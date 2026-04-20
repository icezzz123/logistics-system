package services

import (
	"errors"
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *SortingService) SortingScanByCode(req *dto.SortingScanRequest, sorterID uint) (*dto.SortingScanResponse, error) {
	db := database.DB
	var response *dto.SortingScanResponse
	var taskID uint

	err := db.Transaction(func(tx *gorm.DB) error {
		scanCode := strings.TrimSpace(req.ScanCode)
		if scanCode == "" {
			scanCode = strings.TrimSpace(req.OrderNo)
		}

		order, pkg, scanCodeType, err := resolveOrderByScanCode(tx, scanCode)
		if err != nil {
			if req.OrderID > 0 {
				var legacyOrder models.Order
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&legacyOrder, req.OrderID).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						return errors.New("订单不存在")
					}
					return errors.New("查询订单失败")
				}
				order = &legacyOrder
				scanCodeType = "order_id"
			} else {
				return err
			}
		} else {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(order, order.ID).Error; err != nil {
				return errors.New("查询订单失败")
			}
		}

		taskNo := ""
		if taskCode := strings.TrimSpace(req.TaskCode); taskCode != "" {
			task, err := resolveSortingTaskByCode(tx, taskCode)
			if err != nil {
				return err
			}
			taskID = task.ID
			taskNo = task.TaskNo
		} else if req.TaskID > 0 {
			var task models.SortingTask
			if err := tx.First(&task, req.TaskID).Error; err == nil {
				taskID = task.ID
				taskNo = task.TaskNo
			}
		}

		var station models.Station
		if err := tx.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("站点不存在或已禁用")
			}
			return errors.New("查询站点信息失败")
		}

		var existingRecord models.SortingRecord
		if err := tx.Where("order_id = ? AND station_id = ?", order.ID, req.StationID).Order("scan_time DESC").First(&existingRecord).Error; err == nil {
			response = &dto.SortingScanResponse{
				RecordID: existingRecord.ID,
				OrderID:  order.ID,
				OrderNo:  order.OrderNo,
				ParcelNo: func() string {
					if pkg != nil {
						return pkg.ParcelNo
					}
					return ""
				}(),
				TaskID:        taskID,
				TaskNo:        taskNo,
				ScanCodeType:  scanCodeType,
				RouteMatched:  existingRecord.RouteCode != "" || existingRecord.TargetStation > 0,
				RouteCode:     existingRecord.RouteCode,
				TargetStation: existingRecord.TargetStation,
				StationName:   station.Name,
				Message:       "分拣扫描已处理，无需重复扫描",
			}
			return nil
		}

		routeReq := &dto.RouteMatchRequest{
			Country:  order.ReceiverCountry,
			Province: order.ReceiverProvince,
			City:     order.ReceiverCity,
			District: "",
		}
		routeResult, err := s.MatchRoute(routeReq)
		if err != nil {
			return errors.New("路由匹配失败: " + err.Error())
		}

		record := &models.SortingRecord{
			TaskID:    taskID,
			OrderID:   order.ID,
			StationID: req.StationID,
			SorterID:  sorterID,
			ScanTime:  time.Now().Unix(),
			IsCorrect: 1,
			Remark:    strings.TrimSpace(req.Remark),
		}
		if routeResult.Matched {
			record.RuleID = routeResult.Rule.ID
			record.RouteCode = routeResult.RouteCode
			record.TargetStation = routeResult.StationID
		}

		if err := tx.Create(record).Error; err != nil {
			return errors.New("创建分拣记录失败")
		}

		if order.Status == models.OrderInWarehouse {
			var sorter models.User
			if err := tx.Select("id, username, real_name, role").First(&sorter, sorterID).Error; err == nil {
				stateMachine := &OrderStateMachine{}
				if stateMachine.CanTransition(order.Status, models.OrderSorting, int(sorter.Role)) {
					if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
						"status":          int(models.OrderSorting),
						"current_station": req.StationID,
					}).Error; err != nil {
						return errors.New("更新订单分拣状态失败")
					}

					operatorName := sorter.RealName
					if operatorName == "" {
						operatorName = sorter.Username
					}
					statusLog := models.OrderStatusLog{
						OrderID:      order.ID,
						FromStatus:   models.OrderInWarehouse,
						ToStatus:     models.OrderSorting,
						OperatorID:   sorterID,
						OperatorName: operatorName,
						OperatorRole: int(sorter.Role),
						Remark:       "分拣扫描自动推进到分拣中",
						ChangeTime:   time.Now().Unix(),
					}
					if err := tx.Create(&statusLog).Error; err != nil {
						return errors.New("创建订单状态日志失败")
					}
					order.Status = models.OrderSorting
				}
			}
		}

		response = &dto.SortingScanResponse{
			RecordID: record.ID,
			OrderID:  order.ID,
			OrderNo:  order.OrderNo,
			ParcelNo: func() string {
				if pkg != nil {
					return pkg.ParcelNo
				}
				return ""
			}(),
			TaskID:       taskID,
			TaskNo:       taskNo,
			ScanCodeType: scanCodeType,
			RouteMatched: routeResult.Matched,
			Message:      "分拣扫描成功",
		}

		if routeResult.Matched {
			response.RouteCode = routeResult.RouteCode
			response.TargetStation = routeResult.StationID
			response.StationName = routeResult.StationName
			response.MatchLevel = routeResult.MatchLevel
			response.Rule = routeResult.Rule
			response.Message = fmt.Sprintf("分拣成功，目标站点：%s", routeResult.StationName)
		} else {
			response.Suggestions = routeResult.Suggestions
			response.Message = "未找到匹配的路由规则，请手动处理"
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	if taskID > 0 {
		s.updateTaskProgress(taskID)
	}

	return response, nil
}
