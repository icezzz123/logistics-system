package services

import (
	"errors"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"

	"gorm.io/gorm"
)

type ScanResolverService struct{}

func NewScanResolverService() *ScanResolverService {
	return &ScanResolverService{}
}

func normalizeBusinessCode(code string) string {
	return strings.TrimSpace(code)
}

func resolveOrderByScanCode(tx *gorm.DB, code string) (*models.Order, *models.OrderPackage, string, error) {
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, nil, "", errors.New("扫描码不能为空")
	}

	var order models.Order
	if err := tx.Where("order_no = ?", code).First(&order).Error; err == nil {
		return &order, nil, "order_no", nil
	} else if err != gorm.ErrRecordNotFound {
		return nil, nil, "", errors.New("查询订单失败")
	}

	var pkg models.OrderPackage
	if err := tx.Where("parcel_no = ?", code).First(&pkg).Error; err == nil {
		if err := tx.First(&order, pkg.OrderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, nil, "", errors.New("包裹关联订单不存在")
			}
			return nil, nil, "", errors.New("查询包裹关联订单失败")
		}
		return &order, &pkg, "parcel_no", nil
	} else if err != gorm.ErrRecordNotFound {
		return nil, nil, "", errors.New("查询包裹失败")
	}

	return nil, nil, "", errors.New("未识别到订单号或包裹号")
}

func resolveSortingTaskByCode(tx *gorm.DB, code string) (*models.SortingTask, error) {
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, nil
	}

	var task models.SortingTask
	if err := tx.Where("task_no = ?", code).First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("分拣任务不存在")
		}
		return nil, errors.New("查询分拣任务失败")
	}
	return &task, nil
}

func resolveTransportTaskByCode(tx *gorm.DB, code string, statuses ...string) (*models.TransportTask, error) {
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, nil
	}

	query := tx.Model(&models.TransportTask{})
	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}

	var task models.TransportTask
	if err := query.Where("task_no = ?", code).Order("c_time DESC").First(&task).Error; err == nil {
		return &task, nil
	} else if err != gorm.ErrRecordNotFound {
		return nil, errors.New("查询运输任务失败")
	}

	order, _, _, err := resolveOrderByScanCode(tx, code)
	if err != nil {
		return nil, errors.New("运输任务不存在")
	}

	query = tx.Model(&models.TransportTask{})
	if len(statuses) > 0 {
		query = query.Where("status IN ?", statuses)
	}
	if err := query.Where("order_id = ?", order.ID).Order("c_time DESC").First(&task).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务不存在")
		}
		return nil, errors.New("查询运输任务失败")
	}

	return &task, nil
}

func resolveBatchByCode(tx *gorm.DB, code string) (*models.BatchSchedule, error) {
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, nil
	}

	var batch models.BatchSchedule
	if err := tx.Where("batch_no = ?", code).First(&batch).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("批次不存在")
		}
		return nil, errors.New("查询批次失败")
	}
	return &batch, nil
}

func resolvePlanByCode(tx *gorm.DB, code string) (*models.TransportPlan, error) {
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, nil
	}

	var plan models.TransportPlan
	if err := tx.Where("plan_no = ?", code).First(&plan).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输计划不存在")
		}
		return nil, errors.New("查询运输计划失败")
	}
	return &plan, nil
}

func (s *ScanResolverService) Resolve(code string) (*dto.ScanResolveResponse, error) {
	tx := database.DB
	code = normalizeBusinessCode(code)
	if code == "" {
		return nil, errors.New("扫描码不能为空")
	}

	if order, pkg, codeType, err := resolveOrderByScanCode(tx, code); err == nil {
		resp := &dto.ScanResolveResponse{
			Code:       code,
			CodeType:   codeType,
			EntityType: "order",
			OrderID:    order.ID,
			OrderNo:    order.OrderNo,
		}
		if pkg != nil {
			resp.EntityType = "package"
			resp.ParcelNo = pkg.ParcelNo
		}
		return resp, nil
	}

	if task, err := resolveSortingTaskByCode(tx, code); err == nil && task != nil {
		return &dto.ScanResolveResponse{
			Code:       code,
			CodeType:   "sorting_task_no",
			EntityType: "sorting_task",
			TaskID:     task.ID,
			TaskNo:     task.TaskNo,
		}, nil
	}

	if task, err := resolveTransportTaskByCode(tx, code); err == nil && task != nil {
		return &dto.ScanResolveResponse{
			Code:       code,
			CodeType:   "transport_task_no",
			EntityType: "transport_task",
			TaskID:     task.ID,
			TaskNo:     task.TaskNo,
		}, nil
	}

	if batch, err := resolveBatchByCode(tx, code); err == nil && batch != nil {
		return &dto.ScanResolveResponse{
			Code:       code,
			CodeType:   "batch_no",
			EntityType: "batch",
			BatchID:    batch.ID,
			BatchNo:    batch.BatchNo,
		}, nil
	}

	if plan, err := resolvePlanByCode(tx, code); err == nil && plan != nil {
		return &dto.ScanResolveResponse{
			Code:       code,
			CodeType:   "plan_no",
			EntityType: "plan",
			PlanID:     plan.ID,
			PlanNo:     plan.PlanNo,
		}, nil
	}

	return nil, errors.New("未识别到有效的订单号、包裹号、任务号或批次号")
}
