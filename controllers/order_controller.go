package controllers

import (
	"fmt"
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type OrderController struct {
	orderService *services.OrderService
}

// NewOrderController 创建订单控制器实例
func NewOrderController() *OrderController {
	return &OrderController{
		orderService: services.NewOrderService(),
	}
}

// CreateOrder 创建订单
// @Summary 创建订单
// @Description 创建新的物流订单，系统自动计算运费
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param body body dto.CreateOrderRequest true "订单信息"
// @Success 200 {object} dto.CreateOrderResponse
// @Router /api/orders [post]
func (ctrl *OrderController) CreateOrder(c *gin.Context) {
	// 获取当前登录用户ID
	_, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	if role := userRole.(int); role != 2 && role != 5 && role != 7 {
		utils.Forbidden(c, "当前角色无权录入新订单")
		return
	}

	// 绑定请求参数
	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层创建订单
	order, err := ctrl.orderService.CreateOrder(req.CustomerID, &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	// 返回订单信息
	packageCount := len(req.Packages)
	if packageCount == 0 {
		packageCount = 1
	}
	response := dto.CreateOrderResponse{
		OrderID:       order.ID,
		OrderNo:       order.OrderNo,
		FreightCharge: order.FreightCharge,
		InsuranceFee:  order.InsuranceFee,
		TotalAmount:   order.TotalAmount,
		EstimatedDays: order.EstimatedDays,
		OrderTime:     order.OrderTime,
		PackageCount:  packageCount,
	}

	utils.Success(c, response)
}

// GetOrderList 获取订单列表
// @Summary 获取订单列表
// @Description 支持分页、搜索和筛选的订单列表查询
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param order_no query string false "订单号（模糊搜索）"
// @Param status query int false "订单状态"
// @Param sender_country query string false "发件国家"
// @Param receiver_country query string false "收件国家"
// @Param start_time query int64 false "开始时间（Unix时间戳）"
// @Param end_time query int64 false "结束时间（Unix时间戳）"
// @Success 200 {object} dto.OrderListResponse
// @Router /api/orders [get]
func (ctrl *OrderController) GetOrderList(c *gin.Context) {
	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定查询参数
	var req dto.OrderQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	result, err := ctrl.orderService.GetOrderList(userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetOrderDetail 获取订单详情
// @Summary 获取订单详情
// @Description 根据订单ID获取订单详细信息
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Success 200 {object} models.Order
// @Router /api/orders/{id} [get]
func (ctrl *OrderController) GetOrderDetail(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 查询订单
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 权限检查：普通用户只能查看自己的订单
	if userRole.(int) != 6 && userRole.(int) != 7 {
		if order.CustomerID != userID.(uint) {
			utils.Forbidden(c, "无权查看此订单")
			return
		}
	}

	detail, err := ctrl.orderService.GetOrderDetailResponse(orderID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, detail)
}

// UpdateOrderStatus 更新订单状态
// @Summary 更新订单状态
// @Description 管理员和调度员可以更新订单状态，需遵循状态机规则
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Param body body dto.UpdateOrderStatusRequest true "状态信息"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id}/status [put]
func (ctrl *OrderController) UpdateOrderStatus(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定请求参数
	var req dto.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	if err := ctrl.orderService.UpdateOrderStatus(orderID, req.Status, userID.(uint), userRole.(int), req.Remark); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "订单状态更新成功",
	})
}

// UpdateOrder 修改订单信息
// @Summary 修改订单信息
// @Description 修改订单的收件人信息和备注（仅待处理状态可修改）
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Param body body dto.UpdateOrderRequest true "修改信息"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id} [put]
func (ctrl *OrderController) UpdateOrder(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定请求参数
	var req dto.UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	if err := ctrl.orderService.UpdateOrder(orderID, userID.(uint), userRole.(int), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "订单修改成功",
	})
}

// CancelOrder 取消订单
// @Summary 取消订单
// @Description 取消订单（仅待处理和已接单状态可取消）
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id}/cancel [put]
func (ctrl *OrderController) CancelOrder(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 调用服务层
	if err := ctrl.orderService.CancelOrder(orderID, userID.(uint), userRole.(int)); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "订单已取消",
	})
}

// DeleteOrder 删除订单
// @Summary 删除订单
// @Description 删除订单（仅管理员可删除已取消的订单）
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id} [delete]
func (ctrl *OrderController) DeleteOrder(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 调用服务层
	if err := ctrl.orderService.DeleteOrder(orderID, userID.(uint), userRole.(int)); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "订单删除成功",
	})
}

// GetOrderStatistics 获取订单统计信息
// @Summary 获取订单统计
// @Description 获取订单统计信息，支持按状态、运输方式、国家等维度统计
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param start_time query int64 false "开始时间（Unix时间戳）"
// @Param end_time query int64 false "结束时间（Unix时间戳）"
// @Param group_by query string false "分组方式：date（按日期）"
// @Success 200 {object} dto.OrderStatisticsResponse
// @Router /api/orders/statistics [get]
func (ctrl *OrderController) SplitOrder(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "鏃犳晥鐨勮鍗旾D")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "鏈櫥褰?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "当前角色无权拆单")
		return
	}

	var req dto.SplitOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "鍙傛暟閿欒: "+err.Error())
		return
	}

	result, err := ctrl.orderService.SplitOrder(orderID, &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) MergeOrders(c *gin.Context) {
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "鏈櫥褰?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "当前角色无权合单")
		return
	}

	var req dto.MergeOrdersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "鍙傛暟閿欒: "+err.Error())
		return
	}

	result, err := ctrl.orderService.MergeOrders(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) GetOrderStatistics(c *gin.Context) {
	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定查询参数
	var req dto.OrderStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	result, err := ctrl.orderService.GetOrderStatistics(userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetAllowedStatusTransitions 获取订单允许的状态转换
// @Summary 获取允许的状态转换
// @Description 获取当前订单状态允许转换到的状态列表
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Success 200 {object} dto.AllowedTransitionsResponse
// @Router /api/orders/{id}/transitions [get]
func (ctrl *OrderController) GetAllowedStatusTransitions(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户角色
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 获取订单信息
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 获取允许的状态转换
	allowed, err := ctrl.orderService.GetAllowedStatusTransitions(orderID, userRole.(int))
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	// 构建响应
	response := dto.AllowedTransitionsResponse{
		CurrentStatus:     int(order.Status),
		CurrentStatusName: services.GetOrderStatusName(int(order.Status)),
		AllowedStatuses:   make([]dto.StatusTransitionOption, 0),
	}

	for _, status := range allowed {
		response.AllowedStatuses = append(response.AllowedStatuses, dto.StatusTransitionOption{
			Status:     int(status),
			StatusName: services.GetOrderStatusName(int(status)),
		})
	}

	utils.Success(c, response)
}

// GetOrderStatusLogs 获取订单状态变更日志
// @Summary 获取订单状态变更日志
// @Description 获取订单的所有状态变更历史记录
// @Tags 订单管理
// @Accept json
// @Produce json
// @Param id path int true "订单ID"
// @Success 200 {object} []dto.OrderStatusLogResponse
// @Router /api/orders/{id}/status-logs [get]
func (ctrl *OrderController) GetOrderStatusLogs(c *gin.Context) {
	// 获取订单ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "无效的订单ID")
		return
	}

	// 获取当前用户信息
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 验证订单访问权限
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 权限检查：普通用户只能查看自己的订单日志
	if userRole.(int) == 1 && order.CustomerID != userID.(uint) {
		utils.Forbidden(c, "无权查看此订单的状态日志")
		return
	}

	// 获取状态变更日志
	logs, err := ctrl.orderService.GetOrderStatusLogs(orderID)
	if err != nil {
		utils.Error(c, 500, "获取状态变更日志失败")
		return
	}

	// 构建响应
	response := make([]dto.OrderStatusLogResponse, 0, len(logs))
	for _, log := range logs {
		response = append(response, dto.OrderStatusLogResponse{
			ID:               log.ID,
			OrderID:          log.OrderID,
			FromStatus:       int(log.FromStatus),
			FromStatusName:   services.GetOrderStatusName(int(log.FromStatus)),
			ToStatus:         int(log.ToStatus),
			ToStatusName:     services.GetOrderStatusName(int(log.ToStatus)),
			OperatorID:       log.OperatorID,
			OperatorName:     log.OperatorName,
			OperatorRole:     log.OperatorRole,
			OperatorRoleName: getRoleName(log.OperatorRole),
			Remark:           log.Remark,
			ChangeTime:       log.ChangeTime,
			CreatedAt:        log.CreatedAt,
		})
	}

	utils.Success(c, response)
}

// getRoleName 获取角色名称
func getRoleName(role int) string {
	roleNames := map[int]string{
		1: "客户",
		2: "快递员",
		3: "分拣员",
		4: "司机",
		5: "站点管理员",
		6: "调度员",
		7: "管理员",
	}
	if name, ok := roleNames[role]; ok {
		return name
	}
	return "未知角色"
}
