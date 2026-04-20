package dto

type OrderPackageRequest struct {
	ParcelNo      string  `json:"parcel_no" binding:"omitempty,max=50"`
	GoodsName     string  `json:"goods_name" binding:"required,max=100"`
	GoodsCategory string  `json:"goods_category" binding:"omitempty,max=50"`
	Weight        float64 `json:"weight" binding:"required,gt=0"`
	Volume        float64 `json:"volume" binding:"omitempty,gte=0"`
	Quantity      int     `json:"quantity" binding:"omitempty,min=1"`
	GoodsValue    float64 `json:"goods_value" binding:"omitempty,gte=0"`
	InsuredAmount float64 `json:"insured_amount" binding:"omitempty,gte=0"`
	Remark        string  `json:"remark" binding:"omitempty"`
}

type CreateOrderRequest struct {
	CustomerID uint `json:"customer_id" binding:"required,min=1"`

	SenderName     string `json:"sender_name" binding:"required,max=50"`
	SenderPhone    string `json:"sender_phone" binding:"required,max=20"`
	SenderCountry  string `json:"sender_country" binding:"required,max=50"`
	SenderProvince string `json:"sender_province" binding:"omitempty,max=50"`
	SenderCity     string `json:"sender_city" binding:"required,max=50"`
	SenderAddress  string `json:"sender_address" binding:"required,max=255"`
	SenderPostcode string `json:"sender_postcode" binding:"omitempty,max=20"`

	ReceiverName     string `json:"receiver_name" binding:"required,max=50"`
	ReceiverPhone    string `json:"receiver_phone" binding:"required,max=20"`
	ReceiverCountry  string `json:"receiver_country" binding:"required,max=50"`
	ReceiverProvince string `json:"receiver_province" binding:"omitempty,max=50"`
	ReceiverCity     string `json:"receiver_city" binding:"required,max=50"`
	ReceiverAddress  string `json:"receiver_address" binding:"required,max=255"`
	ReceiverPostcode string `json:"receiver_postcode" binding:"omitempty,max=20"`

	GoodsName     string                `json:"goods_name" binding:"required,max=100"`
	GoodsCategory string                `json:"goods_category" binding:"omitempty,max=50"`
	GoodsWeight   float64               `json:"goods_weight" binding:"required,gt=0"`
	GoodsVolume   float64               `json:"goods_volume" binding:"omitempty,gte=0"`
	GoodsQuantity int                   `json:"goods_quantity" binding:"omitempty,min=1"`
	GoodsValue    float64               `json:"goods_value" binding:"omitempty,gte=0"`
	IsInsured     int                   `json:"is_insured" binding:"omitempty,oneof=0 1"`
	InsuredAmount float64               `json:"insured_amount" binding:"omitempty,gte=0"`
	Packages      []OrderPackageRequest `json:"packages" binding:"omitempty,dive"`

	TransportMode int    `json:"transport_mode" binding:"required,min=1,max=5"`
	ServiceType   string `json:"service_type" binding:"omitempty,max=20"`

	Remark string `json:"remark" binding:"omitempty"`
}

type CreateOrderResponse struct {
	OrderID       uint    `json:"order_id"`
	OrderNo       string  `json:"order_no"`
	FreightCharge float64 `json:"freight_charge"`
	InsuranceFee  float64 `json:"insurance_fee"`
	TotalAmount   float64 `json:"total_amount"`
	EstimatedDays int     `json:"estimated_days"`
	OrderTime     int64   `json:"order_time"`
	PackageCount  int     `json:"package_count"`
}

type OrderQueryRequest struct {
	PageRequest
	OrderNo         string `form:"order_no" json:"order_no"`
	Status          int    `form:"status" json:"status"`
	SenderCountry   string `form:"sender_country" json:"sender_country"`
	ReceiverCountry string `form:"receiver_country" json:"receiver_country"`
	StartTime       int64  `form:"start_time" json:"start_time"`
	EndTime         int64  `form:"end_time" json:"end_time"`
}

type OrderInfo struct {
	ID              uint    `json:"id"`
	OrderNo         string  `json:"order_no"`
	CustomerID      uint    `json:"customer_id"`
	ParentOrderID   uint    `json:"parent_order_id"`
	ParentOrderNo   string  `json:"parent_order_no"`
	RootOrderID     uint    `json:"root_order_id"`
	RootOrderNo     string  `json:"root_order_no"`
	HierarchyType   string  `json:"hierarchy_type"`
	RelationType    string  `json:"relation_type"`
	PackageCount    int     `json:"package_count"`
	ChildOrderCount int     `json:"child_order_count"`
	SenderName      string  `json:"sender_name"`
	SenderCountry   string  `json:"sender_country"`
	SenderCity      string  `json:"sender_city"`
	ReceiverName    string  `json:"receiver_name"`
	ReceiverCountry string  `json:"receiver_country"`
	ReceiverCity    string  `json:"receiver_city"`
	GoodsName       string  `json:"goods_name"`
	GoodsWeight     float64 `json:"goods_weight"`
	TransportMode   int     `json:"transport_mode"`
	TotalAmount     float64 `json:"total_amount"`
	Status          int     `json:"status"`
	StatusName      string  `json:"status_name"`
	OrderTime       string  `json:"order_time"`
}

type OrderListResponse struct {
	List     []OrderInfo `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
	Pages    int         `json:"pages"`
}

type UpdateOrderRequest struct {
	ReceiverName     string `json:"receiver_name" binding:"omitempty,max=50"`
	ReceiverPhone    string `json:"receiver_phone" binding:"omitempty,max=20"`
	ReceiverProvince string `json:"receiver_province" binding:"omitempty,max=50"`
	ReceiverCity     string `json:"receiver_city" binding:"omitempty,max=50"`
	ReceiverAddress  string `json:"receiver_address" binding:"omitempty,max=255"`
	ReceiverPostcode string `json:"receiver_postcode" binding:"omitempty,max=20"`
	Remark           string `json:"remark" binding:"omitempty"`
}

type OrderStatisticsRequest struct {
	StartTime int64  `form:"start_time"`
	EndTime   int64  `form:"end_time"`
	GroupBy   string `form:"group_by"`
}

type OrderStatisticsResponse struct {
	TotalOrders       int64                 `json:"total_orders"`
	TotalAmount       float64               `json:"total_amount"`
	ByStatus          []StatusStatistics    `json:"by_status"`
	ByTransportMode   []TransportStatistics `json:"by_transport_mode"`
	BySenderCountry   []CountryStatistics   `json:"by_sender_country"`
	ByReceiverCountry []CountryStatistics   `json:"by_receiver_country"`
	ByDate            []DateStatistics      `json:"by_date,omitempty"`
}

type StatusStatistics struct {
	Status      int     `json:"status"`
	StatusName  string  `json:"status_name"`
	Count       int64   `json:"count"`
	TotalAmount float64 `json:"total_amount"`
}

type TransportStatistics struct {
	TransportMode int     `json:"transport_mode"`
	ModeName      string  `json:"mode_name"`
	Count         int64   `json:"count"`
	TotalAmount   float64 `json:"total_amount"`
}

type CountryStatistics struct {
	Country     string  `json:"country"`
	Count       int64   `json:"count"`
	TotalAmount float64 `json:"total_amount"`
}

type DateStatistics struct {
	Date        string  `json:"date"`
	Count       int64   `json:"count"`
	TotalAmount float64 `json:"total_amount"`
}

type UpdateOrderStatusRequest struct {
	Status int    `json:"status" binding:"required,min=1,max=12"`
	Remark string `json:"remark"`
}

type AllowedTransitionsResponse struct {
	CurrentStatus     int                      `json:"current_status"`
	CurrentStatusName string                   `json:"current_status_name"`
	AllowedStatuses   []StatusTransitionOption `json:"allowed_statuses"`
}

type StatusTransitionOption struct {
	Status     int    `json:"status"`
	StatusName string `json:"status_name"`
}

type OrderStatusLogResponse struct {
	ID               uint   `json:"id"`
	OrderID          uint   `json:"order_id"`
	FromStatus       int    `json:"from_status"`
	FromStatusName   string `json:"from_status_name"`
	ToStatus         int    `json:"to_status"`
	ToStatusName     string `json:"to_status_name"`
	OperatorID       uint   `json:"operator_id"`
	OperatorName     string `json:"operator_name"`
	OperatorRole     int    `json:"operator_role"`
	OperatorRoleName string `json:"operator_role_name"`
	Remark           string `json:"remark"`
	ChangeTime       int64  `json:"change_time"`
	CreatedAt        int64  `json:"created_at"`
}

type OrderPackageInfo struct {
	ID            uint    `json:"id"`
	OrderID       uint    `json:"order_id"`
	OrderNo       string  `json:"order_no"`
	RootOrderID   uint    `json:"root_order_id"`
	SourceOrderID uint    `json:"source_order_id"`
	ParcelNo      string  `json:"parcel_no"`
	PackageType   string  `json:"package_type"`
	GoodsName     string  `json:"goods_name"`
	GoodsCategory string  `json:"goods_category"`
	Weight        float64 `json:"weight"`
	Volume        float64 `json:"volume"`
	Quantity      int     `json:"quantity"`
	GoodsValue    float64 `json:"goods_value"`
	InsuredAmount float64 `json:"insured_amount"`
	Remark        string  `json:"remark"`
}

type OrderRelationSummary struct {
	ID            uint    `json:"id"`
	OrderNo       string  `json:"order_no"`
	RelationType  string  `json:"relation_type"`
	HierarchyType string  `json:"hierarchy_type"`
	Status        int     `json:"status"`
	StatusName    string  `json:"status_name"`
	PackageCount  int     `json:"package_count"`
	TotalAmount   float64 `json:"total_amount"`
}

type OrderDetailResponse struct {
	ID               uint                   `json:"id"`
	OrderNo          string                 `json:"order_no"`
	CustomerID       uint                   `json:"customer_id"`
	ParentOrderID    uint                   `json:"parent_order_id"`
	ParentOrderNo    string                 `json:"parent_order_no"`
	RootOrderID      uint                   `json:"root_order_id"`
	RootOrderNo      string                 `json:"root_order_no"`
	HierarchyType    string                 `json:"hierarchy_type"`
	RelationType     string                 `json:"relation_type"`
	PackageCount     int                    `json:"package_count"`
	ChildOrderCount  int                    `json:"child_order_count"`
	SenderName       string                 `json:"sender_name"`
	SenderPhone      string                 `json:"sender_phone"`
	SenderCountry    string                 `json:"sender_country"`
	SenderProvince   string                 `json:"sender_province"`
	SenderCity       string                 `json:"sender_city"`
	SenderAddress    string                 `json:"sender_address"`
	SenderPostcode   string                 `json:"sender_postcode"`
	ReceiverName     string                 `json:"receiver_name"`
	ReceiverPhone    string                 `json:"receiver_phone"`
	ReceiverCountry  string                 `json:"receiver_country"`
	ReceiverProvince string                 `json:"receiver_province"`
	ReceiverCity     string                 `json:"receiver_city"`
	ReceiverAddress  string                 `json:"receiver_address"`
	ReceiverPostcode string                 `json:"receiver_postcode"`
	GoodsName        string                 `json:"goods_name"`
	GoodsCategory    string                 `json:"goods_category"`
	GoodsWeight      float64                `json:"goods_weight"`
	GoodsVolume      float64                `json:"goods_volume"`
	GoodsQuantity    int                    `json:"goods_quantity"`
	GoodsValue       float64                `json:"goods_value"`
	IsInsured        int                    `json:"is_insured"`
	InsuredAmount    float64                `json:"insured_amount"`
	TransportMode    int                    `json:"transport_mode"`
	ServiceType      string                 `json:"service_type"`
	EstimatedDays    int                    `json:"estimated_days"`
	FreightCharge    float64                `json:"freight_charge"`
	CustomsFee       float64                `json:"customs_fee"`
	InsuranceFee     float64                `json:"insurance_fee"`
	OtherFee         float64                `json:"other_fee"`
	TotalAmount      float64                `json:"total_amount"`
	Currency         string                 `json:"currency"`
	PaymentStatus    string                 `json:"payment_status"`
	Status           int                    `json:"status"`
	CurrentStation   uint                   `json:"current_station"`
	OrderTime        int64                  `json:"order_time"`
	PickupTime       int64                  `json:"pickup_time"`
	DeliveryTime     int64                  `json:"delivery_time"`
	SignTime         int64                  `json:"sign_time"`
	Remark           string                 `json:"remark"`
	CTime            int64                  `json:"ctime"`
	MTime            int64                  `json:"mtime"`
	Packages         []OrderPackageInfo     `json:"packages"`
	ChildOrders      []OrderRelationSummary `json:"child_orders"`
}

type SplitOrderChildRequest struct {
	PackageIDs []uint `json:"package_ids" binding:"required,min=1,dive,min=1"`
	Remark     string `json:"remark" binding:"omitempty"`
}

type SplitOrderRequest struct {
	ChildOrders []SplitOrderChildRequest `json:"child_orders" binding:"required,min=2,dive"`
}

type SplitOrderResponse struct {
	ParentOrderID uint                   `json:"parent_order_id"`
	ParentOrderNo string                 `json:"parent_order_no"`
	ChildOrders   []OrderRelationSummary `json:"child_orders"`
}

type MergeOrdersRequest struct {
	SourceOrderIDs []uint `json:"source_order_ids" binding:"required,min=2,dive,min=1"`
	Remark         string `json:"remark" binding:"omitempty"`
}

type MergeOrdersResponse struct {
	ParentOrderID uint                   `json:"parent_order_id"`
	ParentOrderNo string                 `json:"parent_order_no"`
	ChildOrders   []OrderRelationSummary `json:"child_orders"`
}
