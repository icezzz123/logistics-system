package controllers

import (
	"net/http"
	"strconv"

	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type DispatchController struct {
	dispatchService *services.DispatchService
}

func NewDispatchController() *DispatchController {
	return &DispatchController{dispatchService: services.NewDispatchService()}
}

// OptimizeRoute 路径优化
func (c *DispatchController) OptimizeRoute(ctx *gin.Context) {
	var req dto.RouteOptimizeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := c.dispatchService.OptimizeRoute(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "路径优化成功", result)
}

// CreateBatchSchedule 创建批次调度
func (c *DispatchController) CreateBatchSchedule(ctx *gin.Context) {
	var req dto.CreateBatchScheduleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := c.dispatchService.CreateBatchSchedule(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "批次调度创建成功", result)
}

// GetBatchScheduleList 获取批次调度列表
func (c *DispatchController) GetBatchScheduleList(ctx *gin.Context) {
	var req dto.BatchScheduleQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := c.dispatchService.GetBatchScheduleList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "获取批次调度列表成功", result)
}

// UpdateBatchScheduleStatus 更新批次调度状态
func (c *DispatchController) UpdateBatchScheduleStatus(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的ID")
		return
	}
	var req dto.BatchScheduleStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := c.dispatchService.UpdateBatchScheduleStatus(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "更新批次状态成功", nil)
}

// GetDispatchSuggestion 获取调度建议
func (c *DispatchController) GetDispatchSuggestion(ctx *gin.Context) {
	var req dto.DispatchSuggestionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := c.dispatchService.GetDispatchSuggestion(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "获取调度建议成功", result)
}

// CreateTransportPlan 创建运输计划
func (c *DispatchController) CreateTransportPlan(ctx *gin.Context) {
	var req dto.CreateTransportPlanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	plan, err := c.dispatchService.CreateTransportPlan(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "创建运输计划成功", plan)
}

// GetTransportPlanList 获取运输计划列表
func (c *DispatchController) GetTransportPlanList(ctx *gin.Context) {
	var req dto.TransportPlanQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := c.dispatchService.GetTransportPlanList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "获取运输计划列表成功", result)
}

// GetTransportPlan 获取运输计划详情
func (c *DispatchController) GetTransportPlan(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的ID")
		return
	}
	plan, err := c.dispatchService.GetTransportPlanByID(uint(id))
	if err != nil {
		utils.Error(ctx, http.StatusNotFound, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "获取运输计划详情成功", plan)
}

// UpdateTransportPlan 更新运输计划
func (c *DispatchController) UpdateTransportPlan(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的ID")
		return
	}
	var req dto.UpdateTransportPlanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := c.dispatchService.UpdateTransportPlan(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "更新运输计划成功", nil)
}

// UpdateTransportPlanStatus 更新运输计划状态
func (c *DispatchController) UpdateTransportPlanStatus(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的ID")
		return
	}
	var req dto.TransportPlanStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := c.dispatchService.UpdateTransportPlanStatus(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "更新运输计划状态成功", nil)
}

// AssignOrdersToPlan 将订单加入运输计划
func (c *DispatchController) AssignOrdersToPlan(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的ID")
		return
	}
	var req dto.AssignOrderToPlanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := c.dispatchService.AssignOrdersToPlan(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(ctx, "订单已加入运输计划", nil)
}
