package services

import (
	"errors"
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"sort"
	"time"

	"gorm.io/gorm"
)

type StationService struct{}

// CreateStation 创建站点
func (s *StationService) CreateStation(req *dto.CreateStationRequest) (*models.Station, error) {
	// 检查站点编码是否已存在
	var existingStation models.Station
	if err := database.DB.Where("station_code = ?", req.StationCode).First(&existingStation).Error; err == nil {
		return nil, errors.New("站点编码已存在")
	}

	// 如果指定了管理员，验证管理员是否存在且角色正确
	if req.ManagerID > 0 {
		var manager models.User
		if err := database.DB.Where("id = ? AND role = ?", req.ManagerID, 5).First(&manager).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("指定的管理员不存在或角色不正确")
			}
			return nil, err
		}
	}

	// 创建站点
	station := &models.Station{
		StationCode:  req.StationCode,
		Name:         req.Name,
		Type:         models.StationType(req.Type),
		Country:      req.Country,
		Province:     req.Province,
		City:         req.City,
		Address:      req.Address,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		ManagerID:    req.ManagerID,
		Capacity:     req.Capacity,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
		WorkingHours: req.WorkingHours,
		Status:       1, // 默认启用
		Remark:       req.Remark,
	}

	if err := database.DB.Create(station).Error; err != nil {
		return nil, errors.New("创建站点失败")
	}

	return station, nil
}

// GetStationByID 根据ID获取站点
func (s *StationService) GetStationByID(id uint) (*models.Station, error) {
	var station models.Station
	if err := database.DB.Where("id = ?", id).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("站点不存在")
		}
		return nil, err
	}
	return &station, nil
}

// GetStationList 获取站点列表
func (s *StationService) GetStationList(req *dto.StationListRequest) ([]models.Station, int64, error) {
	var stations []models.Station
	var total int64

	// 设置默认分页参数
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 {
		pageSize = 10
	}

	// 构建查询
	query := database.DB.Model(&models.Station{})

	// 筛选条件
	if req.Type > 0 {
		query = query.Where("type = ?", req.Type)
	}
	if req.Country != "" {
		query = query.Where("country = ?", req.Country)
	}
	if req.City != "" {
		query = query.Where("city = ?", req.City)
	}
	// 只有明确传递status=1时才筛选启用的站点
	// status=0时不筛选（默认显示所有）
	if req.Status == 1 {
		query = query.Where("status = 1")
	}
	if req.Keyword != "" {
		keyword := "%" + req.Keyword + "%"
		query = query.Where("station_code LIKE ? OR name LIKE ? OR address LIKE ?", keyword, keyword, keyword)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(pageSize).Find(&stations).Error; err != nil {
		return nil, 0, err
	}

	return stations, total, nil
}

// UpdateStation 更新站点
func (s *StationService) UpdateStation(id uint, req *dto.UpdateStationRequest) error {
	// 检查站点是否存在
	station, err := s.GetStationByID(id)
	if err != nil {
		return err
	}

	// 如果指定了管理员，验证管理员是否存在且角色正确
	if req.ManagerID > 0 {
		var manager models.User
		if err := database.DB.Where("id = ? AND role = ?", req.ManagerID, 5).First(&manager).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("指定的管理员不存在或角色不正确")
			}
			return err
		}
	}

	// 构建更新数据
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Type > 0 {
		updates["type"] = req.Type
	}
	if req.Country != "" {
		updates["country"] = req.Country
	}
	if req.Province != "" {
		updates["province"] = req.Province
	}
	if req.City != "" {
		updates["city"] = req.City
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.Latitude != 0 {
		updates["latitude"] = req.Latitude
	}
	if req.Longitude != 0 {
		updates["longitude"] = req.Longitude
	}
	if req.ManagerID > 0 {
		updates["manager_id"] = req.ManagerID
	}
	if req.Capacity > 0 {
		updates["capacity"] = req.Capacity
	}
	if req.ContactName != "" {
		updates["contact_name"] = req.ContactName
	}
	if req.ContactPhone != "" {
		updates["contact_phone"] = req.ContactPhone
	}
	if req.WorkingHours != "" {
		updates["working_hours"] = req.WorkingHours
	}
	// 只有当Status指针不为nil时才更新status字段
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	// 执行更新
	if err := database.DB.Model(station).Updates(updates).Error; err != nil {
		return errors.New("更新站点失败")
	}

	return nil
}

// DeleteStation 删除站点
func (s *StationService) DeleteStation(id uint) error {
	// 检查站点是否存在
	station, err := s.GetStationByID(id)
	if err != nil {
		return err
	}

	// 检查是否有订单关联此站点
	var orderCount int64
	if err := database.DB.Model(&models.Order{}).
		Where("origin_station_id = ? OR dest_station_id = ? OR current_station = ?", id, id, id).
		Count(&orderCount).Error; err != nil {
		return err
	}

	if orderCount > 0 {
		return errors.New("该站点有关联订单，无法删除")
	}

	// 删除站点
	if err := database.DB.Delete(station).Error; err != nil {
		return errors.New("删除站点失败")
	}

	return nil
}

// GetStationFlows 查询站点流转记录
func (s *StationService) GetStationFlows(req dto.StationFlowQueryRequest) (*dto.StationFlowListResponse, error) {
	db := database.DB

	// 构建查询条件
	query := db.Model(&models.StationFlow{})

	if req.OrderID > 0 {
		query = query.Where("order_id = ?", req.OrderID)
	}

	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	if req.FlowType != "" {
		query = query.Where("flow_type = ?", req.FlowType)
	}

	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}

	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}

	// 查询总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询流转记录总数失败")
	}

	// 计算分页
	offset := (req.Page - 1) * req.PageSize
	pages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 查询流转记录列表
	var flows []models.StationFlow
	if err := query.Order("c_time DESC").
		Limit(req.PageSize).
		Offset(offset).
		Find(&flows).Error; err != nil {
		return nil, errors.New("查询流转记录失败")
	}

	// 如果没有记录，直接返回空列表
	if len(flows) == 0 {
		return &dto.StationFlowListResponse{
			List:     []dto.StationFlowResponse{},
			Total:    total,
			Page:     req.Page,
			PageSize: req.PageSize,
			Pages:    pages,
		}, nil
	}

	// 批量查询关联数据
	orderIDs := make([]uint, 0)
	stationIDs := make([]uint, 0)
	operatorIDs := make([]uint, 0)
	nextStationIDs := make([]uint, 0)

	for _, flow := range flows {
		orderIDs = append(orderIDs, flow.OrderID)
		stationIDs = append(stationIDs, flow.StationID)
		operatorIDs = append(operatorIDs, flow.OperatorID)
		if flow.NextStationID > 0 {
			nextStationIDs = append(nextStationIDs, flow.NextStationID)
		}
	}

	// 查询订单信息
	var orders []models.Order
	orderMap := make(map[uint]models.Order)
	if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
		for _, order := range orders {
			orderMap[order.ID] = order
		}
	}

	// 查询站点信息
	var stations []models.Station
	stationMap := make(map[uint]models.Station)
	if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
		for _, station := range stations {
			stationMap[station.ID] = station
		}
	}

	// 查询下一站点信息
	if len(nextStationIDs) > 0 {
		var nextStations []models.Station
		if err := db.Where("id IN ?", nextStationIDs).Find(&nextStations).Error; err == nil {
			for _, station := range nextStations {
				stationMap[station.ID] = station
			}
		}
	}

	// 查询操作人信息
	var operators []models.User
	operatorMap := make(map[uint]models.User)
	if err := db.Where("id IN ?", operatorIDs).Find(&operators).Error; err == nil {
		for _, operator := range operators {
			operatorMap[operator.ID] = operator
		}
	}

	// 组装响应数据
	list := make([]dto.StationFlowResponse, 0, len(flows))
	for _, flow := range flows {
		flowResp := dto.StationFlowResponse{
			ID:            flow.ID,
			OrderID:       flow.OrderID,
			StationID:     flow.StationID,
			FlowType:      flow.FlowType,
			Quantity:      flow.Quantity,
			Weight:        flow.Weight,
			Volume:        flow.Volume,
			OperatorID:    flow.OperatorID,
			NextStationID: flow.NextStationID,
			Remark:        flow.Remark,
			FlowTime:      flow.CTime,
		}

		// 设置流转类型名称
		if flow.FlowType == "in" {
			flowResp.FlowTypeName = "入库"
		} else if flow.FlowType == "out" {
			flowResp.FlowTypeName = "出库"
		}

		// 设置订单号
		if order, ok := orderMap[flow.OrderID]; ok {
			flowResp.OrderNo = order.OrderNo
		}

		// 设置站点名称
		if station, ok := stationMap[flow.StationID]; ok {
			flowResp.StationName = station.Name
		}

		// 设置操作人名称
		if operator, ok := operatorMap[flow.OperatorID]; ok {
			flowResp.OperatorName = operator.Username
		}

		// 设置下一站点名称
		if flow.NextStationID > 0 {
			if nextStation, ok := stationMap[flow.NextStationID]; ok {
				flowResp.NextStation = nextStation.Name
			}
		}

		list = append(list, flowResp)
	}

	return &dto.StationFlowListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// GetStationInventory 查询站点库存（当前在站点的订单统计）
func (s *StationService) GetStationInventory(stationID uint) (*dto.StationInventoryResponse, error) {
	db := database.DB

	var stations []models.Station
	query := db.Model(&models.Station{}).Where("status = 1") // 只查询启用的站点

	if stationID > 0 {
		// 查询指定站点
		query = query.Where("id = ?", stationID)
	}

	if err := query.Find(&stations).Error; err != nil {
		return nil, errors.New("查询站点信息失败")
	}

	if len(stations) == 0 {
		return &dto.StationInventoryResponse{
			List: []dto.StationInventoryItem{},
		}, nil
	}

	// 构建库存统计
	list := make([]dto.StationInventoryItem, 0, len(stations))

	for _, station := range stations {
		item := dto.StationInventoryItem{
			StationID:   station.ID,
			StationName: station.Name,
			StationCode: station.StationCode,
		}

		// 统计当前站点的订单数（current_station = station.id）
		var totalOrders int64
		db.Model(&models.Order{}).Where("current_station = ?", station.ID).Count(&totalOrders)
		item.TotalOrders = totalOrders

		// 按状态统计
		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderInWarehouse)).
			Count(&item.InWarehouse)

		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderSorting)).
			Count(&item.Sorting)

		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderInTransit)).
			Count(&item.InTransit)

		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderCustomsClearing)).
			Count(&item.CustomsClearing)

		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderDestinationSorting)).
			Count(&item.DestSorting)

		db.Model(&models.Order{}).
			Where("current_station = ? AND status = ?", station.ID, int(models.OrderDelivering)).
			Count(&item.Delivering)

		// 计算容量使用率
		if station.Capacity > 0 {
			usagePercent := float64(totalOrders) / float64(station.Capacity) * 100
			item.CapacityUsage = fmt.Sprintf("%.1f%%", usagePercent)

			// 设置预警级别
			if usagePercent >= 90 {
				item.WarningLevel = "critical" // 严重预警
			} else if usagePercent >= 70 {
				item.WarningLevel = "warning" // 警告
			} else {
				item.WarningLevel = "normal" // 正常
			}
		} else {
			item.CapacityUsage = "N/A"
			item.WarningLevel = "normal"
		}

		list = append(list, item)
	}

	return &dto.StationInventoryResponse{
		List: list,
	}, nil
}

// CreateInventoryCheck 创建库存盘点
func (s *StationService) CreateInventoryCheck(req *dto.CreateInventoryCheckRequest, operatorID uint) (*models.InventoryCheck, error) {
	db := database.DB

	// 验证站点是否存在
	var station models.Station
	if err := db.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("站点不存在或已禁用")
		}
		return nil, err
	}

	// 生成盘点单号：CHK + 时间戳 + 随机数
	checkNo := fmt.Sprintf("CHK%d%04d", time.Now().Unix(), time.Now().Nanosecond()%10000)

	// 查询系统中该站点的订单数量
	var systemCount int64
	db.Model(&models.Order{}).Where("current_station = ?", req.StationID).Count(&systemCount)

	// 创建盘点记录
	check := &models.InventoryCheck{
		CheckNo:     checkNo,
		StationID:   req.StationID,
		CheckType:   req.CheckType,
		SystemCount: int(systemCount),
		ActualCount: 0,
		Status:      1, // 盘点中
		OperatorID:  operatorID,
		CheckTime:   time.Now().Unix(),
		Remark:      req.Remark,
	}

	// 开启事务
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 保存盘点记录
	if err := tx.Create(check).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建盘点记录失败")
	}

	// 查询该站点的所有订单，创建盘点明细
	var orders []models.Order
	if err := tx.Where("current_station = ?", req.StationID).Find(&orders).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("查询订单失败")
	}

	// 批量创建盘点明细
	for _, order := range orders {
		detail := models.InventoryCheckDetail{
			CheckID: check.ID,
			OrderID: order.ID,
			OrderNo: order.OrderNo,
			Status:  int(order.Status),
			IsFound: 1, // 默认找到
		}
		if err := tx.Create(&detail).Error; err != nil {
			tx.Rollback()
			return nil, errors.New("创建盘点明细失败")
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交事务失败")
	}

	return check, nil
}

// GetInventoryCheckByID 根据ID获取盘点记录
func (s *StationService) GetInventoryCheckByID(id uint) (*dto.InventoryCheckResponse, error) {
	db := database.DB

	var check models.InventoryCheck
	if err := db.Where("id = ?", id).First(&check).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("盘点记录不存在")
		}
		return nil, err
	}

	// 查询站点信息
	var station models.Station
	db.Where("id = ?", check.StationID).First(&station)

	// 查询操作人信息
	var operator models.User
	db.Where("id = ?", check.OperatorID).First(&operator)

	// 查询盘点明细
	var details []models.InventoryCheckDetail
	db.Where("check_id = ?", check.ID).Find(&details)

	// 构建响应
	response := &dto.InventoryCheckResponse{
		ID:              check.ID,
		CheckNo:         check.CheckNo,
		StationID:       check.StationID,
		StationName:     station.Name,
		CheckType:       check.CheckType,
		CheckTypeName:   getCheckTypeName(check.CheckType),
		SystemCount:     check.SystemCount,
		ActualCount:     check.ActualCount,
		DifferenceCount: check.DifferenceCount,
		Status:          check.Status,
		StatusName:      getCheckStatusName(check.Status),
		OperatorID:      check.OperatorID,
		OperatorName:    operator.Username,
		CheckTime:       check.CheckTime,
		CompleteTime:    check.CompleteTime,
		Remark:          check.Remark,
		Details:         make([]dto.InventoryCheckDetailResponse, 0),
	}

	// 构建明细响应
	for _, detail := range details {
		detailResp := dto.InventoryCheckDetailResponse{
			ID:          detail.ID,
			OrderID:     detail.OrderID,
			OrderNo:     detail.OrderNo,
			Status:      detail.Status,
			StatusName:  GetOrderStatusName(detail.Status),
			IsFound:     detail.IsFound,
			IsFoundName: getIsFoundName(detail.IsFound),
			Remark:      detail.Remark,
		}
		response.Details = append(response.Details, detailResp)
	}

	return response, nil
}

// CompleteInventoryCheck 完成库存盘点
func (s *StationService) CompleteInventoryCheck(id uint, req *dto.CompleteInventoryCheckRequest) error {
	db := database.DB

	// 查询盘点记录
	var check models.InventoryCheck
	if err := db.Where("id = ?", id).First(&check).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("盘点记录不存在")
		}
		return err
	}

	// 检查状态
	if check.Status == 2 {
		return errors.New("盘点已完成，无法重复操作")
	}

	// 计算差异
	differenceCount := req.ActualCount - check.SystemCount

	// 更新盘点记录
	updates := map[string]interface{}{
		"actual_count":     req.ActualCount,
		"difference_count": differenceCount,
		"status":           2, // 已完成
		"complete_time":    time.Now().Unix(),
	}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if err := db.Model(&check).Updates(updates).Error; err != nil {
		return errors.New("更新盘点记录失败")
	}

	return nil
}

// GetInventoryCheckList 获取盘点记录列表
func (s *StationService) GetInventoryCheckList(req *dto.InventoryCheckListRequest) (*dto.InventoryCheckListResponse, error) {
	db := database.DB

	// 构建查询
	query := db.Model(&models.InventoryCheck{})

	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	if req.CheckType != "" {
		query = query.Where("check_type = ?", req.CheckType)
	}

	if req.Status > 0 {
		query = query.Where("status = ?", req.Status)
	}

	if req.StartTime > 0 {
		query = query.Where("check_time >= ?", req.StartTime)
	}

	if req.EndTime > 0 {
		query = query.Where("check_time <= ?", req.EndTime)
	}

	// 查询总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询盘点记录总数失败")
	}

	// 计算分页
	offset := (req.Page - 1) * req.PageSize
	pages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 查询列表
	var checks []models.InventoryCheck
	if err := query.Order("check_time DESC").
		Limit(req.PageSize).
		Offset(offset).
		Find(&checks).Error; err != nil {
		return nil, errors.New("查询盘点记录失败")
	}

	// 如果没有记录，直接返回
	if len(checks) == 0 {
		return &dto.InventoryCheckListResponse{
			List:     []dto.InventoryCheckResponse{},
			Total:    total,
			Page:     req.Page,
			PageSize: req.PageSize,
			Pages:    pages,
		}, nil
	}

	// 批量查询关联数据
	stationIDs := make([]uint, 0)
	operatorIDs := make([]uint, 0)
	for _, check := range checks {
		stationIDs = append(stationIDs, check.StationID)
		operatorIDs = append(operatorIDs, check.OperatorID)
	}

	// 查询站点信息
	var stations []models.Station
	stationMap := make(map[uint]models.Station)
	if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
		for _, station := range stations {
			stationMap[station.ID] = station
		}
	}

	// 查询操作人信息
	var operators []models.User
	operatorMap := make(map[uint]models.User)
	if err := db.Where("id IN ?", operatorIDs).Find(&operators).Error; err == nil {
		for _, operator := range operators {
			operatorMap[operator.ID] = operator
		}
	}

	// 构建响应列表
	list := make([]dto.InventoryCheckResponse, 0, len(checks))
	for _, check := range checks {
		checkResp := dto.InventoryCheckResponse{
			ID:              check.ID,
			CheckNo:         check.CheckNo,
			StationID:       check.StationID,
			CheckType:       check.CheckType,
			CheckTypeName:   getCheckTypeName(check.CheckType),
			SystemCount:     check.SystemCount,
			ActualCount:     check.ActualCount,
			DifferenceCount: check.DifferenceCount,
			Status:          check.Status,
			StatusName:      getCheckStatusName(check.Status),
			OperatorID:      check.OperatorID,
			CheckTime:       check.CheckTime,
			CompleteTime:    check.CompleteTime,
			Remark:          check.Remark,
		}

		// 设置站点名称
		if station, ok := stationMap[check.StationID]; ok {
			checkResp.StationName = station.Name
		}

		// 设置操作人名称
		if operator, ok := operatorMap[check.OperatorID]; ok {
			checkResp.OperatorName = operator.Username
		}

		list = append(list, checkResp)
	}

	return &dto.InventoryCheckListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// GetInventoryWarnings 获取库存预警信息
func (s *StationService) GetInventoryWarnings(req *dto.InventoryWarningQueryRequest) (*dto.InventoryWarningResponse, error) {
	db := database.DB

	// 查询启用的站点
	var stations []models.Station
	query := db.Model(&models.Station{}).Where("status = 1")

	if req.StationID > 0 {
		query = query.Where("id = ?", req.StationID)
	}

	if err := query.Find(&stations).Error; err != nil {
		return nil, errors.New("查询站点信息失败")
	}

	response := &dto.InventoryWarningResponse{
		Warnings: make([]dto.InventoryWarningItem, 0),
	}

	// 统计各级别站点数量
	var totalStations, normalStations, warningStations, criticalStations int

	for _, station := range stations {
		totalStations++

		// 查询当前站点的订单数量
		var currentCount int64
		db.Model(&models.Order{}).Where("current_station = ?", station.ID).Count(&currentCount)

		// 计算使用率
		var usageRate float64
		if station.Capacity > 0 {
			usageRate = float64(currentCount) / float64(station.Capacity)
		}

		// 确定预警级别和消息
		warningLevel, warningMessage, recommendAction := s.determineWarningLevel(usageRate, int(currentCount), station.Capacity)

		// 统计各级别数量
		switch warningLevel {
		case "normal":
			normalStations++
		case "warning":
			warningStations++
		case "critical":
			criticalStations++
		}

		// 根据查询条件过滤
		shouldInclude := false
		switch req.WarningLevel {
		case 0: // 查询所有
			shouldInclude = true
		case 1: // 只查询警告级别
			shouldInclude = (warningLevel == "warning")
		case 2: // 只查询严重级别
			shouldInclude = (warningLevel == "critical")
		default:
			shouldInclude = (warningLevel != "normal") // 查询有预警的
		}

		if shouldInclude {
			item := dto.InventoryWarningItem{
				StationID:       station.ID,
				StationName:     station.Name,
				StationCode:     station.StationCode,
				CurrentCount:    currentCount,
				Capacity:        station.Capacity,
				UsageRate:       usageRate,
				UsagePercent:    fmt.Sprintf("%.1f%%", usageRate*100),
				WarningLevel:    warningLevel,
				WarningMessage:  warningMessage,
				LastCheckTime:   time.Now().Unix(),
				RecommendAction: recommendAction,
			}
			response.Warnings = append(response.Warnings, item)
		}
	}

	// 设置汇总信息
	response.Summary.TotalStations = totalStations
	response.Summary.NormalStations = normalStations
	response.Summary.WarningStations = warningStations
	response.Summary.CriticalStations = criticalStations

	return response, nil
}

// determineWarningLevel 确定预警级别
func (s *StationService) determineWarningLevel(usageRate float64, currentCount, capacity int) (level, message, action string) {
	// 默认阈值
	warningThreshold := 0.7  // 70%
	criticalThreshold := 0.9 // 90%

	if usageRate >= criticalThreshold {
		return "critical",
			fmt.Sprintf("库存严重超载！当前使用率%.1f%%，已达到严重预警线", usageRate*100),
			"立即清理库存，转移部分货物到其他站点"
	} else if usageRate >= warningThreshold {
		return "warning",
			fmt.Sprintf("库存使用率较高，当前%.1f%%，建议关注", usageRate*100),
			"准备清理库存，加快货物流转速度"
	} else {
		return "normal",
			fmt.Sprintf("库存正常，当前使用率%.1f%%", usageRate*100),
			"继续保持正常运营"
	}
}

// GetInventoryWarningsByLevel 按预警级别获取站点列表
func (s *StationService) GetInventoryWarningsByLevel(level string) ([]dto.InventoryWarningItem, error) {
	req := &dto.InventoryWarningQueryRequest{
		StationID: 0, // 查询所有站点
	}

	switch level {
	case "warning":
		req.WarningLevel = 1
	case "critical":
		req.WarningLevel = 2
	default:
		req.WarningLevel = 0 // 所有级别
	}

	response, err := s.GetInventoryWarnings(req)
	if err != nil {
		return nil, err
	}

	return response.Warnings, nil
}

// 辅助函数
func getCheckTypeName(checkType string) string {
	if checkType == "full" {
		return "全盘"
	} else if checkType == "spot" {
		return "抽盘"
	}
	return "未知"
}

func getCheckStatusName(status int) string {
	if status == 1 {
		return "盘点中"
	} else if status == 2 {
		return "已完成"
	}
	return "未知"
}

func getIsFoundName(isFound int) string {
	if isFound == 1 {
		return "找到"
	}
	return "未找到"
}

// GetInventoryStats 获取库存统计报表
func (s *StationService) GetInventoryStats(req *dto.InventoryStatsRequest) (*dto.InventoryStatsResponse, error) {
	db := database.DB

	// 查询启用的站点
	var stations []models.Station
	query := db.Model(&models.Station{}).Where("status = 1")
	if req.StationID > 0 {
		query = query.Where("id = ?", req.StationID)
	}

	if err := query.Find(&stations).Error; err != nil {
		return nil, errors.New("查询站点信息失败")
	}

	response := &dto.InventoryStatsResponse{
		Trends:     make([]dto.InventoryTrendItem, 0),
		StationTop: make([]dto.InventoryStationStats, 0),
	}

	// 生成日期范围
	dates, err := s.generateDateRange(req.StartDate, req.EndDate, req.DateType)
	if err != nil {
		return nil, err
	}

	// 计算趋势数据
	for _, date := range dates {
		trendItem := s.calculateTrendForDate(stations, date)
		response.Trends = append(response.Trends, trendItem)
	}

	// 计算站点统计
	var totalOrders int64
	var totalUsage float64
	var maxUsage, minUsage float64 = 0, 1
	var warningCount, criticalCount int

	for _, station := range stations {
		stationStats := s.calculateStationStats(station)
		response.StationTop = append(response.StationTop, stationStats)

		totalOrders += stationStats.TotalOrders
		totalUsage += stationStats.UsageRate

		if stationStats.UsageRate > maxUsage {
			maxUsage = stationStats.UsageRate
		}
		if stationStats.UsageRate < minUsage {
			minUsage = stationStats.UsageRate
		}

		switch stationStats.WarningLevel {
		case "warning":
			warningCount++
		case "critical":
			criticalCount++
		}
	}

	// 按使用率排序
	sort.Slice(response.StationTop, func(i, j int) bool {
		return response.StationTop[i].UsageRate > response.StationTop[j].UsageRate
	})

	// 计算汇总数据
	stationCount := len(stations)
	response.Summary = dto.InventoryStatsSummary{
		TotalStations:    stationCount,
		TotalOrders:      totalOrders,
		AvgUsageRate:     totalUsage / float64(stationCount),
		MaxUsageRate:     maxUsage,
		MinUsageRate:     minUsage,
		WarningStations:  warningCount,
		CriticalStations: criticalCount,
	}

	return response, nil
}

// GetInventoryDistribution 获取库存分布统计
func (s *StationService) GetInventoryDistribution() (*dto.InventoryDistributionResponse, error) {
	db := database.DB

	response := &dto.InventoryDistributionResponse{
		StatusDistribution:   make([]dto.StatusDistributionItem, 0),
		StationDistribution:  make([]dto.StationDistributionItem, 0),
		CapacityDistribution: make([]dto.CapacityDistributionItem, 0),
	}

	// 1. 状态分布统计
	var statusStats []struct {
		Status int   `json:"status"`
		Count  int64 `json:"count"`
	}

	if err := db.Model(&models.Order{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Find(&statusStats).Error; err != nil {
		return nil, errors.New("查询状态分布失败")
	}

	var totalOrderCount int64
	for _, stat := range statusStats {
		totalOrderCount += stat.Count
	}

	for _, stat := range statusStats {
		statusName := GetOrderStatusName(stat.Status)
		percentage := float64(stat.Count) / float64(totalOrderCount) * 100

		response.StatusDistribution = append(response.StatusDistribution, dto.StatusDistributionItem{
			Status:     stat.Status,
			StatusName: statusName,
			Count:      stat.Count,
			Percentage: fmt.Sprintf("%.1f%%", percentage),
		})
	}

	// 2. 站点分布统计
	var stationStats []struct {
		StationID   uint   `json:"station_id"`
		StationName string `json:"station_name"`
		Count       int64  `json:"count"`
	}

	if err := db.Table("orders o").
		Select("o.current_station as station_id, s.name as station_name, COUNT(*) as count").
		Joins("LEFT JOIN stations s ON o.current_station = s.id").
		Where("o.current_station > 0").
		Group("o.current_station, s.name").
		Find(&stationStats).Error; err != nil {
		return nil, errors.New("查询站点分布失败")
	}

	for _, stat := range stationStats {
		percentage := float64(stat.Count) / float64(totalOrderCount) * 100
		response.StationDistribution = append(response.StationDistribution, dto.StationDistributionItem{
			StationID:   stat.StationID,
			StationName: stat.StationName,
			Count:       stat.Count,
			Percentage:  fmt.Sprintf("%.1f%%", percentage),
		})
	}

	// 3. 容量分布统计
	var stations []models.Station
	if err := db.Where("status = 1").Find(&stations).Error; err != nil {
		return nil, errors.New("查询站点信息失败")
	}

	capacityRanges := map[string]int{
		"0-30%":   0,
		"30-50%":  0,
		"50-70%":  0,
		"70-90%":  0,
		"90-100%": 0,
		">100%":   0,
	}

	for _, station := range stations {
		var currentCount int64
		db.Model(&models.Order{}).Where("current_station = ?", station.ID).Count(&currentCount)

		var usageRate float64
		if station.Capacity > 0 {
			usageRate = float64(currentCount) / float64(station.Capacity)
		}

		switch {
		case usageRate < 0.3:
			capacityRanges["0-30%"]++
		case usageRate < 0.5:
			capacityRanges["30-50%"]++
		case usageRate < 0.7:
			capacityRanges["50-70%"]++
		case usageRate < 0.9:
			capacityRanges["70-90%"]++
		case usageRate <= 1.0:
			capacityRanges["90-100%"]++
		default:
			capacityRanges[">100%"]++
		}
	}

	totalStations := len(stations)
	for rangeKey, count := range capacityRanges {
		percentage := float64(count) / float64(totalStations) * 100
		response.CapacityDistribution = append(response.CapacityDistribution, dto.CapacityDistributionItem{
			Range:      rangeKey,
			Count:      count,
			Percentage: fmt.Sprintf("%.1f%%", percentage),
		})
	}

	return response, nil
}

// generateDateRange 生成日期范围
func (s *StationService) generateDateRange(startDate, endDate, dateType string) ([]string, error) {
	if startDate == "" || endDate == "" {
		// 默认最近7天
		now := time.Now()
		endDate = now.Format("2006-01-02")
		startDate = now.AddDate(0, 0, -6).Format("2006-01-02")
		dateType = "day"
	}

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, errors.New("开始日期格式错误")
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, errors.New("结束日期格式错误")
	}

	var dates []string
	current := start

	for current.Before(end) || current.Equal(end) {
		dates = append(dates, current.Format("2006-01-02"))

		switch dateType {
		case "day":
			current = current.AddDate(0, 0, 1)
		case "week":
			current = current.AddDate(0, 0, 7)
		case "month":
			current = current.AddDate(0, 1, 0)
		default:
			current = current.AddDate(0, 0, 1)
		}
	}

	return dates, nil
}

// calculateTrendForDate 计算指定日期的趋势数据
func (s *StationService) calculateTrendForDate(stations []models.Station, date string) dto.InventoryTrendItem {
	db := database.DB

	// 解析日期
	targetDate, _ := time.Parse("2006-01-02", date)
	startTime := targetDate.Unix()
	endTime := targetDate.AddDate(0, 0, 1).Unix()

	var totalOrders int64
	var totalUsage float64
	var maxUsage, minUsage float64 = 0, 1
	var inWarehouse, sorting, inTransit, delivering int64

	for _, station := range stations {
		// 查询该日期该站点的订单数
		var stationOrders int64
		db.Model(&models.Order{}).
			Where("current_station = ? AND created_at >= ? AND created_at < ?",
				station.ID, startTime, endTime).
			Count(&stationOrders)

		totalOrders += stationOrders

		// 计算使用率
		var usageRate float64
		if station.Capacity > 0 {
			usageRate = float64(stationOrders) / float64(station.Capacity)
		}

		totalUsage += usageRate
		if usageRate > maxUsage {
			maxUsage = usageRate
		}
		if usageRate < minUsage {
			minUsage = usageRate
		}

		// 按状态统计
		var statusCounts []struct {
			Status int   `json:"status"`
			Count  int64 `json:"count"`
		}

		db.Model(&models.Order{}).
			Select("status, COUNT(*) as count").
			Where("current_station = ? AND created_at >= ? AND created_at < ?",
				station.ID, startTime, endTime).
			Group("status").
			Find(&statusCounts)

		for _, sc := range statusCounts {
			switch sc.Status {
			case 3: // 已入库
				inWarehouse += sc.Count
			case 4: // 分拣中
				sorting += sc.Count
			case 5: // 运输中
				inTransit += sc.Count
			case 7: // 配送中
				delivering += sc.Count
			}
		}
	}

	avgUsage := float64(0)
	if len(stations) > 0 {
		avgUsage = totalUsage / float64(len(stations))
	}

	return dto.InventoryTrendItem{
		Date:        date,
		TotalOrders: totalOrders,
		AvgUsage:    avgUsage,
		MaxUsage:    maxUsage,
		MinUsage:    minUsage,
		InWarehouse: inWarehouse,
		Sorting:     sorting,
		InTransit:   inTransit,
		Delivering:  delivering,
	}
}

// calculateStationStats 计算站点统计数据
func (s *StationService) calculateStationStats(station models.Station) dto.InventoryStationStats {
	db := database.DB

	// 查询当前站点的订单数量
	var totalOrders int64
	db.Model(&models.Order{}).Where("current_station = ?", station.ID).Count(&totalOrders)

	// 按状态统计
	var inWarehouse, sorting, inTransit, delivering int64

	db.Model(&models.Order{}).
		Where("current_station = ? AND status = ?", station.ID, 3).
		Count(&inWarehouse)

	db.Model(&models.Order{}).
		Where("current_station = ? AND status = ?", station.ID, 4).
		Count(&sorting)

	db.Model(&models.Order{}).
		Where("current_station = ? AND status = ?", station.ID, 5).
		Count(&inTransit)

	db.Model(&models.Order{}).
		Where("current_station = ? AND status = ?", station.ID, 7).
		Count(&delivering)

	// 计算使用率
	var usageRate float64
	if station.Capacity > 0 {
		usageRate = float64(totalOrders) / float64(station.Capacity)
	}

	// 确定预警级别
	warningLevel, _, _ := s.determineWarningLevel(usageRate, int(totalOrders), station.Capacity)

	return dto.InventoryStationStats{
		StationID:    station.ID,
		StationName:  station.Name,
		StationCode:  station.StationCode,
		TotalOrders:  totalOrders,
		Capacity:     station.Capacity,
		UsageRate:    usageRate,
		UsagePercent: fmt.Sprintf("%.1f%%", usageRate*100),
		WarningLevel: warningLevel,
		InWarehouse:  inWarehouse,
		Sorting:      sorting,
		InTransit:    inTransit,
		Delivering:   delivering,
	}
}
