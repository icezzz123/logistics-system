package dto

// InboundScanRequest 入库扫描请求
type InboundScanRequest struct {
	OrderNo   string  `json:"order_no" binding:"required"`     // 订单号
	StationID uint    `json:"station_id" binding:"required"`   // 站点ID
	Weight    float64 `json:"weight" binding:"omitempty,gt=0"` // 实际重量（可选，用于校验）
	Volume    float64 `json:"volume" binding:"omitempty,gt=0"` // 实际体积（可选）
	Remark    string  `json:"remark"`                          // 备注
}

// InboundScanResponse 入库扫描响应
type InboundScanResponse struct {
	FlowID      uint    `json:"flow_id"`      // 流转记录ID
	OrderID     uint    `json:"order_id"`     // 订单ID
	OrderNo     string  `json:"order_no"`     // 订单号
	StationID   uint    `json:"station_id"`   // 站点ID
	StationName string  `json:"station_name"` // 站点名称
	GoodsName   string  `json:"goods_name"`   // 货物名称
	Weight      float64 `json:"weight"`       // 重量
	Volume      float64 `json:"volume"`       // 体积
	OrderStatus int     `json:"order_status"` // 订单状态
	InboundTime int64   `json:"inbound_time"` // 入库时间
}

// InboundRecordQueryRequest 入库记录查询请求
type InboundRecordQueryRequest struct {
	PageRequest
	StationID uint   `form:"station_id"` // 站点ID
	OrderNo   string `form:"order_no"`   // 订单号
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
}

// InboundRecordInfo 入库记录信息
type InboundRecordInfo struct {
	ID           uint    `json:"id"`
	OrderID      uint    `json:"order_id"`
	OrderNo      string  `json:"order_no"`
	StationID    uint    `json:"station_id"`
	StationName  string  `json:"station_name"`
	GoodsName    string  `json:"goods_name"`
	Weight       float64 `json:"weight"`
	Volume       float64 `json:"volume"`
	OperatorID   uint    `json:"operator_id"`
	OperatorName string  `json:"operator_name"`
	Remark       string  `json:"remark"`
	InboundTime  int64   `json:"inbound_time"`
}

// InboundRecordListResponse 入库记录列表响应
type InboundRecordListResponse struct {
	List     []InboundRecordInfo `json:"list"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
	Pages    int                 `json:"pages"`
}

// OutboundScanRequest 出库扫描请求
type OutboundScanRequest struct {
	OrderNo         string `json:"order_no" binding:"required"`          // 订单号
	StationID       uint   `json:"station_id" binding:"required"`        // 当前站点ID
	NextStationID   uint   `json:"next_station_id" binding:"required"`   // 下一站点ID
	Weight          float64 `json:"weight" binding:"omitempty,gt=0"`     // 实际重量（可选）
	Volume          float64 `json:"volume" binding:"omitempty,gt=0"`     // 实际体积（可选）
	Remark          string  `json:"remark"`                              // 备注
}

// OutboundScanResponse 出库扫描响应
type OutboundScanResponse struct {
	FlowID          uint    `json:"flow_id"`           // 流转记录ID
	OrderID         uint    `json:"order_id"`          // 订单ID
	OrderNo         string  `json:"order_no"`          // 订单号
	StationID       uint    `json:"station_id"`        // 当前站点ID
	StationName     string  `json:"station_name"`      // 当前站点名称
	NextStationID   uint    `json:"next_station_id"`   // 下一站点ID
	NextStationName string  `json:"next_station_name"` // 下一站点名称
	GoodsName       string  `json:"goods_name"`        // 货物名称
	Weight          float64 `json:"weight"`            // 重量
	Volume          float64 `json:"volume"`            // 体积
	OrderStatus     int     `json:"order_status"`      // 订单状态
	OutboundTime    int64   `json:"outbound_time"`     // 出库时间
}

// OutboundRecordQueryRequest 出库记录查询请求
type OutboundRecordQueryRequest struct {
	PageRequest
	StationID uint   `form:"station_id"` // 站点ID
	OrderNo   string `form:"order_no"`   // 订单号
	StartTime int64  `form:"start_time"` // 开始时间
	EndTime   int64  `form:"end_time"`   // 结束时间
}

// OutboundRecordInfo 出库记录信息
type OutboundRecordInfo struct {
	ID              uint    `json:"id"`
	OrderID         uint    `json:"order_id"`
	OrderNo         string  `json:"order_no"`
	StationID       uint    `json:"station_id"`
	StationName     string  `json:"station_name"`
	NextStationID   uint    `json:"next_station_id"`
	NextStationName string  `json:"next_station_name"`
	GoodsName       string  `json:"goods_name"`
	Weight          float64 `json:"weight"`
	Volume          float64 `json:"volume"`
	OperatorID      uint    `json:"operator_id"`
	OperatorName    string  `json:"operator_name"`
	Remark          string  `json:"remark"`
	OutboundTime    int64   `json:"outbound_time"`
}

// OutboundRecordListResponse 出库记录列表响应
type OutboundRecordListResponse struct {
	List     []OutboundRecordInfo `json:"list"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"page_size"`
	Pages    int                  `json:"pages"`
}
