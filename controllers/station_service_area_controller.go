package controllers

import (
	"fmt"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

func (ctrl *StationController) GetStationServiceAreas(c *gin.Context) {
	stationID, ok := parseStationIDParam(c)
	if !ok {
		return
	}

	areas, err := ctrl.stationService.GetStationServiceAreas(stationID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	list := make([]dto.StationServiceAreaResponse, 0, len(areas))
	for _, area := range areas {
		list = append(list, buildStationServiceAreaResponse(area))
	}
	utils.Success(c, dto.StationServiceAreaListResponse{List: list})
}

func (ctrl *StationController) CreateStationServiceArea(c *gin.Context) {
	stationID, ok := parseStationIDParam(c)
	if !ok {
		return
	}

	var req dto.CreateStationServiceAreaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	area, err := ctrl.stationService.CreateStationServiceArea(stationID, &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, buildStationServiceAreaResponse(*area))
}

func (ctrl *StationController) UpdateStationServiceArea(c *gin.Context) {
	stationID, ok := parseStationIDParam(c)
	if !ok {
		return
	}

	areaID, ok := parseStationServiceAreaIDParam(c)
	if !ok {
		return
	}

	var req dto.UpdateStationServiceAreaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.stationService.UpdateStationServiceArea(stationID, areaID, &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "服务范围更新成功"})
}

func (ctrl *StationController) DeleteStationServiceArea(c *gin.Context) {
	stationID, ok := parseStationIDParam(c)
	if !ok {
		return
	}

	areaID, ok := parseStationServiceAreaIDParam(c)
	if !ok {
		return
	}

	if err := ctrl.stationService.DeleteStationServiceArea(stationID, areaID); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{"message": "服务范围删除成功"})
}

func parseStationIDParam(c *gin.Context) (uint, bool) {
	var stationID uint
	if _, err := fmt.Sscanf(c.Param("id"), "%d", &stationID); err != nil {
		utils.BadRequest(c, "无效的站点ID")
		return 0, false
	}
	return stationID, true
}

func parseStationServiceAreaIDParam(c *gin.Context) (uint, bool) {
	var areaID uint
	if _, err := fmt.Sscanf(c.Param("area_id"), "%d", &areaID); err != nil {
		utils.BadRequest(c, "无效的服务范围ID")
		return 0, false
	}
	return areaID, true
}

func buildStationServiceAreaResponse(area models.StationServiceArea) dto.StationServiceAreaResponse {
	return dto.StationServiceAreaResponse{
		ID:         area.ID,
		StationID:  area.StationID,
		Country:    area.Country,
		Province:   area.Province,
		City:       area.City,
		District:   area.District,
		Priority:   area.Priority,
		ScopeLevel: getStationServiceAreaScopeLevel(area),
		Status:     area.Status,
		StatusName: getStatusName(area.Status),
		Remark:     area.Remark,
		CTime:      area.CTime,
		MTime:      area.MTime,
	}
}

func getStationServiceAreaScopeLevel(area models.StationServiceArea) string {
	switch {
	case strings.TrimSpace(area.District) != "":
		return "district"
	case strings.TrimSpace(area.City) != "":
		return "city"
	case strings.TrimSpace(area.Province) != "":
		return "province"
	default:
		return "country"
	}
}
