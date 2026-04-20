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

type ExceptionController struct {
	service *services.ExceptionService
}

func NewExceptionController() *ExceptionController {
	return &ExceptionController{service: services.NewExceptionService()}
}

func (ctrl *ExceptionController) CreateException(c *gin.Context) {
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
	var req dto.CreateExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := ctrl.service.CreateExceptionForUser(userID, userRole, &req)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "创建异常成功", result)
}

func (ctrl *ExceptionController) GetExceptionList(c *gin.Context) {
	var req dto.ExceptionQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛淇℃伅")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛瑙掕壊")
		return
	}
	result, err := ctrl.service.GetExceptionListForUser(userID, userRole, &req)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "获取异常列表成功", result)
}

func (ctrl *ExceptionController) GetException(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的异常ID")
		return
	}
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛淇℃伅")
		return
	}
	userRole, ok := middleware.GetCurrentUserRole(c)
	if !ok {
		utils.Unauthorized(c, "鏈幏鍙栧埌褰撳墠鐢ㄦ埛瑙掕壊")
		return
	}
	result, err := ctrl.service.GetExceptionByIDForUser(uint(id), userID, userRole)
	if err != nil {
		if err.Error() == "异常记录不存在" {
			utils.Error(c, http.StatusNotFound, err.Error())
			return
		}
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "获取异常详情成功", result)
}

func (ctrl *ExceptionController) AssignException(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	_ = userID
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的异常ID")
		return
	}
	var req dto.AssignExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := ctrl.service.AssignException(uint(id), userID, &req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "分配异常处理人成功", nil)
}

func (ctrl *ExceptionController) ProcessException(c *gin.Context) {
	userID, ok := middleware.GetCurrentUserID(c)
	if !ok {
		utils.Unauthorized(c, "未获取到当前用户信息")
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "无效的异常ID")
		return
	}
	var req dto.ProcessExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := ctrl.service.ProcessException(uint(id), userID, &req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "处理异常成功", nil)
}

func (ctrl *ExceptionController) CloseException(c *gin.Context) {
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
		utils.Error(c, http.StatusBadRequest, "无效的异常ID")
		return
	}
	var req dto.CloseExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	if err := ctrl.service.CloseException(uint(id), userID, userRole, &req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "关闭异常成功", nil)
}

func (ctrl *ExceptionController) GetExceptionStats(c *gin.Context) {
	var req dto.ExceptionStatsQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "参数错误: "+err.Error())
		return
	}
	result, err := ctrl.service.GetExceptionStats(&req)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "获取异常统计成功", result)
}
