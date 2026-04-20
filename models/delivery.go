package models

// SignType 签收方式（整数枚举）
type SignType int

const (
	SignSelf    SignType = 1 // 本人签收
	SignProxy   SignType = 2 // 代收
	SignLocker  SignType = 3 // 快递柜
	SignStation SignType = 4 // 驿站
	SignRefused SignType = 5 // 拒收
)

// DeliveryRecord 配送记录
type DeliveryRecord struct {
	ID           uint   `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID      uint   `gorm:"not null;index" json:"order_id"`
	DriverID     uint   `gorm:"not null;index" json:"driver_id"`
	VehicleID    uint   `gorm:"index;default:0" json:"vehicle_id"`
	StationID    uint   `gorm:"not null;index" json:"station_id"`
	DispatchTime int64  `gorm:"not null" json:"dispatch_time"`
	DeliveryTime int64  `gorm:"default:0" json:"delivery_time"`
	Status       string `gorm:"size:20;not null;default:'dispatched'" json:"status"` // dispatched/delivering/delivered/failed
	FailReason   string `gorm:"type:text" json:"fail_reason"`
	Remark       string `gorm:"type:text" json:"remark"`
	CTime        int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime        int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (DeliveryRecord) TableName() string {
	return "delivery_records"
}

// SignRecord 签收记录
type SignRecord struct {
	ID           uint     `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID      uint     `gorm:"not null;uniqueIndex" json:"order_id"`
	SignType     SignType `gorm:"type:int;not null" json:"sign_type"`
	SignerName   string   `gorm:"size:50" json:"signer_name"`
	SignerPhone  string   `gorm:"size:20" json:"signer_phone"`
	SignerIDCard string   `gorm:"size:50" json:"signer_id_card"`
	Relation     string   `gorm:"size:20" json:"relation"`
	SignTime     int64    `gorm:"not null" json:"sign_time"`
	SignImage    string   `gorm:"size:255" json:"sign_image"`
	Latitude     float64  `gorm:"type:decimal(10,6)" json:"latitude"`
	Longitude    float64  `gorm:"type:decimal(10,6)" json:"longitude"`
	LockerCode   string   `gorm:"size:50" json:"locker_code"`
	StationCode  string   `gorm:"size:50" json:"station_code"`
	DriverID     uint     `gorm:"not null;index" json:"driver_id"`
	Remark       string   `gorm:"type:text" json:"remark"`
	CTime        int64    `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime        int64    `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (SignRecord) TableName() string {
	return "sign_records"
}
