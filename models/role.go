package models

// IsManager 判断是否为管理层(调度员或管理员)
func IsManager(role int) bool {
	return role == int(RoleDispatcher) || role == int(RoleAdmin)
}

// IsAdmin 判断是否为管理员
func IsAdmin(role int) bool {
	return role == int(RoleAdmin)
}

// IsStaff 判断是否为员工(快递员、分拣员、司机、站点管理员、调度员、管理员)
func IsStaff(role int) bool {
	return role >= int(RoleCourier) && role <= int(RoleAdmin)
}

// CanManageAllOrders 判断是否可以管理所有订单
func CanManageAllOrders(role int) bool {
	return role == int(RoleDispatcher) || role == int(RoleAdmin)
}
