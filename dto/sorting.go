package dto

// CreateSortingRuleRequest 创建分拣规则请求
type CreateSortingRuleRequest struct {
	RuleName    string `json:"rule_name" binding:"required,max=100"`    // 规则名称
	Country     string `json:"country" binding:"required,max=50"`       // 国家
	Province    string `json:"province" binding:"max=50"`               // 省份
	City        string `json:"city" binding:"max=50"`                   // 城市
	District    string `json:"district" binding:"max=50"`               // 区县
	RouteCode   string `json:"route_code" binding:"required,max=50"`    // 路由代码
	StationID   uint   `json:"station_id" binding:"required"`           // 目标站点ID
	Priority    int    `json:"priority"`                                // 优先级，数值越大优先级越高
	Description string `json:"description" binding:"max=500"`           // 描述
}

// UpdateSortingRuleRequest 更新分拣规则请求
type UpdateSortingRuleRequest struct {
	RuleName    string `json:"rule_name" binding:"max=100"`    // 规则名称
	Country     string `json:"country" binding:"max=50"`       // 国家
	Province    string `json:"province" binding:"max=50"`      // 省份
	City        string `json:"city" binding:"max=50"`          // 城市
	District    string `json:"district" binding:"max=50"`      // 区县
	RouteCode   string `json:"route_code" binding:"max=50"`    // 路由代码
	StationID   uint   `json:"station_id"`                     // 目标站点ID
	Priority    int    `json:"priority"`                       // 优先级
	Description string `json:"description" binding:"max=500"`  // 描述
}

// SortingRuleQueryRequest 分拣规则查询请求
type SortingRuleQueryRequest struct {
	RuleName  string `form:"rule_name"`  // 规则名称
	Country   string `form:"country"`    // 国家
	Province  string `form:"province"`   // 省份
	City      string `form:"city"`       // 城市
	StationID uint   `form:"station_id"` // 站点ID
	Status    int    `form:"status"`     // 状态：1=启用，0=禁用，-1=全部
	Page      int    `form:"page" binding:"min=1"`      // 页码
	PageSize  int    `form:"page_size" binding:"min=1"` // 每页数量
}

// SortingRuleResponse 分拣规则响应
type SortingRuleResponse struct {
	ID           uint   `json:"id"`            // 规则ID
	RuleName     string `json:"rule_name"`     // 规则名称
	Country      string `json:"country"`       // 国家
	Province     string `json:"province"`      // 省份
	City         string `json:"city"`          // 城市
	District     string `json:"district"`      // 区县
	RouteCode    string `json:"route_code"`    // 路由代码
	StationID    uint   `json:"station_id"`    // 目标站点ID
	StationName  string `json:"station_name"`  // 站点名称
	Priority     int    `json:"priority"`      // 优先级
	Status       int    `json:"status"`        // 状态
	StatusName   string `json:"status_name"`   // 状态名称
	Description  string `json:"description"`   // 描述
	CreateTime   string `json:"create_time"`   // 创建时间
	UpdateTime   string `json:"update_time"`   // 更新时间
}

// SortingRuleListResponse 分拣规则列表响应
type SortingRuleListResponse struct {
	List     []SortingRuleResponse `json:"list"`      // 规则列表
	Total    int64                 `json:"total"`     // 总数
	Page     int                   `json:"page"`      // 当前页
	PageSize int                   `json:"page_size"` // 每页数量
	Pages    int                   `json:"pages"`     // 总页数
}

// RouteMatchRequest 路由匹配请求
type RouteMatchRequest struct {
	Country  string `json:"country" binding:"required"`  // 国家
	Province string `json:"province"`                    // 省份
	City     string `json:"city"`                        // 城市
	District string `json:"district"`                    // 区县
}

// RouteMatchResponse 路由匹配响应
type RouteMatchResponse struct {
	Matched     bool                  `json:"matched"`      // 是否匹配到规则
	Rule        *SortingRuleResponse  `json:"rule"`         // 匹配的规则
	RouteCode   string                `json:"route_code"`   // 路由代码
	StationID   uint                  `json:"station_id"`   // 目标站点ID
	StationName string                `json:"station_name"` // 站点名称
	MatchLevel  string                `json:"match_level"`  // 匹配级别：exact/city/province/country
	Suggestions []SortingRuleResponse `json:"suggestions"`  // 建议规则
}

// BatchRouteRequest 批量路由请求
type BatchRouteRequest struct {
	Addresses []RouteMatchRequest `json:"addresses" binding:"required,dive"` // 地址列表
}

// BatchRouteResponse 批量路由响应
type BatchRouteResponse struct {
	Results []RouteMatchResponse `json:"results"` // 匹配结果列表
	Summary BatchRouteSummary    `json:"summary"` // 汇总信息
}

// BatchRouteSummary 批量路由汇总
type BatchRouteSummary struct {
	Total       int `json:"total"`        // 总数
	Matched     int `json:"matched"`      // 匹配成功数
	Unmatched   int `json:"unmatched"`    // 未匹配数
	MatchRate   string `json:"match_rate"` // 匹配率
}

// SortingRuleStatusRequest 分拣规则状态更新请求
type SortingRuleStatusRequest struct {
	Status int `json:"status" binding:"oneof=0 1"` // 状态：1=启用，0=禁用
}

// SortingRuleStatsResponse 分拣规则统计响应
type SortingRuleStatsResponse struct {
	TotalRules    int                      `json:"total_rules"`    // 总规则数
	EnabledRules  int                      `json:"enabled_rules"`  // 启用规则数
	DisabledRules int                      `json:"disabled_rules"` // 禁用规则数
	CountryStats  []CountryRuleStats       `json:"country_stats"`  // 按国家统计
	StationStats  []StationRuleStats       `json:"station_stats"`  // 按站点统计
	PriorityStats []PriorityRuleStats      `json:"priority_stats"` // 按优先级统计
}

// CountryRuleStats 国家规则统计
type CountryRuleStats struct {
	Country string `json:"country"` // 国家
	Count   int    `json:"count"`   // 规则数量
}

// StationRuleStats 站点规则统计
type StationRuleStats struct {
	StationID   uint   `json:"station_id"`   // 站点ID
	StationName string `json:"station_name"` // 站点名称
	Count       int    `json:"count"`        // 规则数量
}

// PriorityRuleStats 优先级规则统计
type PriorityRuleStats struct {
	Priority string `json:"priority"` // 优先级范围
	Count    int    `json:"count"`    // 规则数量
}
// CreateSortingTaskRequest 创建分拣任务请求
type CreateSortingTaskRequest struct {
	StationID   uint   `json:"station_id" binding:"required"`  // 站点ID
	AssignedTo  uint   `json:"assigned_to"`                    // 分配给（分拣员ID）
	TotalCount  int    `json:"total_count"`                    // 预计总数量
	Remark      string `json:"remark" binding:"max=500"`       // 备注
}

// UpdateSortingTaskRequest 更新分拣任务请求
type UpdateSortingTaskRequest struct {
	AssignedTo  uint   `json:"assigned_to"` // 分配给（分拣员ID）
	TotalCount  int    `json:"total_count"` // 预计总数量
	Remark      string `json:"remark"`      // 备注
}

// SortingTaskQueryRequest 分拣任务查询请求
type SortingTaskQueryRequest struct {
	TaskNo     string `form:"task_no"`     // 任务编号
	StationID  uint   `form:"station_id"`  // 站点ID
	AssignedTo uint   `form:"assigned_to"` // 分拣员ID
	Status     string `form:"status"`      // 状态
	StartTime  int64  `form:"start_time"`  // 开始时间
	EndTime    int64  `form:"end_time"`    // 结束时间
	Page       int    `form:"page" binding:"min=1"`      // 页码
	PageSize   int    `form:"page_size" binding:"min=1"` // 每页数量
}

// SortingTaskResponse 分拣任务响应
type SortingTaskResponse struct {
	ID           uint    `json:"id"`            // 任务ID
	TaskNo       string  `json:"task_no"`       // 任务编号
	StationID    uint    `json:"station_id"`    // 站点ID
	StationName  string  `json:"station_name"`  // 站点名称
	AssignedTo   uint    `json:"assigned_to"`   // 分拣员ID
	AssignedName string  `json:"assigned_name"` // 分拣员姓名
	TotalCount   int     `json:"total_count"`   // 总数量
	SortedCount  int     `json:"sorted_count"`  // 已分拣数量
	Progress     float64 `json:"progress"`      // 进度百分比
	Status       string  `json:"status"`        // 状态
	StatusName   string  `json:"status_name"`   // 状态名称
	StartTime    int64   `json:"start_time"`    // 开始时间
	EndTime      int64   `json:"end_time"`      // 结束时间
	Duration     int64   `json:"duration"`      // 耗时（秒）
	Remark       string  `json:"remark"`        // 备注
	CreateTime   string  `json:"create_time"`   // 创建时间
	UpdateTime   string  `json:"update_time"`   // 更新时间
}

// SortingTaskListResponse 分拣任务列表响应
type SortingTaskListResponse struct {
	List     []SortingTaskResponse `json:"list"`      // 任务列表
	Total    int64                 `json:"total"`     // 总数
	Page     int                   `json:"page"`      // 当前页
	PageSize int                   `json:"page_size"` // 每页数量
	Pages    int                   `json:"pages"`     // 总页数
}

// SortingTaskStatusRequest 分拣任务状态更新请求
type SortingTaskStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending processing completed cancelled"` // 状态
	Remark string `json:"remark" binding:"max=500"`                                               // 备注
}

// SortingScanRequest 分拣扫描请求
type SortingScanRequest struct {
	OrderID   uint   `json:"order_id"`                      // 订单ID，兼容旧调用
	OrderNo   string `json:"order_no" binding:"max=50"`     // 订单号，优先使用订单号扫描
	StationID uint   `json:"station_id" binding:"required"` // 当前站点ID
	TaskID    uint   `json:"task_id"`                       // 任务ID（可选）
	Remark    string `json:"remark" binding:"max=500"`      // 备注
}

// SortingScanResponse 分拣扫描响应
type SortingScanResponse struct {
	RecordID      uint                  `json:"record_id"`      // 分拣记录ID
	OrderID       uint                  `json:"order_id"`       // 订单ID
	OrderNo       string                `json:"order_no"`       // 订单号
	RouteMatched  bool                  `json:"route_matched"`  // 是否匹配到路由
	RouteCode     string                `json:"route_code"`     // 路由代码
	TargetStation uint                  `json:"target_station"` // 目标站点ID
	StationName   string                `json:"station_name"`   // 目标站点名称
	MatchLevel    string                `json:"match_level"`    // 匹配级别
	Rule          *SortingRuleResponse  `json:"rule"`           // 匹配的规则
	Suggestions   []SortingRuleResponse `json:"suggestions"`    // 建议规则
	Message       string                `json:"message"`        // 处理消息
}

// SortingRecordQueryRequest 分拣记录查询请求
type SortingRecordQueryRequest struct {
	TaskID        uint   `form:"task_id"`        // 任务ID
	OrderID       uint   `form:"order_id"`       // 订单ID
	StationID     uint   `form:"station_id"`     // 站点ID
	TargetStation uint   `form:"target_station"` // 目标站点ID
	SorterID      uint   `form:"sorter_id"`      // 分拣员ID
	RouteCode     string `form:"route_code"`     // 路由代码
	IsCorrect     int    `form:"is_correct,default=-1"`     // 是否正确：1=正确，0=错误，-1=全部
	StartTime     int64  `form:"start_time"`     // 开始时间
	EndTime       int64  `form:"end_time"`       // 结束时间
	Page          int    `form:"page" binding:"min=1"`      // 页码
	PageSize      int    `form:"page_size" binding:"min=1"` // 每页数量
}

// SortingRecordResponse 分拣记录响应
type SortingRecordResponse struct {
	ID              uint   `json:"id"`               // 记录ID
	TaskID          uint   `json:"task_id"`          // 任务ID
	TaskNo          string `json:"task_no"`          // 任务编号
	OrderID         uint   `json:"order_id"`         // 订单ID
	OrderNo         string `json:"order_no"`         // 订单号
	StationID       uint   `json:"station_id"`       // 站点ID
	StationName     string `json:"station_name"`     // 站点名称
	RuleID          uint   `json:"rule_id"`          // 规则ID
	RuleName        string `json:"rule_name"`        // 规则名称
	RouteCode       string `json:"route_code"`       // 路由代码
	TargetStation   uint   `json:"target_station"`   // 目标站点ID
	TargetName      string `json:"target_name"`      // 目标站点名称
	SorterID        uint   `json:"sorter_id"`        // 分拣员ID
	SorterName      string `json:"sorter_name"`      // 分拣员姓名
	ScanTime        int64  `json:"scan_time"`        // 扫描时间
	ScanTimeFormat  string `json:"scan_time_format"` // 扫描时间格式化
	IsCorrect       int    `json:"is_correct"`       // 是否正确
	IsCorrectName   string `json:"is_correct_name"`  // 是否正确名称
	Remark          string `json:"remark"`           // 备注
	CreateTime      string `json:"create_time"`      // 创建时间
	UpdateTime      string `json:"update_time"`      // 更新时间
}

// SortingRecordListResponse 分拣记录列表响应
type SortingRecordListResponse struct {
	List     []SortingRecordResponse `json:"list"`      // 记录列表
	Total    int64                   `json:"total"`     // 总数
	Page     int                     `json:"page"`      // 当前页
	PageSize int                     `json:"page_size"` // 每页数量
	Pages    int                     `json:"pages"`     // 总页数
}

// SortingStatsResponse 分拣统计响应
type SortingStatsResponse struct {
	TaskStats   SortingTaskStatsData   `json:"task_stats"`   // 任务统计
	RecordStats SortingRecordStatsData `json:"record_stats"` // 记录统计
	SorterStats []SorterStatsData      `json:"sorter_stats"` // 分拣员统计
	StationStats []StationSortingStats `json:"station_stats"` // 站点统计
	AccuracyStats SortingAccuracyStats `json:"accuracy_stats"` // 准确率统计
}

// SortingTaskStatsData 分拣任务统计数据
type SortingTaskStatsData struct {
	TotalTasks      int     `json:"total_tasks"`      // 总任务数
	PendingTasks    int     `json:"pending_tasks"`    // 待处理任务数
	ProcessingTasks int     `json:"processing_tasks"` // 处理中任务数
	CompletedTasks  int     `json:"completed_tasks"`  // 已完成任务数
	CancelledTasks  int     `json:"cancelled_tasks"`  // 已取消任务数
	AvgProgress     float64 `json:"avg_progress"`     // 平均进度
	TotalItems      int     `json:"total_items"`      // 总分拣件数
	SortedItems     int     `json:"sorted_items"`     // 已分拣件数
}

// SortingRecordStatsData 分拣记录统计数据
type SortingRecordStatsData struct {
	TotalRecords   int     `json:"total_records"`   // 总记录数
	CorrectRecords int     `json:"correct_records"` // 正确记录数
	ErrorRecords   int     `json:"error_records"`   // 错误记录数
	AccuracyRate   string  `json:"accuracy_rate"`   // 准确率
	AvgScanTime    float64 `json:"avg_scan_time"`   // 平均扫描时间间隔
}

// SorterStatsData 分拣员统计数据
type SorterStatsData struct {
	SorterID     uint    `json:"sorter_id"`     // 分拣员ID
	SorterName   string  `json:"sorter_name"`   // 分拣员姓名
	TaskCount    int     `json:"task_count"`    // 任务数量
	RecordCount  int     `json:"record_count"`  // 分拣记录数
	CorrectCount int     `json:"correct_count"` // 正确数量
	ErrorCount   int     `json:"error_count"`   // 错误数量
	AccuracyRate string  `json:"accuracy_rate"` // 准确率
	AvgSpeed     float64 `json:"avg_speed"`     // 平均分拣速度（件/小时）
}

// StationSortingStats 站点分拣统计
type StationSortingStats struct {
	StationID   uint   `json:"station_id"`   // 站点ID
	StationName string `json:"station_name"` // 站点名称
	TaskCount   int    `json:"task_count"`   // 任务数量
	RecordCount int    `json:"record_count"` // 分拣记录数
	ItemCount   int    `json:"item_count"`   // 分拣件数
}

// SortingAccuracyStats 分拣准确率统计
type SortingAccuracyStats struct {
	OverallRate string                    `json:"overall_rate"` // 总体准确率
	DailyStats  []DailySortingAccuracy    `json:"daily_stats"`  // 每日准确率
	HourlyStats []HourlySortingAccuracy   `json:"hourly_stats"` // 每小时准确率
}

// DailySortingAccuracy 每日分拣准确率
type DailySortingAccuracy struct {
	Date         string `json:"date"`         // 日期
	TotalCount   int    `json:"total_count"`  // 总数
	CorrectCount int    `json:"correct_count"` // 正确数
	AccuracyRate string `json:"accuracy_rate"` // 准确率
}

// HourlySortingAccuracy 每小时分拣准确率
type HourlySortingAccuracy struct {
	Hour         int    `json:"hour"`         // 小时
	TotalCount   int    `json:"total_count"`  // 总数
	CorrectCount int    `json:"correct_count"` // 正确数
	AccuracyRate string `json:"accuracy_rate"` // 准确率
}
