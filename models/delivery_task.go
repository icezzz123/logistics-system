package models

// DeliveryTask 派送任务
type DeliveryTask struct {
	ID            uint   `gorm:"primarykey;autoIncrement" json:"id"`
	TaskNo        string `gorm:"uniqueIndex;size:50;not null" json:"task_no"`
	OrderID       uint   `gorm:"not null;index" json:"order_id"`
	CourierID     uint   `gorm:"index;default:0" json:"courier_id"`
	StationID     uint   `gorm:"not null;index" json:"station_id"`
	Status        string `gorm:"size:20;not null;default:'pending'" json:"status"`
	AssignTime    int64  `gorm:"default:0" json:"assign_time"`
	StartTime     int64  `gorm:"default:0" json:"start_time"`
	DeliveredTime int64  `gorm:"default:0" json:"delivered_time"`
	SignTime      int64  `gorm:"default:0" json:"sign_time"`
	FailureReason string `gorm:"type:text" json:"failure_reason"`
	Remark        string `gorm:"type:text" json:"remark"`
	CTime         int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime         int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (DeliveryTask) TableName() string {
	return "delivery_tasks"
}
