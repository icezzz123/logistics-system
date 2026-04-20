package dto

type InboundScanRequest struct {
	ScanCode  string  `json:"scan_code" binding:"omitempty,max=50"`
	OrderNo   string  `json:"order_no" binding:"omitempty,max=50"`
	StationID uint    `json:"station_id" binding:"required"`
	Weight    float64 `json:"weight" binding:"omitempty,gt=0"`
	Volume    float64 `json:"volume" binding:"omitempty,gt=0"`
	Remark    string  `json:"remark"`
}

type InboundScanResponse struct {
	FlowID      uint    `json:"flow_id"`
	OrderID     uint    `json:"order_id"`
	OrderNo     string  `json:"order_no"`
	ParcelNo    string  `json:"parcel_no"`
	StationID   uint    `json:"station_id"`
	StationName string  `json:"station_name"`
	GoodsName   string  `json:"goods_name"`
	Weight      float64 `json:"weight"`
	Volume      float64 `json:"volume"`
	OrderStatus int     `json:"order_status"`
	InboundTime int64   `json:"inbound_time"`
}

type InboundRecordQueryRequest struct {
	PageRequest
	StationID uint   `form:"station_id"`
	OrderNo   string `form:"order_no"`
	StartTime int64  `form:"start_time"`
	EndTime   int64  `form:"end_time"`
}

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

type InboundRecordListResponse struct {
	List     []InboundRecordInfo `json:"list"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
	Pages    int                 `json:"pages"`
}

type OutboundScanRequest struct {
	ScanCode      string  `json:"scan_code" binding:"omitempty,max=50"`
	OrderNo       string  `json:"order_no" binding:"omitempty,max=50"`
	StationID     uint    `json:"station_id" binding:"required"`
	NextStationID uint    `json:"next_station_id" binding:"required"`
	Weight        float64 `json:"weight" binding:"omitempty,gt=0"`
	Volume        float64 `json:"volume" binding:"omitempty,gt=0"`
	Remark        string  `json:"remark"`
}

type OutboundScanResponse struct {
	FlowID          uint    `json:"flow_id"`
	OrderID         uint    `json:"order_id"`
	OrderNo         string  `json:"order_no"`
	ParcelNo        string  `json:"parcel_no"`
	StationID       uint    `json:"station_id"`
	StationName     string  `json:"station_name"`
	NextStationID   uint    `json:"next_station_id"`
	NextStationName string  `json:"next_station_name"`
	GoodsName       string  `json:"goods_name"`
	Weight          float64 `json:"weight"`
	Volume          float64 `json:"volume"`
	OrderStatus     int     `json:"order_status"`
	OutboundTime    int64   `json:"outbound_time"`
}

type OutboundRecordQueryRequest struct {
	PageRequest
	StationID uint   `form:"station_id"`
	OrderNo   string `form:"order_no"`
	StartTime int64  `form:"start_time"`
	EndTime   int64  `form:"end_time"`
}

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

type OutboundRecordListResponse struct {
	List     []OutboundRecordInfo `json:"list"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"page_size"`
	Pages    int                  `json:"pages"`
}
