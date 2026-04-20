package controllers

import (
	"net/http"
	"strconv"

	"logistics-system/dto"
	"logistics-system/middleware"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type DeliveryController struct {
	deliveryService *services.DeliveryService
}

func NewDeliveryController() *DeliveryController {
	return &DeliveryController{
		deliveryService: services.NewDeliveryService(),
	}
}

func (c *DeliveryController) CreateDeliveryTask(ctx *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.CreateDeliveryTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.CreateDeliveryTask(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "创建派送任务成功", result)
}

func (c *DeliveryController) GetDeliveryTaskList(ctx *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.GetDeliveryTaskList(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取派送任务列表成功", result)
}

func (c *DeliveryController) GetDeliveryTaskSummary(ctx *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	result, err := c.deliveryService.GetDeliveryTaskSummary(userID, userRole)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取派送任务概览成功", result)
}

func (c *DeliveryController) GetDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	result, err := c.deliveryService.GetDeliveryTaskByID(uint(taskID), userID, userRole)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取派送任务详情成功", result)
}

func (c *DeliveryController) ClaimDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.ClaimDeliveryTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "认领派送任务成功", result)
}

func (c *DeliveryController) StartDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.StartDeliveryTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "开始派送成功", result)
}

func (c *DeliveryController) CompleteDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.CompleteDeliveryTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "确认送达成功", result)
}

func (c *DeliveryController) SignDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskSignRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.SignDeliveryTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "签收完成", result)
}

func (c *DeliveryController) FailDeliveryTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的派送任务ID")
		return
	}

	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "未获取到当前用户角色")
		return
	}

	var req dto.DeliveryTaskFailRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.deliveryService.FailDeliveryTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "已登记派送失败", result)
}
