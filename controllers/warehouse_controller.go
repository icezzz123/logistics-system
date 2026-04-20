package controllers

import (
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WarehouseController struct {
	service *services.WarehouseService
}

func NewWarehouseController() *WarehouseController {
	return &WarehouseController{
		service: services.NewWarehouseService(),
	}
}

// InboundScan 入库扫描
func (ctrl *WarehouseController) InboundScan(c *gin.Context) {
	var req dto.InboundScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, 400, "参数错误: "+err.Error())
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Error(c, 401, "未授权")
		return
	}

	// 调用服务层
	resp, err := ctrl.service.InboundScan(req, userID.(uint))
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "入库成功", resp)
}

// GetInboundRecords 查询入库记录
func (ctrl *WarehouseController) GetInboundRecords(c *gin.Context) {
	var req dto.InboundRecordQueryRequest

	// 解析分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	req.Page = page
	req.PageSize = pageSize

	// 解析筛选参数
	if stationID := c.Query("station_id"); stationID != "" {
		id, _ := strconv.ParseUint(stationID, 10, 32)
		req.StationID = uint(id)
	}

	req.OrderNo = c.Query("order_no")

	if startTime := c.Query("start_time"); startTime != "" {
		t, _ := strconv.ParseInt(startTime, 10, 64)
		req.StartTime = t
	}

	if endTime := c.Query("end_time"); endTime != "" {
		t, _ := strconv.ParseInt(endTime, 10, 64)
		req.EndTime = t
	}

	// 调用服务层
	resp, err := ctrl.service.GetInboundRecords(req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "查询成功", resp)
}

// OutboundScan 出库扫描
func (ctrl *WarehouseController) OutboundScan(c *gin.Context) {
	var req dto.OutboundScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, 400, "参数错误: "+err.Error())
		return
	}
	
	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Error(c, 401, "未授权")
		return
	}
	
	// 调用服务层
	resp, err := ctrl.service.OutboundScan(req, userID.(uint))
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	
	utils.SuccessWithMessage(c, "出库成功", resp)
}

// GetOutboundRecords 查询出库记录
func (ctrl *WarehouseController) GetOutboundRecords(c *gin.Context) {
	var req dto.OutboundRecordQueryRequest
	
	// 解析分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	req.Page = page
	req.PageSize = pageSize
	
	// 解析筛选参数
	if stationID := c.Query("station_id"); stationID != "" {
		id, _ := strconv.ParseUint(stationID, 10, 32)
		req.StationID = uint(id)
	}
	
	req.OrderNo = c.Query("order_no")
	
	if startTime := c.Query("start_time"); startTime != "" {
		t, _ := strconv.ParseInt(startTime, 10, 64)
		req.StartTime = t
	}
	
	if endTime := c.Query("end_time"); endTime != "" {
		t, _ := strconv.ParseInt(endTime, 10, 64)
		req.EndTime = t
	}
	
	// 调用服务层
	resp, err := ctrl.service.GetOutboundRecords(req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}
	
	utils.SuccessWithMessage(c, "查询成功", resp)
}
