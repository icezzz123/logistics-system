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

type TrackingController struct {
	service *services.TrackingService
}

func NewTrackingController() *TrackingController {
	return &TrackingController{service: services.NewTrackingService()}
}

// CreateTrackingRecord 创建追踪记录
func (ctrl *TrackingController) CreateTrackingRecord(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	var req dto.CreateTrackingRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.service.CreateTrackingRecord(userID, userRole, &req)
	if err != nil {
		if err.Error() == "订单不存在" || err.Error() == "无权查看此订单的追踪信息" || err.Error() == "追踪时间不能晚于当前时间" {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "创建追踪记录成功", result)
}

// GetTrackingRecordList 获取追踪记录列表
func (ctrl *TrackingController) GetTrackingRecordList(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	var req dto.TrackingRecordQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.service.GetTrackingRecordList(userID, userRole, &req)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取追踪记录列表成功", result)
}

// GetTrackingRecord 获取追踪记录详情
func (ctrl *TrackingController) GetTrackingRecord(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的记录ID")
		return
	}

	result, err := ctrl.service.GetTrackingRecordByID(uint(id), userID, userRole)
	if err != nil {
		if err.Error() == "追踪记录不存在" {
			utils.Error(c, http.StatusNotFound, err.Error())
			return
		}
		if err.Error() == "订单不存在" || err.Error() == "无权查看此订单的追踪信息" {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取追踪记录详情成功", result)
}

// GetOrderTrackingHistory 获取订单追踪历史
func (ctrl *TrackingController) GetOrderTrackingHistory(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	orderID, err := strconv.ParseUint(c.Param("order_id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	result, err := ctrl.service.GetOrderTrackingHistory(uint(orderID), userID, userRole)
	if err != nil {
		if err.Error() == "订单不存在" {
			utils.Error(c, http.StatusNotFound, err.Error())
			return
		}
		if err.Error() == "无权查看此订单的追踪信息" {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取订单追踪历史成功", result)
}

// GetOrderTrackingTimeline 获取订单追踪时间轴
func (ctrl *TrackingController) GetOrderTrackingTimeline(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	orderID, err := strconv.ParseUint(c.Param("order_id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的订单ID")
		return
	}

	result, err := ctrl.service.GetOrderTrackingTimeline(uint(orderID), userID, userRole)
	if err != nil {
		if err.Error() == "订单不存在" {
			utils.Error(c, http.StatusNotFound, err.Error())
			return
		}
		if err.Error() == "无权查看此订单的追踪信息" {
			utils.Error(c, http.StatusForbidden, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取订单追踪时间轴成功", result)
}

// GetTrackingWarnings 获取追踪预警列表
func (ctrl *TrackingController) GetTrackingWarnings(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户角色")
		return
	}

	var req dto.TrackingWarningQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.service.GetTrackingWarnings(userID, userRole, &req)
	if err != nil {
		if err.Error() == "无效的预警级别" || err.Error() == "无效的预警类型" {
			utils.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "获取追踪预警列表成功", result)
}
