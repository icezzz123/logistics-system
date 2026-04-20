package middleware

import (
	"logistics-system/config"
	"logistics-system/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.Unauthorized(c, "未提供认证令牌")
			c.Abort()
			return
		}

		// 检查Bearer前缀
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			utils.Unauthorized(c, "认证令牌格式错误")
			c.Abort()
			return
		}

		// 解析Token
		claims, err := utils.ParseToken(parts[1])
		if err != nil {
			utils.Unauthorized(c, "无效的认证令牌")
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// RoleMiddleware 角色权限中间件
// allowedRoles: 允许的角色ID列表（1-客户, 2-快递员, 3-分拣员, 4-司机, 5-站点管理员, 6-调度员, 7-管理员）
func RoleMiddleware(allowedRoles ...int) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		userRole := role.(int)
		allowed := false
		for _, r := range allowedRoles {
			if userRole == r {
				allowed = true
				break
			}
		}

		if !allowed {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin 要求管理员权限
func RequireAdmin() gin.HandlerFunc {
	return RoleMiddleware(7) // 7 = 管理员
}

// RequireStaff 要求员工权限（快递员、分拣员、司机、站点管理员、调度员、管理员）
func RequireStaff() gin.HandlerFunc {
	return RoleMiddleware(2, 3, 4, 5, 6, 7)
}

// RequireManager 要求管理层权限（站点管理员、调度员、管理员）
func RequireManager() gin.HandlerFunc {
	return RoleMiddleware(5, 6, 7)
}

// OwnerOrAdminMiddleware 资源所有者或管理员权限中间件
// 检查当前用户是否为资源所有者或管理员
// userIDKey: 上下文中资源所有者ID的键名（如"order_user_id"）
func OwnerOrAdminMiddleware(userIDKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID, exists := c.Get("user_id")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		role, exists := c.Get("role")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		// 管理员可以访问所有资源
		if role.(int) == 7 {
			c.Next()
			return
		}

		// 检查是否为资源所有者
		resourceUserID, exists := c.Get(userIDKey)
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		if currentUserID.(uint) != resourceUserID.(uint) {
			utils.Forbidden(c, "无权限访问此资源")
			c.Abort()
			return
		}

		c.Next()
	}
}

// CheckPermission 通用权限检查函数
// 可在控制器中使用，检查用户是否有特定权限
func CheckPermission(c *gin.Context, requiredRoles ...int) bool {
	role, exists := c.Get("role")
	if !exists {
		return false
	}

	userRole := role.(int)
	for _, r := range requiredRoles {
		if userRole == r {
			return true
		}
	}

	return false
}

// IsAdmin 检查当前用户是否为管理员
func IsAdmin(c *gin.Context) bool {
	return CheckPermission(c, 7)
}

// IsStaff 检查当前用户是否为员工
func IsStaff(c *gin.Context) bool {
	return CheckPermission(c, 2, 3, 4, 5, 6, 7)
}

// IsManager 检查当前用户是否为管理层
func IsManager(c *gin.Context) bool {
	return CheckPermission(c, 5, 6, 7)
}

// GetCurrentUserID 获取当前登录用户ID
func GetCurrentUserID(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	return userID.(uint), true
}

// GetCurrentUsername 获取当前登录用户名
func GetCurrentUsername(c *gin.Context) (string, bool) {
	username, exists := c.Get("username")
	if !exists {
		return "", false
	}
	return username.(string), true
}

// GetCurrentUserRole 获取当前登录用户角色
func GetCurrentUserRole(c *gin.Context) (int, bool) {
	role, exists := c.Get("role")
	if !exists {
		return 0, false
	}
	return role.(int), true
}

// RequirePermission 权限检查中间件
// 检查当前用户是否拥有指定权限
func RequirePermission(permission config.Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		userRole := role.(int)
		if !config.HasPermission(userRole, permission) {
			utils.Forbidden(c, "无权限执行此操作")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyPermission 要求拥有任一权限
// 用户只需拥有其中一个权限即可通过
func RequireAnyPermission(permissions ...config.Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		userRole := role.(int)
		for _, permission := range permissions {
			if config.HasPermission(userRole, permission) {
				c.Next()
				return
			}
		}

		utils.Forbidden(c, "无权限执行此操作")
		c.Abort()
	}
}

// RequireAllPermissions 要求拥有所有权限
// 用户必须拥有所有指定权限才能通过
func RequireAllPermissions(permissions ...config.Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			utils.Forbidden(c, "无权限访问")
			c.Abort()
			return
		}

		userRole := role.(int)
		for _, permission := range permissions {
			if !config.HasPermission(userRole, permission) {
				utils.Forbidden(c, "无权限执行此操作")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// HasPermission 检查当前用户是否拥有指定权限（辅助函数）
func HasPermission(c *gin.Context, permission config.Permission) bool {
	role, exists := c.Get("role")
	if !exists {
		return false
	}

	userRole := role.(int)
	return config.HasPermission(userRole, permission)
}

// GetUserPermissions 获取当前用户的所有权限
func GetUserPermissions(c *gin.Context) []config.Permission {
	role, exists := c.Get("role")
	if !exists {
		return []config.Permission{}
	}

	userRole := role.(int)
	return config.GetRolePermissions(userRole)
}
