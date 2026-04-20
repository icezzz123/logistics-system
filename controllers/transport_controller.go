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

type TransportController struct {
	transportService *services.TransportService
}

func NewTransportController() *TransportController {
	return &TransportController{
		transportService: services.NewTransportService(),
	}
}

// CreateVehicle 创建车辆
func (c *TransportController) CreateVehicle(ctx *gin.Context) {
	var req dto.CreateVehicleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	vehicle, err := c.transportService.CreateVehicle(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "创建车辆成功", vehicle)
}

// GetVehicleList 获取车辆列表
func (c *TransportController) GetVehicleList(ctx *gin.Context) {
	var req dto.VehicleQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetVehicleList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取车辆列表成功", result)
}

// GetVehicle 获取车辆详情
func (c *TransportController) GetVehicle(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	vehicle, err := c.transportService.GetVehicleByID(uint(id))
	if err != nil {
		utils.Error(ctx, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取车辆详情成功", vehicle)
}

// UpdateVehicle 更新车辆信息
func (c *TransportController) UpdateVehicle(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	var req dto.UpdateVehicleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateVehicle(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新车辆信息成功", nil)
}

// UpdateVehicleStatus 更新车辆状态
func (c *TransportController) UpdateVehicleStatus(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	var req dto.VehicleStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateVehicleStatus(uint(id), req.Status); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新车辆状态成功", nil)
}

// DeleteVehicle 删除车辆
func (c *TransportController) DeleteVehicle(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	if err := c.transportService.DeleteVehicle(uint(id)); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "删除车辆成功", nil)
}

// CreateTransportTask 创建运输任务
func (c *TransportController) CreateTransportTask(ctx *gin.Context) {
	var req dto.CreateTransportTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	task, err := c.transportService.CreateTransportTask(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "创建运输任务成功", task)
}

// GetTransportTaskList 获取运输任务列表
func (c *TransportController) GetTransportTaskList(ctx *gin.Context) {
	var req dto.TransportTaskQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportTaskList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输任务列表成功", result)
}

// GetTransportTask 获取运输任务详情
func (c *TransportController) GetTransportTask(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	task, err := c.transportService.GetTransportTaskByID(uint(id))
	if err != nil {
		utils.Error(ctx, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输任务详情成功", task)
}

// UpdateTransportTask 更新运输任务
func (c *TransportController) UpdateTransportTask(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	var req dto.UpdateTransportTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateTransportTask(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新运输任务成功", nil)
}

// UpdateTransportTaskStatus 更新运输任务状态
func (c *TransportController) UpdateTransportTaskStatus(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	var req dto.TransportTaskStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateTransportTaskStatus(uint(id), &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新运输任务状态成功", nil)
}

// LoadScan 装车扫描
func (c *TransportController) LoadScan(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
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

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.LoadScan(uint(id), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "装车扫描成功", result)
}

// UnloadScan 卸车扫描
func (c *TransportController) UnloadScan(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
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

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.UnloadScan(uint(id), userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "卸车扫描成功", result)
}

// GetTransportRecordList 获取装卸记录列表
func (c *TransportController) GetTransportRecordList(ctx *gin.Context) {
	var req dto.TransportRecordQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportRecordList(&req)
	if err != nil {
		if err.Error() == "无效的扫描类型" {
			utils.Error(ctx, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取装卸记录列表成功", result)
}

// GetTransportRecord 获取装卸记录详情
func (c *TransportController) GetTransportRecord(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的记录ID")
		return
	}

	record, err := c.transportService.GetTransportRecordByID(uint(id))
	if err != nil {
		if err.Error() == "装卸记录不存在" {
			utils.Error(ctx, http.StatusNotFound, err.Error())
			return
		}
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取装卸记录详情成功", record)
}

// AssignVehicle 批量分配车辆
func (c *TransportController) AssignVehicle(ctx *gin.Context) {
	var req dto.VehicleAssignRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.AssignVehicle(&req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "车辆分配完成", result)
}

// GetTransportMonitorOverview 获取运输监控概览
func (c *TransportController) GetTransportMonitorOverview(ctx *gin.Context) {
	result, err := c.transportService.GetTransportMonitorOverview()
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输监控概览成功", result)
}

// GetTransportMonitorTaskList 获取运输监控任务列表
func (c *TransportController) GetTransportMonitorTaskList(ctx *gin.Context) {
	var req dto.TransportMonitorQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportMonitorTaskList(&req)
	if err != nil {
		if err.Error() == "无效的预警级别" {
			utils.Error(ctx, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输监控任务列表成功", result)
}

// GetTransportWarningList 获取运输预警列表
func (c *TransportController) GetTransportWarningList(ctx *gin.Context) {
	var req dto.TransportWarningQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportWarningList(&req)
	if err != nil {
		if err.Error() == "无效的预警级别" || err.Error() == "无效的预警类型" {
			utils.Error(ctx, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输预警列表成功", result)
}

// GetTransportCostOverview 获取运输成本概览
func (c *TransportController) GetTransportCostOverview(ctx *gin.Context) {
	var req dto.TransportCostQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportCostOverview(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输成本概览成功", result)
}

// GetTransportCostTaskList 获取运输成本任务列表
func (c *TransportController) GetTransportCostTaskList(ctx *gin.Context) {
	var req dto.TransportCostQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportCostTaskList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输成本任务列表成功", result)
}

// GetTransportCostTaskDetail 获取运输成本任务详情
func (c *TransportController) GetTransportCostTaskDetail(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	result, err := c.transportService.GetTransportCostTaskDetail(uint(id))
	if err != nil {
		if err.Error() == "运输任务不存在" {
			utils.Error(ctx, http.StatusNotFound, err.Error())
			return
		}
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输成本任务详情成功", result)
}

// GetTransportStats 获取运输统计
func (c *TransportController) GetTransportStats(ctx *gin.Context) {
	stats, err := c.transportService.GetTransportStats()
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输统计成功", stats)
}
