package services

import (
	"errors"
	"logistics-system/models"
)

// OrderStateMachine 订单状态机
type OrderStateMachine struct{}

// StateTransition 状态转换规则
type StateTransition struct {
	FromStatus models.OrderStatus
	ToStatus   models.OrderStatus
	AllowedBy  []int // 允许执行此转换的角色
}

// 状态转换规则表
var stateTransitions = []StateTransition{
	// 待处理 -> 已接单（调度员、管理员）
	{FromStatus: models.OrderPending, ToStatus: models.OrderAccepted, AllowedBy: []int{6, 7}},

	// 待处理 -> 已取消（客户、调度员、管理员）
	{FromStatus: models.OrderPending, ToStatus: models.OrderCancelled, AllowedBy: []int{1, 6, 7}},

	// 已接单 -> 已入库（站点管理员、调度员、管理员）
	{FromStatus: models.OrderAccepted, ToStatus: models.OrderInWarehouse, AllowedBy: []int{5, 6, 7}},

	// 已接单 -> 已取消（客户、调度员、管理员）
	{FromStatus: models.OrderAccepted, ToStatus: models.OrderCancelled, AllowedBy: []int{1, 6, 7}},

	// 已入库 -> 分拣中（分拣员、站点管理员、调度员、管理员）
	{FromStatus: models.OrderInWarehouse, ToStatus: models.OrderSorting, AllowedBy: []int{3, 5, 6, 7}},

	// 分拣中 -> 运输中（司机、调度员、管理员）
	{FromStatus: models.OrderSorting, ToStatus: models.OrderInTransit, AllowedBy: []int{4, 6, 7}},

	// 运输中 -> 清关中（调度员、管理员）
	{FromStatus: models.OrderInTransit, ToStatus: models.OrderCustomsClearing, AllowedBy: []int{6, 7}},

	// 运输中 -> 目的地分拣（调度员、管理员）
	{FromStatus: models.OrderInTransit, ToStatus: models.OrderDestinationSorting, AllowedBy: []int{6, 7}},

	// 清关中 -> 目的地分拣（调度员、管理员）
	{FromStatus: models.OrderCustomsClearing, ToStatus: models.OrderDestinationSorting, AllowedBy: []int{6, 7}},

	// 目的地分拣 -> 配送中（快递员、调度员、管理员）
	{FromStatus: models.OrderDestinationSorting, ToStatus: models.OrderDelivering, AllowedBy: []int{2, 6, 7}},

	// 配送中 -> 已送达（快递员、调度员、管理员）
	{FromStatus: models.OrderDelivering, ToStatus: models.OrderDelivered, AllowedBy: []int{2, 6, 7}},

	// 已送达 -> 已签收（快递员、调度员、管理员）
	{FromStatus: models.OrderDelivered, ToStatus: models.OrderSigned, AllowedBy: []int{2, 6, 7}},

	// 任何状态 -> 异常（除已取消、已签收外）
	{FromStatus: models.OrderPending, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderAccepted, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderInWarehouse, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderSorting, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderInTransit, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderCustomsClearing, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderDestinationSorting, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderDelivering, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},
	{FromStatus: models.OrderDelivered, ToStatus: models.OrderException, AllowedBy: []int{2, 3, 4, 5, 6, 7}},

	// 异常 -> 恢复到之前的状态（调度员、管理员）
	{FromStatus: models.OrderException, ToStatus: models.OrderPending, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderAccepted, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderInWarehouse, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderSorting, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderInTransit, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderCustomsClearing, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderDestinationSorting, AllowedBy: []int{6, 7}},
	{FromStatus: models.OrderException, ToStatus: models.OrderDelivering, AllowedBy: []int{6, 7}},
}

// CanTransition 检查是否可以进行状态转换
func (sm *OrderStateMachine) CanTransition(fromStatus, toStatus models.OrderStatus, userRole int) bool {
	// 状态相同，不需要转换
	if fromStatus == toStatus {
		return false
	}

	// 已取消和已签收是终态，不能再转换
	if fromStatus == models.OrderCancelled || fromStatus == models.OrderSigned {
		return false
	}

	// 查找匹配的转换规则
	for _, transition := range stateTransitions {
		if transition.FromStatus == fromStatus && transition.ToStatus == toStatus {
			// 检查角色权限
			for _, allowedRole := range transition.AllowedBy {
				if allowedRole == userRole {
					return true
				}
			}
			return false
		}
	}

	return false
}

// GetAllowedTransitions 获取当前状态允许的所有转换
func (sm *OrderStateMachine) GetAllowedTransitions(currentStatus models.OrderStatus, userRole int) []models.OrderStatus {
	var allowed []models.OrderStatus

	// 已取消和已签收是终态
	if currentStatus == models.OrderCancelled || currentStatus == models.OrderSigned {
		return allowed
	}

	// 遍历所有转换规则
	for _, transition := range stateTransitions {
		if transition.FromStatus == currentStatus {
			// 检查角色权限
			for _, allowedRole := range transition.AllowedBy {
				if allowedRole == userRole {
					// 避免重复
					found := false
					for _, status := range allowed {
						if status == transition.ToStatus {
							found = true
							break
						}
					}
					if !found {
						allowed = append(allowed, transition.ToStatus)
					}
					break
				}
			}
		}
	}

	return allowed
}

// ValidateTransition 验证状态转换并返回错误信息
func (sm *OrderStateMachine) ValidateTransition(fromStatus, toStatus models.OrderStatus, userRole int) error {
	// 状态相同
	if fromStatus == toStatus {
		return errors.New("目标状态与当前状态相同")
	}

	// 终态检查
	if fromStatus == models.OrderCancelled {
		return errors.New("已取消的订单不能修改状态")
	}
	if fromStatus == models.OrderSigned {
		return errors.New("已签收的订单不能修改状态")
	}

	// 查找转换规则
	found := false
	hasPermission := false

	for _, transition := range stateTransitions {
		if transition.FromStatus == fromStatus && transition.ToStatus == toStatus {
			found = true
			// 检查权限
			for _, allowedRole := range transition.AllowedBy {
				if allowedRole == userRole {
					hasPermission = true
					break
				}
			}
			break
		}
	}

	if !found {
		return errors.New("不允许的状态转换")
	}

	if !hasPermission {
		return errors.New("无权执行此状态转换")
	}

	return nil
}

// GetStatusFlow 获取订单的标准流程
func (sm *OrderStateMachine) GetStatusFlow() []models.OrderStatus {
	return []models.OrderStatus{
		models.OrderPending,            // 1. 待处理
		models.OrderAccepted,           // 2. 已接单
		models.OrderInWarehouse,        // 3. 已入库
		models.OrderSorting,            // 4. 分拣中
		models.OrderInTransit,          // 5. 运输中
		models.OrderCustomsClearing,    // 6. 清关中（可选）
		models.OrderDestinationSorting, // 7. 目的地分拣
		models.OrderDelivering,         // 8. 配送中
		models.OrderDelivered,          // 9. 已送达
		models.OrderSigned,             // 10. 已签收
	}
}
