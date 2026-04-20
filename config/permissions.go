package config

// Permission 权限定义
type Permission string

const (
	// 用户管理权限
	PermUserView   Permission = "user:view"   // 查看用户
	PermUserCreate Permission = "user:create" // 创建用户
	PermUserUpdate Permission = "user:update" // 更新用户
	PermUserDelete Permission = "user:delete" // 删除用户

	// 订单管理权限
	PermOrderView   Permission = "order:view"   // 查看订单
	PermOrderCreate Permission = "order:create" // 创建订单
	PermOrderUpdate Permission = "order:update" // 更新订单
	PermOrderDelete Permission = "order:delete" // 删除订单
	PermOrderAssign Permission = "order:assign" // 分配订单

	// 物流跟踪权限
	PermTrackingView   Permission = "tracking:view"   // 查看物流跟踪
	PermTrackingUpdate Permission = "tracking:update" // 更新物流跟踪

	// 运输管理权限
	PermTransportView   Permission = "transport:view"   // 查看运输
	PermTransportCreate Permission = "transport:create" // 创建运输
	PermTransportUpdate Permission = "transport:update" // 更新运输
	PermTransportDelete Permission = "transport:delete" // 删除运输

	// 分拣管理权限
	PermSortingView   Permission = "sorting:view"   // 查看分拣
	PermSortingCreate Permission = "sorting:create" // 创建分拣
	PermSortingUpdate Permission = "sorting:update" // 更新分拣

	// 配送管理权限
	PermDeliveryView   Permission = "delivery:view"   // 查看配送
	PermDeliveryCreate Permission = "delivery:create" // 创建配送
	PermDeliveryUpdate Permission = "delivery:update" // 更新配送

	// 站点管理权限
	PermStationView   Permission = "station:view"   // 查看站点
	PermStationCreate Permission = "station:create" // 创建站点
	PermStationUpdate Permission = "station:update" // 更新站点
	PermStationDelete Permission = "station:delete" // 删除站点

	// 仓库管理权限
	PermWarehouseView   Permission = "warehouse:view"   // 查看仓库
	PermWarehouseCreate Permission = "warehouse:create" // 创建仓库
	PermWarehouseUpdate Permission = "warehouse:update" // 更新仓库
	PermWarehouseDelete Permission = "warehouse:delete" // 删除仓库

	// 异常管理权限
	PermExceptionView   Permission = "exception:view"   // 查看异常
	PermExceptionCreate Permission = "exception:create" // 创建异常
	PermExceptionUpdate Permission = "exception:update" // 更新异常
	PermExceptionDelete Permission = "exception:delete" // 删除异常

	// 系统管理权限
	PermSystemConfig Permission = "system:config" // 系统配置
	PermSystemLog    Permission = "system:log"    // 系统日志
)

// RolePermissions 角色权限映射
var RolePermissions = map[int][]Permission{
	// 1 - 客户
	1: {
		PermOrderView,    // 查看自己的订单
		PermOrderCreate,  // 创建订单
		PermTrackingView, // 查看物流跟踪
	},

	// 2 - 快递员
	2: {
		PermOrderView,      // 查看订单
		PermDeliveryView,   // 查看配送
		PermDeliveryUpdate, // 更新配送状态
		PermTrackingView,   // 查看物流跟踪
		PermTrackingUpdate, // 更新物流跟踪
	},

	// 3 - 分拣员
	3: {
		PermOrderView,      // 查看订单
		PermSortingView,    // 查看分拣
		PermSortingCreate,  // 创建分拣记录
		PermSortingUpdate,  // 更新分拣状态
		PermTrackingView,   // 查看物流跟踪
		PermTrackingUpdate, // 更新物流跟踪
	},

	// 4 - 司机
	4: {
		PermOrderView,       // 查看订单
		PermTransportView,   // 查看运输
		PermTransportUpdate, // 更新运输状态
		PermTrackingView,    // 查看物流跟踪
		PermTrackingUpdate,  // 更新物流跟踪
	},

	// 5 - 站点管理员
	5: {
		PermOrderView,       // 查看订单
		PermOrderUpdate,     // 更新订单
		PermOrderAssign,     // 分配订单
		PermTrackingView,    // 查看物流跟踪
		PermTrackingUpdate,  // 更新物流跟踪
		PermDeliveryView,    // 查看配送
		PermDeliveryCreate,  // 创建配送
		PermDeliveryUpdate,  // 更新配送
		PermSortingView,     // 查看分拣
		PermSortingCreate,   // 创建分拣
		PermSortingUpdate,   // 更新分拣
		PermStationView,     // 查看站点
		PermStationUpdate,   // 更新站点
		PermExceptionView,   // 查看异常
		PermExceptionCreate, // 创建异常
		PermExceptionUpdate, // 更新异常
	},

	// 6 - 调度员
	6: {
		PermOrderView,       // 查看订单
		PermOrderUpdate,     // 更新订单
		PermOrderAssign,     // 分配订单
		PermTrackingView,    // 查看物流跟踪
		PermTrackingUpdate,  // 更新物流跟踪
		PermTransportView,   // 查看运输
		PermTransportCreate, // 创建运输
		PermTransportUpdate, // 更新运输
		PermDeliveryView,    // 查看配送
		PermDeliveryCreate,  // 创建配送
		PermDeliveryUpdate,  // 更新配送
		PermSortingView,     // 查看分拣
		PermStationView,     // 查看站点
		PermWarehouseView,   // 查看仓库
		PermExceptionView,   // 查看异常
		PermExceptionCreate, // 创建异常
		PermExceptionUpdate, // 更新异常
	},

	// 7 - 管理员（拥有所有权限）
	7: {
		// 用户管理
		PermUserView,
		PermUserCreate,
		PermUserUpdate,
		PermUserDelete,

		// 订单管理
		PermOrderView,
		PermOrderCreate,
		PermOrderUpdate,
		PermOrderDelete,
		PermOrderAssign,

		// 物流跟踪
		PermTrackingView,
		PermTrackingUpdate,

		// 运输管理
		PermTransportView,
		PermTransportCreate,
		PermTransportUpdate,
		PermTransportDelete,

		// 分拣管理
		PermSortingView,
		PermSortingCreate,
		PermSortingUpdate,

		// 配送管理
		PermDeliveryView,
		PermDeliveryCreate,
		PermDeliveryUpdate,

		// 站点管理
		PermStationView,
		PermStationCreate,
		PermStationUpdate,
		PermStationDelete,

		// 仓库管理
		PermWarehouseView,
		PermWarehouseCreate,
		PermWarehouseUpdate,
		PermWarehouseDelete,

		// 异常管理
		PermExceptionView,
		PermExceptionCreate,
		PermExceptionUpdate,
		PermExceptionDelete,

		// 系统管理
		PermSystemConfig,
		PermSystemLog,
	},
}

// RoleNames 角色名称映射
var RoleNames = map[int]string{
	1: "客户",
	2: "快递员",
	3: "分拣员",
	4: "司机",
	5: "站点管理员",
	6: "调度员",
	7: "管理员",
}

// HasPermission 检查角色是否拥有指定权限
func HasPermission(role int, permission Permission) bool {
	permissions, exists := RolePermissions[role]
	if !exists {
		return false
	}

	for _, p := range permissions {
		if p == permission {
			return true
		}
	}

	return false
}

// GetRolePermissions 获取角色的所有权限
func GetRolePermissions(role int) []Permission {
	permissions, exists := RolePermissions[role]
	if !exists {
		return []Permission{}
	}
	return permissions
}

// GetRoleName 获取角色名称
func GetRoleName(role int) string {
	name, exists := RoleNames[role]
	if !exists {
		return "未知角色"
	}
	return name
}

// IsValidRole 检查角色ID是否有效
func IsValidRole(role int) bool {
	_, exists := RoleNames[role]
	return exists
}
