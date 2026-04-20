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
	return &TransportController{transportService: services.NewTransportService()}
}

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

func (c *TransportController) GetVehicle(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	vehicle, err := c.transportService.GetVehicleByID(id)
	if err != nil {
		utils.Error(ctx, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取车辆详情成功", vehicle)
}

func (c *TransportController) UpdateVehicle(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	var req dto.UpdateVehicleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateVehicle(id, &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新车辆信息成功", nil)
}

func (c *TransportController) UpdateVehicleStatus(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	var req dto.VehicleStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateVehicleStatus(id, req.Status); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新车辆状态成功", nil)
}

func (c *TransportController) DeleteVehicle(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的车辆ID")
		return
	}

	if err := c.transportService.DeleteVehicle(id); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "删除车辆成功", nil)
}

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

func (c *TransportController) GetTransportTask(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	task, err := c.transportService.GetTransportTaskByID(id)
	if err != nil {
		utils.Error(ctx, http.StatusNotFound, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输任务详情成功", task)
}

func (c *TransportController) UpdateTransportTask(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	var req dto.UpdateTransportTaskRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateTransportTask(id, &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新运输任务成功", nil)
}

func (c *TransportController) UpdateTransportTaskStatus(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	var req dto.TransportTaskStatusRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	if err := c.transportService.UpdateTransportTaskStatus(id, &req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "更新运输任务状态成功", nil)
}

func (c *TransportController) LoadScan(ctx *gin.Context) {
	taskID, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	userID, userRole, ok := currentOperator(ctx)
	if !ok {
		return
	}

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.LoadScan(taskID, userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "装车扫描成功", result)
}

func (c *TransportController) UnloadScan(ctx *gin.Context) {
	taskID, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	userID, userRole, ok := currentOperator(ctx)
	if !ok {
		return
	}

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.UnloadScan(taskID, userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "卸车扫描成功", result)
}

func (c *TransportController) LoadScanByCode(ctx *gin.Context) {
	userID, userRole, ok := currentOperator(ctx)
	if !ok {
		return
	}

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.LoadScanByCode(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "装车扫描成功", result)
}

func (c *TransportController) UnloadScanByCode(ctx *gin.Context) {
	userID, userRole, ok := currentOperator(ctx)
	if !ok {
		return
	}

	var req dto.TransportScanRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.UnloadScanByCode(userID, userRole, &req)
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "卸车扫描成功", result)
}

func (c *TransportController) GetTransportRecordList(ctx *gin.Context) {
	var req dto.TransportRecordQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportRecordList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取装卸记录列表成功", result)
}

func (c *TransportController) GetTransportRecord(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的记录ID")
		return
	}

	record, err := c.transportService.GetTransportRecordByID(id)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取装卸记录详情成功", record)
}

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

func (c *TransportController) GetTransportMonitorOverview(ctx *gin.Context) {
	result, err := c.transportService.GetTransportMonitorOverview()
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输监控概览成功", result)
}

func (c *TransportController) GetTransportMonitorTaskList(ctx *gin.Context) {
	var req dto.TransportMonitorQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportMonitorTaskList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输监控任务列表成功", result)
}

func (c *TransportController) GetTransportWarningList(ctx *gin.Context) {
	var req dto.TransportWarningQueryRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		utils.Error(ctx, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := c.transportService.GetTransportWarningList(&req)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输预警列表成功", result)
}

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

func (c *TransportController) GetTransportCostTaskDetail(ctx *gin.Context) {
	id, err := parseUintParam(ctx.Param("id"))
	if err != nil {
		utils.Error(ctx, http.StatusBadRequest, "无效的任务ID")
		return
	}

	result, err := c.transportService.GetTransportCostTaskDetail(id)
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输成本任务详情成功", result)
}

func (c *TransportController) GetTransportStats(ctx *gin.Context) {
	stats, err := c.transportService.GetTransportStats()
	if err != nil {
		utils.Error(ctx, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(ctx, "获取运输统计成功", stats)
}

func currentOperator(ctx *gin.Context) (uint, int, bool) {
	userID, ok := middleware.GetCurrentUserID(ctx)
	if !ok {
		utils.Unauthorized(ctx, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛淇℃伅")
		return 0, 0, false
	}
	userRole, ok := middleware.GetCurrentUserRole(ctx)
	if !ok {
		utils.Unauthorized(ctx, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛瑙掕壊")
		return 0, 0, false
	}
	return userID, userRole, true
}

func parseUintParam(value string) (uint, error) {
	id, err := strconv.ParseUint(value, 10, 32)
	return uint(id), err
}
