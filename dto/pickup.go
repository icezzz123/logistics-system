package dto

// CreatePickupTaskRequest 创建揽收任务请求
type CreatePickupTaskRequest struct {
	OrderID   uint   `json:"order_id" binding:"omitempty,min=1"`
	OrderNo   string `json:"order_no" binding:"omitempty,max=50"`
	StationID uint   `json:"station_id" binding:"required,min=1"`
	CourierID uint   `json:"courier_id" binding:"omitempty,min=1"`
	Remark    string `json:"remark" binding:"omitempty,max=500"`
}

// PickupTaskQueryRequest 揽收任务查询请求
type PickupTaskQueryRequest struct {
	PageRequest
	TaskNo    string `form:"task_no"`
	OrderNo   string `form:"order_no"`
	StationID uint   `form:"station_id"`
	CourierID uint   `form:"courier_id"`
	Status    string `form:"status"`
	Scope     string `form:"scope"`
}

// PickupTaskActionRequest 揽收任务动作请求
type PickupTaskActionRequest struct {
	Remark string `json:"remark" binding:"omitempty,max=500"`
}

// PickupTaskFailRequest 揽收失败请求
type PickupTaskFailRequest struct {
	ExceptionType int    `json:"exception_type" binding:"omitempty,min=1,max=7"`
	Reason        string `json:"reason" binding:"required,max=1000"`
	Remark        string `json:"remark" binding:"omitempty,max=500"`
}

// PickupTaskInfo 揽收任务信息
type PickupTaskInfo struct {
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
	SenderName      string `json:"sender_name"`
	SenderPhone     string `json:"sender_phone"`
	SenderAddress   string `json:"sender_address"`
	AssignTime      int64  `json:"assign_time"`
	StartTime       int64  `json:"start_time"`
	PickupTime      int64  `json:"pickup_time"`
	FailureReason   string `json:"failure_reason"`
	Remark          string `json:"remark"`
	CreateTime      string `json:"create_time"`
	UpdateTime      string `json:"update_time"`
}

// PickupTaskListResponse 揽收任务列表响应
type PickupTaskListResponse struct {
	List     []PickupTaskInfo `json:"list"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
	Pages    int              `json:"pages"`
}

// PickupTaskSummaryResponse 揽收任务概览
type PickupTaskSummaryResponse struct {
	PendingPool     int64 `json:"pending_pool"`
	PendingAssigned int64 `json:"pending_assigned"`
	PickingUp       int64 `json:"picking_up"`
	PickedUp        int64 `json:"picked_up"`
	Failed          int64 `json:"failed"`
	Total           int64 `json:"total"`
}
