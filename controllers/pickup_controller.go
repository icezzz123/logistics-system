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

type PickupController struct {
	pickupService *services.PickupService
}

func NewPickupController() *PickupController {
	return &PickupController{
		pickupService: services.NewPickupService(),
	}
}

func (c *PickupController) CreatePickupTask(ctx *gin.Context) {
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

	var req dto.CreatePickupTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.CreatePickupTask(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "创建揽收任务成功", result)
}

func (c *PickupController) GetPickupTaskList(ctx *gin.Context) {
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

	var req dto.PickupTaskQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.GetPickupTaskList(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取揽收任务列表成功", result)
}

func (c *PickupController) GetPickupTaskSummary(ctx *gin.Context) {
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

	result, err := c.pickupService.GetPickupTaskSummary(userID, userRole)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取揽收任务概览成功", result)
}

func (c *PickupController) GetPickupTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的揽收任务ID")
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

	result, err := c.pickupService.GetPickupTaskByID(uint(taskID), userID, userRole)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取揽收任务详情成功", result)
}

func (c *PickupController) ClaimPickupTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的揽收任务ID")
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

	var req dto.PickupTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.ClaimPickupTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "认领揽收任务成功", result)
}

func (c *PickupController) StartPickupTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的揽收任务ID")
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

	var req dto.PickupTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.StartPickupTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "开始揽收成功", result)
}

func (c *PickupController) CompletePickupTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的揽收任务ID")
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

	var req dto.PickupTaskActionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.CompletePickupTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "确认完成揽收", result)
}

func (c *PickupController) FailPickupTask(ctx *gin.Context) {
	taskID, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的揽收任务ID")
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

	var req dto.PickupTaskFailRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.pickupService.FailPickupTask(uint(taskID), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "已登记揽收失败", result)
}
