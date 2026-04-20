package controllers

import (
	"logistics-system/config"
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type AuthController struct{}

// Login 用户登录
func (ctrl *AuthController) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层进行登录
	userService := services.NewUserService()
	user, token, err := userService.Login(&req)
	if err != nil {
		utils.Error(c, 401, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"phone":     user.Phone,
			"real_name": user.RealName,
			"role":      user.Role,
			"status":    user.Status,
		},
	})
}

// Register 用户注册
func (ctrl *AuthController) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 调用服务层进行注册
	userService := services.NewUserService()
	user, err := userService.Register(&req)
	if err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	utils.SuccessWithMessage(c, "注册成功", gin.H{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"phone":     user.Phone,
		"real_name": user.RealName,
		"role":      user.Role,
	})
}

// GetProfile 获取当前用户信息
func (ctrl *AuthController) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Error(c, 401, "未授权访问")
		return
	}

	// 调用服务层获取用户信息
	userService := services.NewUserService()
	user, err := userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.NotFound(c, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"phone":     user.Phone,
		"real_name": user.RealName,
		"role":      user.Role,
		"status":    user.Status,
		"ctime":     user.CTime,
		"mtime":     user.MTime,
	})
}

// GetPermissions 获取当前用户的权限列表
func (ctrl *AuthController) GetPermissions(c *gin.Context) {
	role, exists := c.Get("role")
	if !exists {
		utils.Error(c, 401, "未授权访问")
		return
	}

	userRole := role.(int)

	// 导入config包获取权限
	permissions := config.GetRolePermissions(userRole)
	roleName := config.GetRoleName(userRole)

	utils.Success(c, gin.H{
		"role":        userRole,
		"role_name":   roleName,
		"permissions": permissions,
	})
}
