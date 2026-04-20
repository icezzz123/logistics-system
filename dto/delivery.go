package dto

// CreateDeliveryTaskRequest 创建派送任务请求
type CreateDeliveryTaskRequest struct {
	OrderID   uint   `json:"order_id" binding:"omitempty,min=1"`
	OrderNo   string `json:"order_no" binding:"omitempty,max=50"`
	StationID uint   `json:"station_id" binding:"required,min=1"`
	CourierID uint   `json:"courier_id" binding:"omitempty,min=1"`
	Remark    string `json:"remark" binding:"omitempty,max=500"`
}

// DeliveryTaskQueryRequest 派送任务查询请求
type DeliveryTaskQueryRequest struct {
	PageRequest
	TaskNo    string `form:"task_no"`
	OrderNo   string `form:"order_no"`
	StationID uint   `form:"station_id"`
	CourierID uint   `form:"courier_id"`
	Status    string `form:"status"`
	Scope     string `form:"scope"`
}

// DeliveryTaskActionRequest 派送任务动作请求
type DeliveryTaskActionRequest struct {
	Remark string `json:"remark" binding:"omitempty,max=500"`
}

// DeliveryTaskFailRequest 派送失败请求
type DeliveryTaskFailRequest struct {
	ExceptionType int    `json:"exception_type" binding:"omitempty,min=1,max=7"`
	Reason        string `json:"reason" binding:"required,max=1000"`
	Remark        string `json:"remark" binding:"omitempty,max=500"`
}

// DeliveryTaskSignRequest 签收请求
type DeliveryTaskSignRequest struct {
	SignType     int     `json:"sign_type" binding:"required,min=1,max=5"`
	SignerName   string  `json:"signer_name" binding:"omitempty,max=50"`
	SignerPhone  string  `json:"signer_phone" binding:"omitempty,max=20"`
	SignerIDCard string  `json:"signer_id_card" binding:"omitempty,max=50"`
	Relation     string  `json:"relation" binding:"omitempty,max=20"`
	SignImage    string  `json:"sign_image" binding:"omitempty,max=255"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	LockerCode   string  `json:"locker_code" binding:"omitempty,max=50"`
	StationCode  string  `json:"station_code" binding:"omitempty,max=50"`
	Remark       string  `json:"remark" binding:"omitempty,max=500"`
}

// DeliveryTaskInfo 派送任务信息
type DeliveryTaskInfo struct {
	ID              uint   `json:"id"`
	TaskNo          string `json:"task_no"`
	OrderID         uint   `json:"order_id"`
	OrderNo         string `json:"order_no"`
	CourierID       uint   `json:"courier_id"`
	CourierName     string `json:"courier_name"`
	StationID       uint   `json:"station_id"`
	StationName     string `json:"station_name"`
	Status          string `json:"status"`
	StatusName      string `json:"status_name"`
	OrderStatus     int    `json:"order_status"`
	OrderStatusName string `json:"order_status_name"`
	ReceiverName    string `json:"receiver_name"`
	ReceiverPhone   string `json:"receiver_phone"`
	ReceiverAddress string `json:"receiver_address"`
	AssignTime      int64  `json:"assign_time"`
	StartTime       int64  `json:"start_time"`
	DeliveredTime   int64  `json:"delivered_time"`
	SignTime        int64  `json:"sign_time"`
	FailureReason   string `json:"failure_reason"`
	Remark          string `json:"remark"`
	CreateTime      string `json:"create_time"`
	UpdateTime      string `json:"update_time"`
}

// DeliveryTaskListResponse 派送任务列表响应
type DeliveryTaskListResponse struct {
	List     []DeliveryTaskInfo `json:"list"`
	Total    int64              `json:"total"`
	Page     int                `json:"page"`
	PageSize int                `json:"page_size"`
	Pages    int                `json:"pages"`
}

// DeliveryTaskSummaryResponse 派送任务概览
type DeliveryTaskSummaryResponse struct {
	PendingPool     int64 `json:"pending_pool"`
	PendingAssigned int64 `json:"pending_assigned"`
	Delivering      int64 `json:"delivering"`
	Delivered       int64 `json:"delivered"`
	Signed          int64 `json:"signed"`
	Failed          int64 `json:"failed"`
	Total           int64 `json:"total"`
}
