package controllers

import (
	"strconv"

	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type SortingController struct {
	sortingService *services.SortingService
}

func NewSortingController() *SortingController {
	return &SortingController{
		sortingService: services.NewSortingService(),
	}
}

// CreateSortingRule 创建分拣规则
func (ctrl *SortingController) CreateSortingRule(c *gin.Context) {
	var req dto.CreateSortingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	rule, err := ctrl.sortingService.CreateSortingRule(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"id":      rule.ID,
		"message": "分拣规则创建成功",
	})
}

// GetSortingRuleList 获取分拣规则列表
func (ctrl *SortingController) GetSortingRuleList(c *gin.Context) {
	var req dto.SortingRuleQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.Status < 0 {
		req.Status = -1 // -1表示查询所有状态
	}

	response, err := ctrl.sortingService.GetSortingRuleList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, response)
}

// GetSortingRuleDetail 获取分拣规则详情
func (ctrl *SortingController) GetSortingRuleDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的规则ID")
		return
	}

	rule, err := ctrl.sortingService.GetSortingRuleByID(uint(id))
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	utils.Success(c, rule)
}

// UpdateSortingRule 更新分拣规则
func (ctrl *SortingController) UpdateSortingRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的规则ID")
		return
	}

	var req dto.UpdateSortingRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.sortingService.UpdateSortingRule(uint(id), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "分拣规则更新成功",
	})
}

// UpdateSortingRuleStatus 更新分拣规则状态
func (ctrl *SortingController) UpdateSortingRuleStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的规则ID")
		return
	}

	var req dto.SortingRuleStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.sortingService.UpdateSortingRuleStatus(uint(id), req.Status); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	statusName := "禁用"
	if req.Status == 1 {
		statusName = "启用"
	}

	utils.Success(c, gin.H{
		"message": "规则已" + statusName,
	})
}

// DeleteSortingRule 删除分拣规则
func (ctrl *SortingController) DeleteSortingRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的规则ID")
		return
	}

	if err := ctrl.sortingService.DeleteSortingRule(uint(id)); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "分拣规则删除成功",
	})
}

// MatchRoute 路由匹配
func (ctrl *SortingController) MatchRoute(c *gin.Context) {
	var req dto.RouteMatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	response, err := ctrl.sortingService.MatchRoute(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, response)
}

// BatchMatchRoute 批量路由匹配
func (ctrl *SortingController) BatchMatchRoute(c *gin.Context) {
	var req dto.BatchRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if len(req.Addresses) == 0 {
		utils.BadRequest(c, "地址列表不能为空")
		return
	}

	if len(req.Addresses) > 100 {
		utils.BadRequest(c, "批量处理最多支持100个地址")
		return
	}

	response, err := ctrl.sortingService.BatchMatchRoute(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, response)
}

// GetSortingRuleStats 获取分拣规则统计
func (ctrl *SortingController) GetSortingRuleStats(c *gin.Context) {
	response, err := ctrl.sortingService.GetSortingRuleStats()
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, response)
}
// CreateSortingTask 创建分拣任务
func (ctrl *SortingController) CreateSortingTask(c *gin.Context) {
	var req dto.CreateSortingTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	task, err := ctrl.sortingService.CreateSortingTask(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "创建分拣任务成功", task)
}

// GetSortingTaskList 获取分拣任务列表
func (ctrl *SortingController) GetSortingTaskList(c *gin.Context) {
	var req dto.SortingTaskQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	response, err := ctrl.sortingService.GetSortingTaskList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取分拣任务列表成功", response)
}

// GetSortingTaskDetail 获取分拣任务详情
func (ctrl *SortingController) GetSortingTaskDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的任务ID")
		return
	}

	task, err := ctrl.sortingService.GetSortingTaskByID(uint(id))
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取分拣任务详情成功", task)
}

// UpdateSortingTask 更新分拣任务
func (ctrl *SortingController) UpdateSortingTask(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的任务ID")
		return
	}

	var req dto.UpdateSortingTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.sortingService.UpdateSortingTask(uint(id), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "更新分拣任务成功", nil)
}

// UpdateSortingTaskStatus 更新分拣任务状态
func (ctrl *SortingController) UpdateSortingTaskStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的任务ID")
		return
	}

	var req dto.SortingTaskStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.sortingService.UpdateSortingTaskStatus(uint(id), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "更新分拣任务状态成功", nil)
}
// SortingScan 分拣扫描
func (ctrl *SortingController) SortingScan(c *gin.Context) {
	var req dto.SortingScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 获取当前用户ID作为分拣员ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Error(c, 401, "用户未登录")
		return
	}

	sorterID := userID.(uint)

	response, err := ctrl.sortingService.SortingScan(&req, sorterID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, response.Message, response)
}

// GetSortingRecordList 获取分拣记录列表
func (ctrl *SortingController) GetSortingRecordList(c *gin.Context) {
	var req dto.SortingRecordQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	response, err := ctrl.sortingService.GetSortingRecordList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取分拣记录列表成功", response)
}

// GetSortingStats 获取分拣统计
func (ctrl *SortingController) GetSortingStats(c *gin.Context) {
	response, err := ctrl.sortingService.GetSortingStats()
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取分拣统计成功", response)
}