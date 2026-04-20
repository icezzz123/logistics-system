package services

import (
	"errors"
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"math"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

type orderCountInfo struct {
	DirectPackages map[uint]int
	RootPackages   map[uint]int
	ChildOrders    map[uint]int
}

func roundCurrency(value float64) float64 {
	return math.Round(value*100) / 100
}

func roundPositive(value float64) float64 {
	if value < 0 {
		return 0
	}
	return roundCurrency(value)
}

func mergeRemark(parts ...string) string {
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		text := strings.TrimSpace(part)
		if text != "" {
			items = append(items, text)
		}
	}
	return strings.Join(items, " | ")
}

func buildAggregateGoodsName(fallback string, packages []models.OrderPackage) string {
	names := make([]string, 0, len(packages))
	exists := make(map[string]struct{})
	for _, pkg := range packages {
		name := strings.TrimSpace(pkg.GoodsName)
		if name == "" {
			continue
		}
		if _, ok := exists[name]; ok {
			continue
		}
		exists[name] = struct{}{}
		names = append(names, name)
	}
	if len(names) == 1 {
		return names[0]
	}
	if len(names) > 1 {
		return fmt.Sprintf("%s等%d件货物", names[0], len(packages))
	}
	if strings.TrimSpace(fallback) != "" {
		return strings.TrimSpace(fallback)
	}
	return "组合货物"
}

func aggregatePackages(packages []models.OrderPackage) (weight, volume float64, quantity int, goodsValue, insuredAmount float64) {
	for _, pkg := range packages {
		weight += pkg.Weight
		volume += pkg.Volume
		quantity += pkg.Quantity
		goodsValue += pkg.GoodsValue
		insuredAmount += pkg.InsuredAmount
	}
	if quantity == 0 && len(packages) > 0 {
		quantity = len(packages)
	}
	return roundPositive(weight), roundPositive(volume), quantity, roundPositive(goodsValue), roundPositive(insuredAmount)
}

func allocateAmounts(total float64, weights []float64) []float64 {
	result := make([]float64, len(weights))
	if len(weights) == 0 {
		return result
	}
	total = roundCurrency(total)
	sumWeight := 0.0
	for _, weight := range weights {
		sumWeight += weight
	}
	if sumWeight <= 0 {
		each := roundCurrency(total / float64(len(weights)))
		allocated := 0.0
		for i := range weights {
			if i == len(weights)-1 {
				result[i] = roundCurrency(total - allocated)
				break
			}
			result[i] = each
			allocated += each
		}
		return result
	}
	allocated := 0.0
	for i, weight := range weights {
		if i == len(weights)-1 {
			result[i] = roundCurrency(total - allocated)
			break
		}
		share := roundCurrency(total * weight / sumWeight)
		result[i] = share
		allocated += share
	}
	return result
}

func trimPackageRequest(pkg dto.OrderPackageRequest) dto.OrderPackageRequest {
	trimmed := dto.OrderPackageRequest{
		ParcelNo:      strings.TrimSpace(pkg.ParcelNo),
		GoodsName:     strings.TrimSpace(pkg.GoodsName),
		GoodsCategory: strings.TrimSpace(pkg.GoodsCategory),
		Weight:        pkg.Weight,
		Volume:        pkg.Volume,
		Quantity:      pkg.Quantity,
		GoodsValue:    pkg.GoodsValue,
		InsuredAmount: pkg.InsuredAmount,
		Remark:        strings.TrimSpace(pkg.Remark),
	}
	if trimmed.Quantity <= 0 {
		trimmed.Quantity = 1
	}
	return trimmed
}

func (s *OrderService) normalizeCreateOrderRequest(req *dto.CreateOrderRequest) dto.CreateOrderRequest {
	normalized := *req
	normalized.SenderName = strings.TrimSpace(req.SenderName)
	normalized.SenderPhone = strings.TrimSpace(req.SenderPhone)
	normalized.SenderCountry = strings.TrimSpace(req.SenderCountry)
	normalized.SenderProvince = strings.TrimSpace(req.SenderProvince)
	normalized.SenderCity = strings.TrimSpace(req.SenderCity)
	normalized.SenderAddress = strings.TrimSpace(req.SenderAddress)
	normalized.SenderPostcode = strings.TrimSpace(req.SenderPostcode)
	normalized.ReceiverName = strings.TrimSpace(req.ReceiverName)
	normalized.ReceiverPhone = strings.TrimSpace(req.ReceiverPhone)
	normalized.ReceiverCountry = strings.TrimSpace(req.ReceiverCountry)
	normalized.ReceiverProvince = strings.TrimSpace(req.ReceiverProvince)
	normalized.ReceiverCity = strings.TrimSpace(req.ReceiverCity)
	normalized.ReceiverAddress = strings.TrimSpace(req.ReceiverAddress)
	normalized.ReceiverPostcode = strings.TrimSpace(req.ReceiverPostcode)
	normalized.GoodsName = strings.TrimSpace(req.GoodsName)
	normalized.GoodsCategory = strings.TrimSpace(req.GoodsCategory)
	normalized.ServiceType = strings.TrimSpace(req.ServiceType)
	normalized.Remark = strings.TrimSpace(req.Remark)

	packages := make([]dto.OrderPackageRequest, 0, len(req.Packages))
	totalWeight := 0.0
	totalVolume := 0.0
	totalQuantity := 0
	totalValue := 0.0
	totalInsured := 0.0
	for _, pkg := range req.Packages {
		trimmed := trimPackageRequest(pkg)
		packages = append(packages, trimmed)
		totalWeight += trimmed.Weight
		totalVolume += trimmed.Volume
		totalQuantity += trimmed.Quantity
		totalValue += trimmed.GoodsValue
		totalInsured += trimmed.InsuredAmount
	}
	normalized.Packages = packages
	if len(packages) > 0 {
		normalized.GoodsWeight = roundPositive(totalWeight)
		normalized.GoodsVolume = roundPositive(totalVolume)
		normalized.GoodsQuantity = totalQuantity
		normalized.GoodsValue = roundPositive(totalValue)
		if normalized.GoodsName == "" {
			normalized.GoodsName = packages[0].GoodsName
		}
		if normalized.GoodsCategory == "" {
			normalized.GoodsCategory = packages[0].GoodsCategory
		}
		if normalized.IsInsured == 1 && normalized.InsuredAmount <= 0 {
			normalized.InsuredAmount = roundPositive(totalInsured)
		}
	}
	if normalized.GoodsQuantity <= 0 {
		normalized.GoodsQuantity = 1
	}
	return normalized
}

func (s *OrderService) validatePackageRequests(packages []dto.OrderPackageRequest) error {
	parcelNos := make(map[string]struct{})
	for _, pkg := range packages {
		if pkg.GoodsName == "" {
			return errors.New("包裹货物名称不能为空")
		}
		if pkg.Weight <= 0 {
			return errors.New("包裹重量必须大于0")
		}
		if pkg.Volume < 0 {
			return errors.New("包裹体积不能为负数")
		}
		if pkg.Quantity <= 0 {
			return errors.New("包裹件数必须大于0")
		}
		if pkg.GoodsValue < 0 {
			return errors.New("包裹货值不能为负数")
		}
		if pkg.ParcelNo != "" {
			if _, exists := parcelNos[pkg.ParcelNo]; exists {
				return errors.New("包裹号不能重复")
			}
			parcelNos[pkg.ParcelNo] = struct{}{}
		}
	}
	return nil
}

func (s *OrderService) buildPackageRequests(normalized *dto.CreateOrderRequest) []dto.OrderPackageRequest {
	if len(normalized.Packages) > 0 {
		return normalized.Packages
	}
	return []dto.OrderPackageRequest{
		{
			GoodsName:     normalized.GoodsName,
			GoodsCategory: normalized.GoodsCategory,
			Weight:        normalized.GoodsWeight,
			Volume:        normalized.GoodsVolume,
			Quantity:      normalized.GoodsQuantity,
			GoodsValue:    normalized.GoodsValue,
			InsuredAmount: normalized.InsuredAmount,
			Remark:        normalized.Remark,
		},
	}
}

func (s *OrderService) createOrderRecord(tx *gorm.DB, order *models.Order) error {
	if strings.TrimSpace(order.HierarchyType) == "" {
		order.HierarchyType = models.OrderHierarchyNormal
	}
	if strings.TrimSpace(order.RelationType) == "" {
		order.RelationType = models.OrderRelationNormal
	}
	if err := tx.Create(order).Error; err != nil {
		return errors.New("创建订单失败")
	}
	if order.RootOrderID == 0 {
		order.RootOrderID = order.ID
		if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("root_order_id", order.ID).Error; err != nil {
			return errors.New("更新订单根单失败")
		}
	}
	return nil
}

func (s *OrderService) generateParcelNo(customerID uint, orderID uint, index int) string {
	now := time.Now()
	return fmt.Sprintf("PKG%s%04d%04d%02d",
		now.Format("20060102150405"),
		customerID%10000,
		orderID%10000,
		index%100)
}

func (s *OrderService) createPackagesForOrder(tx *gorm.DB, order *models.Order, packages []dto.OrderPackageRequest, sourceOrderID uint, packageType string) ([]models.OrderPackage, error) {
	if len(packages) == 0 {
		return nil, nil
	}
	if packageType == "" {
		packageType = models.OrderPackageTypeNormal
	}
	result := make([]models.OrderPackage, 0, len(packages))
	for index, pkg := range packages {
		parcelNo := strings.TrimSpace(pkg.ParcelNo)
		if parcelNo == "" {
			parcelNo = s.generateParcelNo(order.CustomerID, order.ID, index+1)
		}
		item := models.OrderPackage{
			OrderID:       order.ID,
			RootOrderID:   order.RootOrderID,
			SourceOrderID: sourceOrderID,
			ParcelNo:      parcelNo,
			PackageType:   packageType,
			GoodsName:     pkg.GoodsName,
			GoodsCategory: pkg.GoodsCategory,
			Weight:        roundPositive(pkg.Weight),
			Volume:        roundPositive(pkg.Volume),
			Quantity:      pkg.Quantity,
			GoodsValue:    roundPositive(pkg.GoodsValue),
			InsuredAmount: roundPositive(pkg.InsuredAmount),
			Remark:        strings.TrimSpace(pkg.Remark),
		}
		if item.Quantity <= 0 {
			item.Quantity = 1
		}
		if err := tx.Create(&item).Error; err != nil {
			return nil, errors.New("创建包裹失败")
		}
		result = append(result, item)
	}
	return result, nil
}

func (s *OrderService) ensureLeafOrderPackages(tx *gorm.DB, order *models.Order) ([]models.OrderPackage, error) {
	var packages []models.OrderPackage
	if err := tx.Where("order_id = ?", order.ID).Order("id ASC").Find(&packages).Error; err != nil {
		return nil, errors.New("查询订单包裹失败")
	}
	if len(packages) > 0 {
		return packages, nil
	}
	rootID := order.RootOrderID
	if rootID == 0 {
		rootID = order.ID
	}
	packages = append(packages, models.OrderPackage{
		OrderID:       order.ID,
		RootOrderID:   rootID,
		SourceOrderID: order.ID,
		ParcelNo:      s.generateParcelNo(order.CustomerID, order.ID, 1),
		PackageType:   models.OrderPackageTypeNormal,
		GoodsName:     strings.TrimSpace(order.GoodsName),
		GoodsCategory: strings.TrimSpace(order.GoodsCategory),
		Weight:        roundPositive(order.GoodsWeight),
		Volume:        roundPositive(order.GoodsVolume),
		Quantity:      max(order.GoodsQuantity, 1),
		GoodsValue:    roundPositive(order.GoodsValue),
		InsuredAmount: roundPositive(order.InsuredAmount),
		Remark:        strings.TrimSpace(order.Remark),
	})
	if err := tx.Create(&packages[0]).Error; err != nil {
		return nil, errors.New("补建订单包裹失败")
	}
	return packages, nil
}

func max(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func (s *OrderService) loadOrderCounts(tx *gorm.DB, orderIDs []uint, rootIDs []uint) (*orderCountInfo, error) {
	info := &orderCountInfo{
		DirectPackages: map[uint]int{},
		RootPackages:   map[uint]int{},
		ChildOrders:    map[uint]int{},
	}
	if len(orderIDs) == 0 {
		return info, nil
	}
	var directRows []struct {
		OrderID uint
		Count   int
	}
	if err := tx.Model(&models.OrderPackage{}).
		Select("order_id, COUNT(*) as count").
		Where("order_id IN ?", orderIDs).
		Group("order_id").
		Scan(&directRows).Error; err != nil {
		return nil, errors.New("统计包裹数量失败")
	}
	for _, row := range directRows {
		info.DirectPackages[row.OrderID] = row.Count
	}

	if len(rootIDs) > 0 {
		var rootRows []struct {
			RootOrderID uint
			Count       int
		}
		if err := tx.Model(&models.OrderPackage{}).
			Select("root_order_id, COUNT(*) as count").
			Where("root_order_id IN ?", rootIDs).
			Group("root_order_id").
			Scan(&rootRows).Error; err != nil {
			return nil, errors.New("统计根单包裹数量失败")
		}
		for _, row := range rootRows {
			info.RootPackages[row.RootOrderID] = row.Count
		}
	}

	var childRows []struct {
		ParentOrderID uint
		Count         int
	}
	if err := tx.Model(&models.Order{}).
		Select("parent_order_id, COUNT(*) as count").
		Where("parent_order_id IN ?", orderIDs).
		Group("parent_order_id").
		Scan(&childRows).Error; err != nil {
		return nil, errors.New("统计子单数量失败")
	}
	for _, row := range childRows {
		info.ChildOrders[row.ParentOrderID] = row.Count
	}
	return info, nil
}

func (s *OrderService) loadOrderNoMap(tx *gorm.DB, ids []uint) (map[uint]string, error) {
	result := make(map[uint]string)
	if len(ids) == 0 {
		return result, nil
	}
	type orderNoRow struct {
		ID      uint
		OrderNo string
	}
	var rows []orderNoRow
	if err := tx.Model(&models.Order{}).Select("id, order_no").Where("id IN ?", ids).Find(&rows).Error; err != nil {
		return nil, errors.New("查询订单编号失败")
	}
	for _, row := range rows {
		result[row.ID] = row.OrderNo
	}
	return result, nil
}

func collectUniqueOrderIDs(ids ...[]uint) []uint {
	exists := make(map[uint]struct{})
	result := make([]uint, 0)
	for _, group := range ids {
		for _, id := range group {
			if id == 0 {
				continue
			}
			if _, ok := exists[id]; ok {
				continue
			}
			exists[id] = struct{}{}
			result = append(result, id)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i] < result[j] })
	return result
}

func (s *OrderService) resolvePackageCount(order models.Order, counts *orderCountInfo) int {
	rootID := order.RootOrderID
	if rootID == 0 {
		rootID = order.ID
	}
	if counts.ChildOrders[order.ID] > 0 && order.ParentOrderID == 0 {
		return counts.RootPackages[rootID]
	}
	return counts.DirectPackages[order.ID]
}

func (s *OrderService) buildOrderRelationSummary(order models.Order, packageCount int) dto.OrderRelationSummary {
	return dto.OrderRelationSummary{
		ID:            order.ID,
		OrderNo:       order.OrderNo,
		RelationType:  order.RelationType,
		HierarchyType: order.HierarchyType,
		Status:        int(order.Status),
		StatusName:    GetOrderStatusName(int(order.Status)),
		PackageCount:  packageCount,
		TotalAmount:   order.TotalAmount,
	}
}

func (s *OrderService) GetOrderDetailResponse(orderID uint) (*dto.OrderDetailResponse, error) {
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return nil, err
	}
	tx := database.DB
	rootID := order.RootOrderID
	if rootID == 0 {
		rootID = order.ID
	}

	var childOrders []models.Order
	if order.ParentOrderID == 0 {
		if err := tx.Where("parent_order_id = ?", order.ID).Order("id ASC").Find(&childOrders).Error; err != nil {
			return nil, errors.New("查询子单失败")
		}
	}

	packageFilterOrderIDs := []uint{order.ID}
	if order.ParentOrderID == 0 && len(childOrders) > 0 {
		packageFilterOrderIDs = make([]uint, 0, len(childOrders))
		for _, child := range childOrders {
			packageFilterOrderIDs = append(packageFilterOrderIDs, child.ID)
		}
	}

	var packages []models.OrderPackage
	if len(packageFilterOrderIDs) > 0 {
		if err := tx.Where("order_id IN ?", packageFilterOrderIDs).Order("order_id ASC, id ASC").Find(&packages).Error; err != nil {
			return nil, errors.New("查询订单包裹失败")
		}
	}

	orderIDs := []uint{order.ID}
	rootIDs := []uint{rootID}
	parentIDs := []uint{order.ParentOrderID, rootID}
	for _, child := range childOrders {
		orderIDs = append(orderIDs, child.ID)
		parentIDs = append(parentIDs, child.ParentOrderID)
	}
	for _, pkg := range packages {
		orderIDs = append(orderIDs, pkg.OrderID)
	}
	orderNoMap, err := s.loadOrderNoMap(tx, collectUniqueOrderIDs(orderIDs, parentIDs))
	if err != nil {
		return nil, err
	}
	counts, err := s.loadOrderCounts(tx, collectUniqueOrderIDs(orderIDs), rootIDs)
	if err != nil {
		return nil, err
	}

	packageInfos := make([]dto.OrderPackageInfo, 0, len(packages))
	for _, pkg := range packages {
		packageInfos = append(packageInfos, dto.OrderPackageInfo{
			ID:            pkg.ID,
			OrderID:       pkg.OrderID,
			OrderNo:       orderNoMap[pkg.OrderID],
			RootOrderID:   pkg.RootOrderID,
			SourceOrderID: pkg.SourceOrderID,
			ParcelNo:      pkg.ParcelNo,
			PackageType:   pkg.PackageType,
			GoodsName:     pkg.GoodsName,
			GoodsCategory: pkg.GoodsCategory,
			Weight:        pkg.Weight,
			Volume:        pkg.Volume,
			Quantity:      pkg.Quantity,
			GoodsValue:    pkg.GoodsValue,
			InsuredAmount: pkg.InsuredAmount,
			Remark:        pkg.Remark,
		})
	}

	childSummaries := make([]dto.OrderRelationSummary, 0, len(childOrders))
	for _, child := range childOrders {
		childSummaries = append(childSummaries, s.buildOrderRelationSummary(child, s.resolvePackageCount(child, counts)))
	}

	return &dto.OrderDetailResponse{
		ID:               order.ID,
		OrderNo:          order.OrderNo,
		CustomerID:       order.CustomerID,
		ParentOrderID:    order.ParentOrderID,
		ParentOrderNo:    orderNoMap[order.ParentOrderID],
		RootOrderID:      rootID,
		RootOrderNo:      orderNoMap[rootID],
		HierarchyType:    order.HierarchyType,
		RelationType:     order.RelationType,
		PackageCount:     s.resolvePackageCount(*order, counts),
		ChildOrderCount:  counts.ChildOrders[order.ID],
		SenderName:       order.SenderName,
		SenderPhone:      order.SenderPhone,
		SenderCountry:    order.SenderCountry,
		SenderProvince:   order.SenderProvince,
		SenderCity:       order.SenderCity,
		SenderAddress:    order.SenderAddress,
		SenderPostcode:   order.SenderPostcode,
		ReceiverName:     order.ReceiverName,
		ReceiverPhone:    order.ReceiverPhone,
		ReceiverCountry:  order.ReceiverCountry,
		ReceiverProvince: order.ReceiverProvince,
		ReceiverCity:     order.ReceiverCity,
		ReceiverAddress:  order.ReceiverAddress,
		ReceiverPostcode: order.ReceiverPostcode,
		GoodsName:        order.GoodsName,
		GoodsCategory:    order.GoodsCategory,
		GoodsWeight:      order.GoodsWeight,
		GoodsVolume:      order.GoodsVolume,
		GoodsQuantity:    order.GoodsQuantity,
		GoodsValue:       order.GoodsValue,
		IsInsured:        order.IsInsured,
		InsuredAmount:    order.InsuredAmount,
		TransportMode:    int(order.TransportMode),
		ServiceType:      order.ServiceType,
		EstimatedDays:    order.EstimatedDays,
		FreightCharge:    order.FreightCharge,
		CustomsFee:       order.CustomsFee,
		InsuranceFee:     order.InsuranceFee,
		OtherFee:         order.OtherFee,
		TotalAmount:      order.TotalAmount,
		Currency:         order.Currency,
		PaymentStatus:    order.PaymentStatus,
		Status:           int(order.Status),
		CurrentStation:   order.CurrentStation,
		OrderTime:        order.OrderTime,
		PickupTime:       order.PickupTime,
		DeliveryTime:     order.DeliveryTime,
		SignTime:         order.SignTime,
		Remark:           order.Remark,
		CTime:            order.CTime,
		MTime:            order.MTime,
		Packages:         packageInfos,
		ChildOrders:      childSummaries,
	}, nil
}

func (s *OrderService) canEditOrderStructure(order *models.Order) error {
	if order.ParentOrderID != 0 {
		return errors.New("子单暂不支持再次拆分或并入新的母单")
	}
	childCount, err := s.countChildOrders(database.DB, order.ID)
	if err != nil {
		return err
	}
	if childCount > 0 {
		return errors.New("当前订单已存在子单，不能重复调整结构")
	}
	if order.Status != models.OrderPending && order.Status != models.OrderAccepted {
		return errors.New("仅待处理或已接单状态的订单支持结构调整")
	}
	return nil
}

func (s *OrderService) countChildOrders(tx *gorm.DB, orderID uint) (int64, error) {
	var childCount int64
	if err := tx.Model(&models.Order{}).Where("parent_order_id = ?", orderID).Count(&childCount).Error; err != nil {
		return 0, errors.New("查询子单失败")
	}
	return childCount, nil
}

func (s *OrderService) ensureLeafOrderOperation(order *models.Order) error {
	childCount, err := s.countChildOrders(database.DB, order.ID)
	if err != nil {
		return err
	}
	if childCount > 0 {
		return errors.New("母单存在子单，请对子单执行具体操作")
	}
	return nil
}

func (s *OrderService) SplitOrder(orderID uint, req *dto.SplitOrderRequest) (*dto.SplitOrderResponse, error) {
	if len(req.ChildOrders) < 2 {
		return nil, errors.New("拆单至少需要两个子单")
	}
	var response *dto.SplitOrderResponse
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var parent models.Order
		if err := tx.First(&parent, orderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("订单不存在")
			}
			return errors.New("查询订单失败")
		}
		if err := s.canEditOrderStructure(&parent); err != nil {
			return err
		}
		if parent.RootOrderID == 0 {
			parent.RootOrderID = parent.ID
			if err := tx.Model(&models.Order{}).Where("id = ?", parent.ID).Update("root_order_id", parent.ID).Error; err != nil {
				return errors.New("更新母单根标识失败")
			}
		}

		packages, err := s.ensureLeafOrderPackages(tx, &parent)
		if err != nil {
			return err
		}
		if len(packages) < 2 {
			return errors.New("当前订单包裹数不足，无法拆单")
		}
		if len(req.ChildOrders) > len(packages) {
			return errors.New("子单数量不能超过包裹数量")
		}

		packageMap := make(map[uint]models.OrderPackage, len(packages))
		allPackageIDs := make([]uint, 0, len(packages))
		for _, pkg := range packages {
			packageMap[pkg.ID] = pkg
			allPackageIDs = append(allPackageIDs, pkg.ID)
		}

		assigned := make(map[uint]struct{}, len(packages))
		childPackages := make([][]models.OrderPackage, 0, len(req.ChildOrders))
		for _, childReq := range req.ChildOrders {
			items := make([]models.OrderPackage, 0, len(childReq.PackageIDs))
			for _, packageID := range childReq.PackageIDs {
				pkg, ok := packageMap[packageID]
				if !ok {
					return errors.New("拆单包裹不存在")
				}
				if _, exists := assigned[packageID]; exists {
					return errors.New("同一个包裹不能分配到多个子单")
				}
				assigned[packageID] = struct{}{}
				items = append(items, pkg)
			}
			if len(items) == 0 {
				return errors.New("每个子单至少要分配一个包裹")
			}
			childPackages = append(childPackages, items)
		}
		if len(assigned) != len(allPackageIDs) {
			return errors.New("拆单时必须分配父单下的全部包裹")
		}

		weights := make([]float64, 0, len(childPackages))
		for _, items := range childPackages {
			weight, _, _, _, _ := aggregatePackages(items)
			weights = append(weights, weight)
		}
		freightShares := allocateAmounts(parent.FreightCharge, weights)
		customsShares := allocateAmounts(parent.CustomsFee, weights)
		insuranceShares := allocateAmounts(parent.InsuranceFee, weights)
		otherShares := allocateAmounts(parent.OtherFee, weights)
		totalShares := allocateAmounts(parent.TotalAmount, weights)

		childSummaries := make([]dto.OrderRelationSummary, 0, len(req.ChildOrders))
		for index, childReq := range req.ChildOrders {
			items := childPackages[index]
			weight, volume, quantity, goodsValue, insuredAmount := aggregatePackages(items)
			childOrder := models.Order{
				OrderNo:          s.generateOrderNo(parent.CustomerID),
				CustomerID:       parent.CustomerID,
				ParentOrderID:    parent.ID,
				RootOrderID:      parent.ID,
				HierarchyType:    models.OrderHierarchyChild,
				RelationType:     models.OrderRelationSplitChild,
				SenderName:       parent.SenderName,
				SenderPhone:      parent.SenderPhone,
				SenderCountry:    parent.SenderCountry,
				SenderProvince:   parent.SenderProvince,
				SenderCity:       parent.SenderCity,
				SenderAddress:    parent.SenderAddress,
				SenderPostcode:   parent.SenderPostcode,
				ReceiverName:     parent.ReceiverName,
				ReceiverPhone:    parent.ReceiverPhone,
				ReceiverCountry:  parent.ReceiverCountry,
				ReceiverProvince: parent.ReceiverProvince,
				ReceiverCity:     parent.ReceiverCity,
				ReceiverAddress:  parent.ReceiverAddress,
				ReceiverPostcode: parent.ReceiverPostcode,
				GoodsName:        buildAggregateGoodsName(parent.GoodsName, items),
				GoodsCategory:    parent.GoodsCategory,
				GoodsWeight:      weight,
				GoodsVolume:      volume,
				GoodsQuantity:    quantity,
				GoodsValue:       goodsValue,
				IsInsured:        parent.IsInsured,
				InsuredAmount:    insuredAmount,
				TransportMode:    parent.TransportMode,
				ServiceType:      parent.ServiceType,
				EstimatedDays:    parent.EstimatedDays,
				OriginStationID:  parent.OriginStationID,
				DestStationID:    parent.DestStationID,
				FreightCharge:    freightShares[index],
				CustomsFee:       customsShares[index],
				InsuranceFee:     insuranceShares[index],
				OtherFee:         otherShares[index],
				TotalAmount:      totalShares[index],
				Currency:         parent.Currency,
				PaymentStatus:    parent.PaymentStatus,
				Status:           parent.Status,
				CurrentStation:   parent.CurrentStation,
				OrderTime:        time.Now().Unix(),
				PickupTime:       parent.PickupTime,
				DeliveryTime:     parent.DeliveryTime,
				SignTime:         parent.SignTime,
				Remark:           mergeRemark(parent.Remark, childReq.Remark),
			}
			if err := s.createOrderRecord(tx, &childOrder); err != nil {
				return err
			}
			itemIDs := make([]uint, 0, len(items))
			for _, item := range items {
				itemIDs = append(itemIDs, item.ID)
			}
			if err := tx.Model(&models.OrderPackage{}).
				Where("id IN ?", itemIDs).
				Updates(map[string]interface{}{
					"order_id":        childOrder.ID,
					"root_order_id":   parent.ID,
					"source_order_id": parent.ID,
					"package_type":    models.OrderPackageTypeSplitChild,
				}).Error; err != nil {
				return errors.New("更新拆单包裹失败")
			}
			childSummaries = append(childSummaries, s.buildOrderRelationSummary(childOrder, len(items)))
		}

		if err := tx.Model(&models.Order{}).
			Where("id = ?", parent.ID).
			Updates(map[string]interface{}{
				"root_order_id":  parent.ID,
				"hierarchy_type": models.OrderHierarchyMaster,
				"relation_type":  models.OrderRelationSplitParent,
			}).Error; err != nil {
			return errors.New("更新母单结构失败")
		}

		response = &dto.SplitOrderResponse{
			ParentOrderID: parent.ID,
			ParentOrderNo: parent.OrderNo,
			ChildOrders:   childSummaries,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (s *OrderService) MergeOrders(req *dto.MergeOrdersRequest) (*dto.MergeOrdersResponse, error) {
	if len(req.SourceOrderIDs) < 2 {
		return nil, errors.New("合单至少需要两个来源订单")
	}
	var response *dto.MergeOrdersResponse
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		sourceIDs := collectUniqueOrderIDs(req.SourceOrderIDs)
		var sourceOrders []models.Order
		if err := tx.Where("id IN ?", sourceIDs).Order("id ASC").Find(&sourceOrders).Error; err != nil {
			return errors.New("查询来源订单失败")
		}
		if len(sourceOrders) != len(sourceIDs) {
			return errors.New("存在来源订单不存在")
		}

		first := sourceOrders[0]
		for _, order := range sourceOrders {
			if err := s.canEditOrderStructure(&order); err != nil {
				return err
			}
			if order.CustomerID != first.CustomerID ||
				order.SenderCountry != first.SenderCountry ||
				order.SenderCity != first.SenderCity ||
				order.SenderAddress != first.SenderAddress ||
				order.ReceiverCountry != first.ReceiverCountry ||
				order.ReceiverCity != first.ReceiverCity ||
				order.ReceiverAddress != first.ReceiverAddress ||
				order.TransportMode != first.TransportMode ||
				order.ServiceType != first.ServiceType ||
				order.Status != first.Status {
				return errors.New("合单只支持相同客户、线路、服务类型和状态的订单")
			}
		}

		totalWeight := 0.0
		totalVolume := 0.0
		totalQuantity := 0
		totalValue := 0.0
		totalInsured := 0.0
		totalFreight := 0.0
		totalCustoms := 0.0
		totalInsurance := 0.0
		totalOther := 0.0
		totalAmount := 0.0
		childSummaries := make([]dto.OrderRelationSummary, 0, len(sourceOrders))
		for _, order := range sourceOrders {
			packages, err := s.ensureLeafOrderPackages(tx, &order)
			if err != nil {
				return err
			}
			weight, volume, quantity, goodsValue, insuredAmount := aggregatePackages(packages)
			totalWeight += weight
			totalVolume += volume
			totalQuantity += quantity
			totalValue += goodsValue
			totalInsured += insuredAmount
			totalFreight += order.FreightCharge
			totalCustoms += order.CustomsFee
			totalInsurance += order.InsuranceFee
			totalOther += order.OtherFee
			totalAmount += order.TotalAmount
			childSummaries = append(childSummaries, s.buildOrderRelationSummary(order, len(packages)))
		}

		parentOrder := models.Order{
			OrderNo:          s.generateOrderNo(first.CustomerID),
			CustomerID:       first.CustomerID,
			ParentOrderID:    0,
			RootOrderID:      0,
			HierarchyType:    models.OrderHierarchyMaster,
			RelationType:     models.OrderRelationMergeParent,
			SenderName:       first.SenderName,
			SenderPhone:      first.SenderPhone,
			SenderCountry:    first.SenderCountry,
			SenderProvince:   first.SenderProvince,
			SenderCity:       first.SenderCity,
			SenderAddress:    first.SenderAddress,
			SenderPostcode:   first.SenderPostcode,
			ReceiverName:     first.ReceiverName,
			ReceiverPhone:    first.ReceiverPhone,
			ReceiverCountry:  first.ReceiverCountry,
			ReceiverProvince: first.ReceiverProvince,
			ReceiverCity:     first.ReceiverCity,
			ReceiverAddress:  first.ReceiverAddress,
			ReceiverPostcode: first.ReceiverPostcode,
			GoodsName:        buildAggregateGoodsName(first.GoodsName, nil),
			GoodsCategory:    first.GoodsCategory,
			GoodsWeight:      roundPositive(totalWeight),
			GoodsVolume:      roundPositive(totalVolume),
			GoodsQuantity:    max(totalQuantity, len(sourceOrders)),
			GoodsValue:       roundPositive(totalValue),
			IsInsured:        first.IsInsured,
			InsuredAmount:    roundPositive(totalInsured),
			TransportMode:    first.TransportMode,
			ServiceType:      first.ServiceType,
			EstimatedDays:    first.EstimatedDays,
			OriginStationID:  first.OriginStationID,
			DestStationID:    first.DestStationID,
			FreightCharge:    roundCurrency(totalFreight),
			CustomsFee:       roundCurrency(totalCustoms),
			InsuranceFee:     roundCurrency(totalInsurance),
			OtherFee:         roundCurrency(totalOther),
			TotalAmount:      roundCurrency(totalAmount),
			Currency:         first.Currency,
			PaymentStatus:    first.PaymentStatus,
			Status:           first.Status,
			CurrentStation:   first.CurrentStation,
			OrderTime:        time.Now().Unix(),
			PickupTime:       first.PickupTime,
			DeliveryTime:     first.DeliveryTime,
			SignTime:         first.SignTime,
			Remark:           mergeRemark(first.Remark, req.Remark),
		}
		if parentOrder.GoodsName == "" {
			parentOrder.GoodsName = "合单母单"
		}
		if err := s.createOrderRecord(tx, &parentOrder); err != nil {
			return err
		}

		if err := tx.Model(&models.Order{}).
			Where("id IN ?", sourceIDs).
			Updates(map[string]interface{}{
				"parent_order_id": parentOrder.ID,
				"root_order_id":   parentOrder.ID,
				"hierarchy_type":  models.OrderHierarchyChild,
				"relation_type":   models.OrderRelationMergeChild,
			}).Error; err != nil {
			return errors.New("更新来源订单结构失败")
		}
		if err := tx.Model(&models.OrderPackage{}).
			Where("order_id IN ?", sourceIDs).
			Updates(map[string]interface{}{
				"root_order_id": parentOrder.ID,
				"package_type":  models.OrderPackageTypeMergeChild,
			}).Error; err != nil {
			return errors.New("更新合单包裹失败")
		}

		response = &dto.MergeOrdersResponse{
			ParentOrderID: parentOrder.ID,
			ParentOrderNo: parentOrder.OrderNo,
			ChildOrders:   childSummaries,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return response, nil
}
