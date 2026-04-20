package controllers

import (
	"logistics-system/config"
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type RoleController struct{}

// GetRoleList 获取所有角色列表
func (ctrl *RoleController) GetRoleList(c *gin.Context) {
	roles := []gin.H{
		{
			"id":                1,
			"name":              "客户",
			"description":       "普通用户，可以下单和查询订单",
			"permissions_count": len(config.GetRolePermissions(1)),
		},
		{
			"id":                2,
			"name":              "快递员",
			"description":       "负责配送包裹",
			"permissions_count": len(config.GetRolePermissions(2)),
		},
		{
			"id":                3,
			"name":              "分拣员",
			"description":       "负责分拣包裹",
			"permissions_count": len(config.GetRolePermissions(3)),
		},
		{
			"id":                4,
			"name":              "司机",
			"description":       "负责运输包裹",
			"permissions_count": len(config.GetRolePermissions(4)),
		},
		{
			"id":                5,
			"name":              "站点管理员",
			"description":       "管理站点运营",
			"permissions_count": len(config.GetRolePermissions(5)),
		},
		{
			"id":                6,
			"name":              "调度员",
			"description":       "调度运输资源",
			"permissions_count": len(config.GetRolePermissions(6)),
		},
		{
			"id":                7,
			"name":              "管理员",
			"description":       "系统管理员，拥有所有权限",
			"permissions_count": len(config.GetRolePermissions(7)),
		},
	}

	utils.Success(c, gin.H{
		"roles": roles,
		"total": len(roles),
	})
}

// GetRoleDetail 获取角色详情
func (ctrl *RoleController) GetRoleDetail(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "无效的角色ID")
		return
	}

	if !config.IsValidRole(roleID) {
		utils.NotFound(c, "角色不存在")
		return
	}

	roleName := config.GetRoleName(roleID)
	permissions := config.GetRolePermissions(roleID)

	// 角色描述
	descriptions := map[int]string{
		1: "普通用户，可以下单和查询订单",
		2: "负责配送包裹，更新配送状态",
		3: "负责分拣包裹，记录分拣信息",
		4: "负责运输包裹，更新运输状态",
		5: "管理站点运营，分配任务，处理异常",
		6: "调度运输资源，规划路线",
		7: "系统管理员，拥有所有权限",
	}

	utils.Success(c, gin.H{
		"id":          roleID,
		"name":        roleName,
		"description": descriptions[roleID],
		"permissions": permissions,
	})
}

// GetRolePermissions 获取角色的所有权限
func (ctrl *RoleController) GetRolePermissions(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.BadRequest(c, "无效的角色ID")
		return
	}

	if !config.IsValidRole(roleID) {
		utils.NotFound(c, "角色不存在")
		return
	}

	roleName := config.GetRoleName(roleID)
	permissions := config.GetRolePermissions(roleID)

	// 按类别分组权限
	groupedPermissions := ctrl.groupPermissionsByCategory(permissions)

	utils.Success(c, gin.H{
		"role":                roleID,
		"role_name":           roleName,
		"permissions":         permissions,
		"grouped_permissions": groupedPermissions,
		"permissions_count":   len(permissions),
	})
}

// AssignUserRole 分配用户角色
func (ctrl *RoleController) AssignUserRole(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的用户ID")
		return
	}

	var req dto.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	// 验证角色是否有效
	if !config.IsValidRole(req.RoleID) {
		utils.BadRequest(c, "无效的角色ID")
		return
	}

	// 调用服务层更新用户角色
	userService := services.NewUserService()
	if err := userService.UpdateUserRole(uint(userID), req.RoleID); err != nil {
		utils.BadRequest(c, err.Error())
		return
	}

	roleName := config.GetRoleName(req.RoleID)
	utils.SuccessWithMessage(c, "角色分配成功", gin.H{
		"user_id":   userID,
		"role_id":   req.RoleID,
		"role_name": roleName,
	})
}

// GetUserRole 获取用户的角色信息
func (ctrl *RoleController) GetUserRole(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.BadRequest(c, "无效的用户ID")
		return
	}

	// 获取用户信息
	userService := services.NewUserService()
	user, err := userService.GetUserByID(uint(userID))
	if err != nil {
		utils.NotFound(c, err.Error())
		return
	}

	// 获取角色信息
	roleID := int(user.Role)
	roleName := config.GetRoleName(roleID)
	permissions := config.GetRolePermissions(roleID)

	utils.Success(c, gin.H{
		"user_id":           user.ID,
		"username":          user.Username,
		"role_id":           roleID,
		"role_name":         roleName,
		"permissions":       permissions,
		"permissions_count": len(permissions),
	})
}

// CompareRoles 比较两个角色的权限差异
func (ctrl *RoleController) CompareRoles(c *gin.Context) {
	role1, err1 := strconv.Atoi(c.Query("role1"))
	role2, err2 := strconv.Atoi(c.Query("role2"))

	if err1 != nil || err2 != nil {
		utils.BadRequest(c, "无效的角色ID")
		return
	}

	if !config.IsValidRole(role1) || !config.IsValidRole(role2) {
		utils.BadRequest(c, "角色不存在")
		return
	}

	perms1 := config.GetRolePermissions(role1)
	perms2 := config.GetRolePermissions(role2)

	// 计算权限差异
	onlyInRole1 := ctrl.diffPermissions(perms1, perms2)
	onlyInRole2 := ctrl.diffPermissions(perms2, perms1)
	common := ctrl.intersectPermissions(perms1, perms2)

	utils.Success(c, gin.H{
		"role1": gin.H{
			"id":          role1,
			"name":        config.GetRoleName(role1),
			"permissions": perms1,
		},
		"role2": gin.H{
			"id":          role2,
			"name":        config.GetRoleName(role2),
			"permissions": perms2,
		},
		"comparison": gin.H{
			"only_in_role1": onlyInRole1,
			"only_in_role2": onlyInRole2,
			"common":        common,
		},
	})
}

// groupPermissionsByCategory 按类别分组权限
func (ctrl *RoleController) groupPermissionsByCategory(permissions []config.Permission) map[string][]config.Permission {
	grouped := make(map[string][]config.Permission)

	for _, perm := range permissions {
		permStr := string(perm)
		category := ""

		// 根据权限前缀分类
		if len(permStr) > 0 {
			for i, ch := range permStr {
				if ch == ':' {
					category = permStr[:i]
					break
				}
			}
		}

		if category == "" {
			category = "other"
		}

		grouped[category] = append(grouped[category], perm)
	}

	return grouped
}

// diffPermissions 计算权限差集（在perms1中但不在perms2中）
func (ctrl *RoleController) diffPermissions(perms1, perms2 []config.Permission) []config.Permission {
	result := []config.Permission{}
	perms2Map := make(map[config.Permission]bool)

	for _, p := range perms2 {
		perms2Map[p] = true
	}

	for _, p := range perms1 {
		if !perms2Map[p] {
			result = append(result, p)
		}
	}

	return result
}

// intersectPermissions 计算权限交集
func (ctrl *RoleController) intersectPermissions(perms1, perms2 []config.Permission) []config.Permission {
	result := []config.Permission{}
	perms2Map := make(map[config.Permission]bool)

	for _, p := range perms2 {
		perms2Map[p] = true
	}

	for _, p := range perms1 {
		if perms2Map[p] {
			result = append(result, p)
		}
	}

	return result
}
