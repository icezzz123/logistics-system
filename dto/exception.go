package dto

// CreateExceptionRequest 创建异常请求
type CreateExceptionRequest struct {
	OrderID     uint     `json:"order_id" binding:"required"`             // 订单ID
	Type        int      `json:"type" binding:"required,min=1,max=7"`     // 异常类型
	StationID   uint     `json:"station_id"`                              // 站点ID
	Description string   `json:"description" binding:"required,max=2000"` // 异常描述
	Images      []string `json:"images"`                                  // 图片列表
	Remark      string   `json:"remark" binding:"max=1000"`               // 备注
}

// AssignExceptionRequest 分配异常请求
type AssignExceptionRequest struct {
	HandlerID uint   `json:"handler_id" binding:"required"` // 处理人ID
	Remark    string `json:"remark" binding:"max=1000"`     // 备注
}

// ProcessExceptionRequest 处理异常请求
type ProcessExceptionRequest struct {
	Status           int     `json:"status" binding:"required,oneof=2 3"` // 处理中/已解决
	Solution         string  `json:"solution" binding:"max=2000"`         // 处理方案
	Result           string  `json:"result" binding:"max=2000"`           // 处理结果
	CompensateAmount float64 `json:"compensate_amount" binding:"min=0"`   // 赔付金额
	Remark           string  `json:"remark" binding:"max=1000"`           // 备注
}

// CloseExceptionRequest 关闭异常请求
type CloseExceptionRequest struct {
	ResumeStatus *int   `json:"resume_status,omitempty" binding:"omitempty,min=1,max=12"` // 恢复订单状态，可选
	Remark       string `json:"remark" binding:"max=1000"`                                // 备注
	Result       string `json:"result" binding:"max=2000"`                                // 关闭结果补充
}

// ExceptionQueryRequest 异常列表查询请求
type ExceptionQueryRequest struct {
	PageRequest
	OrderNo    string `form:"order_no"`    // 订单号
	Type       int    `form:"type"`        // 异常类型
	Status     int    `form:"status"`      // 异常状态
	StationID  uint   `form:"station_id"`  // 站点ID
	ReporterID uint   `form:"reporter_id"` // 上报人ID
	HandlerID  uint   `form:"handler_id"`  // 处理人ID
	StartTime  int64  `form:"start_time"`  // 开始时间
	EndTime    int64  `form:"end_time"`    // 结束时间
}

// ExceptionInfo 异常信息
type ExceptionInfo struct {
	ID               uint     `json:"id"`
	ExceptionNo      string   `json:"exception_no"`
	OrderID          uint     `json:"order_id"`
	OrderNo          string   `json:"order_no"`
	OrderStatus      int      `json:"order_status"`
	OrderStatusName  string   `json:"order_status_name"`
	Type             int      `json:"type"`
	TypeName         string   `json:"type_name"`
	Status           int      `json:"status"`
	StatusName       string   `json:"status_name"`
	StationID        uint     `json:"station_id"`
	StationName      string   `json:"station_name"`
	ReporterID       uint     `json:"reporter_id"`
	ReporterName     string   `json:"reporter_name"`
	HandlerID        uint     `json:"handler_id"`
	HandlerName      string   `json:"handler_name"`
	Description      string   `json:"description"`
	Images           []string `json:"images"`
	Solution         string   `json:"solution"`
	Result           string   `json:"result"`
	CompensateAmount float64  `json:"compensate_amount"`
	ReportTime       int64    `json:"report_time"`
	HandleTime       int64    `json:"handle_time"`
	CloseTime        int64    `json:"close_time"`
	Remark           string   `json:"remark"`
	CreateTime       string   `json:"create_time"`
	UpdateTime       string   `json:"update_time"`
}

// ExceptionListResponse 异常列表响应
type ExceptionListResponse struct {
	List     []ExceptionInfo `json:"list"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"page_size"`
	Pages    int             `json:"pages"`
}

// ExceptionStatsQueryRequest 异常统计查询请求
type ExceptionStatsQueryRequest struct {
	StartTime int64 `form:"start_time"` // 开始时间
	EndTime   int64 `form:"end_time"`   // 结束时间
	StationID uint  `form:"station_id"` // 站点ID
}

// ExceptionTypeStats 异常类型统计
type ExceptionTypeStats struct {
	Type     int    `json:"type"`
	TypeName string `json:"type_name"`
	Count    int64  `json:"count"`
}

// ExceptionStatusStats 异常状态统计
type ExceptionStatusStats struct {
	Status     int    `json:"status"`
	StatusName string `json:"status_name"`
	Count      int64  `json:"count"`
}

// ExceptionStationStats 站点异常统计
type ExceptionStationStats struct {
	StationID   uint   `json:"station_id"`
	StationName string `json:"station_name"`
	Count       int64  `json:"count"`
}

// ExceptionDateStats 日期异常统计
type ExceptionDateStats struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

// ExceptionStatsResponse 异常统计响应
type ExceptionStatsResponse struct {
	Summary struct {
		TotalExceptions      int64   `json:"total_exceptions"`
		PendingExceptions    int64   `json:"pending_exceptions"`
		ProcessingExceptions int64   `json:"processing_exceptions"`
		ResolvedExceptions   int64   `json:"resolved_exceptions"`
		ClosedExceptions     int64   `json:"closed_exceptions"`
		TotalCompensation    float64 `json:"total_compensation"`
	} `json:"summary"`
	ByType    []ExceptionTypeStats    `json:"by_type"`
	ByStatus  []ExceptionStatusStats  `json:"by_status"`
	ByStation []ExceptionStationStats `json:"by_station"`
	ByDate    []ExceptionDateStats    `json:"by_date"`
}
