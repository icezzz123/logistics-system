package services

import (
	"errors"
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"time"
)

// 流转类型常量
const (
	FlowTypeIn  = "in"  // 入库
	FlowTypeOut = "out" // 出库
)

type WarehouseService struct{}

func NewWarehouseService() *WarehouseService {
	return &WarehouseService{}
}

// InboundScan 入库扫描
func (s *WarehouseService) InboundScan(req dto.InboundScanRequest, operatorID uint) (*dto.InboundScanResponse, error) {
	db := database.DB

	// 1. 查询订单
	var order models.Order
	if err := db.Where("order_no = ?", req.OrderNo).First(&order).Error; err != nil {
		return nil, errors.New("订单不存在")
	}

	// 2. 验证站点是否存在
	var station models.Station
	if err := db.Where("id = ?", req.StationID).First(&station).Error; err != nil {
		return nil, errors.New("站点不存在")
	}

	// 3. 检查站点状态
	if station.Status != 1 {
		return nil, errors.New("站点已禁用，无法入库")
	}

	// 4. 检查订单状态（只有已接单或运输中的订单可以入库）
	if order.Status != models.OrderAccepted && order.Status != models.OrderInTransit {
		return nil, fmt.Errorf("订单当前状态不允许入库，当前状态: %d", order.Status)
	}

	// 5. 检查是否已在该站点入库
	var existingFlow models.StationFlow
	err := db.Where("order_id = ? AND station_id = ? AND flow_type = ?",
		order.ID, req.StationID, FlowTypeIn).First(&existingFlow).Error
	if err == nil {
		return nil, errors.New("该订单已在此站点入库")
	}

	// 6. 使用订单的重量和体积，如果请求中有则使用请求的
	weight := order.GoodsWeight
	volume := order.GoodsVolume
	if req.Weight > 0 {
		weight = req.Weight
	}
	if req.Volume > 0 {
		volume = req.Volume
	}

	// 7. 查询操作人信息
	var operator models.User
	if err := db.Where("id = ?", operatorID).First(&operator).Error; err != nil {
		return nil, errors.New("操作人信息不存在")
	}

	// 8. 使用事务执行入库操作
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 8.1 创建入库流转记录
	flow := models.StationFlow{
		OrderID:    order.ID,
		StationID:  req.StationID,
		FlowType:   FlowTypeIn,
		Quantity:   order.GoodsQuantity,
		Weight:     weight,
		Volume:     volume,
		OperatorID: operatorID,
		Remark:     req.Remark,
	}

	if err := tx.Create(&flow).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建入库记录失败")
	}

	// 8.2 保存原状态，用于状态日志
	oldStatus := order.Status

	// 8.3 更新订单状态为已入库，并更新当前站点
	updates := map[string]interface{}{
		"status":          int(models.OrderInWarehouse),
		"current_station": req.StationID,
	}

	if err := tx.Model(&order).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新订单状态失败")
	}

	// 8.4 记录订单状态变更日志
	statusLog := models.OrderStatusLog{
		OrderID:      order.ID,
		FromStatus:   oldStatus,
		ToStatus:     models.OrderInWarehouse,
		OperatorID:   operatorID,
		OperatorName: operator.Username,
		OperatorRole: int(operator.Role),
		Remark:       fmt.Sprintf("站点入库: %s", station.Name),
		ChangeTime:   time.Now().Unix(),
	}

	if err := tx.Create(&statusLog).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建状态日志失败")
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交事务失败")
	}

	// 9. 返回响应
	return &dto.InboundScanResponse{
		FlowID:      flow.ID,
		OrderID:     order.ID,
		OrderNo:     order.OrderNo,
		StationID:   req.StationID,
		StationName: station.Name,
		GoodsName:   order.GoodsName,
		Weight:      weight,
		Volume:      volume,
		OrderStatus: int(models.OrderInWarehouse),
		InboundTime: flow.CTime,
	}, nil
}

// GetInboundRecords 查询入库记录
func (s *WarehouseService) GetInboundRecords(req dto.InboundRecordQueryRequest) (*dto.InboundRecordListResponse, error) {
	db := database.DB

	// 构建查询
	query := db.Model(&models.StationFlow{}).Where("flow_type = ?", FlowTypeIn)

	// 条件筛选
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	if req.OrderNo != "" {
		var order models.Order
		if err := db.Where("order_no = ?", req.OrderNo).First(&order).Error; err == nil {
			query = query.Where("order_id = ?", order.ID)
		}
	}

	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}

	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}

	// 统计总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询入库记录总数失败")
	}

	// 分页查询
	var flows []models.StationFlow
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&flows).Error; err != nil {
		return nil, errors.New("查询入库记录失败")
	}

	// 如果没有记录，直接返回空列表
	if len(flows) == 0 {
		return &dto.InboundRecordListResponse{
			List:     []dto.InboundRecordInfo{},
			Total:    0,
			Page:     req.Page,
			PageSize: req.PageSize,
			Pages:    0,
		}, nil
	}

	// 收集所有需要查询的ID
	orderIDs := make([]uint, 0, len(flows))
	stationIDs := make([]uint, 0, len(flows))
	operatorIDs := make([]uint, 0, len(flows))

	for _, flow := range flows {
		orderIDs = append(orderIDs, flow.OrderID)
		stationIDs = append(stationIDs, flow.StationID)
		operatorIDs = append(operatorIDs, flow.OperatorID)
	}

	// 批量查询关联数据
	var orders []models.Order
	var stations []models.Station
	var operators []models.User

	db.Where("id IN ?", orderIDs).Find(&orders)
	db.Where("id IN ?", stationIDs).Find(&stations)
	db.Where("id IN ?", operatorIDs).Find(&operators)

	// 构建映射表
	orderMap := make(map[uint]models.Order)
	stationMap := make(map[uint]models.Station)
	operatorMap := make(map[uint]models.User)

	for _, order := range orders {
		orderMap[order.ID] = order
	}
	for _, station := range stations {
		stationMap[station.ID] = station
	}
	for _, operator := range operators {
		operatorMap[operator.ID] = operator
	}

	// 组装响应数据
	list := make([]dto.InboundRecordInfo, 0, len(flows))
	for _, flow := range flows {
		order := orderMap[flow.OrderID]
		station := stationMap[flow.StationID]
		operator := operatorMap[flow.OperatorID]

		list = append(list, dto.InboundRecordInfo{
			ID:           flow.ID,
			OrderID:      flow.OrderID,
			OrderNo:      order.OrderNo,
			StationID:    flow.StationID,
			StationName:  station.Name,
			GoodsName:    order.GoodsName,
			Weight:       flow.Weight,
			Volume:       flow.Volume,
			OperatorID:   flow.OperatorID,
			OperatorName: operator.Username,
			Remark:       flow.Remark,
			InboundTime:  flow.CTime,
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.InboundRecordListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// OutboundScan 出库扫描
func (s *WarehouseService) OutboundScan(req dto.OutboundScanRequest, operatorID uint) (*dto.OutboundScanResponse, error) {
	db := database.DB
	
	// 1. 查询订单
	var order models.Order
	if err := db.Where("order_no = ?", req.OrderNo).First(&order).Error; err != nil {
		return nil, errors.New("订单不存在")
	}
	
	// 2. 验证当前站点是否存在
	var station models.Station
	if err := db.Where("id = ?", req.StationID).First(&station).Error; err != nil {
		return nil, errors.New("当前站点不存在")
	}
	
	// 3. 验证下一站点是否存在
	var nextStation models.Station
	if err := db.Where("id = ?", req.NextStationID).First(&nextStation).Error; err != nil {
		return nil, errors.New("下一站点不存在")
	}
	
	// 4. 检查站点状态
	if station.Status != 1 {
		return nil, errors.New("当前站点已禁用，无法出库")
	}
	if nextStation.Status != 1 {
		return nil, errors.New("下一站点已禁用，无法出库")
	}
	
	// 5. 检查订单当前站点
	if order.CurrentStation != req.StationID {
		return nil, fmt.Errorf("订单当前不在此站点，当前站点ID: %d", order.CurrentStation)
	}
	
	// 6. 检查订单状态（只有已入库、分拣中、运输中的订单可以出库）
	if order.Status != models.OrderInWarehouse && 
	   order.Status != models.OrderSorting && 
	   order.Status != models.OrderInTransit {
		return nil, fmt.Errorf("订单当前状态不允许出库，当前状态: %d", order.Status)
	}
	
	// 7. 检查是否已在该站点入库
	var inboundFlow models.StationFlow
	if err := db.Where("order_id = ? AND station_id = ? AND flow_type = ?", 
		order.ID, req.StationID, FlowTypeIn).First(&inboundFlow).Error; err != nil {
		return nil, errors.New("该订单未在此站点入库，无法出库")
	}
	
	// 8. 使用订单的重量和体积，如果请求中有则使用请求的
	weight := order.GoodsWeight
	volume := order.GoodsVolume
	if req.Weight > 0 {
		weight = req.Weight
	}
	if req.Volume > 0 {
		volume = req.Volume
	}
	
	// 9. 查询操作人信息
	var operator models.User
	if err := db.Where("id = ?", operatorID).First(&operator).Error; err != nil {
		return nil, errors.New("操作人信息不存在")
	}
	
	// 10. 使用事务执行出库操作
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	// 10.1 创建出库流转记录
	flow := models.StationFlow{
		OrderID:       order.ID,
		StationID:     req.StationID,
		FlowType:      FlowTypeOut,
		Quantity:      order.GoodsQuantity,
		Weight:        weight,
		Volume:        volume,
		OperatorID:    operatorID,
		NextStationID: req.NextStationID,
		Remark:        req.Remark,
	}
	
	if err := tx.Create(&flow).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建出库记录失败")
	}
	
	// 10.2 更新订单状态为运输中，并更新当前站点
	oldStatus := order.Status // 保存原状态
	updates := map[string]interface{}{
		"status":          int(models.OrderInTransit),
		"current_station": req.NextStationID,
	}
	
	if err := tx.Model(&order).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新订单状态失败")
	}
	
	// 10.3 记录订单状态变更日志
	statusLog := models.OrderStatusLog{
		OrderID:      order.ID,
		FromStatus:   oldStatus, // 使用保存的原状态
		ToStatus:     models.OrderInTransit,
		OperatorID:   operatorID,
		OperatorName: operator.Username,
		OperatorRole: int(operator.Role),
		Remark:       fmt.Sprintf("站点出库: %s -> %s", station.Name, nextStation.Name),
		ChangeTime:   time.Now().Unix(),
	}
	
	if err := tx.Create(&statusLog).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建状态日志失败")
	}
	
	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交事务失败")
	}
	
	// 11. 返回响应
	return &dto.OutboundScanResponse{
		FlowID:          flow.ID,
		OrderID:         order.ID,
		OrderNo:         order.OrderNo,
		StationID:       req.StationID,
		StationName:     station.Name,
		NextStationID:   req.NextStationID,
		NextStationName: nextStation.Name,
		GoodsName:       order.GoodsName,
		Weight:          weight,
		Volume:          volume,
		OrderStatus:     int(models.OrderInTransit),
		OutboundTime:    flow.CTime,
	}, nil
}

// GetOutboundRecords 查询出库记录
func (s *WarehouseService) GetOutboundRecords(req dto.OutboundRecordQueryRequest) (*dto.OutboundRecordListResponse, error) {
	db := database.DB
	
	// 构建查询
	query := db.Model(&models.StationFlow{}).Where("flow_type = ?", FlowTypeOut)
	
	// 条件筛选
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}
	
	if req.OrderNo != "" {
		var order models.Order
		if err := db.Where("order_no = ?", req.OrderNo).First(&order).Error; err == nil {
			query = query.Where("order_id = ?", order.ID)
		}
	}
	
	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}
	
	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}
	
	// 统计总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询出库记录总数失败")
	}
	
	// 分页查询
	var flows []models.StationFlow
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&flows).Error; err != nil {
		return nil, errors.New("查询出库记录失败")
	}
	
	// 如果没有记录，直接返回空列表
	if len(flows) == 0 {
		return &dto.OutboundRecordListResponse{
			List:     []dto.OutboundRecordInfo{},
			Total:    0,
			Page:     req.Page,
			PageSize: req.PageSize,
			Pages:    0,
		}, nil
	}
	
	// 收集所有需要查询的ID
	orderIDs := make([]uint, 0, len(flows))
	stationIDs := make([]uint, 0, len(flows))
	nextStationIDs := make([]uint, 0, len(flows))
	operatorIDs := make([]uint, 0, len(flows))
	
	for _, flow := range flows {
		orderIDs = append(orderIDs, flow.OrderID)
		stationIDs = append(stationIDs, flow.StationID)
		if flow.NextStationID > 0 {
			nextStationIDs = append(nextStationIDs, flow.NextStationID)
		}
		operatorIDs = append(operatorIDs, flow.OperatorID)
	}
	
	// 批量查询关联数据
	var orders []models.Order
	var stations []models.Station
	var nextStations []models.Station
	var operators []models.User
	
	db.Where("id IN ?", orderIDs).Find(&orders)
	db.Where("id IN ?", stationIDs).Find(&stations)
	if len(nextStationIDs) > 0 {
		db.Where("id IN ?", nextStationIDs).Find(&nextStations)
	}
	db.Where("id IN ?", operatorIDs).Find(&operators)
	
	// 构建映射表
	orderMap := make(map[uint]models.Order)
	stationMap := make(map[uint]models.Station)
	nextStationMap := make(map[uint]models.Station)
	operatorMap := make(map[uint]models.User)
	
	for _, order := range orders {
		orderMap[order.ID] = order
	}
	for _, station := range stations {
		stationMap[station.ID] = station
	}
	for _, station := range nextStations {
		nextStationMap[station.ID] = station
	}
	for _, operator := range operators {
		operatorMap[operator.ID] = operator
	}
	
	// 组装响应数据
	list := make([]dto.OutboundRecordInfo, 0, len(flows))
	for _, flow := range flows {
		order := orderMap[flow.OrderID]
		station := stationMap[flow.StationID]
		nextStation := nextStationMap[flow.NextStationID]
		operator := operatorMap[flow.OperatorID]
		
		list = append(list, dto.OutboundRecordInfo{
			ID:              flow.ID,
			OrderID:         flow.OrderID,
			OrderNo:         order.OrderNo,
			StationID:       flow.StationID,
			StationName:     station.Name,
			NextStationID:   flow.NextStationID,
			NextStationName: nextStation.Name,
			GoodsName:       order.GoodsName,
			Weight:          flow.Weight,
			Volume:          flow.Volume,
			OperatorID:      flow.OperatorID,
			OperatorName:    operator.Username,
			Remark:          flow.Remark,
			OutboundTime:    flow.CTime,
		})
	}
	
	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}
	
	return &dto.OutboundRecordListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}
