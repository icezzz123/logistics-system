package routes

import (
	"logistics-system/config"
	"logistics-system/controllers"
	"logistics-system/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes 设置路由
func SetupRoutes(r *gin.Engine) {
	// 初始化控制器
	authCtrl := &controllers.AuthController{}
	roleCtrl := &controllers.RoleController{}
	userCtrl := controllers.NewUserController()
	orderCtrl := controllers.NewOrderController()
	stationCtrl := controllers.NewStationController()
	warehouseCtrl := controllers.NewWarehouseController()
	sortingCtrl := controllers.NewSortingController()
	transportCtrl := controllers.NewTransportController()
	exceptionCtrl := controllers.NewExceptionController()
	trackingCtrl := controllers.NewTrackingController()
	dispatchCtrl := controllers.NewDispatchController()

	// 公开路由
	public := r.Group("/api")
	{
		// 认证相关
		auth := public.Group("/auth")
		{
			auth.POST("/login", authCtrl.Login)
			auth.POST("/register", authCtrl.Register)
		}
	}

	// 需要认证的路由
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// 用户信息
		protected.GET("/profile", authCtrl.GetProfile)
		protected.GET("/permissions", authCtrl.GetPermissions)

		// 用户自己的操作
		protected.PUT("/user/password", userCtrl.ChangePassword) // 修改密码

		// 角色查询（所有认证用户可查看）
		protected.GET("/roles", roleCtrl.GetRoleList)
		protected.GET("/roles/:id", roleCtrl.GetRoleDetail)
		protected.GET("/roles/:id/permissions", roleCtrl.GetRolePermissions)
		protected.GET("/roles/compare", roleCtrl.CompareRoles)

		// 用户管理（需要管理员权限）
		users := protected.Group("/users")
		users.Use(middleware.RequireAdmin())
		{
			users.GET("", userCtrl.GetUserList) // 获取用户列表
		}

		// 用户信息修改（用户自己或管理员）
		protected.PUT("/users/:id", userCtrl.UpdateUserInfo)                                                 // 更新用户信息
		protected.GET("/customers/options", middleware.RoleMiddleware(2, 5, 7), userCtrl.GetCustomerOptions) // 客户选项查询

		// 订单管理
		orders := protected.Group("/orders")
		{
			orders.POST("", orderCtrl.CreateOrder)
			orders.GET("", orderCtrl.GetOrderList)
			orders.GET("/statistics", orderCtrl.GetOrderStatistics)
			orders.GET("/:id", orderCtrl.GetOrderDetail)
			orders.GET("/:id/transitions", orderCtrl.GetAllowedStatusTransitions)
			orders.GET("/:id/status-logs", orderCtrl.GetOrderStatusLogs)
			orders.POST("/:id/split", orderCtrl.SplitOrder)
			orders.POST("/merge", orderCtrl.MergeOrders)
			orders.PUT("/:id", orderCtrl.UpdateOrder)
			orders.PUT("/:id/status", orderCtrl.UpdateOrderStatus)
			orders.PUT("/:id/cancel", orderCtrl.CancelOrder)
			orders.DELETE("/:id", orderCtrl.DeleteOrder)
		}

		// 站点管理
		stations := protected.Group("/stations")
		{
			stations.GET("", stationCtrl.GetStationList)                                        // 获取站点列表
			stations.GET("/flows/records", stationCtrl.GetStationFlows)                         // 获取站点流转记录
			stations.GET("/inventory", stationCtrl.GetStationInventory)                         // 获取站点库存
			stations.GET("/inventory/warnings", stationCtrl.GetInventoryWarnings)               // 获取库存预警
			stations.GET("/inventory/warnings/:level", stationCtrl.GetInventoryWarningsByLevel) // 按级别获取预警
			stations.POST("/inventory/check", stationCtrl.CreateInventoryCheck)                 // 创建库存盘点
			stations.GET("/inventory/check", stationCtrl.GetInventoryCheckList)                 // 获取盘点记录列表
			stations.GET("/inventory/check/:id", stationCtrl.GetInventoryCheckDetail)           // 获取盘点详情
			stations.PUT("/inventory/check/:id/complete", stationCtrl.CompleteInventoryCheck)   // 完成盘点
			stations.GET("/inventory/stats", stationCtrl.GetInventoryStats)                     // 获取库存统计报表
			stations.GET("/inventory/distribution", stationCtrl.GetInventoryDistribution)       // 获取库存分布统计
			stations.GET("/:id", stationCtrl.GetStationDetail)                                  // 获取站点详情
		}

		// 站点管理（管理员专用）
		stationsAdmin := protected.Group("/stations")
		stationsAdmin.Use(middleware.RequireAdmin())
		{
			stationsAdmin.POST("", stationCtrl.CreateStation)       // 创建站点
			stationsAdmin.PUT("/:id", stationCtrl.UpdateStation)    // 更新站点
			stationsAdmin.DELETE("/:id", stationCtrl.DeleteStation) // 删除站点
		}

		// 仓库管理（入库功能）
		warehouse := protected.Group("/warehouse")
		{
			warehouse.POST("/inbound", warehouseCtrl.InboundScan)                // 入库扫描
			warehouse.GET("/inbound/records", warehouseCtrl.GetInboundRecords)   // 入库记录查询
			warehouse.POST("/outbound", warehouseCtrl.OutboundScan)              // 出库扫描
			warehouse.GET("/outbound/records", warehouseCtrl.GetOutboundRecords) // 出库记录查询
		}

		// 分拣管理
		sorting := protected.Group("/sorting")
		{
			// 分拣规则管理
			sorting.GET("/rules", sortingCtrl.GetSortingRuleList)                 // 获取分拣规则列表
			sorting.GET("/rules/stats", sortingCtrl.GetSortingRuleStats)          // 获取分拣规则统计
			sorting.GET("/rules/:id", sortingCtrl.GetSortingRuleDetail)           // 获取分拣规则详情
			sorting.POST("/rules", sortingCtrl.CreateSortingRule)                 // 创建分拣规则
			sorting.PUT("/rules/:id", sortingCtrl.UpdateSortingRule)              // 更新分拣规则
			sorting.PUT("/rules/:id/status", sortingCtrl.UpdateSortingRuleStatus) // 更新规则状态
			sorting.DELETE("/rules/:id", sortingCtrl.DeleteSortingRule)           // 删除分拣规则
			sorting.POST("/route/match", sortingCtrl.MatchRoute)                  // 路由匹配
			sorting.POST("/route/batch", sortingCtrl.BatchMatchRoute)             // 批量路由匹配

			// 分拣任务管理
			sorting.GET("/tasks", sortingCtrl.GetSortingTaskList)                 // 获取分拣任务列表
			sorting.GET("/tasks/:id", sortingCtrl.GetSortingTaskDetail)           // 获取分拣任务详情
			sorting.POST("/tasks", sortingCtrl.CreateSortingTask)                 // 创建分拣任务
			sorting.PUT("/tasks/:id", sortingCtrl.UpdateSortingTask)              // 更新分拣任务
			sorting.PUT("/tasks/:id/status", sortingCtrl.UpdateSortingTaskStatus) // 更新任务状态

			// 分拣作业功能
			sorting.POST("/scan", sortingCtrl.SortingScan)            // 分拣扫描
			sorting.GET("/records", sortingCtrl.GetSortingRecordList) // 获取分拣记录列表

			// 分拣统计
			sorting.GET("/stats", sortingCtrl.GetSortingStats) // 获取分拣统计
		}

		// 运输管理
		transport := protected.Group("/transport")
		{
			// 车辆管理
			transport.GET("/vehicles", transportCtrl.GetVehicleList)                 // 获取车辆列表
			transport.GET("/vehicles/:id", transportCtrl.GetVehicle)                 // 获取车辆详情
			transport.POST("/vehicles", transportCtrl.CreateVehicle)                 // 创建车辆
			transport.PUT("/vehicles/:id", transportCtrl.UpdateVehicle)              // 更新车辆信息
			transport.PUT("/vehicles/:id/status", transportCtrl.UpdateVehicleStatus) // 更新车辆状态
			transport.DELETE("/vehicles/:id", transportCtrl.DeleteVehicle)           // 删除车辆

			// 运输任务管理
			transport.GET("/tasks", transportCtrl.GetTransportTaskList)                 // 获取运输任务列表
			transport.GET("/tasks/:id", transportCtrl.GetTransportTask)                 // 获取运输任务详情
			transport.POST("/tasks", transportCtrl.CreateTransportTask)                 // 创建运输任务
			transport.PUT("/tasks/:id", transportCtrl.UpdateTransportTask)              // 更新运输任务
			transport.PUT("/tasks/:id/status", transportCtrl.UpdateTransportTaskStatus) // 更新任务状态
			transport.POST("/tasks/:id/load-scan", transportCtrl.LoadScan)              // 装车扫描
			transport.POST("/tasks/:id/unload-scan", transportCtrl.UnloadScan)          // 卸车扫描
			transport.POST("/tasks/assign", transportCtrl.AssignVehicle)                // 批量分配车辆

			// 装卸记录管理
			transport.GET("/records", transportCtrl.GetTransportRecordList) // 获取装卸记录列表
			transport.GET("/records/:id", transportCtrl.GetTransportRecord) // 获取装卸记录详情

			// 运输监控与预警
			transport.GET("/monitor/overview", transportCtrl.GetTransportMonitorOverview) // 获取运输监控概览
			transport.GET("/monitor/tasks", transportCtrl.GetTransportMonitorTaskList)    // 获取运输监控任务列表
			transport.GET("/monitor/warnings", transportCtrl.GetTransportWarningList)     // 获取运输预警列表

			// 运输成本核算
			transport.GET("/costs/overview", transportCtrl.GetTransportCostOverview)    // 获取运输成本概览
			transport.GET("/costs/tasks", transportCtrl.GetTransportCostTaskList)       // 获取运输成本任务列表
			transport.GET("/costs/tasks/:id", transportCtrl.GetTransportCostTaskDetail) // 获取运输成本任务详情

			// 运输统计
			transport.GET("/stats", transportCtrl.GetTransportStats) // 获取运输统计
		}

		// 异常管理
		exceptions := protected.Group("/exceptions")
		{
			exceptions.GET("", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetExceptionList)               // 获取异常列表
			exceptions.GET("/stats", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetExceptionStats)        // 获取异常统计
			exceptions.GET("/:id", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetException)               // 获取异常详情
			exceptions.POST("", middleware.RequirePermission(config.PermExceptionCreate), exceptionCtrl.CreateException)             // 创建异常
			exceptions.PUT("/:id/assign", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.AssignException)   // 分配异常处理人
			exceptions.PUT("/:id/process", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.ProcessException) // 处理异常
			exceptions.PUT("/:id/close", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.CloseException)     // 关闭异常
		}

		// 追踪管理
		tracking := protected.Group("/tracking")
		{
			tracking.GET("/records", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingRecordList)                      // 获取追踪记录列表
			tracking.GET("/records/:id", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingRecord)                      // 获取追踪记录详情
			tracking.GET("/orders/:order_id/history", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetOrderTrackingHistory)   // 获取订单追踪历史
			tracking.GET("/orders/:order_id/timeline", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetOrderTrackingTimeline) // 获取订单追踪时间轴
			tracking.GET("/warnings", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingWarnings)                       // 获取追踪预警列表
			tracking.POST("/records", middleware.RequirePermission(config.PermTrackingUpdate), trackingCtrl.CreateTrackingRecord)                    // 创建追踪记录
		}

		// 运输调度
		dispatch := protected.Group("/dispatch")
		{
			dispatch.POST("/route/optimize", dispatchCtrl.OptimizeRoute)                // 路径优化
			dispatch.GET("/batches", dispatchCtrl.GetBatchScheduleList)                 // 批次调度列表
			dispatch.POST("/batches", dispatchCtrl.CreateBatchSchedule)                 // 创建批次调度
			dispatch.PUT("/batches/:id/status", dispatchCtrl.UpdateBatchScheduleStatus) // 更新批次状态
			dispatch.POST("/suggestion", dispatchCtrl.GetDispatchSuggestion)            // 智能调度建议
			dispatch.GET("/plans", dispatchCtrl.GetTransportPlanList)                   // 运输计划列表
			dispatch.POST("/plans", dispatchCtrl.CreateTransportPlan)                   // 创建运输计划
			dispatch.GET("/plans/:id", dispatchCtrl.GetTransportPlan)                   // 运输计划详情
			dispatch.PUT("/plans/:id", dispatchCtrl.UpdateTransportPlan)                // 更新运输计划
			dispatch.PUT("/plans/:id/status", dispatchCtrl.UpdateTransportPlanStatus)   // 更新计划状态
			dispatch.POST("/plans/:id/orders", dispatchCtrl.AssignOrdersToPlan)         // 订单加入计划
		}

		// 员工路由（快递员、分拣员、司机、站点管理员、调度员、管理员）
		staff := protected.Group("/staff")
		staff.Use(middleware.RequireStaff())
		{
			// 员工专属功能
		}

		// 管理层路由（站点管理员、调度员、管理员）
		manager := protected.Group("/manager")
		manager.Use(middleware.RequireManager())
		{
			// 管理层专属功能
		}

		// 管理员路由
		admin := protected.Group("/admin")
		admin.Use(middleware.RequireAdmin())
		{
			// 用户管理（管理员专属）
			admin.POST("/users", userCtrl.CreateUser)                 // 创建用户
			admin.PUT("/users/:id/role", roleCtrl.AssignUserRole)     // 分配角色
			admin.GET("/users/:id/role", roleCtrl.GetUserRole)        // 获取用户角色
			admin.PUT("/users/:id/status", userCtrl.UpdateUserStatus) // 更新用户状态
			admin.DELETE("/users/:id", userCtrl.DeleteUser)           // 删除用户

			// 站点管理（管理员专属）
			admin.POST("/stations", stationCtrl.CreateStation)       // 创建站点
			admin.PUT("/stations/:id", stationCtrl.UpdateStation)    // 更新站点
			admin.DELETE("/stations/:id", stationCtrl.DeleteStation) // 删除站点
		}
	}
}
