package dto

type ScanResolveRequest struct {
	Code string `json:"code" binding:"required,max=50"`
}

type ScanResolveResponse struct {
	Code       string `json:"code"`
	CodeType   string `json:"code_type"`
	EntityType string `json:"entity_type"`
	OrderID    uint   `json:"order_id"`
	OrderNo    string `json:"order_no"`
	ParcelNo   string `json:"parcel_no"`
	TaskID     uint   `json:"task_id"`
	TaskNo     string `json:"task_no"`
	BatchID    uint   `json:"batch_id"`
	BatchNo    string `json:"batch_no"`
	PlanID     uint   `json:"plan_id"`
	PlanNo     string `json:"plan_no"`
}
