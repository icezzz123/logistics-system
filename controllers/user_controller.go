package controllers

import (
	"fmt"
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *services.UserService
}

// NewUserController 创建用户控制器实例
func NewUserController() *UserController {
	return &UserController{
		userService: services.NewUserService(),
	}
}

// CreateUser 管理员创建用户
// @Summary 管理员创建用户
// @Description 管理员在后台直接创建用户账号
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param body body dto.RegisterRequest true "用户信息"
// @Success 200 {object} utils.Response
// @Router /api/admin/users [post]
func (ctrl *UserController) CreateUser(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	user, err := ctrl.userService.Register(&req)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "用户创建成功", gin.H{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"phone":     user.Phone,
		"real_name": user.RealName,
		"role":      user.Role,
		"status":    user.Status,
	})
}

// GetUserList 获取用户列表
// @Summary 获取用户列表
// @Description 支持分页、搜索和筛选的用户列表查询
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param keyword query string false "搜索关键词（用户名、邮箱、手机号、真实姓名）"
// @Param role query int false "角色筛选（0=全部，1=客户，2=快递员...）"
// @Param status query int false "状态筛选（-1=全部，0=禁用，1=启用）"
// @Success 200 {object} dto.UserListResponse
// @Router /api/users [get]
func (ctrl *UserController) GetUserList(c *gin.Context) {
	var req dto.UserListRequest

	// 绑定查询参数
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	result, err := ctrl.userService.GetUserList(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// UpdateUserInfo 更新用户信息
// @Summary 更新用户信息
// @Description 用户可以更新自己的信息，管理员可以更新任何用户的信息
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param body body dto.UpdateUserRequest true "更新信息"
// @Success 200 {object} utils.Response
// @Router /api/users/{id} [put]
func (ctrl *UserController) UpdateUserInfo(c *gin.Context) {
	// 获取路径参数中的用户ID
	userIDParam := c.Param("id")
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDParam, "%d", &targetUserID); err != nil {
		utils.BadRequest(c, "无效的用户ID")
		return
	}

	// 获取当前登录用户ID
	currentUserID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 检查权限：只能修改自己的信息，或者管理员可以修改任何人的信息
	isAdmin := false
	if role, exists := c.Get("role"); exists {
		isAdmin = role.(int) == 7
	}

	if !isAdmin && currentUserID.(uint) != targetUserID {
		utils.Forbidden(c, "无权限修改其他用户的信息")
		return
	}

	// 绑定请求参数
	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	if err := ctrl.userService.UpdateUserInfo(targetUserID, &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "用户信息更新成功",
	})
}

// UpdateUserStatus 更新用户状态（管理员专用）
// @Summary 更新用户状态
// @Description 管理员可以启用或禁用用户
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param body body dto.UpdateUserStatusRequest true "状态信息"
// @Success 200 {object} utils.Response
// @Router /api/admin/users/{id}/status [put]
func (ctrl *UserController) UpdateUserStatus(c *gin.Context) {
	// 获取路径参数中的用户ID
	userIDParam := c.Param("id")
	var userID uint
	if _, err := fmt.Sscanf(userIDParam, "%d", &userID); err != nil {
		utils.BadRequest(c, "无效的用户ID")
		return
	}

	// 绑定请求参数
	var req dto.UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if req.Status == nil {
		utils.BadRequest(c, "参数错误: status不能为空")
		return
	}

	// 调用服务层
	if err := ctrl.userService.UpdateUserStatus(userID, *req.Status); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	statusText := "禁用"
	if *req.Status == 1 {
		statusText = "启用"
	}

	utils.Success(c, gin.H{
		"message": fmt.Sprintf("用户已%s", statusText),
	})
}

// ChangePassword 修改密码
// @Summary 修改密码
// @Description 用户修改自己的密码
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param body body dto.ChangePasswordRequest true "密码信息"
// @Success 200 {object} utils.Response
// @Router /api/user/password [put]
func (ctrl *UserController) ChangePassword(c *gin.Context) {
	// 获取当前登录用户ID
	currentUserID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定请求参数
	var req dto.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层
	if err := ctrl.userService.ChangePassword(currentUserID.(uint), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "密码修改成功",
	})
}

// DeleteUser 删除用户（管理员专用）
// @Summary 删除用户
// @Description 管理员可以删除（禁用）用户
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} utils.Response
// @Router /api/admin/users/{id} [delete]
func (ctrl *UserController) DeleteUser(c *gin.Context) {
	// 获取路径参数中的用户ID
	userIDParam := c.Param("id")
	var userID uint
	if _, err := fmt.Sscanf(userIDParam, "%d", &userID); err != nil {
		utils.BadRequest(c, "无效的用户ID")
		return
	}

	// 调用服务层
	if err := ctrl.userService.DeleteUser(userID); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"message": "用户已删除",
	})
}

// GetCustomerOptions 获取客户选项列表
// @Summary 获取客户选项列表
// @Description 供代客户录单时选择客户账号
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param keyword query string false "搜索关键词"
// @Param page_size query int false "返回数量" default(20)
// @Success 200 {object} dto.CustomerOptionListResponse
// @Router /api/customers/options [get]
func (ctrl *UserController) GetCustomerOptions(c *gin.Context) {
	var req dto.CustomerOptionRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.userService.GetCustomerOptions(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}
