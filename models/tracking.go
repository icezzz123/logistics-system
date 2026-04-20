package models

// TrackingRecord 货物追踪记录模型
type TrackingRecord struct {
	ID          uint    `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID     uint    `gorm:"not null;index" json:"order_id"`
	Location    string  `gorm:"size:255;not null" json:"location"`
	Latitude    float64 `gorm:"type:decimal(10,6)" json:"latitude"`
	Longitude   float64 `gorm:"type:decimal(10,6)" json:"longitude"`
	Status      string  `gorm:"size:50;not null" json:"status"`
	Description string  `gorm:"type:text" json:"description"`
	OperatorID  uint    `gorm:"index;default:0" json:"operator_id"`
	CTime       int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime       int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (TrackingRecord) TableName() string {
	return "tracking_records"
}
