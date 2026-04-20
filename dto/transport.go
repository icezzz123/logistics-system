package dto

// CreateVehicleRequest 创建车辆请求
type CreateVehicleRequest struct {
	PlateNumber string  `json:"plate_number" binding:"required,max=20"` // 车牌号
	VehicleType string  `json:"vehicle_type" binding:"max=50"`          // 车辆类型
	Capacity    float64 `json:"capacity" binding:"min=0"`               // 载重量（吨）
	DriverID    uint    `json:"driver_id"`                              // 司机ID
}

// UpdateVehicleRequest 更新车辆请求
type UpdateVehicleRequest struct {
	PlateNumber string  `json:"plate_number" binding:"max=20"` // 车牌号
	VehicleType string  `json:"vehicle_type" binding:"max=50"` // 车辆类型
	Capacity    float64 `json:"capacity" binding:"min=0"`      // 载重量（吨）
	DriverID    uint    `json:"driver_id"`                     // 司机ID
}

// VehicleQueryRequest 车辆查询请求
type VehicleQueryRequest struct {
	PlateNumber string `form:"plate_number"`      // 车牌号（模糊搜索）
	VehicleType string `form:"vehicle_type"`      // 车辆类型
	Status      int    `form:"status,default=-1"` // 状态：1=可用，0=维修中，-1=全部
	DriverID    uint   `form:"driver_id"`         // 司机ID
	Page        int    `form:"page,default=1"`
	PageSize    int    `form:"page_size,default=10"`
}

// VehicleResponse 车辆响应
type VehicleResponse struct {
	ID          uint    `json:"id"`           // 车辆ID
	PlateNumber string  `json:"plate_number"` // 车牌号
	VehicleType string  `json:"vehicle_type"` // 车辆类型
	Capacity    float64 `json:"capacity"`     // 载重量（吨）
	DriverID    uint    `json:"driver_id"`    // 司机ID
	DriverName  string  `json:"driver_name"`  // 司机姓名
	Status      int     `json:"status"`       // 状态
	StatusName  string  `json:"status_name"`  // 状态名称
	CreateTime  string  `json:"create_time"`  // 创建时间
	UpdateTime  string  `json:"update_time"`  // 更新时间
}

// VehicleListResponse 车辆列表响应
type VehicleListResponse struct {
	List     []VehicleResponse `json:"list"`      // 车辆列表
	Total    int64             `json:"total"`     // 总数
	Page     int               `json:"page"`      // 当前页
	PageSize int               `json:"page_size"` // 每页数量
	Pages    int               `json:"pages"`     // 总页数
}

// VehicleStatusRequest 车辆状态更新请求
type VehicleStatusRequest struct {
	Status int `json:"status" binding:"oneof=0 1"` // 状态：1=可用，0=维修中
}

// CreateTransportTaskRequest 创建运输任务请求
type CreateTransportTaskRequest struct {
	OrderID    uint    `json:"order_id" binding:"required"`    // 订单ID
	VehicleID  uint    `json:"vehicle_id" binding:"required"`  // 车辆ID
	DriverID   uint    `json:"driver_id" binding:"required"`   // 司机ID
	StartPoint string  `json:"start_point" binding:"required"` // 起点
	EndPoint   string  `json:"end_point" binding:"required"`   // 终点
	Distance   float64 `json:"distance" binding:"min=0"`       // 距离（公里）
	Cost       float64 `json:"cost" binding:"min=0"`           // 运输成本
	Remark     string  `json:"remark" binding:"max=500"`       // 备注
}

// UpdateTransportTaskRequest 更新运输任务请求
type UpdateTransportTaskRequest struct {
	VehicleID  uint    `json:"vehicle_id"`  // 车辆ID
	DriverID   uint    `json:"driver_id"`   // 司机ID
	StartPoint string  `json:"start_point"` // 起点
	EndPoint   string  `json:"end_point"`   // 终点
	Distance   float64 `json:"distance"`    // 距离（公里）
	Cost       float64 `json:"cost"`        // 运输成本
	Remark     string  `json:"remark"`      // 备注
}

// TransportTaskQueryRequest 运输任务查询请求
type TransportTaskQueryRequest struct {
	TaskNo    string `form:"task_no"`    // 任务编号（模糊搜索）
	OrderID   uint   `form:"order_id"`   // 订单ID
	VehicleID uint   `form:"vehicle_id"` // 车辆ID
	DriverID  uint   `form:"driver_id"`  // 司机ID
	Status    string `form:"status"`     // 状态
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
	Page      int    `form:"page,default=1"`
	PageSize  int    `form:"page_size,default=10"`
}

// TransportTaskResponse 运输任务响应
type TransportTaskResponse struct {
	ID          uint    `json:"id"`           // 任务ID
	TaskNo      string  `json:"task_no"`      // 任务编号
	OrderID     uint    `json:"order_id"`     // 订单ID
	OrderNo     string  `json:"order_no"`     // 订单号
	VehicleID   uint    `json:"vehicle_id"`   // 车辆ID
	PlateNumber string  `json:"plate_number"` // 车牌号
	DriverID    uint    `json:"driver_id"`    // 司机ID
	DriverName  string  `json:"driver_name"`  // 司机姓名
	StartPoint  string  `json:"start_point"`  // 起点
	EndPoint    string  `json:"end_point"`    // 终点
	Distance    float64 `json:"distance"`     // 距离（公里）
	Status      string  `json:"status"`       // 状态
	StatusName  string  `json:"status_name"`  // 状态名称
	StartTime   int64   `json:"start_time"`   // 开始时间
	EndTime     int64   `json:"end_time"`     // 结束时间
	Cost        float64 `json:"cost"`         // 运输成本
	Remark      string  `json:"remark"`       // 备注
	CreateTime  string  `json:"create_time"`  // 创建时间
	UpdateTime  string  `json:"update_time"`  // 更新时间
}

// TransportTaskListResponse 运输任务列表响应
type TransportTaskListResponse struct {
	List     []TransportTaskResponse `json:"list"`      // 任务列表
	Total    int64                   `json:"total"`     // 总数
	Page     int                     `json:"page"`      // 当前页
	PageSize int                     `json:"page_size"` // 每页数量
	Pages    int                     `json:"pages"`     // 总页数
}

// TransportTaskStatusRequest 运输任务状态更新请求
type TransportTaskStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending in_progress completed cancelled"` // 状态
	Remark string `json:"remark" binding:"max=500"`                                                // 备注
}

// TransportScanRequest 装车/卸车扫描请求
type TransportScanRequest struct {
	ScanCode  string `json:"scan_code" binding:"required,max=50"` // 扫描码，可传任务号、订单号或包裹号
	TaskNo    string `json:"task_no" binding:"max=50"`            // 任务号，可选
	StationID uint   `json:"station_id" binding:"required"`       // 扫描站点ID
	Remark    string `json:"remark" binding:"max=500"`            // 备注
}

// TransportScanResponse 装车/卸车扫描响应
type TransportScanResponse struct {
	TaskID          uint   `json:"task_id"`           // 任务ID
	TaskNo          string `json:"task_no"`           // 任务编号
	OrderID         uint   `json:"order_id"`          // 订单ID
	OrderNo         string `json:"order_no"`          // 订单号
	ParcelNo        string `json:"parcel_no"`         // 包裹号
	ScanCodeType    string `json:"scan_code_type"`    // 扫描码类型
	ScanType        string `json:"scan_type"`         // 扫描类型：load/unload
	StationID       uint   `json:"station_id"`        // 站点ID
	StationName     string `json:"station_name"`      // 站点名称
	RecordID        uint   `json:"record_id"`         // 记录ID
	ScanTime        int64  `json:"scan_time"`         // 扫描时间
	TaskStatus      string `json:"task_status"`       // 任务状态
	TaskStatusName  string `json:"task_status_name"`  // 任务状态名称
	OrderStatus     int    `json:"order_status"`      // 订单状态
	OrderStatusName string `json:"order_status_name"` // 订单状态名称
	Message         string `json:"message"`           // 结果说明
}

// TransportRecordQueryRequest 装卸记录查询请求
type TransportRecordQueryRequest struct {
	PageRequest
	TaskNo    string `form:"task_no"`    // 任务编号
	OrderNo   string `form:"order_no"`   // 订单号
	VehicleID uint   `form:"vehicle_id"` // 车辆ID
	DriverID  uint   `form:"driver_id"`  // 司机ID
	StationID uint   `form:"station_id"` // 站点ID
	ScanType  string `form:"scan_type"`  // 扫描类型：load/unload
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
}

// TransportRecordInfo 装卸记录信息
type TransportRecordInfo struct {
	ID           uint   `json:"id"`
	TaskID       uint   `json:"task_id"`
	TaskNo       string `json:"task_no"`
	OrderID      uint   `json:"order_id"`
	OrderNo      string `json:"order_no"`
	VehicleID    uint   `json:"vehicle_id"`
	PlateNumber  string `json:"plate_number"`
	DriverID     uint   `json:"driver_id"`
	DriverName   string `json:"driver_name"`
	StationID    uint   `json:"station_id"`
	StationName  string `json:"station_name"`
	ScanType     string `json:"scan_type"`
	ScanTypeName string `json:"scan_type_name"`
	RecordStatus string `json:"record_status"`
	DispatchTime int64  `json:"dispatch_time"`
	DeliveryTime int64  `json:"delivery_time"`
	ScanTime     int64  `json:"scan_time"`
	FailReason   string `json:"fail_reason"`
	Remark       string `json:"remark"`
	CreateTime   string `json:"create_time"`
	UpdateTime   string `json:"update_time"`
}

// TransportRecordListResponse 装卸记录列表响应
type TransportRecordListResponse struct {
	List     []TransportRecordInfo `json:"list"`
	Total    int64                 `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"page_size"`
	Pages    int                   `json:"pages"`
}

// TransportMonitorQueryRequest 运输监控任务查询请求
type TransportMonitorQueryRequest struct {
	PageRequest
	TaskNo       string `form:"task_no"`       // 任务编号
	OrderNo      string `form:"order_no"`      // 订单号
	VehicleID    uint   `form:"vehicle_id"`    // 车辆ID
	DriverID     uint   `form:"driver_id"`     // 司机ID
	Status       string `form:"status"`        // 任务状态
	WarningLevel string `form:"warning_level"` // 预警级别：warning/critical
	StartTime    int64  `form:"start_time"`    // 开始时间
	EndTime      int64  `form:"end_time"`      // 结束时间
}

// TransportMonitorTaskInfo 运输监控任务信息
type TransportMonitorTaskInfo struct {
	TaskID             uint    `json:"task_id"`
	TaskNo             string  `json:"task_no"`
	OrderID            uint    `json:"order_id"`
	OrderNo            string  `json:"order_no"`
	VehicleID          uint    `json:"vehicle_id"`
	PlateNumber        string  `json:"plate_number"`
	DriverID           uint    `json:"driver_id"`
	DriverName         string  `json:"driver_name"`
	Status             string  `json:"status"`
	StatusName         string  `json:"status_name"`
	OrderStatus        int     `json:"order_status"`
	OrderStatusName    string  `json:"order_status_name"`
	Progress           float64 `json:"progress"`
	EstimatedHours     int     `json:"estimated_hours"`
	ElapsedHours       float64 `json:"elapsed_hours"`
	DelayHours         float64 `json:"delay_hours"`
	LatestScanType     string  `json:"latest_scan_type"`
	LatestScanTypeName string  `json:"latest_scan_type_name"`
	LatestScanTime     int64   `json:"latest_scan_time"`
	LatestStationID    uint    `json:"latest_station_id"`
	LatestStationName  string  `json:"latest_station_name"`
	LoadCount          int     `json:"load_count"`
	UnloadCount        int     `json:"unload_count"`
	WarningLevel       string  `json:"warning_level"`
	WarningMessage     string  `json:"warning_message"`
	ExceptionCount     int     `json:"exception_count"`
	Cost               float64 `json:"cost"`
	CostPerKm          float64 `json:"cost_per_km"`
	CreateTime         string  `json:"create_time"`
	UpdateTime         string  `json:"update_time"`
}

// TransportMonitorListResponse 运输监控任务列表响应
type TransportMonitorListResponse struct {
	List     []TransportMonitorTaskInfo `json:"list"`
	Total    int64                      `json:"total"`
	Page     int                        `json:"page"`
	PageSize int                        `json:"page_size"`
	Pages    int                        `json:"pages"`
}

// TransportMonitorOverviewResponse 运输监控概览响应
type TransportMonitorOverviewResponse struct {
	TotalTasks      int64   `json:"total_tasks"`
	PendingTasks    int64   `json:"pending_tasks"`
	InProgressTasks int64   `json:"in_progress_tasks"`
	CompletedTasks  int64   `json:"completed_tasks"`
	CancelledTasks  int64   `json:"cancelled_tasks"`
	WarningTasks    int64   `json:"warning_tasks"`
	CriticalTasks   int64   `json:"critical_tasks"`
	DelayedTasks    int64   `json:"delayed_tasks"`
	ExceptionTasks  int64   `json:"exception_tasks"`
	AvgProgress     float64 `json:"avg_progress"`
	TotalDistance   float64 `json:"total_distance"`
	TotalCost       float64 `json:"total_cost"`
}

// TransportWarningQueryRequest 运输预警查询请求
type TransportWarningQueryRequest struct {
	PageRequest
	Level       string `form:"level"`        // 预警级别：warning/critical
	WarningType string `form:"warning_type"` // 预警类型：delay/high_cost/exception/pending
	TaskNo      string `form:"task_no"`      // 任务编号
	OrderNo     string `form:"order_no"`     // 订单号
	VehicleID   uint   `form:"vehicle_id"`   // 车辆ID
	DriverID    uint   `form:"driver_id"`    // 司机ID
}

// TransportWarningInfo 运输预警信息
type TransportWarningInfo struct {
	TaskID              uint    `json:"task_id"`
	TaskNo              string  `json:"task_no"`
	OrderID             uint    `json:"order_id"`
	OrderNo             string  `json:"order_no"`
	VehicleID           uint    `json:"vehicle_id"`
	PlateNumber         string  `json:"plate_number"`
	DriverID            uint    `json:"driver_id"`
	DriverName          string  `json:"driver_name"`
	WarningType         string  `json:"warning_type"`
	WarningTypeName     string  `json:"warning_type_name"`
	WarningLevel        string  `json:"warning_level"`
	WarningMessage      string  `json:"warning_message"`
	TriggerTime         int64   `json:"trigger_time"`
	TaskStatus          string  `json:"task_status"`
	TaskStatusName      string  `json:"task_status_name"`
	OrderStatus         int     `json:"order_status"`
	OrderStatusName     string  `json:"order_status_name"`
	ExceptionNo         string  `json:"exception_no"`
	ExceptionStatus     int     `json:"exception_status"`
	ExceptionStatusName string  `json:"exception_status_name"`
	Cost                float64 `json:"cost"`
	CostPerKm           float64 `json:"cost_per_km"`
}

// TransportWarningListResponse 运输预警列表响应
type TransportWarningListResponse struct {
	List          []TransportWarningInfo `json:"list"`
	Total         int64                  `json:"total"`
	Page          int                    `json:"page"`
	PageSize      int                    `json:"page_size"`
	Pages         int                    `json:"pages"`
	WarningCount  int64                  `json:"warning_count"`
	CriticalCount int64                  `json:"critical_count"`
}

// TransportCostQueryRequest 运输成本查询请求
type TransportCostQueryRequest struct {
	PageRequest
	TaskNo    string  `form:"task_no"`    // 任务编号
	OrderNo   string  `form:"order_no"`   // 订单号
	VehicleID uint    `form:"vehicle_id"` // 车辆ID
	DriverID  uint    `form:"driver_id"`  // 司机ID
	Status    string  `form:"status"`     // 任务状态
	StartTime int64   `form:"start_time"` // 开始时间
	EndTime   int64   `form:"end_time"`   // 结束时间
	MinCost   float64 `form:"min_cost"`   // 最小成本
	MaxCost   float64 `form:"max_cost"`   // 最大成本
}

// TransportCostTaskInfo 运输成本任务信息
type TransportCostTaskInfo struct {
	TaskID             uint    `json:"task_id"`
	TaskNo             string  `json:"task_no"`
	OrderID            uint    `json:"order_id"`
	OrderNo            string  `json:"order_no"`
	VehicleID          uint    `json:"vehicle_id"`
	PlateNumber        string  `json:"plate_number"`
	DriverID           uint    `json:"driver_id"`
	DriverName         string  `json:"driver_name"`
	Status             string  `json:"status"`
	StatusName         string  `json:"status_name"`
	Distance           float64 `json:"distance"`
	Cost               float64 `json:"cost"`
	CostPerKm          float64 `json:"cost_per_km"`
	EstimatedHours     int     `json:"estimated_hours"`
	ActualHours        float64 `json:"actual_hours"`
	LoadCount          int     `json:"load_count"`
	UnloadCount        int     `json:"unload_count"`
	CostLevel          string  `json:"cost_level"`
	CompensationAmount float64 `json:"compensation_amount"`
	CreateTime         string  `json:"create_time"`
	UpdateTime         string  `json:"update_time"`
}

// TransportCostListResponse 运输成本任务列表响应
type TransportCostListResponse struct {
	List     []TransportCostTaskInfo `json:"list"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"page_size"`
	Pages    int                     `json:"pages"`
}

// TransportCostOverviewResponse 运输成本概览响应
type TransportCostOverviewResponse struct {
	TotalTasks        int64   `json:"total_tasks"`
	TotalDistance     float64 `json:"total_distance"`
	TotalCost         float64 `json:"total_cost"`
	TotalCompensation float64 `json:"total_compensation"`
	AvgCostPerTask    float64 `json:"avg_cost_per_task"`
	AvgCostPerKm      float64 `json:"avg_cost_per_km"`
	MaxTaskCost       float64 `json:"max_task_cost"`
	MinTaskCost       float64 `json:"min_task_cost"`
	HighCostTasks     int64   `json:"high_cost_tasks"`
}

// TransportCostDetailResponse 运输成本详情响应
type TransportCostDetailResponse struct {
	TaskID             uint    `json:"task_id"`
	TaskNo             string  `json:"task_no"`
	OrderID            uint    `json:"order_id"`
	OrderNo            string  `json:"order_no"`
	VehicleID          uint    `json:"vehicle_id"`
	PlateNumber        string  `json:"plate_number"`
	DriverID           uint    `json:"driver_id"`
	DriverName         string  `json:"driver_name"`
	Status             string  `json:"status"`
	StatusName         string  `json:"status_name"`
	StartPoint         string  `json:"start_point"`
	EndPoint           string  `json:"end_point"`
	Distance           float64 `json:"distance"`
	Cost               float64 `json:"cost"`
	CostPerKm          float64 `json:"cost_per_km"`
	EstimatedHours     int     `json:"estimated_hours"`
	ActualHours        float64 `json:"actual_hours"`
	LoadCount          int     `json:"load_count"`
	UnloadCount        int     `json:"unload_count"`
	LatestScanType     string  `json:"latest_scan_type"`
	LatestScanTypeName string  `json:"latest_scan_type_name"`
	LatestScanTime     int64   `json:"latest_scan_time"`
	LatestStationName  string  `json:"latest_station_name"`
	WarningLevel       string  `json:"warning_level"`
	WarningMessage     string  `json:"warning_message"`
	CompensationAmount float64 `json:"compensation_amount"`
	Remark             string  `json:"remark"`
	CreateTime         string  `json:"create_time"`
	UpdateTime         string  `json:"update_time"`
}

// VehicleAssignRequest 车辆分配请求
type VehicleAssignRequest struct {
	OrderIDs  []uint `json:"order_ids" binding:"required,dive,min=1"` // 订单ID列表
	VehicleID uint   `json:"vehicle_id" binding:"required"`           // 车辆ID
	DriverID  uint   `json:"driver_id" binding:"required"`            // 司机ID
}

// VehicleAssignResponse 车辆分配响应
type VehicleAssignResponse struct {
	SuccessCount int                     `json:"success_count"` // 成功分配数量
	FailCount    int                     `json:"fail_count"`    // 失败数量
	Tasks        []TransportTaskResponse `json:"tasks"`         // 创建的任务列表
	Errors       []string                `json:"errors"`        // 错误信息列表
}

// TransportStatsResponse 运输统计响应
type TransportStatsResponse struct {
	VehicleStats VehicleStatsData      `json:"vehicle_stats"` // 车辆统计
	TaskStats    TaskStatsData         `json:"task_stats"`    // 任务统计
	DriverStats  []DriverStatsData     `json:"driver_stats"`  // 司机统计
	StatusStats  []TaskStatusStatsData `json:"status_stats"`  // 状态统计
}

// VehicleStatsData 车辆统计数据
type VehicleStatsData struct {
	TotalVehicles       int     `json:"total_vehicles"`       // 总车辆数
	AvailableVehicles   int     `json:"available_vehicles"`   // 可用车辆数
	MaintenanceVehicles int     `json:"maintenance_vehicles"` // 维修中车辆数
	TotalCapacity       float64 `json:"total_capacity"`       // 总载重量
	AvgCapacity         float64 `json:"avg_capacity"`         // 平均载重量
}

// TaskStatsData 任务统计数据
type TaskStatsData struct {
	TotalTasks      int     `json:"total_tasks"`       // 总任务数
	PendingTasks    int     `json:"pending_tasks"`     // 待执行任务数
	InProgressTasks int     `json:"in_progress_tasks"` // 执行中任务数
	CompletedTasks  int     `json:"completed_tasks"`   // 已完成任务数
	CancelledTasks  int     `json:"cancelled_tasks"`   // 已取消任务数
	TotalDistance   float64 `json:"total_distance"`    // 总运输距离
	TotalCost       float64 `json:"total_cost"`        // 总运输成本
}

// DriverStatsData 司机统计数据
type DriverStatsData struct {
	DriverID   uint    `json:"driver_id"`   // 司机ID
	DriverName string  `json:"driver_name"` // 司机姓名
	TaskCount  int     `json:"task_count"`  // 任务数量
	Distance   float64 `json:"distance"`    // 总距离
	Cost       float64 `json:"cost"`        // 总成本
}

// TaskStatusStatsData 任务状态统计数据
type TaskStatusStatsData struct {
	Status     string `json:"status"`      // 状态
	StatusName string `json:"status_name"` // 状态名称
	Count      int    `json:"count"`       // 数量
	Percentage string `json:"percentage"`  // 占比
}

// ---- 运输调度相关 DTO ----

// RouteOptimizeRequest 路径优化请求
type RouteOptimizeRequest struct {
	StationIDs []uint `json:"station_ids" binding:"required,min=2"` // 途经站点ID列表（含起终点）
	VehicleID  uint   `json:"vehicle_id" binding:"required"`        // 车辆ID
}

// RouteOptimizeResponse 路径优化响应
type RouteOptimizeResponse struct {
	OriginalOrder  []RouteStationInfo `json:"original_order"`  // 原始顺序
	OptimizedOrder []RouteStationInfo `json:"optimized_order"` // 优化后顺序
	TotalDistance  float64            `json:"total_distance"`  // 总距离（公里）
	SavedDistance  float64            `json:"saved_distance"`  // 节省距离
	EstimatedTime  int                `json:"estimated_time"`  // 预计耗时（分钟）
}

// RouteStationInfo 路径站点信息
type RouteStationInfo struct {
	StationID   uint    `json:"station_id"`   // 站点ID
	StationName string  `json:"station_name"` // 站点名称
	Latitude    float64 `json:"latitude"`     // 纬度
	Longitude   float64 `json:"longitude"`    // 经度
	Sequence    int     `json:"sequence"`     // 顺序
	Distance    float64 `json:"distance"`     // 到下一站距离（公里）
}

// CreateBatchScheduleRequest 创建批次调度请求
type CreateBatchScheduleRequest struct {
	BatchName   string `json:"batch_name" binding:"required,max=100"` // 批次名称
	VehicleID   uint   `json:"vehicle_id" binding:"required"`         // 车辆ID
	DriverID    uint   `json:"driver_id" binding:"required"`          // 司机ID
	OrderIDs    []uint `json:"order_ids" binding:"required,min=1"`    // 订单ID列表
	PlannedTime int64  `json:"planned_time" binding:"required"`       // 计划发车时间
	Remark      string `json:"remark" binding:"max=500"`              // 备注
}

// BatchScheduleQueryRequest 批次调度查询请求
type BatchScheduleQueryRequest struct {
	BatchName string `form:"batch_name"` // 批次名称
	VehicleID uint   `form:"vehicle_id"` // 车辆ID
	DriverID  uint   `form:"driver_id"`  // 司机ID
	Status    string `form:"status"`     // 状态
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
	Page      int    `form:"page,default=1"`
	PageSize  int    `form:"page_size,default=10"`
}

// BatchScheduleResponse 批次调度响应
type BatchScheduleResponse struct {
	ID          uint                    `json:"id"`
	BatchNo     string                  `json:"batch_no"`   // 批次编号
	BatchName   string                  `json:"batch_name"` // 批次名称
	VehicleID   uint                    `json:"vehicle_id"`
	PlateNumber string                  `json:"plate_number"` // 车牌号
	DriverID    uint                    `json:"driver_id"`
	DriverName  string                  `json:"driver_name"`  // 司机姓名
	OrderCount  int                     `json:"order_count"`  // 订单数量
	TotalWeight float64                 `json:"total_weight"` // 总重量
	Status      string                  `json:"status"`
	StatusName  string                  `json:"status_name"`
	PlannedTime int64                   `json:"planned_time"` // 计划发车时间
	ActualTime  int64                   `json:"actual_time"`  // 实际发车时间
	Tasks       []TransportTaskResponse `json:"tasks"`        // 关联任务列表
	Remark      string                  `json:"remark"`
	CreateTime  string                  `json:"create_time"`
	UpdateTime  string                  `json:"update_time"`
}

// BatchScheduleListResponse 批次调度列表响应
type BatchScheduleListResponse struct {
	List     []BatchScheduleResponse `json:"list"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"page_size"`
	Pages    int                     `json:"pages"`
}

// BatchScheduleStatusRequest 批次调度状态更新请求
type BatchScheduleStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending dispatched in_transit completed cancelled"`
	Remark string `json:"remark" binding:"max=500"`
}

// CreateTransportPlanRequest 创建运输计划请求
type CreateTransportPlanRequest struct {
	PlanName    string  `json:"plan_name" binding:"required,max=100"`   // 计划名称
	PlanDate    int64   `json:"plan_date" binding:"required"`           // 计划日期（时间戳）
	VehicleID   uint    `json:"vehicle_id" binding:"required"`          // 车辆ID
	DriverID    uint    `json:"driver_id" binding:"required"`           // 司机ID
	StartPoint  string  `json:"start_point" binding:"required,max=255"` // 起点
	EndPoint    string  `json:"end_point" binding:"required,max=255"`   // 终点
	Waypoints   string  `json:"waypoints" binding:"max=1000"`           // 途经点（JSON字符串）
	Distance    float64 `json:"distance" binding:"min=0"`               // 计划距离
	EstimatedH  int     `json:"estimated_hours" binding:"min=0"`        // 预计耗时（小时）
	MaxCapacity float64 `json:"max_capacity" binding:"min=0"`           // 最大载重
	Remark      string  `json:"remark" binding:"max=500"`
}

// UpdateTransportPlanRequest 更新运输计划请求
type UpdateTransportPlanRequest struct {
	PlanName    string  `json:"plan_name" binding:"max=100"`
	VehicleID   uint    `json:"vehicle_id"`
	DriverID    uint    `json:"driver_id"`
	StartPoint  string  `json:"start_point" binding:"max=255"`
	EndPoint    string  `json:"end_point" binding:"max=255"`
	Waypoints   string  `json:"waypoints" binding:"max=1000"`
	Distance    float64 `json:"distance"`
	EstimatedH  int     `json:"estimated_hours"`
	MaxCapacity float64 `json:"max_capacity"`
	Remark      string  `json:"remark" binding:"max=500"`
}

// TransportPlanQueryRequest 运输计划查询请求
type TransportPlanQueryRequest struct {
	PlanName  string `form:"plan_name"`
	VehicleID uint   `form:"vehicle_id"`
	DriverID  uint   `form:"driver_id"`
	Status    string `form:"status"`
	StartDate int64  `form:"start_date"`
	EndDate   int64  `form:"end_date"`
	Page      int    `form:"page,default=1"`
	PageSize  int    `form:"page_size,default=10"`
}

// TransportPlanResponse 运输计划响应
type TransportPlanResponse struct {
	ID           uint    `json:"id"`
	PlanNo       string  `json:"plan_no"`   // 计划编号
	PlanName     string  `json:"plan_name"` // 计划名称
	PlanDate     int64   `json:"plan_date"` // 计划日期
	VehicleID    uint    `json:"vehicle_id"`
	PlateNumber  string  `json:"plate_number"`
	DriverID     uint    `json:"driver_id"`
	DriverName   string  `json:"driver_name"`
	StartPoint   string  `json:"start_point"`
	EndPoint     string  `json:"end_point"`
	Waypoints    string  `json:"waypoints"`
	Distance     float64 `json:"distance"`
	EstimatedH   int     `json:"estimated_hours"`
	MaxCapacity  float64 `json:"max_capacity"`
	UsedCapacity float64 `json:"used_capacity"` // 已用载重
	Status       string  `json:"status"`
	StatusName   string  `json:"status_name"`
	Remark       string  `json:"remark"`
	CreateTime   string  `json:"create_time"`
	UpdateTime   string  `json:"update_time"`
}

// TransportPlanListResponse 运输计划列表响应
type TransportPlanListResponse struct {
	List     []TransportPlanResponse `json:"list"`
	Total    int64                   `json:"total"`
	Page     int                     `json:"page"`
	PageSize int                     `json:"page_size"`
	Pages    int                     `json:"pages"`
}

// TransportPlanStatusRequest 运输计划状态更新请求
type TransportPlanStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=draft confirmed executing completed cancelled"`
	Remark string `json:"remark" binding:"max=500"`
}

// AssignOrderToPlanRequest 将订单加入运输计划请求
type AssignOrderToPlanRequest struct {
	OrderIDs []uint `json:"order_ids" binding:"required,min=1"`
}

// DispatchSuggestionRequest 调度建议请求
type DispatchSuggestionRequest struct {
	OrderIDs []uint `json:"order_ids" binding:"required,min=1"` // 待调度订单
	Date     int64  `json:"date" binding:"required"`            // 调度日期
}

// DispatchSuggestionResponse 调度建议响应
type DispatchSuggestionResponse struct {
	Suggestions      []BatchSuggestion `json:"suggestions"`       // 建议批次列表
	UnassignedOrders []uint            `json:"unassigned_orders"` // 无法分配的订单
	Summary          DispatchSummary   `json:"summary"`
}

// BatchSuggestion 批次建议
type BatchSuggestion struct {
	VehicleID   uint    `json:"vehicle_id"`
	PlateNumber string  `json:"plate_number"`
	DriverID    uint    `json:"driver_id"`
	DriverName  string  `json:"driver_name"`
	OrderIDs    []uint  `json:"order_ids"`
	TotalWeight float64 `json:"total_weight"`
	Capacity    float64 `json:"capacity"`
	LoadRate    string  `json:"load_rate"` // 装载率
}

// DispatchSummary 调度汇总
type DispatchSummary struct {
	TotalOrders    int `json:"total_orders"`
	AssignedOrders int `json:"assigned_orders"`
	TotalVehicles  int `json:"total_vehicles"`
	UsedVehicles   int `json:"used_vehicles"`
}
