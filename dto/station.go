package dto

// CreateStationRequest 创建站点请求
type CreateStationRequest struct {
	StationCode  string  `json:"station_code" binding:"required"`
	Name         string  `json:"name" binding:"required"`
	Type         int     `json:"type" binding:"required,min=1,max=4"`
	Country      string  `json:"country" binding:"required"`
	Province     string  `json:"province"`
	City         string  `json:"city" binding:"required"`
	Address      string  `json:"address" binding:"required"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	ManagerID    uint    `json:"manager_id"`
	Capacity     int     `json:"capacity" binding:"required,min=1"`
	ContactName  string  `json:"contact_name"`
	ContactPhone string  `json:"contact_phone"`
	WorkingHours string  `json:"working_hours"`
	Remark       string  `json:"remark"`
}

// UpdateStationRequest 更新站点请求
type UpdateStationRequest struct {
	Name         string  `json:"name"`
	Type         int     `json:"type" binding:"omitempty,min=1,max=4"`
	Country      string  `json:"country"`
	Province     string  `json:"province"`
	City         string  `json:"city"`
	Address      string  `json:"address"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	ManagerID    uint    `json:"manager_id"`
	Capacity     int     `json:"capacity" binding:"omitempty,min=1"`
	ContactName  string  `json:"contact_name"`
	ContactPhone string  `json:"contact_phone"`
	WorkingHours string  `json:"working_hours"`
	Status       *int    `json:"status,omitempty" binding:"omitempty,oneof=0 1"` // 使用指针类型区分未设置和设置为0
	Remark       string  `json:"remark"`
}

// StationResponse 站点响应
type StationResponse struct {
	ID           uint    `json:"id"`
	StationCode  string  `json:"station_code"`
	Name         string  `json:"name"`
	Type         int     `json:"type"`
	TypeName     string  `json:"type_name"`
	Country      string  `json:"country"`
	Province     string  `json:"province"`
	City         string  `json:"city"`
	Address      string  `json:"address"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	ManagerID    uint    `json:"manager_id"`
	ManagerName  string  `json:"manager_name"`
	Capacity     int     `json:"capacity"`
	ContactName  string  `json:"contact_name"`
	ContactPhone string  `json:"contact_phone"`
	WorkingHours string  `json:"working_hours"`
	Status       int     `json:"status"`
	StatusName   string  `json:"status_name"`
	Remark       string  `json:"remark"`
	CTime        int64   `json:"ctime"`
	MTime        int64   `json:"mtime"`
}

type CreateStationServiceAreaRequest struct {
	Country  string `json:"country" binding:"required,max=50"`
	Province string `json:"province" binding:"omitempty,max=50"`
	City     string `json:"city" binding:"omitempty,max=50"`
	District string `json:"district" binding:"omitempty,max=50"`
	Priority int    `json:"priority" binding:"omitempty,min=1,max=10000"`
	Status   *int   `json:"status,omitempty" binding:"omitempty,oneof=0 1"`
	Remark   string `json:"remark" binding:"omitempty,max=500"`
}

type UpdateStationServiceAreaRequest struct {
	Country  string `json:"country" binding:"omitempty,max=50"`
	Province string `json:"province" binding:"omitempty,max=50"`
	City     string `json:"city" binding:"omitempty,max=50"`
	District string `json:"district" binding:"omitempty,max=50"`
	Priority int    `json:"priority" binding:"omitempty,min=1,max=10000"`
	Status   *int   `json:"status,omitempty" binding:"omitempty,oneof=0 1"`
	Remark   string `json:"remark" binding:"omitempty,max=500"`
}

type StationServiceAreaResponse struct {
	ID         uint   `json:"id"`
	StationID  uint   `json:"station_id"`
	Country    string `json:"country"`
	Province   string `json:"province"`
	City       string `json:"city"`
	District   string `json:"district"`
	Priority   int    `json:"priority"`
	ScopeLevel string `json:"scope_level"`
	Status     int    `json:"status"`
	StatusName string `json:"status_name"`
	Remark     string `json:"remark"`
	CTime      int64  `json:"ctime"`
	MTime      int64  `json:"mtime"`
}

type StationServiceAreaListResponse struct {
	List []StationServiceAreaResponse `json:"list"`
}

// StationListRequest 站点列表请求
type StationListRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
	Type     int    `form:"type" binding:"omitempty,min=1,max=4"`
	Country  string `form:"country"`
	City     string `form:"city"`
	Status   int    `form:"status" binding:"omitempty,oneof=0 1"` // 0不筛选，1只显示启用的
	Keyword  string `form:"keyword"`
}

// StationFlowQueryRequest 站点流转记录查询请求
type StationFlowQueryRequest struct {
	OrderID   uint   `form:"order_id"`   // 订单ID
	StationID uint   `form:"station_id"` // 站点ID
	FlowType  string `form:"flow_type"`  // 流转类型：in/out
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
	Page      int    `form:"page" binding:"required,min=1"`
	PageSize  int    `form:"page_size" binding:"required,min=1,max=100"`
}

// StationFlowResponse 站点流转记录响应
type StationFlowResponse struct {
	ID            uint    `json:"id"`
	OrderID       uint    `json:"order_id"`
	OrderNo       string  `json:"order_no"`
	StationID     uint    `json:"station_id"`
	StationName   string  `json:"station_name"`
	FlowType      string  `json:"flow_type"`
	FlowTypeName  string  `json:"flow_type_name"`
	Quantity      int     `json:"quantity"`
	Weight        float64 `json:"weight"`
	Volume        float64 `json:"volume"`
	OperatorID    uint    `json:"operator_id"`
	OperatorName  string  `json:"operator_name"`
	NextStationID uint    `json:"next_station_id"`
	NextStation   string  `json:"next_station,omitempty"`
	Remark        string  `json:"remark"`
	FlowTime      int64   `json:"flow_time"`
}

// StationFlowListResponse 站点流转记录列表响应
type StationFlowListResponse struct {
	List     []StationFlowResponse `json:"list"`
	Total    int64                 `json:"total"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"page_size"`
	Pages    int                   `json:"pages"`
}

// StationInventoryQueryRequest 站点库存查询请求
type StationInventoryQueryRequest struct {
	StationID uint `form:"station_id"` // 站点ID，0表示查询所有站点
}

// StationInventoryItem 站点库存项
type StationInventoryItem struct {
	StationID       uint   `json:"station_id"`
	StationName     string `json:"station_name"`
	StationCode     string `json:"station_code"`
	TotalOrders     int64  `json:"total_orders"`     // 总订单数
	InWarehouse     int64  `json:"in_warehouse"`     // 已入库
	Sorting         int64  `json:"sorting"`          // 分拣中
	InTransit       int64  `json:"in_transit"`       // 运输中（当前站点）
	CustomsClearing int64  `json:"customs_clearing"` // 清关中
	DestSorting     int64  `json:"dest_sorting"`     // 目的地分拣
	Delivering      int64  `json:"delivering"`       // 配送中
	CapacityUsage   string `json:"capacity_usage"`   // 容量使用率
	WarningLevel    string `json:"warning_level"`    // 预警级别：normal/warning/critical
}

// StationInventoryResponse 站点库存响应
type StationInventoryResponse struct {
	List []StationInventoryItem `json:"list"`
}

// CreateInventoryCheckRequest 创建库存盘点请求
type CreateInventoryCheckRequest struct {
	StationID uint   `json:"station_id" binding:"required"`                 // 站点ID
	CheckType string `json:"check_type" binding:"required,oneof=full spot"` // 盘点类型：full=全盘，spot=抽盘
	Remark    string `json:"remark"`                                        // 备注
}

// CompleteInventoryCheckRequest 完成库存盘点请求
type CompleteInventoryCheckRequest struct {
	ActualCount int    `json:"actual_count" binding:"required,min=0"` // 实际数量
	Remark      string `json:"remark"`                                // 备注
}

// InventoryCheckResponse 库存盘点响应
type InventoryCheckResponse struct {
	ID              uint                           `json:"id"`
	CheckNo         string                         `json:"check_no"`
	StationID       uint                           `json:"station_id"`
	StationName     string                         `json:"station_name"`
	CheckType       string                         `json:"check_type"`
	CheckTypeName   string                         `json:"check_type_name"`
	SystemCount     int                            `json:"system_count"`
	ActualCount     int                            `json:"actual_count"`
	DifferenceCount int                            `json:"difference_count"`
	Status          int                            `json:"status"`
	StatusName      string                         `json:"status_name"`
	OperatorID      uint                           `json:"operator_id"`
	OperatorName    string                         `json:"operator_name"`
	CheckTime       int64                          `json:"check_time"`
	CompleteTime    int64                          `json:"complete_time"`
	Remark          string                         `json:"remark"`
	Details         []InventoryCheckDetailResponse `json:"details,omitempty"`
}

// InventoryCheckDetailResponse 库存盘点明细响应
type InventoryCheckDetailResponse struct {
	ID          uint   `json:"id"`
	OrderID     uint   `json:"order_id"`
	OrderNo     string `json:"order_no"`
	Status      int    `json:"status"`
	StatusName  string `json:"status_name"`
	IsFound     int    `json:"is_found"`
	IsFoundName string `json:"is_found_name"`
	Remark      string `json:"remark"`
}

// InventoryCheckListRequest 库存盘点列表请求
type InventoryCheckListRequest struct {
	StationID uint   `form:"station_id"` // 站点ID
	CheckType string `form:"check_type"` // 盘点类型
	Status    int    `form:"status"`     // 状态
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
	Page      int    `form:"page" binding:"required,min=1"`
	PageSize  int    `form:"page_size" binding:"required,min=1,max=100"`
}

// InventoryCheckListResponse 库存盘点列表响应
type InventoryCheckListResponse struct {
	List     []InventoryCheckResponse `json:"list"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"page_size"`
	Pages    int                      `json:"pages"`
}

// InventoryWarningQueryRequest 库存预警查询请求
type InventoryWarningQueryRequest struct {
	StationID    uint `form:"station_id"`    // 站点ID，0表示查询所有站点
	WarningLevel int  `form:"warning_level"` // 预警级别：1=warning, 2=critical, 0=all
}

// InventoryWarningItem 库存预警项
type InventoryWarningItem struct {
	StationID       uint    `json:"station_id"`
	StationName     string  `json:"station_name"`
	StationCode     string  `json:"station_code"`
	CurrentCount    int64   `json:"current_count"`    // 当前订单数
	Capacity        int     `json:"capacity"`         // 站点容量
	UsageRate       float64 `json:"usage_rate"`       // 使用率（小数）
	UsagePercent    string  `json:"usage_percent"`    // 使用率（百分比字符串）
	WarningLevel    string  `json:"warning_level"`    // 预警级别
	WarningMessage  string  `json:"warning_message"`  // 预警消息
	LastCheckTime   int64   `json:"last_check_time"`  // 最后检查时间
	RecommendAction string  `json:"recommend_action"` // 建议操作
}

// InventoryWarningResponse 库存预警响应
type InventoryWarningResponse struct {
	Summary struct {
		TotalStations    int `json:"total_stations"`    // 总站点数
		NormalStations   int `json:"normal_stations"`   // 正常站点数
		WarningStations  int `json:"warning_stations"`  // 警告站点数
		CriticalStations int `json:"critical_stations"` // 严重预警站点数
	} `json:"summary"`
	Warnings []InventoryWarningItem `json:"warnings"`
}

// InventoryWarningConfigRequest 库存预警配置请求
type InventoryWarningConfigRequest struct {
	StationID         uint    `json:"station_id" binding:"required"`                     // 站点ID
	WarningThreshold  float64 `json:"warning_threshold" binding:"required,min=0,max=1"`  // 警告阈值（0-1）
	CriticalThreshold float64 `json:"critical_threshold" binding:"required,min=0,max=1"` // 严重阈值（0-1）
}

// InventoryWarningConfig 库存预警配置
type InventoryWarningConfig struct {
	StationID         uint    `json:"station_id"`
	StationName       string  `json:"station_name"`
	WarningThreshold  float64 `json:"warning_threshold"`  // 警告阈值
	CriticalThreshold float64 `json:"critical_threshold"` // 严重阈值
	IsEnabled         bool    `json:"is_enabled"`         // 是否启用预警
}

// InventoryStatsRequest 库存统计请求
type InventoryStatsRequest struct {
	StationID uint   `form:"station_id"`                               // 站点ID，0表示所有站点
	DateType  string `form:"date_type" binding:"oneof=day week month"` // 统计类型：day=日统计，week=周统计，month=月统计
	StartDate string `form:"start_date"`                               // 开始日期 YYYY-MM-DD
	EndDate   string `form:"end_date"`                                 // 结束日期 YYYY-MM-DD
}

// InventoryStatsResponse 库存统计响应
type InventoryStatsResponse struct {
	Summary    InventoryStatsSummary   `json:"summary"`     // 统计汇总
	Trends     []InventoryTrendItem    `json:"trends"`      // 趋势数据
	StationTop []InventoryStationStats `json:"station_top"` // 站点排行
}

// InventoryStatsSummary 库存统计汇总
type InventoryStatsSummary struct {
	TotalStations    int     `json:"total_stations"`    // 总站点数
	TotalOrders      int64   `json:"total_orders"`      // 总订单数
	AvgUsageRate     float64 `json:"avg_usage_rate"`    // 平均使用率
	MaxUsageRate     float64 `json:"max_usage_rate"`    // 最高使用率
	MinUsageRate     float64 `json:"min_usage_rate"`    // 最低使用率
	WarningStations  int     `json:"warning_stations"`  // 警告站点数
	CriticalStations int     `json:"critical_stations"` // 严重预警站点数
}

// InventoryTrendItem 库存趋势项
type InventoryTrendItem struct {
	Date        string  `json:"date"`         // 日期
	TotalOrders int64   `json:"total_orders"` // 总订单数
	AvgUsage    float64 `json:"avg_usage"`    // 平均使用率
	MaxUsage    float64 `json:"max_usage"`    // 最高使用率
	MinUsage    float64 `json:"min_usage"`    // 最低使用率
	InWarehouse int64   `json:"in_warehouse"` // 已入库数量
	Sorting     int64   `json:"sorting"`      // 分拣中数量
	InTransit   int64   `json:"in_transit"`   // 运输中数量
	Delivering  int64   `json:"delivering"`   // 配送中数量
}

// InventoryStationStats 站点库存统计
type InventoryStationStats struct {
	StationID    uint    `json:"station_id"`    // 站点ID
	StationName  string  `json:"station_name"`  // 站点名称
	StationCode  string  `json:"station_code"`  // 站点编码
	TotalOrders  int64   `json:"total_orders"`  // 总订单数
	Capacity     int     `json:"capacity"`      // 容量
	UsageRate    float64 `json:"usage_rate"`    // 使用率
	UsagePercent string  `json:"usage_percent"` // 使用率百分比
	WarningLevel string  `json:"warning_level"` // 预警级别
	InWarehouse  int64   `json:"in_warehouse"`  // 已入库数量
	Sorting      int64   `json:"sorting"`       // 分拣中数量
	InTransit    int64   `json:"in_transit"`    // 运输中数量
	Delivering   int64   `json:"delivering"`    // 配送中数量
}

// InventoryDistributionResponse 库存分布响应
type InventoryDistributionResponse struct {
	StatusDistribution   []StatusDistributionItem   `json:"status_distribution"`   // 状态分布
	StationDistribution  []StationDistributionItem  `json:"station_distribution"`  // 站点分布
	CapacityDistribution []CapacityDistributionItem `json:"capacity_distribution"` // 容量分布
}

// StatusDistributionItem 状态分布项
type StatusDistributionItem struct {
	Status     int    `json:"status"`      // 状态值
	StatusName string `json:"status_name"` // 状态名称
	Count      int64  `json:"count"`       // 数量
	Percentage string `json:"percentage"`  // 占比
}

// StationDistributionItem 站点分布项
type StationDistributionItem struct {
	StationID   uint   `json:"station_id"`   // 站点ID
	StationName string `json:"station_name"` // 站点名称
	Count       int64  `json:"count"`        // 数量
	Percentage  string `json:"percentage"`   // 占比
}

// CapacityDistributionItem 容量分布项
type CapacityDistributionItem struct {
	Range      string `json:"range"`      // 使用率范围
	Count      int    `json:"count"`      // 站点数量
	Percentage string `json:"percentage"` // 占比
}
