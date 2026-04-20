package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"

	"gorm.io/gorm"
)

type TransportService struct{}

func NewTransportService() *TransportService {
	return &TransportService{}
}

// CreateVehicle 创建车辆
func (s *TransportService) CreateVehicle(req *dto.CreateVehicleRequest) (*models.Vehicle, error) {
	db := database.DB

	// 检查车牌号是否重复
	var existingVehicle models.Vehicle
	if err := db.Where("plate_number = ?", req.PlateNumber).First(&existingVehicle).Error; err == nil {
		return nil, errors.New("车牌号已存在")
	}

	// 如果指定了司机，验证司机是否存在
	if req.DriverID > 0 {
		var driver models.User
		if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("指定的司机不存在或权限不足")
			}
			return nil, errors.New("查询司机信息失败")
		}
	}

	// 创建车辆
	vehicle := &models.Vehicle{
		PlateNumber: strings.TrimSpace(req.PlateNumber),
		VehicleType: strings.TrimSpace(req.VehicleType),
		Capacity:    req.Capacity,
		DriverID:    req.DriverID,
		Status:      1, // 默认可用
	}

	if err := db.Create(vehicle).Error; err != nil {
		return nil, errors.New("创建车辆失败")
	}

	return vehicle, nil
}

// GetVehicleByID 根据ID获取车辆
func (s *TransportService) GetVehicleByID(id uint) (*models.Vehicle, error) {
	var vehicle models.Vehicle
	if err := database.DB.First(&vehicle, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("车辆不存在")
		}
		return nil, errors.New("查询车辆失败")
	}
	return &vehicle, nil
}

// GetVehicleList 获取车辆列表
func (s *TransportService) GetVehicleList(req *dto.VehicleQueryRequest) (*dto.VehicleListResponse, error) {
	db := database.DB

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	var vehicles []models.Vehicle
	var total int64

	query := db.Model(&models.Vehicle{})

	// 按车牌号搜索
	if req.PlateNumber != "" {
		query = query.Where("plate_number LIKE ?", "%"+strings.TrimSpace(req.PlateNumber)+"%")
	}

	// 按车辆类型筛选
	if req.VehicleType != "" {
		query = query.Where("vehicle_type = ?", strings.TrimSpace(req.VehicleType))
	}

	// 按状态筛选（-1表示全部，0和1表示具体状态）
	if req.Status != -1 {
		query = query.Where("status = ?", req.Status)
	}

	// 按司机筛选
	if req.DriverID > 0 {
		query = query.Where("driver_id = ?", req.DriverID)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询车辆总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&vehicles).Error; err != nil {
		return nil, errors.New("查询车辆列表失败")
	}

	// 获取司机信息
	driverMap := make(map[uint]string)
	if len(vehicles) > 0 {
		var driverIDs []uint
		for _, vehicle := range vehicles {
			if vehicle.DriverID > 0 {
				driverIDs = append(driverIDs, vehicle.DriverID)
			}
		}

		if len(driverIDs) > 0 {
			var drivers []models.User
			if err := db.Where("id IN ?", driverIDs).Find(&drivers).Error; err == nil {
				for _, driver := range drivers {
					name := driver.RealName
					if name == "" {
						name = driver.Username
					}
					driverMap[driver.ID] = name
				}
			}
		}
	}

	// 转换为DTO
	vehicleList := make([]dto.VehicleResponse, 0, len(vehicles))
	for _, vehicle := range vehicles {
		vehicleList = append(vehicleList, dto.VehicleResponse{
			ID:          vehicle.ID,
			PlateNumber: vehicle.PlateNumber,
			VehicleType: vehicle.VehicleType,
			Capacity:    vehicle.Capacity,
			DriverID:    vehicle.DriverID,
			DriverName:  driverMap[vehicle.DriverID],
			Status:      vehicle.Status,
			StatusName:  s.getVehicleStatusName(vehicle.Status),
			CreateTime:  utils.FormatTimestamp(vehicle.CTime),
			UpdateTime:  utils.FormatTimestamp(vehicle.MTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.VehicleListResponse{
		List:     vehicleList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// UpdateVehicle 更新车辆信息
func (s *TransportService) UpdateVehicle(id uint, req *dto.UpdateVehicleRequest) error {
	db := database.DB

	// 查询车辆是否存在
	vehicle, err := s.GetVehicleByID(id)
	if err != nil {
		return err
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.PlateNumber != "" && req.PlateNumber != vehicle.PlateNumber {
		// 检查车牌号是否重复
		var existingVehicle models.Vehicle
		if err := db.Where("plate_number = ? AND id != ?", req.PlateNumber, id).First(&existingVehicle).Error; err == nil {
			return errors.New("车牌号已存在")
		}
		updates["plate_number"] = strings.TrimSpace(req.PlateNumber)
	}

	if req.VehicleType != "" {
		updates["vehicle_type"] = strings.TrimSpace(req.VehicleType)
	}

	if req.Capacity != vehicle.Capacity {
		updates["capacity"] = req.Capacity
	}

	if req.DriverID != vehicle.DriverID {
		// 如果指定了司机，验证司机是否存在
		if req.DriverID > 0 {
			var driver models.User
			if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return errors.New("指定的司机不存在或权限不足")
				}
				return errors.New("查询司机信息失败")
			}
		}
		updates["driver_id"] = req.DriverID
	}

	// 如果没有要更新的字段
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	// 执行更新
	if err := db.Model(&models.Vehicle{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新车辆信息失败")
	}

	return nil
}

// UpdateVehicleStatus 更新车辆状态
func (s *TransportService) UpdateVehicleStatus(id uint, status int) error {
	// 查询车辆是否存在
	_, err := s.GetVehicleByID(id)
	if err != nil {
		return err
	}

	// 更新状态
	if err := database.DB.Model(&models.Vehicle{}).Where("id = ?", id).Update("status", status).Error; err != nil {
		return errors.New("更新车辆状态失败")
	}

	return nil
}

// DeleteVehicle 删除车辆
func (s *TransportService) DeleteVehicle(id uint) error {
	// 查询车辆是否存在
	_, err := s.GetVehicleByID(id)
	if err != nil {
		return err
	}

	// 检查是否有运输任务使用此车辆
	var taskCount int64
	if err := database.DB.Model(&models.TransportTask{}).Where("vehicle_id = ?", id).Count(&taskCount).Error; err != nil {
		return errors.New("查询运输任务失败")
	}

	if taskCount > 0 {
		return errors.New("该车辆已被运输任务使用，不能删除，建议设为维修状态")
	}

	// 删除车辆
	if err := database.DB.Delete(&models.Vehicle{}, id).Error; err != nil {
		return errors.New("删除车辆失败")
	}

	return nil
}

// getVehicleStatusName 获取车辆状态名称
func (s *TransportService) getVehicleStatusName(status int) string {
	switch status {
	case 1:
		return "可用"
	case 0:
		return "维修中"
	default:
		return "未知"
	}
}

// generateTaskNo 生成任务编号
func (s *TransportService) generateTaskNo() string {
	now := time.Now()
	return fmt.Sprintf("T%s%06d", now.Format("20060102150405"), now.Nanosecond()/1000)
}

// CreateTransportTask 创建运输任务
func (s *TransportService) CreateTransportTask(req *dto.CreateTransportTaskRequest) (*models.TransportTask, error) {
	db := database.DB

	// 验证订单是否存在
	var order models.Order
	if err := db.First(&order, req.OrderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}

	// 验证车辆是否存在且可用
	var vehicle models.Vehicle
	if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&vehicle).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("车辆不存在或不可用")
		}
		return nil, errors.New("查询车辆失败")
	}

	// 验证司机是否存在
	var driver models.User
	if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("司机不存在或权限不足")
		}
		return nil, errors.New("查询司机失败")
	}

	// 检查订单是否已有运输任务
	var existingTask models.TransportTask
	if err := db.Where("order_id = ? AND status NOT IN ('cancelled')", req.OrderID).First(&existingTask).Error; err == nil {
		return nil, errors.New("该订单已有运输任务")
	}

	// 创建运输任务
	task := &models.TransportTask{
		TaskNo:     s.generateTaskNo(),
		OrderID:    req.OrderID,
		VehicleID:  req.VehicleID,
		DriverID:   req.DriverID,
		StartPoint: strings.TrimSpace(req.StartPoint),
		EndPoint:   strings.TrimSpace(req.EndPoint),
		Distance:   req.Distance,
		Status:     "pending",
		Cost:       req.Cost,
		Remark:     strings.TrimSpace(req.Remark),
	}

	if err := db.Create(task).Error; err != nil {
		return nil, errors.New("创建运输任务失败")
	}

	return task, nil
}

// GetTransportTaskByID 根据ID获取运输任务
func (s *TransportService) GetTransportTaskByID(id uint) (*models.TransportTask, error) {
	var task models.TransportTask
	if err := database.DB.First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务不存在")
		}
		return nil, errors.New("查询运输任务失败")
	}
	return &task, nil
}

// GetTransportTaskList 获取运输任务列表
func (s *TransportService) GetTransportTaskList(req *dto.TransportTaskQueryRequest) (*dto.TransportTaskListResponse, error) {
	db := database.DB

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	var tasks []models.TransportTask
	var total int64

	query := db.Model(&models.TransportTask{})

	// 按任务编号搜索
	if req.TaskNo != "" {
		query = query.Where("task_no LIKE ?", "%"+strings.TrimSpace(req.TaskNo)+"%")
	}

	// 按订单ID筛选
	if req.OrderID > 0 {
		query = query.Where("order_id = ?", req.OrderID)
	}

	// 按车辆ID筛选
	if req.VehicleID > 0 {
		query = query.Where("vehicle_id = ?", req.VehicleID)
	}

	// 按司机ID筛选
	if req.DriverID > 0 {
		query = query.Where("driver_id = ?", req.DriverID)
	}

	// 按状态筛选
	if req.Status != "" {
		query = query.Where("status = ?", strings.TrimSpace(req.Status))
	}

	// 按时间范围筛选
	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询运输任务总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&tasks).Error; err != nil {
		return nil, errors.New("查询运输任务列表失败")
	}

	// 获取关联信息
	orderMap := make(map[uint]string)
	vehicleMap := make(map[uint]string)
	driverMap := make(map[uint]string)

	if len(tasks) > 0 {
		// 获取订单信息
		var orderIDs []uint
		var vehicleIDs []uint
		var driverIDs []uint

		for _, task := range tasks {
			orderIDs = append(orderIDs, task.OrderID)
			vehicleIDs = append(vehicleIDs, task.VehicleID)
			driverIDs = append(driverIDs, task.DriverID)
		}

		// 查询订单
		if len(orderIDs) > 0 {
			var orders []models.Order
			if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
				for _, order := range orders {
					orderMap[order.ID] = order.OrderNo
				}
			}
		}

		// 查询车辆
		if len(vehicleIDs) > 0 {
			var vehicles []models.Vehicle
			if err := db.Where("id IN ?", vehicleIDs).Find(&vehicles).Error; err == nil {
				for _, vehicle := range vehicles {
					vehicleMap[vehicle.ID] = vehicle.PlateNumber
				}
			}
		}

		// 查询司机
		if len(driverIDs) > 0 {
			var drivers []models.User
			if err := db.Where("id IN ?", driverIDs).Find(&drivers).Error; err == nil {
				for _, driver := range drivers {
					name := driver.RealName
					if name == "" {
						name = driver.Username
					}
					driverMap[driver.ID] = name
				}
			}
		}
	}

	// 转换为DTO
	taskList := make([]dto.TransportTaskResponse, 0, len(tasks))
	for _, task := range tasks {
		taskList = append(taskList, dto.TransportTaskResponse{
			ID:          task.ID,
			TaskNo:      task.TaskNo,
			OrderID:     task.OrderID,
			OrderNo:     orderMap[task.OrderID],
			VehicleID:   task.VehicleID,
			PlateNumber: vehicleMap[task.VehicleID],
			DriverID:    task.DriverID,
			DriverName:  driverMap[task.DriverID],
			StartPoint:  task.StartPoint,
			EndPoint:    task.EndPoint,
			Distance:    task.Distance,
			Status:      task.Status,
			StatusName:  s.getTransportTaskStatusName(task.Status),
			StartTime:   task.StartTime,
			EndTime:     task.EndTime,
			Cost:        task.Cost,
			Remark:      task.Remark,
			CreateTime:  utils.FormatTimestamp(task.CTime),
			UpdateTime:  utils.FormatTimestamp(task.MTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.TransportTaskListResponse{
		List:     taskList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// UpdateTransportTask 更新运输任务
func (s *TransportService) UpdateTransportTask(id uint, req *dto.UpdateTransportTaskRequest) error {
	db := database.DB

	// 查询任务是否存在
	task, err := s.GetTransportTaskByID(id)
	if err != nil {
		return err
	}

	// 检查任务状态，已完成或已取消的任务不能修改
	if task.Status == "completed" || task.Status == "cancelled" {
		return errors.New("已完成或已取消的任务不能修改")
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.VehicleID > 0 && req.VehicleID != task.VehicleID {
		// 验证车辆是否存在且可用
		var vehicle models.Vehicle
		if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&vehicle).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("车辆不存在或不可用")
			}
			return errors.New("查询车辆失败")
		}
		updates["vehicle_id"] = req.VehicleID
	}

	if req.DriverID > 0 && req.DriverID != task.DriverID {
		// 验证司机是否存在
		var driver models.User
		if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("司机不存在或权限不足")
			}
			return errors.New("查询司机失败")
		}
		updates["driver_id"] = req.DriverID
	}

	if req.StartPoint != "" {
		updates["start_point"] = strings.TrimSpace(req.StartPoint)
	}

	if req.EndPoint != "" {
		updates["end_point"] = strings.TrimSpace(req.EndPoint)
	}

	if req.Distance != task.Distance {
		updates["distance"] = req.Distance
	}

	if req.Cost != task.Cost {
		updates["cost"] = req.Cost
	}

	if req.Remark != task.Remark {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	// 如果没有要更新的字段
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	// 执行更新
	if err := db.Model(&models.TransportTask{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新运输任务失败")
	}

	return nil
}

// UpdateTransportTaskStatus 更新运输任务状态
func (s *TransportService) UpdateTransportTaskStatus(id uint, req *dto.TransportTaskStatusRequest) error {
	db := database.DB

	// 查询任务是否存在
	task, err := s.GetTransportTaskByID(id)
	if err != nil {
		return err
	}

	// 状态转换验证
	if !s.isValidStatusTransition(task.Status, req.Status) {
		return errors.New("无效的状态转换")
	}

	// 构建更新数据
	updates := map[string]interface{}{
		"status": req.Status,
	}

	if req.Remark != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	// 根据状态设置时间
	now := time.Now().Unix()
	switch req.Status {
	case "in_progress":
		if task.StartTime == 0 {
			updates["start_time"] = now
		}
	case "completed":
		if task.EndTime == 0 {
			updates["end_time"] = now
		}
	}

	// 执行更新
	if err := db.Model(&models.TransportTask{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新运输任务状态失败")
	}

	return nil
}

func (s *TransportService) LoadScan(taskID uint, operatorID uint, operatorRole int, req *dto.TransportScanRequest) (*dto.TransportScanResponse, error) {
	if err := s.validateTransportScanPermission("load", operatorRole); err != nil {
		return nil, err
	}

	db := database.DB
	tx := db.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var task models.TransportTask
	if err := tx.First(&task, taskID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务不存在")
		}
		return nil, errors.New("查询运输任务失败")
	}

	if task.Status != "pending" {
		tx.Rollback()
		return nil, errors.New("只有待执行状态的运输任务可以装车扫描")
	}

	var order models.Order
	if err := tx.First(&order, task.OrderID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务关联的订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}

	if err := s.validateTransportScanCode(req.ScanCode, &task, &order); err != nil {
		tx.Rollback()
		return nil, err
	}

	var station models.Station
	if err := tx.Select("id", "name").First(&station, req.StationID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("扫描站点不存在")
		}
		return nil, errors.New("查询扫描站点失败")
	}

	var existingRecord models.DeliveryRecord
	if err := tx.Where("order_id = ? AND vehicle_id = ? AND driver_id = ? AND status = ? AND dispatch_time >= ?", task.OrderID, task.VehicleID, task.DriverID, "loaded", task.CTime).Order("dispatch_time DESC").First(&existingRecord).Error; err == nil {
		tx.Rollback()
		return nil, errors.New("该任务已完成装车扫描，请勿重复操作")
	} else if err != gorm.ErrRecordNotFound {
		tx.Rollback()
		return nil, errors.New("查询装车记录失败")
	}

	now := time.Now().Unix()
	record := models.DeliveryRecord{
		OrderID:      task.OrderID,
		DriverID:     task.DriverID,
		VehicleID:    task.VehicleID,
		StationID:    req.StationID,
		DispatchTime: now,
		Status:       "loaded",
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建装车扫描记录失败")
	}

	updates := map[string]interface{}{
		"status": "in_progress",
	}
	if task.StartTime == 0 {
		updates["start_time"] = now
		task.StartTime = now
	}
	if err := tx.Model(&models.TransportTask{}).Where("id = ?", task.ID).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新运输任务状态失败")
	}
	task.Status = "in_progress"

	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("current_station", req.StationID).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新订单当前站点失败")
	}

	remark := s.buildTransportScanRemark("装车扫描", req.Remark)
	if order.Status != models.OrderInTransit {
		if err := s.updateOrderStatusForScan(tx, &order, models.OrderInTransit, operatorID, operatorRole, remark); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交装车扫描事务失败")
	}

	return &dto.TransportScanResponse{
		TaskID:          task.ID,
		TaskNo:          task.TaskNo,
		OrderID:         order.ID,
		OrderNo:         order.OrderNo,
		ScanType:        "load",
		StationID:       station.ID,
		StationName:     station.Name,
		RecordID:        record.ID,
		ScanTime:        now,
		TaskStatus:      task.Status,
		TaskStatusName:  s.getTransportTaskStatusName(task.Status),
		OrderStatus:     int(order.Status),
		OrderStatusName: GetOrderStatusName(int(order.Status)),
		Message:         "装车扫描成功",
	}, nil
}

func (s *TransportService) UnloadScan(taskID uint, operatorID uint, operatorRole int, req *dto.TransportScanRequest) (*dto.TransportScanResponse, error) {
	if err := s.validateTransportScanPermission("unload", operatorRole); err != nil {
		return nil, err
	}

	db := database.DB
	tx := db.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	var task models.TransportTask
	if err := tx.First(&task, taskID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务不存在")
		}
		return nil, errors.New("查询运输任务失败")
	}

	if task.Status != "in_progress" {
		tx.Rollback()
		return nil, errors.New("只有执行中的运输任务可以卸车扫描")
	}

	var order models.Order
	if err := tx.First(&order, task.OrderID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输任务关联的订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}

	if err := s.validateTransportScanCode(req.ScanCode, &task, &order); err != nil {
		tx.Rollback()
		return nil, err
	}

	var station models.Station
	if err := tx.Select("id", "name").First(&station, req.StationID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("扫描站点不存在")
		}
		return nil, errors.New("查询扫描站点失败")
	}

	var loadedRecord models.DeliveryRecord
	if err := tx.Where("order_id = ? AND vehicle_id = ? AND driver_id = ? AND status = ? AND dispatch_time >= ?", task.OrderID, task.VehicleID, task.DriverID, "loaded", task.CTime).Order("dispatch_time DESC").First(&loadedRecord).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("未找到对应的装车扫描记录，请先完成装车扫描")
		}
		return nil, errors.New("查询装车扫描记录失败")
	}

	now := time.Now().Unix()
	record := models.DeliveryRecord{
		OrderID:      task.OrderID,
		DriverID:     task.DriverID,
		VehicleID:    task.VehicleID,
		StationID:    req.StationID,
		DeliveryTime: now,
		Status:       "unloaded",
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建卸车扫描记录失败")
	}

	updates := map[string]interface{}{
		"status":   "completed",
		"end_time": now,
	}
	if err := tx.Model(&models.TransportTask{}).Where("id = ?", task.ID).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新运输任务状态失败")
	}
	task.Status = "completed"
	task.EndTime = now

	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("current_station", req.StationID).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新订单当前站点失败")
	}

	remark := s.buildTransportScanRemark("卸车扫描", req.Remark)
	stateMachine := &OrderStateMachine{}
	if order.Status == models.OrderInTransit && stateMachine.CanTransition(order.Status, models.OrderDestinationSorting, operatorRole) {
		if err := s.updateOrderStatusForScan(tx, &order, models.OrderDestinationSorting, operatorID, operatorRole, remark); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交卸车扫描事务失败")
	}

	return &dto.TransportScanResponse{
		TaskID:          task.ID,
		TaskNo:          task.TaskNo,
		OrderID:         order.ID,
		OrderNo:         order.OrderNo,
		ScanType:        "unload",
		StationID:       station.ID,
		StationName:     station.Name,
		RecordID:        record.ID,
		ScanTime:        now,
		TaskStatus:      task.Status,
		TaskStatusName:  s.getTransportTaskStatusName(task.Status),
		OrderStatus:     int(order.Status),
		OrderStatusName: GetOrderStatusName(int(order.Status)),
		Message:         "卸车扫描成功",
	}, nil
}

func (s *TransportService) validateTransportScanPermission(scanType string, role int) error {
	switch scanType {
	case "load":
		if role == 4 || role == 6 || role == 7 {
			return nil
		}
	case "unload":
		if role == 4 || role == 5 || role == 6 || role == 7 {
			return nil
		}
	}
	return errors.New("当前角色无权执行装卸扫描")
}

func (s *TransportService) validateTransportScanCode(scanCode string, task *models.TransportTask, order *models.Order) error {
	code := strings.TrimSpace(scanCode)
	if code == "" {
		return errors.New("扫描码不能为空")
	}
	if code != task.TaskNo && code != order.OrderNo {
		return errors.New("扫描码与运输任务不匹配")
	}
	return nil
}

func (s *TransportService) buildTransportScanRemark(prefix, remark string) string {
	remark = strings.TrimSpace(remark)
	if remark == "" {
		return prefix
	}
	return fmt.Sprintf("%s：%s", prefix, remark)
}

func (s *TransportService) updateOrderStatusForScan(tx *gorm.DB, order *models.Order, newStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	stateMachine := &OrderStateMachine{}
	if err := stateMachine.ValidateTransition(order.Status, newStatus, operatorRole); err != nil {
		return err
	}

	updates := map[string]interface{}{
		"status": newStatus,
	}
	if remark != "" {
		updates["remark"] = remark
	}

	currentTime := time.Now().Unix()
	switch newStatus {
	case models.OrderDelivered:
		updates["delivery_time"] = currentTime
	case models.OrderSigned:
		updates["sign_time"] = currentTime
	}

	oldStatus := order.Status
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		return errors.New("更新订单状态失败")
	}

	if err := s.createOrderStatusLogTx(tx, order.ID, oldStatus, newStatus, operatorID, operatorRole, remark); err != nil {
		return err
	}

	order.Status = newStatus
	return nil
}

func (s *TransportService) createOrderStatusLogTx(tx *gorm.DB, orderID uint, fromStatus, toStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	var user models.User
	if err := tx.Select("username", "real_name").Where("id = ?", operatorID).First(&user).Error; err != nil {
		return errors.New("查询操作人信息失败")
	}

	operatorName := user.RealName
	if operatorName == "" {
		operatorName = user.Username
	}

	log := models.OrderStatusLog{
		OrderID:      orderID,
		FromStatus:   fromStatus,
		ToStatus:     toStatus,
		OperatorID:   operatorID,
		OperatorName: operatorName,
		OperatorRole: operatorRole,
		Remark:       remark,
		ChangeTime:   time.Now().Unix(),
	}

	if err := tx.Create(&log).Error; err != nil {
		return errors.New("创建订单状态日志失败")
	}
	return nil
}

func (s *TransportService) GetTransportRecordList(req *dto.TransportRecordQueryRequest) (*dto.TransportRecordListResponse, error) {
	db := database.DB

	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	query := db.Model(&models.DeliveryRecord{})

	if req.VehicleID > 0 {
		query = query.Where("vehicle_id = ?", req.VehicleID)
	}
	if req.DriverID > 0 {
		query = query.Where("driver_id = ?", req.DriverID)
	}
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}
	if req.ScanType != "" {
		status, err := s.getTransportRecordStatusFilter(req.ScanType)
		if err != nil {
			return nil, err
		}
		query = query.Where("status = ?", status)
	}
	if req.TaskNo != "" {
		var task models.TransportTask
		err := db.Where("task_no = ?", strings.TrimSpace(req.TaskNo)).First(&task).Error
		if err == gorm.ErrRecordNotFound {
			return s.emptyTransportRecordListResponse(req.Page, req.PageSize), nil
		}
		if err != nil {
			return nil, errors.New("查询运输任务失败")
		}
		query = query.Where("order_id = ? AND vehicle_id = ? AND driver_id = ? AND c_time >= ?", task.OrderID, task.VehicleID, task.DriverID, task.CTime)
		if task.EndTime > 0 {
			query = query.Where("c_time <= ?", task.EndTime)
		}
	}
	if req.OrderNo != "" {
		var order models.Order
		err := db.Select("id").Where("order_no = ?", strings.TrimSpace(req.OrderNo)).First(&order).Error
		if err == gorm.ErrRecordNotFound {
			return s.emptyTransportRecordListResponse(req.Page, req.PageSize), nil
		}
		if err != nil {
			return nil, errors.New("查询订单失败")
		}
		query = query.Where("order_id = ?", order.ID)
	}
	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询装卸记录总数失败")
	}

	var records []models.DeliveryRecord
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&records).Error; err != nil {
		return nil, errors.New("查询装卸记录失败")
	}

	if len(records) == 0 {
		return s.emptyTransportRecordListResponse(req.Page, req.PageSize), nil
	}

	orderIDs := make([]uint, 0, len(records))
	stationIDs := make([]uint, 0, len(records))
	vehicleIDs := make([]uint, 0, len(records))
	driverIDs := make([]uint, 0, len(records))
	for _, record := range records {
		orderIDs = append(orderIDs, record.OrderID)
		stationIDs = append(stationIDs, record.StationID)
		if record.VehicleID > 0 {
			vehicleIDs = append(vehicleIDs, record.VehicleID)
		}
		if record.DriverID > 0 {
			driverIDs = append(driverIDs, record.DriverID)
		}
	}

	orderMap := make(map[uint]models.Order)
	stationMap := make(map[uint]models.Station)
	vehicleMap := make(map[uint]models.Vehicle)
	driverMap := make(map[uint]models.User)
	taskMap := make(map[uint]models.TransportTask)

	var orders []models.Order
	if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
		for _, order := range orders {
			orderMap[order.ID] = order
		}
	}

	var stations []models.Station
	if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
		for _, station := range stations {
			stationMap[station.ID] = station
		}
	}

	if len(vehicleIDs) > 0 {
		var vehicles []models.Vehicle
		if err := db.Where("id IN ?", vehicleIDs).Find(&vehicles).Error; err == nil {
			for _, vehicle := range vehicles {
				vehicleMap[vehicle.ID] = vehicle
			}
		}
	}

	if len(driverIDs) > 0 {
		var drivers []models.User
		if err := db.Where("id IN ?", driverIDs).Find(&drivers).Error; err == nil {
			for _, driver := range drivers {
				driverMap[driver.ID] = driver
			}
		}
	}

	var tasks []models.TransportTask
	if err := db.Where("order_id IN ?", orderIDs).Order("c_time DESC").Find(&tasks).Error; err == nil {
		for _, task := range tasks {
			if _, exists := taskMap[task.OrderID]; !exists {
				taskMap[task.OrderID] = task
			}
		}
	}

	list := make([]dto.TransportRecordInfo, 0, len(records))
	for _, record := range records {
		list = append(list, s.buildTransportRecordInfo(record, taskMap[record.OrderID], orderMap[record.OrderID], stationMap[record.StationID], vehicleMap[record.VehicleID], driverMap[record.DriverID]))
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.TransportRecordListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

func (s *TransportService) GetTransportRecordByID(id uint) (*dto.TransportRecordInfo, error) {
	db := database.DB

	var record models.DeliveryRecord
	if err := db.First(&record, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("装卸记录不存在")
		}
		return nil, errors.New("查询装卸记录失败")
	}

	var order models.Order
	if err := db.First(&order, record.OrderID).Error; err != nil {
		return nil, errors.New("查询关联订单失败")
	}

	var station models.Station
	if err := db.First(&station, record.StationID).Error; err != nil {
		return nil, errors.New("查询关联站点失败")
	}

	var vehicle models.Vehicle
	if record.VehicleID > 0 {
		if err := db.First(&vehicle, record.VehicleID).Error; err != nil && err != gorm.ErrRecordNotFound {
			return nil, errors.New("查询关联车辆失败")
		}
	}

	var driver models.User
	if record.DriverID > 0 {
		if err := db.First(&driver, record.DriverID).Error; err != nil && err != gorm.ErrRecordNotFound {
			return nil, errors.New("查询关联司机失败")
		}
	}

	var task models.TransportTask
	if err := db.Where("order_id = ?", record.OrderID).Order("c_time DESC").First(&task).Error; err != nil && err != gorm.ErrRecordNotFound {
		return nil, errors.New("查询关联运输任务失败")
	}

	result := s.buildTransportRecordInfo(record, task, order, station, vehicle, driver)
	return &result, nil
}

func (s *TransportService) emptyTransportRecordListResponse(page, pageSize int) *dto.TransportRecordListResponse {
	return &dto.TransportRecordListResponse{
		List:     []dto.TransportRecordInfo{},
		Total:    0,
		Page:     page,
		PageSize: pageSize,
		Pages:    0,
	}
}

func (s *TransportService) getTransportRecordStatusFilter(scanType string) (string, error) {
	switch strings.TrimSpace(scanType) {
	case "load":
		return "loaded", nil
	case "unload":
		return "unloaded", nil
	default:
		return "", errors.New("无效的扫描类型")
	}
}

func (s *TransportService) getTransportRecordMeta(record models.DeliveryRecord) (string, string, int64) {
	switch record.Status {
	case "loaded":
		scanTime := record.DispatchTime
		if scanTime == 0 {
			scanTime = record.CTime
		}
		return "load", "装车", scanTime
	case "unloaded":
		scanTime := record.DeliveryTime
		if scanTime == 0 {
			scanTime = record.CTime
		}
		return "unload", "卸车", scanTime
	default:
		if record.DeliveryTime > 0 {
			return "unload", "卸车", record.DeliveryTime
		}
		if record.DispatchTime > 0 {
			return "load", "装车", record.DispatchTime
		}
		return "unknown", "未知", record.CTime
	}
}

func (s *TransportService) buildTransportRecordInfo(record models.DeliveryRecord, task models.TransportTask, order models.Order, station models.Station, vehicle models.Vehicle, driver models.User) dto.TransportRecordInfo {
	scanType, scanTypeName, scanTime := s.getTransportRecordMeta(record)
	driverName := driver.RealName
	if driverName == "" {
		driverName = driver.Username
	}

	return dto.TransportRecordInfo{
		ID:           record.ID,
		TaskID:       task.ID,
		TaskNo:       task.TaskNo,
		OrderID:      record.OrderID,
		OrderNo:      order.OrderNo,
		VehicleID:    record.VehicleID,
		PlateNumber:  vehicle.PlateNumber,
		DriverID:     record.DriverID,
		DriverName:   driverName,
		StationID:    record.StationID,
		StationName:  station.Name,
		ScanType:     scanType,
		ScanTypeName: scanTypeName,
		RecordStatus: record.Status,
		DispatchTime: record.DispatchTime,
		DeliveryTime: record.DeliveryTime,
		ScanTime:     scanTime,
		FailReason:   record.FailReason,
		Remark:       record.Remark,
		CreateTime:   utils.FormatTimestamp(record.CTime),
		UpdateTime:   utils.FormatTimestamp(record.MTime),
	}
}

type transportTaskFilter struct {
	TaskID    uint
	TaskNo    string
	OrderNo   string
	VehicleID uint
	DriverID  uint
	Status    string
	StartTime int64
	EndTime   int64
	MinCost   float64
	MaxCost   float64
}

type transportMonitorContext struct {
	Task                  models.TransportTask
	Order                 models.Order
	Vehicle               models.Vehicle
	Driver                models.User
	LatestRecord          models.DeliveryRecord
	HasLatestRecord       bool
	LatestStation         models.Station
	LoadCount             int
	UnloadCount           int
	PendingException      models.ExceptionRecord
	HasPendingException   bool
	PendingExceptionCount int
	TotalCompensation     float64
	Progress              float64
	EstimatedHours        int
	ElapsedHours          float64
	DelayHours            float64
	CostPerKm             float64
	WarningLevel          string
	WarningType           string
	WarningMessage        string
	WarningTriggerTime    int64
	CostLevel             string
}

func (s *TransportService) GetTransportMonitorOverview() (*dto.TransportMonitorOverviewResponse, error) {
	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{})
	if err != nil {
		return nil, err
	}

	resp := &dto.TransportMonitorOverviewResponse{}
	if len(contexts) == 0 {
		return resp, nil
	}

	var progressSum float64
	for _, ctx := range contexts {
		resp.TotalTasks++
		resp.TotalDistance += ctx.Task.Distance
		resp.TotalCost += ctx.Task.Cost
		progressSum += ctx.Progress

		switch ctx.Task.Status {
		case "pending":
			resp.PendingTasks++
		case "in_progress":
			resp.InProgressTasks++
		case "completed":
			resp.CompletedTasks++
		case "cancelled":
			resp.CancelledTasks++
		}

		if ctx.WarningLevel == "warning" {
			resp.WarningTasks++
		}
		if ctx.WarningLevel == "critical" {
			resp.CriticalTasks++
		}
		if ctx.WarningType == "delay" {
			resp.DelayedTasks++
		}
		if ctx.WarningType == "exception" {
			resp.ExceptionTasks++
		}
	}

	resp.TotalDistance = s.round2(resp.TotalDistance)
	resp.TotalCost = s.round2(resp.TotalCost)
	resp.AvgProgress = s.round2(progressSum / float64(len(contexts)))
	return resp, nil
}

func (s *TransportService) GetTransportMonitorTaskList(req *dto.TransportMonitorQueryRequest) (*dto.TransportMonitorListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	if req.WarningLevel != "" && req.WarningLevel != "warning" && req.WarningLevel != "critical" {
		return nil, errors.New("无效的预警级别")
	}

	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{
		TaskNo:    req.TaskNo,
		OrderNo:   req.OrderNo,
		VehicleID: req.VehicleID,
		DriverID:  req.DriverID,
		Status:    req.Status,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	})
	if err != nil {
		return nil, err
	}

	items := make([]dto.TransportMonitorTaskInfo, 0, len(contexts))
	for _, ctx := range contexts {
		if req.WarningLevel != "" && ctx.WarningLevel != req.WarningLevel {
			continue
		}
		items = append(items, s.buildTransportMonitorTaskInfo(ctx))
	}

	return s.paginateTransportMonitorItems(items, req.Page, req.PageSize), nil
}

func (s *TransportService) GetTransportWarningList(req *dto.TransportWarningQueryRequest) (*dto.TransportWarningListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	if req.Level != "" && req.Level != "warning" && req.Level != "critical" {
		return nil, errors.New("无效的预警级别")
	}
	if req.WarningType != "" && req.WarningType != "delay" && req.WarningType != "high_cost" && req.WarningType != "exception" && req.WarningType != "pending" {
		return nil, errors.New("无效的预警类型")
	}

	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{
		TaskNo:    req.TaskNo,
		OrderNo:   req.OrderNo,
		VehicleID: req.VehicleID,
		DriverID:  req.DriverID,
	})
	if err != nil {
		return nil, err
	}

	warnings := make([]dto.TransportWarningInfo, 0)
	var warningCount int64
	var criticalCount int64
	for _, ctx := range contexts {
		if ctx.WarningType == "" {
			continue
		}
		if req.Level != "" && ctx.WarningLevel != req.Level {
			continue
		}
		if req.WarningType != "" && ctx.WarningType != req.WarningType {
			continue
		}
		if ctx.WarningLevel == "warning" {
			warningCount++
		}
		if ctx.WarningLevel == "critical" {
			criticalCount++
		}
		warnings = append(warnings, s.buildTransportWarningInfo(ctx))
	}

	return s.paginateTransportWarningItems(warnings, req.Page, req.PageSize, warningCount, criticalCount), nil
}

func (s *TransportService) GetTransportCostOverview(req *dto.TransportCostQueryRequest) (*dto.TransportCostOverviewResponse, error) {
	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{
		TaskNo:    req.TaskNo,
		OrderNo:   req.OrderNo,
		VehicleID: req.VehicleID,
		DriverID:  req.DriverID,
		Status:    req.Status,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		MinCost:   req.MinCost,
		MaxCost:   req.MaxCost,
	})
	if err != nil {
		return nil, err
	}

	resp := &dto.TransportCostOverviewResponse{}
	if len(contexts) == 0 {
		return resp, nil
	}

	resp.MinTaskCost = -1
	for _, ctx := range contexts {
		resp.TotalTasks++
		resp.TotalDistance += ctx.Task.Distance
		resp.TotalCost += ctx.Task.Cost
		resp.TotalCompensation += ctx.TotalCompensation
		if ctx.Task.Cost > resp.MaxTaskCost {
			resp.MaxTaskCost = ctx.Task.Cost
		}
		if resp.MinTaskCost < 0 || ctx.Task.Cost < resp.MinTaskCost {
			resp.MinTaskCost = ctx.Task.Cost
		}
		if ctx.CostLevel == "high" || ctx.CostLevel == "critical" {
			resp.HighCostTasks++
		}
	}

	resp.TotalDistance = s.round2(resp.TotalDistance)
	resp.TotalCost = s.round2(resp.TotalCost)
	resp.TotalCompensation = s.round2(resp.TotalCompensation)
	resp.MaxTaskCost = s.round2(resp.MaxTaskCost)
	resp.MinTaskCost = s.round2(resp.MinTaskCost)
	if resp.TotalTasks > 0 {
		resp.AvgCostPerTask = s.round2(resp.TotalCost / float64(resp.TotalTasks))
	}
	if resp.TotalDistance > 0 {
		resp.AvgCostPerKm = s.round2(resp.TotalCost / resp.TotalDistance)
	}
	return resp, nil
}

func (s *TransportService) GetTransportCostTaskList(req *dto.TransportCostQueryRequest) (*dto.TransportCostListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{
		TaskNo:    req.TaskNo,
		OrderNo:   req.OrderNo,
		VehicleID: req.VehicleID,
		DriverID:  req.DriverID,
		Status:    req.Status,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		MinCost:   req.MinCost,
		MaxCost:   req.MaxCost,
	})
	if err != nil {
		return nil, err
	}

	items := make([]dto.TransportCostTaskInfo, 0, len(contexts))
	for _, ctx := range contexts {
		items = append(items, s.buildTransportCostTaskInfo(ctx))
	}

	return s.paginateTransportCostItems(items, req.Page, req.PageSize), nil
}

func (s *TransportService) GetTransportCostTaskDetail(id uint) (*dto.TransportCostDetailResponse, error) {
	contexts, err := s.loadTransportMonitorContexts(transportTaskFilter{TaskID: id})
	if err != nil {
		return nil, err
	}
	if len(contexts) == 0 {
		return nil, errors.New("运输任务不存在")
	}
	resp := s.buildTransportCostDetailResponse(contexts[0])
	return &resp, nil
}

func (s *TransportService) loadTransportMonitorContexts(filter transportTaskFilter) ([]transportMonitorContext, error) {
	db := database.DB
	query := db.Model(&models.TransportTask{})

	if filter.TaskID > 0 {
		query = query.Where("id = ?", filter.TaskID)
	}
	if filter.TaskNo != "" {
		query = query.Where("task_no LIKE ?", "%"+strings.TrimSpace(filter.TaskNo)+"%")
	}
	if filter.VehicleID > 0 {
		query = query.Where("vehicle_id = ?", filter.VehicleID)
	}
	if filter.DriverID > 0 {
		query = query.Where("driver_id = ?", filter.DriverID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", strings.TrimSpace(filter.Status))
	}
	if filter.StartTime > 0 {
		query = query.Where("c_time >= ?", filter.StartTime)
	}
	if filter.EndTime > 0 {
		query = query.Where("c_time <= ?", filter.EndTime)
	}
	if filter.MinCost > 0 {
		query = query.Where("cost >= ?", filter.MinCost)
	}
	if filter.MaxCost > 0 {
		query = query.Where("cost <= ?", filter.MaxCost)
	}
	if filter.OrderNo != "" {
		var orders []models.Order
		if err := db.Select("id").Where("order_no LIKE ?", "%"+strings.TrimSpace(filter.OrderNo)+"%").Find(&orders).Error; err != nil {
			return nil, errors.New("查询订单失败")
		}
		if len(orders) == 0 {
			return []transportMonitorContext{}, nil
		}
		orderIDs := make([]uint, 0, len(orders))
		for _, order := range orders {
			orderIDs = append(orderIDs, order.ID)
		}
		query = query.Where("order_id IN ?", orderIDs)
	}

	var tasks []models.TransportTask
	if err := query.Order("c_time DESC").Find(&tasks).Error; err != nil {
		return nil, errors.New("查询运输任务失败")
	}
	if len(tasks) == 0 {
		return []transportMonitorContext{}, nil
	}

	orderIDs := make([]uint, 0, len(tasks))
	vehicleIDs := make([]uint, 0, len(tasks))
	driverIDs := make([]uint, 0, len(tasks))
	for _, task := range tasks {
		orderIDs = append(orderIDs, task.OrderID)
		if task.VehicleID > 0 {
			vehicleIDs = append(vehicleIDs, task.VehicleID)
		}
		if task.DriverID > 0 {
			driverIDs = append(driverIDs, task.DriverID)
		}
	}

	orderMap := make(map[uint]models.Order)
	vehicleMap := make(map[uint]models.Vehicle)
	driverMap := make(map[uint]models.User)
	stationMap := make(map[uint]models.Station)
	recordsByOrder := make(map[uint][]models.DeliveryRecord)
	pendingExceptionMap := make(map[uint]models.ExceptionRecord)
	pendingExceptionCountMap := make(map[uint]int)
	compensationMap := make(map[uint]float64)
	nextTaskTimeMap := make(map[uint]int64)

	var orders []models.Order
	if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
		for _, order := range orders {
			orderMap[order.ID] = order
		}
	}

	if len(vehicleIDs) > 0 {
		var vehicles []models.Vehicle
		if err := db.Where("id IN ?", vehicleIDs).Find(&vehicles).Error; err == nil {
			for _, vehicle := range vehicles {
				vehicleMap[vehicle.ID] = vehicle
			}
		}
	}

	if len(driverIDs) > 0 {
		var drivers []models.User
		if err := db.Where("id IN ?", driverIDs).Find(&drivers).Error; err == nil {
			for _, driver := range drivers {
				driverMap[driver.ID] = driver
			}
		}
	}

	var orderTasks []models.TransportTask
	if err := db.Where("order_id IN ?", orderIDs).Order("order_id ASC, c_time ASC").Find(&orderTasks).Error; err == nil {
		for idx, task := range orderTasks {
			if idx+1 < len(orderTasks) && orderTasks[idx+1].OrderID == task.OrderID {
				nextTaskTimeMap[task.ID] = orderTasks[idx+1].CTime
			}
		}
	}

	var records []models.DeliveryRecord
	if err := db.Where("order_id IN ?", orderIDs).Order("c_time DESC").Find(&records).Error; err == nil {
		stationIDs := make([]uint, 0, len(records))
		for _, record := range records {
			recordsByOrder[record.OrderID] = append(recordsByOrder[record.OrderID], record)
			if record.StationID > 0 {
				stationIDs = append(stationIDs, record.StationID)
			}
		}
		if len(stationIDs) > 0 {
			var stations []models.Station
			if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
				for _, station := range stations {
					stationMap[station.ID] = station
				}
			}
		}
	}

	var exceptions []models.ExceptionRecord
	if err := db.Where("order_id IN ?", orderIDs).Order("report_time DESC").Find(&exceptions).Error; err == nil {
		for _, ex := range exceptions {
			compensationMap[ex.OrderID] += ex.CompensateAmount
			if ex.Status == models.ExceptionPending || ex.Status == models.ExceptionProcessing {
				pendingExceptionCountMap[ex.OrderID]++
				if _, exists := pendingExceptionMap[ex.OrderID]; !exists {
					pendingExceptionMap[ex.OrderID] = ex
				}
			}
		}
	}

	contexts := make([]transportMonitorContext, 0, len(tasks))
	for _, task := range tasks {
		relevantRecords := s.filterTaskRecords(recordsByOrder[task.OrderID], task.CTime, nextTaskTimeMap[task.ID])
		latestRecord, hasLatest := s.getLatestTaskRecord(relevantRecords)
		loadCount, unloadCount := s.countTaskRecordTypes(relevantRecords)
		estimatedHours := s.calculateTransportEstimatedHours(task.Distance)
		elapsedHours := s.calculateTransportElapsedHours(task)
		delayHours := s.calculateTransportDelayHours(task.Status, elapsedHours, estimatedHours)
		progress := s.calculateTransportProgress(task.Status, loadCount, unloadCount)
		costPerKm := s.calculateTransportCostPerKm(task.Distance, task.Cost)
		pendingException, hasPendingException := pendingExceptionMap[task.OrderID]
		warningLevel, warningType, warningMessage, warningTriggerTime := s.evaluateTransportWarning(task, orderMap[task.OrderID], pendingException, hasPendingException, pendingExceptionCountMap[task.OrderID], elapsedHours, estimatedHours, costPerKm)

		ctx := transportMonitorContext{
			Task:                  task,
			Order:                 orderMap[task.OrderID],
			Vehicle:               vehicleMap[task.VehicleID],
			Driver:                driverMap[task.DriverID],
			HasLatestRecord:       hasLatest,
			LoadCount:             loadCount,
			UnloadCount:           unloadCount,
			HasPendingException:   hasPendingException,
			PendingExceptionCount: pendingExceptionCountMap[task.OrderID],
			TotalCompensation:     s.round2(compensationMap[task.OrderID]),
			Progress:              progress,
			EstimatedHours:        estimatedHours,
			ElapsedHours:          elapsedHours,
			DelayHours:            delayHours,
			CostPerKm:             costPerKm,
			WarningLevel:          warningLevel,
			WarningType:           warningType,
			WarningMessage:        warningMessage,
			WarningTriggerTime:    warningTriggerTime,
			CostLevel:             s.getTransportCostLevel(costPerKm),
		}
		if hasLatest {
			ctx.LatestRecord = latestRecord
			ctx.LatestStation = stationMap[latestRecord.StationID]
		}
		if hasPendingException {
			ctx.PendingException = pendingException
		}
		contexts = append(contexts, ctx)
	}

	return contexts, nil
}

func (s *TransportService) filterTaskRecords(records []models.DeliveryRecord, taskStart, nextTaskTime int64) []models.DeliveryRecord {
	filtered := make([]models.DeliveryRecord, 0)
	for _, record := range records {
		if record.CTime < taskStart {
			continue
		}
		if nextTaskTime > 0 && record.CTime >= nextTaskTime {
			continue
		}
		filtered = append(filtered, record)
	}
	return filtered
}

func (s *TransportService) getLatestTaskRecord(records []models.DeliveryRecord) (models.DeliveryRecord, bool) {
	if len(records) == 0 {
		return models.DeliveryRecord{}, false
	}
	return records[0], true
}

func (s *TransportService) countTaskRecordTypes(records []models.DeliveryRecord) (int, int) {
	loadCount := 0
	unloadCount := 0
	for _, record := range records {
		switch record.Status {
		case "loaded":
			loadCount++
		case "unloaded":
			unloadCount++
		}
	}
	return loadCount, unloadCount
}

func (s *TransportService) calculateTransportEstimatedHours(distance float64) int {
	if distance <= 0 {
		return 0
	}
	hours := int(math.Ceil(distance / 60.0))
	if hours < 1 {
		hours = 1
	}
	return hours
}

func (s *TransportService) calculateTransportElapsedHours(task models.TransportTask) float64 {
	now := time.Now().Unix()
	switch task.Status {
	case "pending":
		return s.round2(float64(now-task.CTime) / 3600.0)
	case "in_progress":
		start := task.StartTime
		if start == 0 {
			start = task.CTime
		}
		return s.round2(float64(now-start) / 3600.0)
	case "completed", "cancelled":
		start := task.StartTime
		if start == 0 {
			start = task.CTime
		}
		end := task.EndTime
		if end == 0 {
			end = task.MTime
		}
		if end < start {
			return 0
		}
		return s.round2(float64(end-start) / 3600.0)
	default:
		return 0
	}
}

func (s *TransportService) calculateTransportDelayHours(status string, elapsedHours float64, estimatedHours int) float64 {
	if estimatedHours == 0 {
		return 0
	}
	if status != "in_progress" && status != "completed" {
		return 0
	}
	delay := elapsedHours - float64(estimatedHours)
	if delay < 0 {
		return 0
	}
	return s.round2(delay)
}

func (s *TransportService) calculateTransportProgress(status string, loadCount, unloadCount int) float64 {
	switch status {
	case "pending":
		return 0
	case "in_progress":
		if unloadCount > 0 {
			return 90
		}
		if loadCount > 0 {
			return 60
		}
		return 30
	case "completed":
		return 100
	case "cancelled":
		return 0
	default:
		return 0
	}
}

func (s *TransportService) calculateTransportCostPerKm(distance, cost float64) float64 {
	if distance <= 0 || cost <= 0 {
		return 0
	}
	return s.round2(cost / distance)
}

func (s *TransportService) evaluateTransportWarning(task models.TransportTask, order models.Order, pendingException models.ExceptionRecord, hasPendingException bool, pendingExceptionCount int, elapsedHours float64, estimatedHours int, costPerKm float64) (string, string, string, int64) {
	if hasPendingException || order.Status == models.OrderException {
		triggerTime := task.MTime
		message := "运输任务关联订单存在异常，请及时处理"
		if hasPendingException {
			triggerTime = pendingException.ReportTime
			message = fmt.Sprintf("存在未处理异常：%s", s.getExceptionTypeName(pendingException.Type))
		}
		return "critical", "exception", message, triggerTime
	}

	if task.Status == "in_progress" && estimatedHours > 0 {
		ratio := elapsedHours / float64(estimatedHours)
		if ratio >= 1.5 {
			return "critical", "delay", fmt.Sprintf("运输任务严重延迟，已超出预计时长 %.1f 小时", s.round2(elapsedHours-float64(estimatedHours))), time.Now().Unix()
		}
		if ratio >= 1.2 {
			return "warning", "delay", fmt.Sprintf("运输任务存在延迟风险，已接近或超过预计时长 %.1f 小时", s.round2(elapsedHours-float64(estimatedHours))), time.Now().Unix()
		}
	}

	if task.Status == "pending" {
		if elapsedHours >= 6 {
			return "critical", "pending", "运输任务长时间未启动，请检查车辆和司机安排", task.CTime
		}
		if elapsedHours >= 2 {
			return "warning", "pending", "运输任务待执行时间较长，请关注调度进度", task.CTime
		}
	}

	if costPerKm >= 40 {
		return "critical", "high_cost", fmt.Sprintf("运输成本异常偏高，当前单公里成本 %.2f", costPerKm), task.MTime
	}
	if costPerKm >= 20 {
		return "warning", "high_cost", fmt.Sprintf("运输成本偏高，当前单公里成本 %.2f", costPerKm), task.MTime
	}

	if pendingExceptionCount > 0 {
		return "warning", "exception", "存在待处理运输异常，请及时跟进", task.MTime
	}

	return "", "", "", 0
}

func (s *TransportService) buildTransportMonitorTaskInfo(ctx transportMonitorContext) dto.TransportMonitorTaskInfo {
	latestScanType := ""
	latestScanTypeName := ""
	latestScanTime := int64(0)
	latestStationID := uint(0)
	latestStationName := ""
	if ctx.HasLatestRecord {
		latestScanType, latestScanTypeName, latestScanTime = s.getTransportRecordMeta(ctx.LatestRecord)
		latestStationID = ctx.LatestRecord.StationID
		latestStationName = ctx.LatestStation.Name
	}
	driverName := ctx.Driver.RealName
	if driverName == "" {
		driverName = ctx.Driver.Username
	}

	return dto.TransportMonitorTaskInfo{
		TaskID:             ctx.Task.ID,
		TaskNo:             ctx.Task.TaskNo,
		OrderID:            ctx.Task.OrderID,
		OrderNo:            ctx.Order.OrderNo,
		VehicleID:          ctx.Task.VehicleID,
		PlateNumber:        ctx.Vehicle.PlateNumber,
		DriverID:           ctx.Task.DriverID,
		DriverName:         driverName,
		Status:             ctx.Task.Status,
		StatusName:         s.getTransportTaskStatusName(ctx.Task.Status),
		OrderStatus:        int(ctx.Order.Status),
		OrderStatusName:    GetOrderStatusName(int(ctx.Order.Status)),
		Progress:           ctx.Progress,
		EstimatedHours:     ctx.EstimatedHours,
		ElapsedHours:       ctx.ElapsedHours,
		DelayHours:         ctx.DelayHours,
		LatestScanType:     latestScanType,
		LatestScanTypeName: latestScanTypeName,
		LatestScanTime:     latestScanTime,
		LatestStationID:    latestStationID,
		LatestStationName:  latestStationName,
		LoadCount:          ctx.LoadCount,
		UnloadCount:        ctx.UnloadCount,
		WarningLevel:       ctx.WarningLevel,
		WarningMessage:     ctx.WarningMessage,
		ExceptionCount:     ctx.PendingExceptionCount,
		Cost:               s.round2(ctx.Task.Cost),
		CostPerKm:          ctx.CostPerKm,
		CreateTime:         utils.FormatTimestamp(ctx.Task.CTime),
		UpdateTime:         utils.FormatTimestamp(ctx.Task.MTime),
	}
}

func (s *TransportService) buildTransportWarningInfo(ctx transportMonitorContext) dto.TransportWarningInfo {
	driverName := ctx.Driver.RealName
	if driverName == "" {
		driverName = ctx.Driver.Username
	}

	warning := dto.TransportWarningInfo{
		TaskID:          ctx.Task.ID,
		TaskNo:          ctx.Task.TaskNo,
		OrderID:         ctx.Task.OrderID,
		OrderNo:         ctx.Order.OrderNo,
		VehicleID:       ctx.Task.VehicleID,
		PlateNumber:     ctx.Vehicle.PlateNumber,
		DriverID:        ctx.Task.DriverID,
		DriverName:      driverName,
		WarningType:     ctx.WarningType,
		WarningTypeName: s.getTransportWarningTypeName(ctx.WarningType),
		WarningLevel:    ctx.WarningLevel,
		WarningMessage:  ctx.WarningMessage,
		TriggerTime:     ctx.WarningTriggerTime,
		TaskStatus:      ctx.Task.Status,
		TaskStatusName:  s.getTransportTaskStatusName(ctx.Task.Status),
		OrderStatus:     int(ctx.Order.Status),
		OrderStatusName: GetOrderStatusName(int(ctx.Order.Status)),
		Cost:            s.round2(ctx.Task.Cost),
		CostPerKm:       ctx.CostPerKm,
	}
	if ctx.HasPendingException {
		warning.ExceptionNo = ctx.PendingException.ExceptionNo
		warning.ExceptionStatus = int(ctx.PendingException.Status)
		warning.ExceptionStatusName = s.getExceptionStatusName(ctx.PendingException.Status)
	}
	return warning
}

func (s *TransportService) buildTransportCostTaskInfo(ctx transportMonitorContext) dto.TransportCostTaskInfo {
	driverName := ctx.Driver.RealName
	if driverName == "" {
		driverName = ctx.Driver.Username
	}

	return dto.TransportCostTaskInfo{
		TaskID:             ctx.Task.ID,
		TaskNo:             ctx.Task.TaskNo,
		OrderID:            ctx.Task.OrderID,
		OrderNo:            ctx.Order.OrderNo,
		VehicleID:          ctx.Task.VehicleID,
		PlateNumber:        ctx.Vehicle.PlateNumber,
		DriverID:           ctx.Task.DriverID,
		DriverName:         driverName,
		Status:             ctx.Task.Status,
		StatusName:         s.getTransportTaskStatusName(ctx.Task.Status),
		Distance:           s.round2(ctx.Task.Distance),
		Cost:               s.round2(ctx.Task.Cost),
		CostPerKm:          ctx.CostPerKm,
		EstimatedHours:     ctx.EstimatedHours,
		ActualHours:        ctx.ElapsedHours,
		LoadCount:          ctx.LoadCount,
		UnloadCount:        ctx.UnloadCount,
		CostLevel:          ctx.CostLevel,
		CompensationAmount: ctx.TotalCompensation,
		CreateTime:         utils.FormatTimestamp(ctx.Task.CTime),
		UpdateTime:         utils.FormatTimestamp(ctx.Task.MTime),
	}
}

func (s *TransportService) buildTransportCostDetailResponse(ctx transportMonitorContext) dto.TransportCostDetailResponse {
	latestScanType := ""
	latestScanTypeName := ""
	latestScanTime := int64(0)
	latestStationName := ""
	if ctx.HasLatestRecord {
		latestScanType, latestScanTypeName, latestScanTime = s.getTransportRecordMeta(ctx.LatestRecord)
		latestStationName = ctx.LatestStation.Name
	}
	driverName := ctx.Driver.RealName
	if driverName == "" {
		driverName = ctx.Driver.Username
	}

	return dto.TransportCostDetailResponse{
		TaskID:             ctx.Task.ID,
		TaskNo:             ctx.Task.TaskNo,
		OrderID:            ctx.Task.OrderID,
		OrderNo:            ctx.Order.OrderNo,
		VehicleID:          ctx.Task.VehicleID,
		PlateNumber:        ctx.Vehicle.PlateNumber,
		DriverID:           ctx.Task.DriverID,
		DriverName:         driverName,
		Status:             ctx.Task.Status,
		StatusName:         s.getTransportTaskStatusName(ctx.Task.Status),
		StartPoint:         ctx.Task.StartPoint,
		EndPoint:           ctx.Task.EndPoint,
		Distance:           s.round2(ctx.Task.Distance),
		Cost:               s.round2(ctx.Task.Cost),
		CostPerKm:          ctx.CostPerKm,
		EstimatedHours:     ctx.EstimatedHours,
		ActualHours:        ctx.ElapsedHours,
		LoadCount:          ctx.LoadCount,
		UnloadCount:        ctx.UnloadCount,
		LatestScanType:     latestScanType,
		LatestScanTypeName: latestScanTypeName,
		LatestScanTime:     latestScanTime,
		LatestStationName:  latestStationName,
		WarningLevel:       ctx.WarningLevel,
		WarningMessage:     ctx.WarningMessage,
		CompensationAmount: ctx.TotalCompensation,
		Remark:             ctx.Task.Remark,
		CreateTime:         utils.FormatTimestamp(ctx.Task.CTime),
		UpdateTime:         utils.FormatTimestamp(ctx.Task.MTime),
	}
}

func (s *TransportService) paginateTransportMonitorItems(items []dto.TransportMonitorTaskInfo, page, pageSize int) *dto.TransportMonitorListResponse {
	total := len(items)
	if total == 0 {
		return &dto.TransportMonitorListResponse{List: []dto.TransportMonitorTaskInfo{}, Total: 0, Page: page, PageSize: pageSize, Pages: 0}
	}
	start := (page - 1) * pageSize
	if start >= total {
		return &dto.TransportMonitorListResponse{List: []dto.TransportMonitorTaskInfo{}, Total: int64(total), Page: page, PageSize: pageSize, Pages: (total + pageSize - 1) / pageSize}
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return &dto.TransportMonitorListResponse{List: items[start:end], Total: int64(total), Page: page, PageSize: pageSize, Pages: pages}
}

func (s *TransportService) paginateTransportWarningItems(items []dto.TransportWarningInfo, page, pageSize int, warningCount, criticalCount int64) *dto.TransportWarningListResponse {
	total := len(items)
	if total == 0 {
		return &dto.TransportWarningListResponse{List: []dto.TransportWarningInfo{}, Total: 0, Page: page, PageSize: pageSize, Pages: 0, WarningCount: warningCount, CriticalCount: criticalCount}
	}
	start := (page - 1) * pageSize
	if start >= total {
		return &dto.TransportWarningListResponse{List: []dto.TransportWarningInfo{}, Total: int64(total), Page: page, PageSize: pageSize, Pages: (total + pageSize - 1) / pageSize, WarningCount: warningCount, CriticalCount: criticalCount}
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return &dto.TransportWarningListResponse{List: items[start:end], Total: int64(total), Page: page, PageSize: pageSize, Pages: pages, WarningCount: warningCount, CriticalCount: criticalCount}
}

func (s *TransportService) paginateTransportCostItems(items []dto.TransportCostTaskInfo, page, pageSize int) *dto.TransportCostListResponse {
	total := len(items)
	if total == 0 {
		return &dto.TransportCostListResponse{List: []dto.TransportCostTaskInfo{}, Total: 0, Page: page, PageSize: pageSize, Pages: 0}
	}
	start := (page - 1) * pageSize
	if start >= total {
		return &dto.TransportCostListResponse{List: []dto.TransportCostTaskInfo{}, Total: int64(total), Page: page, PageSize: pageSize, Pages: (total + pageSize - 1) / pageSize}
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return &dto.TransportCostListResponse{List: items[start:end], Total: int64(total), Page: page, PageSize: pageSize, Pages: pages}
}

func (s *TransportService) getTransportWarningTypeName(warningType string) string {
	switch warningType {
	case "delay":
		return "延迟预警"
	case "high_cost":
		return "高成本预警"
	case "exception":
		return "异常预警"
	case "pending":
		return "待发车预警"
	default:
		return "未知预警"
	}
}

func (s *TransportService) getExceptionTypeName(exceptionType models.ExceptionType) string {
	switch exceptionType {
	case models.ExceptionDamaged:
		return "破损"
	case models.ExceptionLost:
		return "丢失"
	case models.ExceptionDelay:
		return "延误"
	case models.ExceptionRefused:
		return "拒收"
	case models.ExceptionAddressErr:
		return "地址错误"
	case models.ExceptionCustoms:
		return "海关扣留"
	case models.ExceptionOther:
		return "其他"
	default:
		return "未知"
	}
}

func (s *TransportService) getExceptionStatusName(status models.ExceptionStatus) string {
	switch status {
	case models.ExceptionPending:
		return "待处理"
	case models.ExceptionProcessing:
		return "处理中"
	case models.ExceptionResolved:
		return "已解决"
	case models.ExceptionClosed:
		return "已关闭"
	default:
		return "未知"
	}
}

func (s *TransportService) getTransportCostLevel(costPerKm float64) string {
	switch {
	case costPerKm >= 40:
		return "critical"
	case costPerKm >= 20:
		return "high"
	case costPerKm > 0:
		return "normal"
	default:
		return "unaccounted"
	}
}

func (s *TransportService) round2(value float64) float64 {
	return math.Round(value*100) / 100
}

// AssignVehicle 批量分配车辆
func (s *TransportService) AssignVehicle(req *dto.VehicleAssignRequest) (*dto.VehicleAssignResponse, error) {
	db := database.DB

	// 验证车辆是否存在且可用
	var vehicle models.Vehicle
	if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&vehicle).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("车辆不存在或不可用")
		}
		return nil, errors.New("查询车辆失败")
	}

	// 验证司机是否存在
	var driver models.User
	if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("司机不存在或权限不足")
		}
		return nil, errors.New("查询司机失败")
	}

	response := &dto.VehicleAssignResponse{
		Tasks:  make([]dto.TransportTaskResponse, 0),
		Errors: make([]string, 0),
	}

	// 批量处理订单
	for _, orderID := range req.OrderIDs {
		// 验证订单是否存在
		var order models.Order
		if err := db.First(&order, orderID).Error; err != nil {
			response.FailCount++
			response.Errors = append(response.Errors, fmt.Sprintf("订单%d不存在", orderID))
			continue
		}

		// 检查订单是否已有运输任务
		var existingTask models.TransportTask
		if err := db.Where("order_id = ? AND status NOT IN ('cancelled')", orderID).First(&existingTask).Error; err == nil {
			response.FailCount++
			response.Errors = append(response.Errors, fmt.Sprintf("订单%d已有运输任务", orderID))
			continue
		}

		// 创建运输任务
		task := &models.TransportTask{
			TaskNo:     s.generateTaskNo(),
			OrderID:    orderID,
			VehicleID:  req.VehicleID,
			DriverID:   req.DriverID,
			StartPoint: order.SenderAddress,
			EndPoint:   order.ReceiverAddress,
			Status:     "pending",
		}

		if err := db.Create(task).Error; err != nil {
			response.FailCount++
			response.Errors = append(response.Errors, fmt.Sprintf("创建订单%d的运输任务失败", orderID))
			continue
		}

		// 成功创建
		response.SuccessCount++
		response.Tasks = append(response.Tasks, dto.TransportTaskResponse{
			ID:          task.ID,
			TaskNo:      task.TaskNo,
			OrderID:     task.OrderID,
			OrderNo:     order.OrderNo,
			VehicleID:   task.VehicleID,
			PlateNumber: vehicle.PlateNumber,
			DriverID:    task.DriverID,
			DriverName:  driver.RealName,
			StartPoint:  task.StartPoint,
			EndPoint:    task.EndPoint,
			Distance:    task.Distance,
			Status:      task.Status,
			StatusName:  s.getTransportTaskStatusName(task.Status),
			StartTime:   task.StartTime,
			EndTime:     task.EndTime,
			Cost:        task.Cost,
			Remark:      task.Remark,
			CreateTime:  utils.FormatTimestamp(task.CTime),
			UpdateTime:  utils.FormatTimestamp(task.MTime),
		})
	}

	return response, nil
}

// GetTransportStats 获取运输统计
func (s *TransportService) GetTransportStats() (*dto.TransportStatsResponse, error) {
	db := database.DB

	stats := &dto.TransportStatsResponse{}

	// 车辆统计
	var vehicleStats dto.VehicleStatsData
	var totalVehicles, availableVehicles, maintenanceVehicles int64
	db.Model(&models.Vehicle{}).Count(&totalVehicles)
	db.Model(&models.Vehicle{}).Where("status = 1").Count(&availableVehicles)
	db.Model(&models.Vehicle{}).Where("status = 0").Count(&maintenanceVehicles)
	vehicleStats.TotalVehicles = int(totalVehicles)
	vehicleStats.AvailableVehicles = int(availableVehicles)
	vehicleStats.MaintenanceVehicles = int(maintenanceVehicles)

	var totalCapacity, avgCapacity float64
	db.Model(&models.Vehicle{}).Select("COALESCE(SUM(capacity), 0)").Scan(&totalCapacity)
	db.Model(&models.Vehicle{}).Select("COALESCE(AVG(capacity), 0)").Scan(&avgCapacity)
	vehicleStats.TotalCapacity = totalCapacity
	vehicleStats.AvgCapacity = avgCapacity
	stats.VehicleStats = vehicleStats

	// 任务统计
	var taskStats dto.TaskStatsData
	var totalTasks, pendingTasks, inProgressTasks, completedTasks, cancelledTasks int64
	db.Model(&models.TransportTask{}).Count(&totalTasks)
	db.Model(&models.TransportTask{}).Where("status = 'pending'").Count(&pendingTasks)
	db.Model(&models.TransportTask{}).Where("status = 'in_progress'").Count(&inProgressTasks)
	db.Model(&models.TransportTask{}).Where("status = 'completed'").Count(&completedTasks)
	db.Model(&models.TransportTask{}).Where("status = 'cancelled'").Count(&cancelledTasks)
	taskStats.TotalTasks = int(totalTasks)
	taskStats.PendingTasks = int(pendingTasks)
	taskStats.InProgressTasks = int(inProgressTasks)
	taskStats.CompletedTasks = int(completedTasks)
	taskStats.CancelledTasks = int(cancelledTasks)

	var totalDistance, totalCost float64
	db.Model(&models.TransportTask{}).Select("COALESCE(SUM(distance), 0)").Scan(&totalDistance)
	db.Model(&models.TransportTask{}).Select("COALESCE(SUM(cost), 0)").Scan(&totalCost)
	taskStats.TotalDistance = totalDistance
	taskStats.TotalCost = totalCost
	stats.TaskStats = taskStats

	// 司机统计
	var driverStats []dto.DriverStatsData
	rows, err := db.Raw(`
		SELECT 
			t.driver_id,
			u.real_name as driver_name,
			COUNT(*) as task_count,
			COALESCE(SUM(t.distance), 0) as distance,
			COALESCE(SUM(t.cost), 0) as cost
		FROM transport_tasks t
		LEFT JOIN users u ON t.driver_id = u.id
		GROUP BY t.driver_id, u.real_name
		ORDER BY task_count DESC
		LIMIT 10
	`).Rows()
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stat dto.DriverStatsData
			rows.Scan(&stat.DriverID, &stat.DriverName, &stat.TaskCount, &stat.Distance, &stat.Cost)
			if stat.DriverName == "" {
				stat.DriverName = "未知司机"
			}
			driverStats = append(driverStats, stat)
		}
	}
	stats.DriverStats = driverStats

	// 状态统计
	var statusStats []dto.TaskStatusStatsData
	statusRows, err := db.Raw(`
		SELECT 
			status,
			COUNT(*) as count
		FROM transport_tasks
		GROUP BY status
		ORDER BY count DESC
	`).Rows()
	if err == nil {
		defer statusRows.Close()
		total := float64(taskStats.TotalTasks)
		for statusRows.Next() {
			var stat dto.TaskStatusStatsData
			statusRows.Scan(&stat.Status, &stat.Count)
			stat.StatusName = s.getTransportTaskStatusName(stat.Status)
			if total > 0 {
				percentage := float64(stat.Count) / total * 100
				stat.Percentage = fmt.Sprintf("%.1f%%", percentage)
			} else {
				stat.Percentage = "0.0%"
			}
			statusStats = append(statusStats, stat)
		}
	}
	stats.StatusStats = statusStats

	return stats, nil
}

// getTransportTaskStatusName 获取运输任务状态名称
func (s *TransportService) getTransportTaskStatusName(status string) string {
	switch status {
	case "pending":
		return "待执行"
	case "in_progress":
		return "执行中"
	case "completed":
		return "已完成"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}

// isValidStatusTransition 验证状态转换是否有效
func (s *TransportService) isValidStatusTransition(from, to string) bool {
	validTransitions := map[string][]string{
		"pending":     {"in_progress", "cancelled"},
		"in_progress": {"completed", "cancelled"},
		"completed":   {}, // 已完成不能转换到其他状态
		"cancelled":   {}, // 已取消不能转换到其他状态
	}

	allowedStates, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, state := range allowedStates {
		if state == to {
			return true
		}
	}
	return false
}
