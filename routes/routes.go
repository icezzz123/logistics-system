package routes

import (
	"logistics-system/config"
	"logistics-system/controllers"
	"logistics-system/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes.
func SetupRoutes(r *gin.Engine) {
	authCtrl := &controllers.AuthController{}
	roleCtrl := &controllers.RoleController{}
	userCtrl := controllers.NewUserController()
	addressBookCtrl := controllers.NewAddressBookController()
	orderCtrl := controllers.NewOrderController()
	stationCtrl := controllers.NewStationController()
	warehouseCtrl := controllers.NewWarehouseController()
	sortingCtrl := controllers.NewSortingController()
	transportCtrl := controllers.NewTransportController()
	pickupCtrl := controllers.NewPickupController()
	deliveryCtrl := controllers.NewDeliveryController()
	exceptionCtrl := controllers.NewExceptionController()
	trackingCtrl := controllers.NewTrackingController()
	dispatchCtrl := controllers.NewDispatchController()

	public := r.Group("/api")
	{
		auth := public.Group("/auth")
		{
			auth.POST("/login", authCtrl.Login)
			auth.POST("/register", authCtrl.Register)
		}
	}

	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/profile", authCtrl.GetProfile)
		protected.GET("/permissions", authCtrl.GetPermissions)
		protected.PUT("/user/password", userCtrl.ChangePassword)
		protected.GET("/address-book", addressBookCtrl.GetAddressList)
		protected.POST("/address-book", addressBookCtrl.CreateAddress)
		protected.PUT("/address-book/:id", addressBookCtrl.UpdateAddress)
		protected.DELETE("/address-book/:id", addressBookCtrl.DeleteAddress)
		protected.PUT("/address-book/:id/default", addressBookCtrl.SetDefaultAddress)

		protected.GET("/roles", roleCtrl.GetRoleList)
		protected.GET("/roles/:id", roleCtrl.GetRoleDetail)
		protected.GET("/roles/:id/permissions", roleCtrl.GetRolePermissions)
		protected.GET("/roles/compare", roleCtrl.CompareRoles)

		users := protected.Group("/users")
		users.Use(middleware.RequireAdmin())
		{
			users.GET("", userCtrl.GetUserList)
		}

		protected.PUT("/users/:id", userCtrl.UpdateUserInfo)

		orders := protected.Group("/orders")
		{
			orders.POST("", orderCtrl.CreateOrder)
			orders.GET("", orderCtrl.GetOrderList)
			orders.GET("/statistics", orderCtrl.GetOrderStatistics)
			orders.POST("/hs-suggest", orderCtrl.SuggestHSCode)
			orders.POST("/merge", orderCtrl.MergeOrders)
			orders.GET("/:id", orderCtrl.GetOrderDetail)
			orders.GET("/:id/transitions", orderCtrl.GetAllowedStatusTransitions)
			orders.GET("/:id/status-logs", orderCtrl.GetOrderStatusLogs)
			orders.GET("/:id/customs", orderCtrl.GetOrderCustoms)
			orders.POST("/:id/split", orderCtrl.SplitOrder)
			orders.PUT("/:id", orderCtrl.UpdateOrder)
			orders.PUT("/:id/status", orderCtrl.UpdateOrderStatus)
			orders.PUT("/:id/cancel", orderCtrl.CancelOrder)
			orders.PUT("/:id/customs", orderCtrl.UpdateOrderCustoms)
			orders.POST("/:id/customs/nodes", orderCtrl.AddOrderCustomsNode)
			orders.POST("/:id/customs/exception", orderCtrl.CreateOrderCustomsException)
			orders.DELETE("/:id", orderCtrl.DeleteOrder)
		}

		stations := protected.Group("/stations")
		{
			stations.GET("", stationCtrl.GetStationList)
			stations.GET("/flows/records", stationCtrl.GetStationFlows)
			stations.GET("/inventory", stationCtrl.GetStationInventory)
			stations.GET("/inventory/warnings", stationCtrl.GetInventoryWarnings)
			stations.GET("/inventory/warnings/:level", stationCtrl.GetInventoryWarningsByLevel)
			stations.POST("/inventory/check", stationCtrl.CreateInventoryCheck)
			stations.GET("/inventory/check", stationCtrl.GetInventoryCheckList)
			stations.GET("/inventory/check/:id", stationCtrl.GetInventoryCheckDetail)
			stations.PUT("/inventory/check/:id/complete", stationCtrl.CompleteInventoryCheck)
			stations.GET("/inventory/stats", stationCtrl.GetInventoryStats)
			stations.GET("/inventory/distribution", stationCtrl.GetInventoryDistribution)
			stations.GET("/:id", stationCtrl.GetStationDetail)
		}

		stationsAdmin := protected.Group("/stations")
		stationsAdmin.Use(middleware.RequireAdmin())
		{
			stationsAdmin.POST("", stationCtrl.CreateStation)
			stationsAdmin.PUT("/:id", stationCtrl.UpdateStation)
			stationsAdmin.DELETE("/:id", stationCtrl.DeleteStation)
		}

		warehouse := protected.Group("/warehouse")
		{
			warehouse.POST("/inbound", warehouseCtrl.InboundScan)
			warehouse.GET("/inbound/records", warehouseCtrl.GetInboundRecords)
			warehouse.POST("/outbound", warehouseCtrl.OutboundScan)
			warehouse.GET("/outbound/records", warehouseCtrl.GetOutboundRecords)
		}

		sorting := protected.Group("/sorting")
		{
			sorting.GET("/rules", sortingCtrl.GetSortingRuleList)
			sorting.GET("/rules/stats", sortingCtrl.GetSortingRuleStats)
			sorting.GET("/rules/:id", sortingCtrl.GetSortingRuleDetail)
			sorting.POST("/rules", sortingCtrl.CreateSortingRule)
			sorting.PUT("/rules/:id", sortingCtrl.UpdateSortingRule)
			sorting.PUT("/rules/:id/status", sortingCtrl.UpdateSortingRuleStatus)
			sorting.DELETE("/rules/:id", sortingCtrl.DeleteSortingRule)
			sorting.POST("/route/match", sortingCtrl.MatchRoute)
			sorting.POST("/route/batch", sortingCtrl.BatchMatchRoute)
			sorting.GET("/tasks", sortingCtrl.GetSortingTaskList)
			sorting.GET("/tasks/:id", sortingCtrl.GetSortingTaskDetail)
			sorting.POST("/tasks", sortingCtrl.CreateSortingTask)
			sorting.PUT("/tasks/:id", sortingCtrl.UpdateSortingTask)
			sorting.PUT("/tasks/:id/status", sortingCtrl.UpdateSortingTaskStatus)
			sorting.POST("/scan", sortingCtrl.SortingScan)
			sorting.GET("/records", sortingCtrl.GetSortingRecordList)
			sorting.GET("/stats", sortingCtrl.GetSortingStats)
		}

		transport := protected.Group("/transport")
		{
			transport.GET("/vehicles", transportCtrl.GetVehicleList)
			transport.GET("/vehicles/:id", transportCtrl.GetVehicle)
			transport.POST("/vehicles", transportCtrl.CreateVehicle)
			transport.PUT("/vehicles/:id", transportCtrl.UpdateVehicle)
			transport.PUT("/vehicles/:id/status", transportCtrl.UpdateVehicleStatus)
			transport.DELETE("/vehicles/:id", transportCtrl.DeleteVehicle)

			transport.GET("/tasks", transportCtrl.GetTransportTaskList)
			transport.GET("/tasks/:id", transportCtrl.GetTransportTask)
			transport.POST("/tasks", transportCtrl.CreateTransportTask)
			transport.PUT("/tasks/:id", transportCtrl.UpdateTransportTask)
			transport.PUT("/tasks/:id/status", transportCtrl.UpdateTransportTaskStatus)
			transport.POST("/tasks/:id/load-scan", transportCtrl.LoadScan)
			transport.POST("/tasks/:id/unload-scan", transportCtrl.UnloadScan)
			transport.POST("/scan/load", transportCtrl.LoadScanByCode)
			transport.POST("/scan/unload", transportCtrl.UnloadScanByCode)
			transport.POST("/tasks/assign", transportCtrl.AssignVehicle)

			transport.GET("/records", transportCtrl.GetTransportRecordList)
			transport.GET("/records/:id", transportCtrl.GetTransportRecord)

			transport.GET("/monitor/overview", transportCtrl.GetTransportMonitorOverview)
			transport.GET("/monitor/tasks", transportCtrl.GetTransportMonitorTaskList)
			transport.GET("/monitor/warnings", transportCtrl.GetTransportWarningList)

			transport.GET("/costs/overview", transportCtrl.GetTransportCostOverview)
			transport.GET("/costs/tasks", transportCtrl.GetTransportCostTaskList)
			transport.GET("/costs/tasks/:id", transportCtrl.GetTransportCostTaskDetail)

			transport.GET("/stats", transportCtrl.GetTransportStats)
		}

		pickup := protected.Group("/pickup")
		{
			pickup.GET("/tasks", middleware.RequirePermission(config.PermPickupView), pickupCtrl.GetPickupTaskList)
			pickup.GET("/tasks/summary", middleware.RequirePermission(config.PermPickupView), pickupCtrl.GetPickupTaskSummary)
			pickup.GET("/tasks/:id", middleware.RequirePermission(config.PermPickupView), pickupCtrl.GetPickupTask)
			pickup.POST("/tasks", middleware.RequirePermission(config.PermPickupCreate), pickupCtrl.CreatePickupTask)
			pickup.POST("/tasks/:id/claim", middleware.RequirePermission(config.PermPickupUpdate), pickupCtrl.ClaimPickupTask)
			pickup.POST("/tasks/:id/start", middleware.RequirePermission(config.PermPickupUpdate), pickupCtrl.StartPickupTask)
			pickup.POST("/tasks/:id/complete", middleware.RequirePermission(config.PermPickupUpdate), pickupCtrl.CompletePickupTask)
			pickup.POST("/tasks/:id/fail", middleware.RequirePermission(config.PermPickupUpdate), pickupCtrl.FailPickupTask)
		}

		delivery := protected.Group("/delivery")
		{
			delivery.GET("/tasks", middleware.RequirePermission(config.PermDeliveryView), deliveryCtrl.GetDeliveryTaskList)
			delivery.GET("/tasks/summary", middleware.RequirePermission(config.PermDeliveryView), deliveryCtrl.GetDeliveryTaskSummary)
			delivery.GET("/tasks/:id", middleware.RequirePermission(config.PermDeliveryView), deliveryCtrl.GetDeliveryTask)
			delivery.POST("/tasks", middleware.RequirePermission(config.PermDeliveryCreate), deliveryCtrl.CreateDeliveryTask)
			delivery.POST("/tasks/:id/claim", middleware.RequirePermission(config.PermDeliveryUpdate), deliveryCtrl.ClaimDeliveryTask)
			delivery.POST("/tasks/:id/start", middleware.RequirePermission(config.PermDeliveryUpdate), deliveryCtrl.StartDeliveryTask)
			delivery.POST("/tasks/:id/deliver", middleware.RequirePermission(config.PermDeliveryUpdate), deliveryCtrl.CompleteDeliveryTask)
			delivery.POST("/tasks/:id/sign", middleware.RequirePermission(config.PermDeliveryUpdate), deliveryCtrl.SignDeliveryTask)
			delivery.POST("/tasks/:id/fail", middleware.RequirePermission(config.PermDeliveryUpdate), deliveryCtrl.FailDeliveryTask)
		}

		exceptions := protected.Group("/exceptions")
		{
			exceptions.GET("", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetExceptionList)
			exceptions.GET("/stats", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetExceptionStats)
			exceptions.GET("/:id", middleware.RequirePermission(config.PermExceptionView), exceptionCtrl.GetException)
			exceptions.POST("", middleware.RequirePermission(config.PermExceptionCreate), exceptionCtrl.CreateException)
			exceptions.PUT("/:id/assign", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.AssignException)
			exceptions.PUT("/:id/process", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.ProcessException)
			exceptions.PUT("/:id/close", middleware.RequirePermission(config.PermExceptionUpdate), exceptionCtrl.CloseException)
		}

		tracking := protected.Group("/tracking")
		{
			tracking.GET("/records", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingRecordList)
			tracking.GET("/records/:id", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingRecord)
			tracking.GET("/orders/:order_id/history", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetOrderTrackingHistory)
			tracking.GET("/orders/:order_id/timeline", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetOrderTrackingTimeline)
			tracking.GET("/warnings", middleware.RequirePermission(config.PermTrackingView), trackingCtrl.GetTrackingWarnings)
			tracking.POST("/records", middleware.RequirePermission(config.PermTrackingUpdate), trackingCtrl.CreateTrackingRecord)
		}

		dispatch := protected.Group("/dispatch")
		{
			dispatch.POST("/route/optimize", dispatchCtrl.OptimizeRoute)
			dispatch.GET("/batches", dispatchCtrl.GetBatchScheduleList)
			dispatch.GET("/batches/:id", dispatchCtrl.GetBatchSchedule)
			dispatch.POST("/batches", dispatchCtrl.CreateBatchSchedule)
			dispatch.PUT("/batches/:id/status", dispatchCtrl.UpdateBatchScheduleStatus)
			dispatch.POST("/suggestion", dispatchCtrl.GetDispatchSuggestion)
			dispatch.GET("/plans", dispatchCtrl.GetTransportPlanList)
			dispatch.POST("/plans", dispatchCtrl.CreateTransportPlan)
			dispatch.GET("/plans/:id", dispatchCtrl.GetTransportPlan)
			dispatch.PUT("/plans/:id", dispatchCtrl.UpdateTransportPlan)
			dispatch.PUT("/plans/:id/status", dispatchCtrl.UpdateTransportPlanStatus)
			dispatch.POST("/plans/:id/orders", dispatchCtrl.AssignOrdersToPlan)
		}

		staff := protected.Group("/staff")
		staff.Use(middleware.RequireStaff())
		{
		}

		manager := protected.Group("/manager")
		manager.Use(middleware.RequireManager())
		{
			manager.GET("/stations/:id/service-areas", stationCtrl.GetStationServiceAreas)
			manager.POST("/stations/:id/service-areas", stationCtrl.CreateStationServiceArea)
			manager.PUT("/stations/:id/service-areas/:area_id", stationCtrl.UpdateStationServiceArea)
			manager.DELETE("/stations/:id/service-areas/:area_id", stationCtrl.DeleteStationServiceArea)
		}

		admin := protected.Group("/admin")
		admin.Use(middleware.RequireAdmin())
		{
			admin.POST("/users", userCtrl.CreateUser)
			admin.PUT("/users/:id/role", roleCtrl.AssignUserRole)
			admin.GET("/users/:id/role", roleCtrl.GetUserRole)
			admin.PUT("/users/:id/status", userCtrl.UpdateUserStatus)
			admin.DELETE("/users/:id", userCtrl.DeleteUser)

			admin.POST("/stations", stationCtrl.CreateStation)
			admin.PUT("/stations/:id", stationCtrl.UpdateStation)
			admin.DELETE("/stations/:id", stationCtrl.DeleteStation)
		}
	}
}
