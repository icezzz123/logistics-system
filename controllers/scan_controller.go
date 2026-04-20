package controllers

import (
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type ScanController struct {
	service *services.ScanResolverService
}

func NewScanController() *ScanController {
	return &ScanController{service: services.NewScanResolverService()}
}

func (ctrl *ScanController) Resolve(c *gin.Context) {
	var req dto.ScanResolveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	resp, err := ctrl.service.Resolve(req.Code)
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}

	utils.Success(c, resp)
}
