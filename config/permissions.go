package config

type Permission string

const (
	PermUserView   Permission = "user:view"
	PermUserCreate Permission = "user:create"
	PermUserUpdate Permission = "user:update"
	PermUserDelete Permission = "user:delete"

	PermOrderView   Permission = "order:view"
	PermOrderCreate Permission = "order:create"
	PermOrderUpdate Permission = "order:update"
	PermOrderDelete Permission = "order:delete"
	PermOrderAssign Permission = "order:assign"

	PermTrackingView   Permission = "tracking:view"
	PermTrackingUpdate Permission = "tracking:update"

	PermTransportView   Permission = "transport:view"
	PermTransportCreate Permission = "transport:create"
	PermTransportUpdate Permission = "transport:update"
	PermTransportDelete Permission = "transport:delete"

	PermSortingView   Permission = "sorting:view"
	PermSortingCreate Permission = "sorting:create"
	PermSortingUpdate Permission = "sorting:update"

	PermDeliveryView   Permission = "delivery:view"
	PermDeliveryCreate Permission = "delivery:create"
	PermDeliveryUpdate Permission = "delivery:update"

	PermPickupView   Permission = "pickup:view"
	PermPickupCreate Permission = "pickup:create"
	PermPickupUpdate Permission = "pickup:update"

	PermStationView   Permission = "station:view"
	PermStationCreate Permission = "station:create"
	PermStationUpdate Permission = "station:update"
	PermStationDelete Permission = "station:delete"

	PermWarehouseView   Permission = "warehouse:view"
	PermWarehouseCreate Permission = "warehouse:create"
	PermWarehouseUpdate Permission = "warehouse:update"
	PermWarehouseDelete Permission = "warehouse:delete"

	PermExceptionView   Permission = "exception:view"
	PermExceptionCreate Permission = "exception:create"
	PermExceptionUpdate Permission = "exception:update"
	PermExceptionDelete Permission = "exception:delete"

	PermSystemConfig Permission = "system:config"
	PermSystemLog    Permission = "system:log"
)

var RolePermissions = map[int][]Permission{
	1: {
		PermOrderView,
		PermOrderCreate,
		PermTrackingView,
		PermExceptionView,
		PermExceptionCreate,
	},
	2: {
		PermOrderView,
		PermPickupView,
		PermPickupUpdate,
		PermDeliveryView,
		PermDeliveryUpdate,
		PermTrackingView,
		PermTrackingUpdate,
	},
	3: {
		PermOrderView,
		PermSortingView,
		PermSortingCreate,
		PermSortingUpdate,
		PermTrackingView,
		PermTrackingUpdate,
	},
	4: {
		PermOrderView,
		PermTransportView,
		PermTransportUpdate,
		PermTrackingView,
		PermTrackingUpdate,
	},
	5: {
		PermOrderView,
		PermOrderUpdate,
		PermOrderAssign,
		PermTrackingView,
		PermTrackingUpdate,
		PermPickupView,
		PermPickupCreate,
		PermPickupUpdate,
		PermDeliveryView,
		PermDeliveryCreate,
		PermDeliveryUpdate,
		PermSortingView,
		PermSortingCreate,
		PermSortingUpdate,
		PermStationView,
		PermStationUpdate,
		PermExceptionView,
		PermExceptionCreate,
		PermExceptionUpdate,
	},
	6: {
		PermOrderView,
		PermOrderUpdate,
		PermOrderAssign,
		PermTrackingView,
		PermTrackingUpdate,
		PermTransportView,
		PermTransportCreate,
		PermTransportUpdate,
		PermPickupView,
		PermPickupCreate,
		PermPickupUpdate,
		PermDeliveryView,
		PermDeliveryCreate,
		PermDeliveryUpdate,
		PermSortingView,
		PermStationView,
		PermWarehouseView,
		PermExceptionView,
		PermExceptionCreate,
		PermExceptionUpdate,
	},
	7: {
		PermUserView,
		PermUserCreate,
		PermUserUpdate,
		PermUserDelete,
		PermOrderView,
		PermOrderCreate,
		PermOrderUpdate,
		PermOrderDelete,
		PermOrderAssign,
		PermTrackingView,
		PermTrackingUpdate,
		PermTransportView,
		PermTransportCreate,
		PermTransportUpdate,
		PermTransportDelete,
		PermSortingView,
		PermSortingCreate,
		PermSortingUpdate,
		PermPickupView,
		PermPickupCreate,
		PermPickupUpdate,
		PermDeliveryView,
		PermDeliveryCreate,
		PermDeliveryUpdate,
		PermStationView,
		PermStationCreate,
		PermStationUpdate,
		PermStationDelete,
		PermWarehouseView,
		PermWarehouseCreate,
		PermWarehouseUpdate,
		PermWarehouseDelete,
		PermExceptionView,
		PermExceptionCreate,
		PermExceptionUpdate,
		PermExceptionDelete,
		PermSystemConfig,
		PermSystemLog,
	},
}

var RoleNames = map[int]string{
	1: "客户",
	2: "快递员",
	3: "分拣员",
	4: "司机",
	5: "站点管理员",
	6: "调度员",
	7: "管理员",
}

func HasPermission(role int, permission Permission) bool {
	permissions, exists := RolePermissions[role]
	if !exists {
		return false
	}

	for _, item := range permissions {
		if item == permission {
			return true
		}
	}

	return false
}

func GetRolePermissions(role int) []Permission {
	permissions, exists := RolePermissions[role]
	if !exists {
		return []Permission{}
	}
	return permissions
}

func GetRoleName(role int) string {
	name, exists := RoleNames[role]
	if !exists {
		return "未知角色"
	}
	return name
}

func IsValidRole(role int) bool {
	_, exists := RoleNames[role]
	return exists
}
