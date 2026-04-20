package services

import (
	"errors"
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"
	"strings"
	"time"

	"gorm.io/gorm"
)

var customsNodeNameMap = map[string]string{
	models.CustomsNodeDeclared:       "申报已提交",
	models.CustomsNodeDocumentsReady: "资料齐备",
	models.CustomsNodeReviewing:      "海关审核中",
	models.CustomsNodeDutyPending:    "税费待缴",
	models.CustomsNodeDutyPaid:       "税费已缴",
	models.CustomsNodeInspection:     "查验处理中",
	models.CustomsNodeReleased:       "清关放行",
	models.CustomsNodeException:      "关务异常",
}

func getCustomsStatusName(status string) string {
	if name, ok := customsNodeNameMap[status]; ok {
		return name
	}
	switch status {
	case "", "pending":
		return "待申报"
	default:
		return "未知状态"
	}
}

func getCustomsNodeStatusName(status string) string {
	switch status {
	case "", "completed":
		return "已完成"
	case "pending":
		return "待处理"
	case "failed":
		return "失败"
	default:
		return "未知状态"
	}
}

func isCustomsNodeCodeValid(code string) bool {
	_, ok := customsNodeNameMap[code]
	return ok
}

func (s *OrderService) buildOrderCustomsInfo(order models.Order) dto.OrderCustomsInfo {
	return dto.OrderCustomsInfo{
		CustomsDeclaration: order.CustomsDeclaration,
		HSCode:             order.HSCode,
		DeclaredValue:      order.DeclaredValue,
		CustomsDuty:        order.CustomsDuty,
		CustomsVAT:         order.CustomsVAT,
		CustomsOtherTax:    order.CustomsOtherTax,
		CustomsFee:         order.CustomsFee,
		CustomsStatus:      order.CustomsStatus,
		CustomsStatusName:  getCustomsStatusName(order.CustomsStatus),
	}
}

func (s *OrderService) loadOrderCustomsNodes(tx *gorm.DB, orderID uint) ([]dto.OrderCustomsNodeInfo, error) {
	var nodes []models.OrderCustomsNode
	if err := tx.Where("order_id = ?", orderID).Order("node_time DESC, id DESC").Find(&nodes).Error; err != nil {
		return nil, errors.New("查询清关节点失败")
	}
	if len(nodes) == 0 {
		return []dto.OrderCustomsNodeInfo{}, nil
	}

	operatorIDs := make([]uint, 0, len(nodes))
	for _, node := range nodes {
		if node.OperatorID > 0 {
			operatorIDs = append(operatorIDs, node.OperatorID)
		}
	}
	userMap, err := s.loadOrderCustomsUserMap(tx, operatorIDs)
	if err != nil {
		return nil, err
	}

	result := make([]dto.OrderCustomsNodeInfo, 0, len(nodes))
	for _, node := range nodes {
		result = append(result, dto.OrderCustomsNodeInfo{
			ID:             node.ID,
			NodeCode:       node.NodeCode,
			NodeName:       getCustomsStatusName(node.NodeCode),
			NodeStatus:     node.NodeStatus,
			NodeStatusName: getCustomsNodeStatusName(node.NodeStatus),
			DutyAmount:     node.DutyAmount,
			VATAmount:      node.VATAmount,
			OtherTaxAmount: node.OtherTaxAmount,
			OperatorID:     node.OperatorID,
			OperatorName:   userMap[node.OperatorID],
			Remark:         node.Remark,
			NodeTime:       node.NodeTime,
			NodeTimeText:   utils.FormatTimestamp(node.NodeTime),
		})
	}
	return result, nil
}

func (s *OrderService) loadOrderCustomsUserMap(tx *gorm.DB, userIDs []uint) (map[uint]string, error) {
	result := make(map[uint]string)
	if len(userIDs) == 0 {
		return result, nil
	}
	var users []models.User
	if err := tx.Select("id, username, real_name").Where("id IN ?", collectUniqueOrderIDs(userIDs)).Find(&users).Error; err != nil {
		return nil, errors.New("查询清关操作人失败")
	}
	for _, user := range users {
		name := strings.TrimSpace(user.RealName)
		if name == "" {
			name = user.Username
		}
		result[user.ID] = name
	}
	return result, nil
}

func (s *OrderService) updateOrderStatusTx(tx *gorm.DB, order *models.Order, newStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	stateMachine := &OrderStateMachine{}
	if err := stateMachine.ValidateTransition(order.Status, newStatus, operatorRole); err != nil {
		return err
	}

	updates := map[string]interface{}{
		"status": newStatus,
	}
	currentTime := time.Now().Unix()
	switch newStatus {
	case models.OrderDelivered:
		updates["delivery_time"] = currentTime
	case models.OrderSigned:
		updates["sign_time"] = currentTime
	}
	if remark != "" {
		updates["remark"] = remark
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

func (s *OrderService) createOrderStatusLogTx(tx *gorm.DB, orderID uint, fromStatus, toStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	var user models.User
	if err := tx.Select("id, username, real_name").Where("id = ?", operatorID).First(&user).Error; err != nil {
		return errors.New("查询清关操作人失败")
	}

	operatorName := strings.TrimSpace(user.RealName)
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

func (s *OrderService) createCustomsTrackingRecordTx(tx *gorm.DB, orderID uint, operatorID uint, location string, status string, description string, trackTime int64) error {
	record := models.TrackingRecord{
		OrderID:     orderID,
		Location:    location,
		Status:      status,
		Description: description,
		OperatorID:  operatorID,
		CTime:       trackTime,
		MTime:       trackTime,
	}
	if err := tx.Create(&record).Error; err != nil {
		return errors.New("创建清关追踪记录失败")
	}
	return nil
}

func (s *OrderService) UpdateOrderCustoms(orderID uint, req *dto.UpdateOrderCustomsRequest) error {
	order, err := s.GetOrderByID(orderID)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{}
	customsDeclaration := strings.TrimSpace(req.CustomsDeclaration)
	if customsDeclaration != "" {
		updates["customs_declaration"] = customsDeclaration
	}
	if req.HSCode != "" {
		normalizedHSCode, err := validateHSCodeFormat(req.HSCode)
		if err != nil {
			return err
		}
		updates["hs_code"] = normalizedHSCode
	}
	if req.DeclaredValue > 0 {
		updates["declared_value"] = roundPositive(req.DeclaredValue)
	}

	duty := order.CustomsDuty
	vat := order.CustomsVAT
	other := order.CustomsOtherTax
	if req.CustomsDuty > 0 || order.CustomsDuty > 0 {
		duty = roundPositive(req.CustomsDuty)
		updates["customs_duty"] = duty
	}
	if req.CustomsVAT > 0 || order.CustomsVAT > 0 {
		vat = roundPositive(req.CustomsVAT)
		updates["customs_vat"] = vat
	}
	if req.CustomsOtherTax > 0 || order.CustomsOtherTax > 0 {
		other = roundPositive(req.CustomsOtherTax)
		updates["customs_other_tax"] = other
	}
	if req.CustomsStatus != "" {
		status := strings.TrimSpace(req.CustomsStatus)
		updates["customs_status"] = status
	}

	currentDeclaration := customsDeclaration
	if currentDeclaration == "" {
		currentDeclaration = order.CustomsDeclaration
	}
	currentHSCode := order.HSCode
	if value, ok := updates["hs_code"].(string); ok {
		currentHSCode = value
	}
	if currentHSCode == "" || currentDeclaration == "" {
		suggestion := NewHSCodeService().Suggest(&dto.HSCodeSuggestRequest{
			GoodsName:          order.GoodsName,
			GoodsCategory:      order.GoodsCategory,
			CustomsDeclaration: currentDeclaration,
		})
		if suggestion.Suggestion != nil {
			if currentHSCode == "" {
				updates["hs_code"] = suggestion.Suggestion.HSCode
			}
			if currentDeclaration == "" {
				updates["customs_declaration"] = suggestion.Suggestion.CustomsDeclaration
			}
		}
	}

	updates["customs_fee"] = calculateCustomsFee(duty, vat, other)
	updates["total_amount"] = roundCurrency(order.FreightCharge + order.InsuranceFee + order.OtherFee + calculateCustomsFee(duty, vat, other))
	if req.Remark != "" {
		updates["remark"] = mergeRemark(order.Remark, req.Remark)
	}

	if len(updates) == 0 {
		return errors.New("没有要更新的清关字段")
	}
	if err := database.DB.Model(&models.Order{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
		return errors.New("更新清关信息失败")
	}
	return nil
}

func (s *OrderService) AddOrderCustomsNode(orderID uint, operatorID uint, operatorRole int, req *dto.CreateOrderCustomsNodeRequest) (*dto.OrderCustomsNodeInfo, error) {
	nodeCode := strings.TrimSpace(req.NodeCode)
	if !isCustomsNodeCodeValid(nodeCode) {
		return nil, errors.New("无效的清关节点")
	}
	nodeStatus := strings.TrimSpace(req.NodeStatus)
	if nodeStatus == "" {
		nodeStatus = "completed"
	}
	nodeTime := req.NodeTime
	if nodeTime <= 0 {
		nodeTime = time.Now().Unix()
	}

	var result *dto.OrderCustomsNodeInfo
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.First(&order, orderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("订单不存在")
			}
			return errors.New("查询订单失败")
		}

		node := &models.OrderCustomsNode{
			OrderID:        order.ID,
			NodeCode:       nodeCode,
			NodeStatus:     nodeStatus,
			DutyAmount:     roundPositive(req.DutyAmount),
			VATAmount:      roundPositive(req.VATAmount),
			OtherTaxAmount: roundPositive(req.OtherTaxAmount),
			OperatorID:     operatorID,
			Remark:         strings.TrimSpace(req.Remark),
			NodeTime:       nodeTime,
		}
		if err := tx.Create(node).Error; err != nil {
			return errors.New("创建清关节点失败")
		}

		updates := map[string]interface{}{
			"customs_status": nodeCode,
		}
		if node.DutyAmount > 0 || node.VATAmount > 0 || node.OtherTaxAmount > 0 {
			duty := node.DutyAmount
			vat := node.VATAmount
			other := node.OtherTaxAmount
			updates["customs_duty"] = duty
			updates["customs_vat"] = vat
			updates["customs_other_tax"] = other
			updates["customs_fee"] = calculateCustomsFee(duty, vat, other)
			updates["total_amount"] = roundCurrency(order.FreightCharge + order.InsuranceFee + order.OtherFee + calculateCustomsFee(duty, vat, other))
		}
		if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			return errors.New("更新订单清关状态失败")
		}

		statusRemark := fmt.Sprintf("清关节点：%s", getCustomsStatusName(nodeCode))
		if nodeCode == models.CustomsNodeDeclared || nodeCode == models.CustomsNodeDocumentsReady || nodeCode == models.CustomsNodeReviewing || nodeCode == models.CustomsNodeDutyPending || nodeCode == models.CustomsNodeDutyPaid || nodeCode == models.CustomsNodeInspection {
			if order.Status != models.OrderCustomsClearing {
				if err := s.updateOrderStatusTx(tx, &order, models.OrderCustomsClearing, operatorID, operatorRole, statusRemark); err != nil {
					return err
				}
			}
		}
		if nodeCode == models.CustomsNodeReleased && order.Status == models.OrderCustomsClearing {
			if err := s.updateOrderStatusTx(tx, &order, models.OrderDestinationSorting, operatorID, operatorRole, statusRemark); err != nil {
				return err
			}
		}

		if err := s.createCustomsTrackingRecordTx(tx, order.ID, operatorID, "海关", getCustomsStatusName(nodeCode), mergeRemark(getCustomsStatusName(nodeCode), req.Remark), nodeTime); err != nil {
			return err
		}

		userMap, err := s.loadOrderCustomsUserMap(tx, []uint{operatorID})
		if err != nil {
			return err
		}
		result = &dto.OrderCustomsNodeInfo{
			ID:             node.ID,
			NodeCode:       node.NodeCode,
			NodeName:       getCustomsStatusName(node.NodeCode),
			NodeStatus:     node.NodeStatus,
			NodeStatusName: getCustomsNodeStatusName(node.NodeStatus),
			DutyAmount:     node.DutyAmount,
			VATAmount:      node.VATAmount,
			OtherTaxAmount: node.OtherTaxAmount,
			OperatorID:     node.OperatorID,
			OperatorName:   userMap[node.OperatorID],
			Remark:         node.Remark,
			NodeTime:       node.NodeTime,
			NodeTimeText:   utils.FormatTimestamp(node.NodeTime),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *OrderService) CreateOrderCustomsException(orderID uint, operatorID uint, operatorRole int, req *dto.CreateOrderCustomsExceptionRequest) (*dto.CreateOrderCustomsExceptionResponse, error) {
	exceptionService := NewExceptionService()
	exception, err := exceptionService.CreateException(operatorID, operatorRole, &dto.CreateExceptionRequest{
		OrderID:     orderID,
		Type:        int(models.ExceptionCustoms),
		StationID:   0,
		Description: strings.TrimSpace(req.Description),
		Remark:      strings.TrimSpace(req.Remark),
	})
	if err != nil {
		return nil, err
	}

	_, nodeErr := s.AddOrderCustomsNode(orderID, operatorID, operatorRole, &dto.CreateOrderCustomsNodeRequest{
		NodeCode:   models.CustomsNodeException,
		NodeStatus: "failed",
		Remark:     mergeRemark(req.Description, req.Remark),
	})
	if nodeErr != nil {
		return nil, nodeErr
	}

	return &dto.CreateOrderCustomsExceptionResponse{
		ExceptionID: exception.ID,
		ExceptionNo: exception.ExceptionNo,
	}, nil
}
