package controllers

import (
	"fmt"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type StationController struct {
	stationService *services.StationService
}

// NewStationController 创建站点控制器实例
func NewStationController() *StationController {
	return &StationController{
		stationService: &services.StationService{},
	}
}

// CreateStation 创建站点
// @Summary 创建站点
// @Description 创建新的物流站点
// @Tags 站点管理
// @Accept json
// @Produce json
// @Param body body dto.CreateStationRequest true "站点信息"
// @Success 200 {object} dto.StationResponse
// @Router /api/stations [post]
func (ctrl *StationController) CreateStation(c *gin.Context) {
	// 绑定请求参数
	var req dto.CreateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层创建站点
	station, err := ctrl.stationService.CreateStation(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	// 构造响应
	response := ctrl.buildStationResponse(station)
	utils.Success(c, response)
}

// GetStationList 获取站点列表
// @Summary 获取站点列表
// @Description 支持分页、搜索和筛选的站点列表查询
// @Tags 站点管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param type query int false "站点类型（1=始发站，2=中转站，3=目的站，4=海关站点）"
// @Param country query string false "国家"
// @Param city query string false "城市"
// @Param status query int false "状态（0=禁用，1=启用）"
// @Param keyword query string false "搜索关键词（站点编码、名称、地址）"
// @Success 200 {object} object
// @Router /api/stations [get]
func (ctrl *StationController) GetStationList(c *gin.Context) {
	// 绑定查询参数
	var req dto.StationListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	stations, total, err := ctrl.stationService.GetStationList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	// 构造响应列表
	list := make([]dto.StationResponse, 0, len(stations))
	for _, station := range stations {
		list = append(list, ctrl.buildStationResponse(&station))
	}

	// 计算总页数
	pageSize := req.PageSize
	if pageSize < 1 {
		pageSize = 10
	}
	pages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		pages++
	}

	utils.Success(c, gin.H{
		"list":      list,
		"total":     total,
		"page":      req.Page,
		"page_size": pageSize,
		"pages":     pages,
	})
}

// GetStationDetail 获取站点详情
// @Summary 获取站点详情
// @Description 根据站点ID获取站点详细信息
// @Tags 站点管理
// @Accept json
// @Produce json
// @Param id path int true "站点ID"
// @Success 200 {object} dto.StationResponse
// @Router /api/stations/{id} [get]
func (ctrl *StationController) GetStationDetail(c *gin.Context) {
	// 获取站点ID
	stationIDParam := c.Param("id")
	var stationID uint
	if _, err := fmt.Sscanf(stationIDParam, "%d", &stationID); err != nil {
		utils.BadRequest(c, "无效的站点ID")
		return
	}

	// 查询站点
	station, err := ctrl.stationService.GetStationByID(stationID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 构造响应
	response := ctrl.buildStationResponse(station)
	utils.Success(c, response)
}

// UpdateStation 更新站点
// @Summary 更新站点
// @Description 更新站点信息
// @Tags 站点管理
// @Accept json
// @Produce json
// @Param id path int true "站点ID"
// @Param body body dto.UpdateStationRequest true "更新信息"
// @Success 200 {object} utils.Response
// @Router /api/stations/{id} [put]
func (ctrl *StationController) UpdateStation(c *gin.Context) {
	// 获取站点ID
	stationIDParam := c.Param("id")
	var stationID uint
	if _, err := fmt.Sscanf(stationIDParam, "%d", &stationID); err != nil {
		utils.BadRequest(c, "无效的站点ID")
		return
	}

	// 绑定请求参数
	var req dto.UpdateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	if err := ctrl.stationService.UpdateStation(stationID, &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "站点更新成功",
	})
}

// DeleteStation 删除站点
// @Summary 删除站点
// @Description 删除站点（仅管理员可删除，且站点无关联订单）
// @Tags 站点管理
// @Accept json
// @Produce json
// @Param id path int true "站点ID"
// @Success 200 {object} utils.Response
// @Router /api/stations/{id} [delete]
func (ctrl *StationController) DeleteStation(c *gin.Context) {
	// 获取站点ID
	stationIDParam := c.Param("id")
	var stationID uint
	if _, err := fmt.Sscanf(stationIDParam, "%d", &stationID); err != nil {
		utils.BadRequest(c, "无效的站点ID")
		return
	}

	// 调用服务层
	if err := ctrl.stationService.DeleteStation(stationID); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "站点删除成功",
	})
}

// buildStationResponse 构建站点响应对象
func (ctrl *StationController) buildStationResponse(station *models.Station) dto.StationResponse {
	response := dto.StationResponse{
		ID:           station.ID,
		StationCode:  station.StationCode,
		Name:         station.Name,
		Type:         int(station.Type),
		TypeName:     getStationTypeName(int(station.Type)),
		Country:      station.Country,
		Province:     station.Province,
		City:         station.City,
		Address:      station.Address,
		Latitude:     station.Latitude,
		Longitude:    station.Longitude,
		ManagerID:    station.ManagerID,
		Capacity:     station.Capacity,
		ContactName:  station.ContactName,
		ContactPhone: station.ContactPhone,
		WorkingHours: station.WorkingHours,
		Status:       station.Status,
		StatusName:   getStatusName(station.Status),
		Remark:       station.Remark,
		CTime:        station.CTime,
		MTime:        station.MTime,
	}

	// 获取管理员姓名
	if station.ManagerID > 0 {
		var manager models.User
		if err := database.DB.Where("id = ?", station.ManagerID).First(&manager).Error; err == nil {
			response.ManagerName = manager.RealName
			if response.ManagerName == "" {
				response.ManagerName = manager.Username
			}
		}
	}

	return response
}

// getStationTypeName 获取站点类型名称
func getStationTypeName(stationType int) string {
	typeNames := map[int]string{
		1: "始发站",
		2: "中转站",
		3: "目的站",
		4: "海关站点",
	}
	if name, ok := typeNames[stationType]; ok {
		return name
	}
	return "未知类型"
}

// getStatusName 获取状态名称
func getStatusName(status int) string {
	if status == 1 {
		return "启用"
	}
	return "禁用"
}

// GetStationFlows 查询站点流转记录
func (ctrl *StationController) GetStationFlows(c *gin.Context) {
	var req dto.StationFlowQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.stationService.GetStationFlows(req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetStationInventory 查询站点库存
func (ctrl *StationController) GetStationInventory(c *gin.Context) {
	var req dto.StationInventoryQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.stationService.GetStationInventory(req.StationID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// CreateInventoryCheck 创建库存盘点
func (ctrl *StationController) CreateInventoryCheck(c *gin.Context) {
	var req dto.CreateInventoryCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Error(c, 401, "未授权")
		return
	}

	check, err := ctrl.stationService.CreateInventoryCheck(&req, userID.(uint))
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"id":       check.ID,
		"check_no": check.CheckNo,
		"message":  "盘点单创建成功",
	})
}

// GetInventoryCheckDetail 获取盘点记录详情
func (ctrl *StationController) GetInventoryCheckDetail(c *gin.Context) {
	// 获取盘点ID
	checkIDParam := c.Param("id")
	var checkID uint
	if _, err := fmt.Sscanf(checkIDParam, "%d", &checkID); err != nil {
		utils.BadRequest(c, "无效的盘点ID")
		return
	}

	result, err := ctrl.stationService.GetInventoryCheckByID(checkID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	utils.Success(c, result)
}

// CompleteInventoryCheck 完成库存盘点
func (ctrl *StationController) CompleteInventoryCheck(c *gin.Context) {
	// 获取盘点ID
	checkIDParam := c.Param("id")
	var checkID uint
	if _, err := fmt.Sscanf(checkIDParam, "%d", &checkID); err != nil {
		utils.BadRequest(c, "无效的盘点ID")
		return
	}

	var req dto.CompleteInventoryCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.stationService.CompleteInventoryCheck(checkID, &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "盘点完成",
	})
}

// GetInventoryCheckList 获取盘点记录列表
func (ctrl *StationController) GetInventoryCheckList(c *gin.Context) {
	var req dto.InventoryCheckListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.stationService.GetInventoryCheckList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetInventoryWarnings 获取库存预警信息
func (ctrl *StationController) GetInventoryWarnings(c *gin.Context) {
	var req dto.InventoryWarningQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.stationService.GetInventoryWarnings(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetInventoryWarningsByLevel 按预警级别获取站点列表
func (ctrl *StationController) GetInventoryWarningsByLevel(c *gin.Context) {
	level := c.Param("level")

	// 验证预警级别参数
	if level != "warning" && level != "critical" && level != "all" {
		utils.BadRequest(c, "无效的预警级别，支持: warning, critical, all")
		return
	}

	warnings, err := ctrl.stationService.GetInventoryWarningsByLevel(level)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"level":    level,
		"count":    len(warnings),
		"warnings": warnings,
	})
}

// GetInventoryStats 获取库存统计报表
func (ctrl *StationController) GetInventoryStats(c *gin.Context) {
	var req dto.InventoryStatsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 默认值设置
	if req.DateType == "" {
		req.DateType = "day"
	}

	stats, err := ctrl.stationService.GetInventoryStats(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, stats)
}

// GetInventoryDistribution 获取库存分布统计
func (ctrl *StationController) GetInventoryDistribution(c *gin.Context) {
	distribution, err := ctrl.stationService.GetInventoryDistribution()
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, distribution)
}
