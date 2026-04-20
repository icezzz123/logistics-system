package models

type OrderStatus int

const (
	OrderPending            OrderStatus = 1
	OrderAccepted           OrderStatus = 2
	OrderInWarehouse        OrderStatus = 3
	OrderSorting            OrderStatus = 4
	OrderInTransit          OrderStatus = 5
	OrderCustomsClearing    OrderStatus = 6
	OrderDestinationSorting OrderStatus = 7
	OrderDelivering         OrderStatus = 8
	OrderDelivered          OrderStatus = 9
	OrderSigned             OrderStatus = 10
	OrderException          OrderStatus = 11
	OrderCancelled          OrderStatus = 12
)

type TransportMode int

const (
	TransportAir     TransportMode = 1
	TransportSea     TransportMode = 2
	TransportLand    TransportMode = 3
	TransportRail    TransportMode = 4
	TransportExpress TransportMode = 5
)

const (
	OrderHierarchyNormal = "normal"
	OrderHierarchyMaster = "master"
	OrderHierarchyChild  = "child"
)

const (
	OrderRelationNormal      = "normal"
	OrderRelationSplitParent = "split_parent"
	OrderRelationSplitChild  = "split_child"
	OrderRelationMergeParent = "merge_parent"
	OrderRelationMergeChild  = "merge_child"
)

type Order struct {
	ID            uint   `gorm:"primarykey;autoIncrement" json:"id"`
	OrderNo       string `gorm:"uniqueIndex;size:50;not null" json:"order_no"`
	CustomerID    uint   `gorm:"not null;index" json:"customer_id"`
	ParentOrderID uint   `gorm:"index;default:0" json:"parent_order_id"`
	RootOrderID   uint   `gorm:"index;default:0" json:"root_order_id"`
	HierarchyType string `gorm:"size:20;not null;default:'normal'" json:"hierarchy_type"`
	RelationType  string `gorm:"size:20;not null;default:'normal'" json:"relation_type"`

	SenderName     string `gorm:"size:50;not null" json:"sender_name"`
	SenderPhone    string `gorm:"size:20;not null" json:"sender_phone"`
	SenderCountry  string `gorm:"size:50;not null;index" json:"sender_country"`
	SenderProvince string `gorm:"size:50" json:"sender_province"`
	SenderCity     string `gorm:"size:50;not null" json:"sender_city"`
	SenderAddress  string `gorm:"size:255;not null" json:"sender_address"`
	SenderPostcode string `gorm:"size:20" json:"sender_postcode"`

	ReceiverName     string `gorm:"size:50;not null" json:"receiver_name"`
	ReceiverPhone    string `gorm:"size:20;not null" json:"receiver_phone"`
	ReceiverCountry  string `gorm:"size:50;not null;index" json:"receiver_country"`
	ReceiverProvince string `gorm:"size:50" json:"receiver_province"`
	ReceiverCity     string `gorm:"size:50;not null" json:"receiver_city"`
	ReceiverAddress  string `gorm:"size:255;not null" json:"receiver_address"`
	ReceiverPostcode string `gorm:"size:20" json:"receiver_postcode"`

	GoodsName     string  `gorm:"size:100;not null" json:"goods_name"`
	GoodsCategory string  `gorm:"size:50" json:"goods_category"`
	GoodsWeight   float64 `gorm:"type:decimal(10,2);not null" json:"goods_weight"`
	GoodsVolume   float64 `gorm:"type:decimal(10,2)" json:"goods_volume"`
	GoodsQuantity int     `gorm:"default:1" json:"goods_quantity"`
	GoodsValue    float64 `gorm:"type:decimal(10,2)" json:"goods_value"`
	IsInsured     int     `gorm:"default:0" json:"is_insured"`
	InsuredAmount float64 `gorm:"type:decimal(10,2);default:0" json:"insured_amount"`

	TransportMode   TransportMode `gorm:"type:int" json:"transport_mode"`
	ServiceType     string        `gorm:"size:20" json:"service_type"`
	EstimatedDays   int           `gorm:"default:0" json:"estimated_days"`
	OriginStationID uint          `gorm:"index;default:0" json:"origin_station_id"`
	DestStationID   uint          `gorm:"index;default:0" json:"dest_station_id"`

	FreightCharge float64 `gorm:"type:decimal(10,2);default:0" json:"freight_charge"`
	CustomsFee    float64 `gorm:"type:decimal(10,2);default:0" json:"customs_fee"`
	InsuranceFee  float64 `gorm:"type:decimal(10,2);default:0" json:"insurance_fee"`
	OtherFee      float64 `gorm:"type:decimal(10,2);default:0" json:"other_fee"`
	TotalAmount   float64 `gorm:"type:decimal(10,2);default:0" json:"total_amount"`
	Currency      string  `gorm:"size:10;default:'CNY'" json:"currency"`
	PaymentStatus string  `gorm:"size:20;default:'unpaid'" json:"payment_status"`

	Status         OrderStatus `gorm:"type:int;not null;default:1;index" json:"status"`
	CurrentStation uint        `gorm:"index;default:0" json:"current_station"`

	OrderTime    int64 `gorm:"not null" json:"order_time"`
	PickupTime   int64 `gorm:"default:0" json:"pickup_time"`
	DeliveryTime int64 `gorm:"default:0" json:"delivery_time"`
	SignTime     int64 `gorm:"default:0" json:"sign_time"`

	Remark string `gorm:"type:text" json:"remark"`
	CTime  int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime  int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (Order) TableName() string {
	return "orders"
}
