package services

import (
	"errors"
	"fmt"
	"log"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"
)

type OrderService struct{}

func NewOrderService() *OrderService {
	return &OrderService{}
}

func (s *OrderService) CreateOrder(customerID uint, req *dto.CreateOrderRequest) (*models.Order, error) {
	if err := s.validateOrderCustomer(customerID); err != nil {
		return nil, err
	}
	normalized := s.normalizeCreateOrderRequest(req)
	if err := s.validateOrderParams(&normalized); err != nil {
		return nil, err
	}
	if err := s.validatePackageRequests(normalized.Packages); err != nil {
		return nil, err
	}

	orderNo := s.generateOrderNo(customerID)
	freightCharge := s.calculateFreight(&normalized)
	insuranceFee := 0.0
	if normalized.IsInsured == 1 && normalized.InsuredAmount > 0 {
		insuranceFee = s.calculateInsuranceFee(normalized.InsuredAmount)
	}
	customsFee := calculateCustomsFee(normalized.CustomsDuty, normalized.CustomsVAT, normalized.CustomsOtherTax)
	totalAmount := freightCharge + insuranceFee + customsFee
	estimatedDays := s.estimateDeliveryDays(normalized.TransportMode, normalized.SenderCountry, normalized.ReceiverCountry)

	order := &models.Order{
		OrderNo:            orderNo,
		CustomerID:         customerID,
		HierarchyType:      models.OrderHierarchyNormal,
		RelationType:       models.OrderRelationNormal,
		SenderName:         normalized.SenderName,
		SenderPhone:        normalized.SenderPhone,
		SenderCountry:      normalized.SenderCountry,
		SenderProvince:     normalized.SenderProvince,
		SenderCity:         normalized.SenderCity,
		SenderAddress:      normalized.SenderAddress,
		SenderPostcode:     normalized.SenderPostcode,
		ReceiverName:       normalized.ReceiverName,
		ReceiverPhone:      normalized.ReceiverPhone,
		ReceiverCountry:    normalized.ReceiverCountry,
		ReceiverProvince:   normalized.ReceiverProvince,
		ReceiverCity:       normalized.ReceiverCity,
		ReceiverAddress:    normalized.ReceiverAddress,
		ReceiverPostcode:   normalized.ReceiverPostcode,
		GoodsName:          normalized.GoodsName,
		GoodsCategory:      normalized.GoodsCategory,
		GoodsWeight:        normalized.GoodsWeight,
		GoodsVolume:        normalized.GoodsVolume,
		GoodsQuantity:      normalized.GoodsQuantity,
		GoodsValue:         normalized.GoodsValue,
		IsInsured:          normalized.IsInsured,
		InsuredAmount:      normalized.InsuredAmount,
		CustomsDeclaration: normalized.CustomsDeclaration,
		HSCode:             normalized.HSCode,
		DeclaredValue:      normalized.DeclaredValue,
		CustomsDuty:        normalized.CustomsDuty,
		CustomsVAT:         normalized.CustomsVAT,
		CustomsOtherTax:    normalized.CustomsOtherTax,
		CustomsStatus:      "pending",
		TransportMode:      models.TransportMode(normalized.TransportMode),
		ServiceType:        normalized.ServiceType,
		EstimatedDays:      estimatedDays,
		FreightCharge:      freightCharge,
		CustomsFee:         customsFee,
		InsuranceFee:       insuranceFee,
		TotalAmount:        totalAmount,
		Currency:           "CNY",
		PaymentStatus:      "unpaid",
		Status:             models.OrderPending,
		OrderTime:          time.Now().Unix(),
		Remark:             normalized.Remark,
	}

	if order.GoodsQuantity == 0 {
		order.GoodsQuantity = 1
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := s.createOrderRecord(tx, order); err != nil {
			return err
		}
		if _, err := s.createPackagesForOrder(tx, order, s.buildPackageRequests(&normalized), order.ID, models.OrderPackageTypeNormal); err != nil {
			return err
		}
		return s.autoAcceptAndCreatePickupTaskTx(tx, order, &normalized)
	}); err != nil {
		return nil, errors.New("创建订单失败")
	}

	return order, nil
}

func (s *OrderService) validateOrderCustomer(customerID uint) error {
	var customer models.User
	if err := database.DB.First(&customer, customerID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("下单客户不存在")
		}
		return errors.New("查询下单客户失败")
	}
	if customer.Role != models.RoleCustomer {
		return errors.New("只能为客户账号录单")
	}
	if customer.Status != 1 {
		return errors.New("目标客户账号已禁用")
	}
	return nil
}

func (s *OrderService) generateOrderNo(customerID uint) string {
	now := time.Now()
	return fmt.Sprintf("ORD%s%04d%06d",
		now.Format("20060102150405"),
		customerID%10000,
		now.Nanosecond()/1000)
}

func (s *OrderService) validateOrderParams(req *dto.CreateOrderRequest) error {
	if strings.TrimSpace(req.SenderName) == "" {
		return errors.New("发件人姓名不能为空")
	}
	if strings.TrimSpace(req.SenderPhone) == "" {
		return errors.New("发件人电话不能为空")
	}
	if strings.TrimSpace(req.SenderCountry) == "" {
		return errors.New("发件人国家不能为空")
	}
	if strings.TrimSpace(req.SenderCity) == "" {
		return errors.New("发件人城市不能为空")
	}
	if strings.TrimSpace(req.SenderAddress) == "" {
		return errors.New("发件人地址不能为空")
	}
	if strings.TrimSpace(req.ReceiverName) == "" {
		return errors.New("收件人姓名不能为空")
	}
	if strings.TrimSpace(req.ReceiverPhone) == "" {
		return errors.New("收件人电话不能为空")
	}
	if strings.TrimSpace(req.ReceiverCountry) == "" {
		return errors.New("收件人国家不能为空")
	}
	if strings.TrimSpace(req.ReceiverCity) == "" {
		return errors.New("收件人城市不能为空")
	}
	if strings.TrimSpace(req.ReceiverAddress) == "" {
		return errors.New("收件人地址不能为空")
	}
	if strings.TrimSpace(req.GoodsName) == "" {
		return errors.New("货物名称不能为空")
	}
	if req.GoodsWeight <= 0 {
		return errors.New("货物重量必须大于0")
	}
	if req.GoodsWeight > 10000 {
		return errors.New("货物重量不能超过10000kg")
	}
	if req.GoodsVolume < 0 {
		return errors.New("货物体积不能为负数")
	}
	if req.GoodsVolume > 1000 {
		return errors.New("货物体积不能超过1000立方米")
	}
	if req.TransportMode < 1 || req.TransportMode > 5 {
		return errors.New("无效的运输方式")
	}
	if req.IsInsured == 1 {
		if req.InsuredAmount <= 0 {
			return errors.New("保价金额必须大于0")
		}
		if req.GoodsValue > 0 && req.InsuredAmount > req.GoodsValue {
			return errors.New("保价金额不能超过货物价值")
		}
	}
	if req.CustomsDeclaration != "" && len(strings.TrimSpace(req.CustomsDeclaration)) < 2 {
		return errors.New("申报品名至少需要2个字符")
	}
	if req.HSCode != "" {
		if _, err := validateHSCodeFormat(req.HSCode); err != nil {
			return err
		}
	}
	return nil
}

func (s *OrderService) calculateFreight(req *dto.CreateOrderRequest) float64 {
	weightCharge := req.GoodsWeight * 10.0
	volumeCharge := 0.0
	if req.GoodsVolume > 0 {
		volumeCharge = req.GoodsVolume * 200.0
	}
	baseCharge := math.Max(weightCharge, volumeCharge)
	transportCoefficient := s.getTransportCoefficient(req.TransportMode)
	baseCharge *= transportCoefficient
	if req.SenderCountry != req.ReceiverCountry {
		baseCharge *= 1.5
	}
	return math.Round(baseCharge*100) / 100
}

func (s *OrderService) getTransportCoefficient(transportMode int) float64 {
	switch transportMode {
	case 1:
		return 1.5
	case 2:
		return 0.5
	case 3:
		return 1.0
	case 4:
		return 0.8
	case 5:
		return 2.0
	default:
		return 1.0
	}
}

func (s *OrderService) calculateInsuranceFee(insuredAmount float64) float64 {
	fee := insuredAmount * 0.01
	return math.Round(fee*100) / 100
}

func (s *OrderService) estimateDeliveryDays(transportMode int, senderCountry, receiverCountry string) int {
	baseDays := 0
	switch transportMode {
	case 1:
		baseDays = 3
	case 2:
		baseDays = 30
	case 3:
		baseDays = 7
	case 4:
		baseDays = 10
	case 5:
		baseDays = 2
	default:
		baseDays = 7
	}
	if senderCountry != receiverCountry {
		baseDays += 5
	}
	return baseDays
}

func (s *OrderService) GetOrderByID(orderID uint) (*models.Order, error) {
	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("数据库查询失败")
	}
	return &order, nil
}

func (s *OrderService) GetOrderByNo(orderNo string) (*models.Order, error) {
	var order models.Order
	if err := database.DB.Where("order_no = ?", orderNo).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("数据库查询失败")
	}
	return &order, nil
}

// GetOrderList 获取订单列表（支持分页、搜索、筛选）
func (s *OrderService) GetOrderList(userID uint, userRole int, req *dto.OrderQueryRequest) (*dto.OrderListResponse, error) {
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

	var orders []models.Order
	var total int64

	query := database.DB.Model(&models.Order{})

	// 权限控制：普通客户只能查看自己的订单
	// 调度员(6)和管理员(7)可以查看所有订单
	if userRole != 6 && userRole != 7 {
		query = query.Where("customer_id = ?", userID)
	}

	// 按订单号搜索
	if req.OrderNo != "" {
		query = query.Where("order_no LIKE ?", "%"+strings.TrimSpace(req.OrderNo)+"%")
	}

	// 按状态筛选
	if req.Status > 0 {
		query = query.Where("status = ?", req.Status)
	}

	// 按发件国家筛选
	if req.SenderCountry != "" {
		query = query.Where("sender_country = ?", strings.TrimSpace(req.SenderCountry))
	}

	// 按收件国家筛选
	if req.ReceiverCountry != "" {
		query = query.Where("receiver_country = ?", strings.TrimSpace(req.ReceiverCountry))
	}

	// 按时间范围筛选
	if req.StartTime > 0 {
		query = query.Where("order_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("order_time <= ?", req.EndTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询订单总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("order_time DESC").Offset(offset).Limit(req.PageSize).Find(&orders).Error; err != nil {
		return nil, errors.New("查询订单列表失败")
	}

	// 转换为DTO
	orderIDs := make([]uint, 0, len(orders))
	rootIDs := make([]uint, 0, len(orders))
	parentIDs := make([]uint, 0, len(orders)*2)
	for _, order := range orders {
		orderIDs = append(orderIDs, order.ID)
		if order.RootOrderID > 0 {
			rootIDs = append(rootIDs, order.RootOrderID)
			parentIDs = append(parentIDs, order.RootOrderID)
		} else {
			rootIDs = append(rootIDs, order.ID)
		}
		if order.ParentOrderID > 0 {
			parentIDs = append(parentIDs, order.ParentOrderID)
		}
	}

	counts, err := s.loadOrderCounts(database.DB, collectUniqueOrderIDs(orderIDs), collectUniqueOrderIDs(rootIDs))
	if err != nil {
		return nil, err
	}
	orderNoMap, err := s.loadOrderNoMap(database.DB, collectUniqueOrderIDs(parentIDs, rootIDs))
	if err != nil {
		return nil, err
	}

	orderList := make([]dto.OrderInfo, 0, len(orders))
	for _, order := range orders {
		rootOrderID := order.RootOrderID
		if rootOrderID == 0 {
			rootOrderID = order.ID
		}
		orderList = append(orderList, dto.OrderInfo{
			ID:              order.ID,
			OrderNo:         order.OrderNo,
			CustomerID:      order.CustomerID,
			ParentOrderID:   order.ParentOrderID,
			ParentOrderNo:   orderNoMap[order.ParentOrderID],
			RootOrderID:     rootOrderID,
			RootOrderNo:     orderNoMap[rootOrderID],
			HierarchyType:   order.HierarchyType,
			RelationType:    order.RelationType,
			PackageCount:    s.resolvePackageCount(order, counts),
			ChildOrderCount: counts.ChildOrders[order.ID],
			SenderName:      order.SenderName,
			SenderCountry:   order.SenderCountry,
			SenderCity:      order.SenderCity,
			ReceiverName:    order.ReceiverName,
			ReceiverCountry: order.ReceiverCountry,
			ReceiverCity:    order.ReceiverCity,
			GoodsName:       order.GoodsName,
			GoodsWeight:     order.GoodsWeight,
			TransportMode:   int(order.TransportMode),
			TotalAmount:     order.TotalAmount,
			Status:          int(order.Status),
			StatusName:      GetOrderStatusName(int(order.Status)),
			OrderTime:       utils.FormatTimestamp(order.OrderTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.OrderListResponse{
		List:     orderList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// GetOrderStatusName 获取订单状态名称（公共函数）
func GetOrderStatusName(status int) string {
	statusNames := map[int]string{
		1:  "待处理",
		2:  "已接单",
		3:  "已入库",
		4:  "分拣中",
		5:  "运输中",
		6:  "清关中",
		7:  "目的地分拣",
		8:  "配送中",
		9:  "已送达",
		10: "已签收",
		11: "异常",
		12: "已取消",
		13: "待揽收",
		14: "揽收中",
		15: "已揽收",
	}
	if name, ok := statusNames[status]; ok {
		return name
	}
	return "未知"
}

// UpdateOrder 修改订单信息
// 只允许修改收件人信息和备注，且只能在订单状态为"待处理"时修改
func (s *OrderService) UpdateOrder(orderID uint, userID uint, userRole int, req *dto.UpdateOrderRequest) error {
	// 查询订单
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	// 权限检查：普通用户只能修改自己的订单，调度员和管理员可以修改任何订单
	if userRole != 6 && userRole != 7 {
		if order.CustomerID != userID {
			return errors.New("无权修改此订单")
		}
	}

	// 状态检查：只有待处理状态的订单可以修改
	if err := s.ensureLeafOrderOperation(order); err != nil {
		return err
	}
	if order.Status != models.OrderPending {
		return errors.New("只有待处理状态的订单可以修改")
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.ReceiverName != "" {
		updates["receiver_name"] = strings.TrimSpace(req.ReceiverName)
	}
	if req.ReceiverPhone != "" {
		updates["receiver_phone"] = strings.TrimSpace(req.ReceiverPhone)
	}
	if req.ReceiverProvince != "" {
		updates["receiver_province"] = strings.TrimSpace(req.ReceiverProvince)
	}
	if req.ReceiverCity != "" {
		updates["receiver_city"] = strings.TrimSpace(req.ReceiverCity)
	}
	if req.ReceiverAddress != "" {
		updates["receiver_address"] = strings.TrimSpace(req.ReceiverAddress)
	}
	if req.ReceiverPostcode != "" {
		updates["receiver_postcode"] = strings.TrimSpace(req.ReceiverPostcode)
	}
	if req.Remark != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	// 如果没有要更新的字段
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	// 执行更新
	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
		return errors.New("更新订单失败")
	}

	return nil
}

// CancelOrder 取消订单
func (s *OrderService) CancelOrder(orderID uint, userID uint, userRole int) error {
	// 查询订单
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	// 权限检查
	if userRole != 6 && userRole != 7 {
		if order.CustomerID != userID {
			return errors.New("无权取消此订单")
		}
	}

	// 状态检查：只有待处理和已接单状态的订单可以取消
	if err := s.ensureLeafOrderOperation(order); err != nil {
		return err
	}
	if order.Status != models.OrderPending && order.Status != models.OrderAccepted && order.Status != models.OrderPickupPending {
		return errors.New("当前状态的订单不能取消")
	}

	// 更新状态为已取消
	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Update("status", models.OrderCancelled).Error; err != nil {
		return errors.New("取消订单失败")
	}

	return nil
}

// DeleteOrder 删除订单（物理删除）
// 只有管理员可以删除订单，且只能删除已取消状态的订单
func (s *OrderService) DeleteOrder(orderID uint, userID uint, userRole int) error {
	// 权限检查：只有管理员可以删除订单
	if userRole != 7 {
		return errors.New("无权删除订单，只有管理员可以删除订单")
	}

	// 查询订单
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	// 状态检查：只能删除已取消状态的订单
	if err := s.ensureLeafOrderOperation(order); err != nil {
		return err
	}
	if order.ParentOrderID != 0 {
		return errors.New("子单不支持单独删除")
	}
	if order.Status != models.OrderCancelled {
		return errors.New("只能删除已取消状态的订单")
	}

	// 物理删除订单（直接从数据库删除）
	if err := database.DB.Delete(&models.Order{}, orderID).Error; err != nil {
		return errors.New("删除订单失败")
	}

	return nil
}

// GetOrderStatistics 获取订单统计信息
func (s *OrderService) GetOrderStatistics(userID uint, userRole int, req *dto.OrderStatisticsRequest) (*dto.OrderStatisticsResponse, error) {
	query := database.DB.Model(&models.Order{})

	// 权限控制：普通用户只能查看自己的订单统计
	if userRole != 6 && userRole != 7 {
		query = query.Where("customer_id = ?", userID)
	}

	// 时间范围筛选
	if req.StartTime > 0 {
		query = query.Where("order_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("order_time <= ?", req.EndTime)
	}

	response := &dto.OrderStatisticsResponse{}

	// 1. 总体统计
	var totalOrders int64
	var totalAmount float64
	query.Count(&totalOrders)
	query.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalAmount)
	response.TotalOrders = totalOrders
	response.TotalAmount = totalAmount

	// 2. 按状态统计
	var statusStats []struct {
		Status      int
		Count       int64
		TotalAmount float64
	}
	database.DB.Model(&models.Order{}).
		Select("status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount").
		Where(query.Statement.SQL.String()).
		Group("status").
		Scan(&statusStats)

	for _, stat := range statusStats {
		response.ByStatus = append(response.ByStatus, dto.StatusStatistics{
			Status:      stat.Status,
			StatusName:  GetOrderStatusName(stat.Status),
			Count:       stat.Count,
			TotalAmount: stat.TotalAmount,
		})
	}

	// 3. 按运输方式统计
	var transportStats []struct {
		TransportMode int
		Count         int64
		TotalAmount   float64
	}
	database.DB.Model(&models.Order{}).
		Select("transport_mode, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount").
		Where(query.Statement.SQL.String()).
		Group("transport_mode").
		Scan(&transportStats)

	for _, stat := range transportStats {
		response.ByTransportMode = append(response.ByTransportMode, dto.TransportStatistics{
			TransportMode: stat.TransportMode,
			ModeName:      getTransportModeName(stat.TransportMode),
			Count:         stat.Count,
			TotalAmount:   stat.TotalAmount,
		})
	}

	// 4. 按发件国家统计
	var senderCountryStats []struct {
		Country     string
		Count       int64
		TotalAmount float64
	}
	database.DB.Model(&models.Order{}).
		Select("sender_country as country, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount").
		Where(query.Statement.SQL.String()).
		Group("sender_country").
		Order("count DESC").
		Limit(10).
		Scan(&senderCountryStats)

	for _, stat := range senderCountryStats {
		response.BySenderCountry = append(response.BySenderCountry, dto.CountryStatistics{
			Country:     stat.Country,
			Count:       stat.Count,
			TotalAmount: stat.TotalAmount,
		})
	}

	// 5. 按收件国家统计
	var receiverCountryStats []struct {
		Country     string
		Count       int64
		TotalAmount float64
	}
	database.DB.Model(&models.Order{}).
		Select("receiver_country as country, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount").
		Where(query.Statement.SQL.String()).
		Group("receiver_country").
		Order("count DESC").
		Limit(10).
		Scan(&receiverCountryStats)

	for _, stat := range receiverCountryStats {
		response.ByReceiverCountry = append(response.ByReceiverCountry, dto.CountryStatistics{
			Country:     stat.Country,
			Count:       stat.Count,
			TotalAmount: stat.TotalAmount,
		})
	}

	// 6. 按日期统计（如果指定了group_by=date）
	if req.GroupBy == "date" {
		var dateStats []struct {
			Date        string
			Count       int64
			TotalAmount float64
		}
		database.DB.Model(&models.Order{}).
			Select("DATE(FROM_UNIXTIME(order_time)) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount").
			Where(query.Statement.SQL.String()).
			Group("date").
			Order("date DESC").
			Scan(&dateStats)

		for _, stat := range dateStats {
			response.ByDate = append(response.ByDate, dto.DateStatistics{
				Date:        stat.Date,
				Count:       stat.Count,
				TotalAmount: stat.TotalAmount,
			})
		}
	}

	return response, nil
}

// getTransportModeName 获取运输方式名称
func getTransportModeName(mode int) string {
	modeMap := map[int]string{
		1: "空运",
		2: "海运",
		3: "陆运",
		4: "铁路",
		5: "快递",
	}
	if name, ok := modeMap[mode]; ok {
		return name
	}
	return "未知"
}

// UpdateOrderStatus 更新订单状态
func (s *OrderService) UpdateOrderStatus(orderID uint, newStatus int, userID uint, userRole int, remark string) error {
	// 查询订单
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	// 保存原状态用于日志
	if err := s.ensureLeafOrderOperation(order); err != nil {
		return err
	}
	oldStatus := order.Status

	// 使用状态机验证转换
	stateMachine := &OrderStateMachine{}
	if err := stateMachine.ValidateTransition(order.Status, models.OrderStatus(newStatus), userRole); err != nil {
		return err
	}

	// 更新状态
	updates := map[string]interface{}{
		"status": newStatus,
	}

	// 根据状态更新相关时间字段
	currentTime := time.Now().Unix()
	switch models.OrderStatus(newStatus) {
	case models.OrderAccepted:
		// 接单时间可以记录
	case models.OrderPickedUp:
		updates["pickup_time"] = currentTime
	case models.OrderInWarehouse:
		// 入库时间
	case models.OrderDelivered:
		updates["delivery_time"] = currentTime
	case models.OrderSigned:
		updates["sign_time"] = currentTime
	}

	// 如果有备注，更新备注
	if remark != "" {
		updates["remark"] = remark
	}

	// 执行更新
	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
		return errors.New("更新订单状态失败")
	}

	// 记录状态变更日志
	if err := s.createStatusLog(orderID, oldStatus, models.OrderStatus(newStatus), userID, userRole, remark); err != nil {
		// 日志记录失败不影响主流程，只记录错误
		log.Printf("创建状态变更日志失败: %v", err)
	}

	return nil
}

// createStatusLog 创建状态变更日志
func (s *OrderService) createStatusLog(orderID uint, fromStatus, toStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	// 查询操作人信息
	var user models.User
	if err := database.DB.Select("username, real_name").Where("id = ?", operatorID).First(&user).Error; err != nil {
		return err
	}

	operatorName := user.RealName
	if operatorName == "" {
		operatorName = user.Username
	}

	// 创建日志记录
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

	return database.DB.Create(&log).Error
}

// GetAllowedStatusTransitions 获取订单允许的状态转换
func (s *OrderService) GetAllowedStatusTransitions(orderID uint, userRole int) ([]models.OrderStatus, error) {
	// 查询订单
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return nil, err
	}

	if err := s.ensureLeafOrderOperation(order); err != nil {
		return []models.OrderStatus{}, nil
	}

	// 使用状态机获取允许的转换
	stateMachine := &OrderStateMachine{}
	allowed := stateMachine.GetAllowedTransitions(order.Status, userRole)

	return allowed, nil
}

// GetOrderStatusLogs 获取订单状态变更日志
func (s *OrderService) GetOrderStatusLogs(orderID uint) ([]models.OrderStatusLog, error) {
	var logs []models.OrderStatusLog

	if err := database.DB.Where("order_id = ?", orderID).
		Order("change_time DESC").
		Find(&logs).Error; err != nil {
		return nil, err
	}

	return logs, nil
}
