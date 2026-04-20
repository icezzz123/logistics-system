package dto

// CreateTrackingRecordRequest 创建追踪记录请求
type CreateTrackingRecordRequest struct {
	OrderID     uint    `json:"order_id" binding:"required"`         // 订单ID
	Location    string  `json:"location" binding:"required,max=255"` // 追踪位置
	Latitude    float64 `json:"latitude"`                            // 纬度
	Longitude   float64 `json:"longitude"`                           // 经度
	Status      string  `json:"status" binding:"required,max=50"`    // 追踪状态
	Description string  `json:"description" binding:"max=1000"`      // 描述
	TrackTime   int64   `json:"track_time"`                          // 追踪时间，可选，默认当前时间
}

// TrackingRecordQueryRequest 追踪记录查询请求
type TrackingRecordQueryRequest struct {
	PageRequest
	OrderID    uint   `form:"order_id"`    // 订单ID
	OrderNo    string `form:"order_no"`    // 订单号
	Status     string `form:"status"`      // 追踪状态
	OperatorID uint   `form:"operator_id"` // 操作人ID
	StartTime  int64  `form:"start_time"`  // 开始时间
	EndTime    int64  `form:"end_time"`    // 结束时间
}

// TrackingRecordInfo 追踪记录信息
type TrackingRecordInfo struct {
	ID           uint    `json:"id"`
	OrderID      uint    `json:"order_id"`
	OrderNo      string  `json:"order_no"`
	Location     string  `json:"location"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Status       string  `json:"status"`
	Description  string  `json:"description"`
	OperatorID   uint    `json:"operator_id"`
	OperatorName string  `json:"operator_name"`
	TrackTime    int64   `json:"track_time"`
	CreateTime   string  `json:"create_time"`
	UpdateTime   string  `json:"update_time"`
}

// TrackingRecordListResponse 追踪记录列表响应
type TrackingRecordListResponse struct {
	List     []TrackingRecordInfo `json:"list"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"page_size"`
	Pages    int                  `json:"pages"`
}

// OrderTrackingHistoryResponse 订单追踪历史响应
type OrderTrackingHistoryResponse struct {
	OrderID           uint                 `json:"order_id"`
	OrderNo           string               `json:"order_no"`
	CurrentStatus     int                  `json:"current_status"`
	CurrentStatusName string               `json:"current_status_name"`
	List              []TrackingRecordInfo `json:"list"`
}

// TrackingTimelineItem 追踪时间轴项
type TrackingTimelineItem struct {
	RecordID     uint    `json:"record_id"`
	Status       string  `json:"status"`
	Description  string  `json:"description"`
	Location     string  `json:"location"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	OperatorID   uint    `json:"operator_id"`
	OperatorName string  `json:"operator_name"`
	TrackTime    int64   `json:"track_time"`
	DisplayTime  string  `json:"display_time"`
}

// TrackingTimelineResponse 追踪时间轴响应
type TrackingTimelineResponse struct {
	OrderID              uint                   `json:"order_id"`
	OrderNo              string                 `json:"order_no"`
	CurrentStatus        int                    `json:"current_status"`
	CurrentStatusName    string                 `json:"current_status_name"`
	ExpectedDeliveryTime int64                  `json:"expected_delivery_time"`
	IsDelayed            bool                   `json:"is_delayed"`
	DelayHours           float64                `json:"delay_hours"`
	LatestLocation       string                 `json:"latest_location"`
	LatestTrackTime      int64                  `json:"latest_track_time"`
	Timeline             []TrackingTimelineItem `json:"timeline"`
}

// TrackingWarningQueryRequest 追踪预警查询请求
type TrackingWarningQueryRequest struct {
	PageRequest
	OrderNo      string `form:"order_no"`      // 订单号
	WarningLevel string `form:"warning_level"` // 预警级别：warning/critical
	WarningType  string `form:"warning_type"`  // 预警类型：timeliness/delay/stale_update
}

// TrackingWarningInfo 追踪预警信息
type TrackingWarningInfo struct {
	OrderID              uint    `json:"order_id"`
	OrderNo              string  `json:"order_no"`
	CurrentStatus        int     `json:"current_status"`
	CurrentStatusName    string  `json:"current_status_name"`
	LatestTrackingStatus string  `json:"latest_tracking_status"`
	LatestLocation       string  `json:"latest_location"`
	LatestTrackTime      int64   `json:"latest_track_time"`
	ExpectedDeliveryTime int64   `json:"expected_delivery_time"`
	RemainingHours       float64 `json:"remaining_hours"`
	OverdueHours         float64 `json:"overdue_hours"`
	WarningLevel         string  `json:"warning_level"`
	WarningType          string  `json:"warning_type"`
	WarningTypeName      string  `json:"warning_type_name"`
	WarningMessage       string  `json:"warning_message"`
}

// TrackingWarningListResponse 追踪预警列表响应
type TrackingWarningListResponse struct {
	List          []TrackingWarningInfo `json:"list"`
	Total         int64                 `json:"total"`
	Page          int                   `json:"page"`
	PageSize      int                   `json:"page_size"`
	Pages         int                   `json:"pages"`
	WarningCount  int64                 `json:"warning_count"`
	CriticalCount int64                 `json:"critical_count"`
}
