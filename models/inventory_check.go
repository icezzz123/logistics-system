package models

// InventoryCheck 库存盘点记录
type InventoryCheck struct {
	ID              uint   `gorm:"primarykey;autoIncrement" json:"id"`
	CheckNo         string `gorm:"uniqueIndex;size:50;not null" json:"check_no"`         // 盘点单号
	StationID       uint   `gorm:"not null;index" json:"station_id"`                     // 站点ID
	CheckType       string `gorm:"size:20;not null" json:"check_type"`                   // 盘点类型：full/spot
	SystemCount     int    `gorm:"not null;default:0" json:"system_count"`               // 系统数量
	ActualCount     int    `gorm:"not null;default:0" json:"actual_count"`               // 实际数量
	DifferenceCount int    `gorm:"default:0" json:"difference_count"`                    // 差异数量
	Status          int    `gorm:"default:1" json:"status"`                              // 状态：1=盘点中，2=已完成
	OperatorID      uint   `gorm:"not null;index" json:"operator_id"`                    // 操作人ID
	CheckTime       int64  `gorm:"not null" json:"check_time"`                           // 盘点时间
	CompleteTime    int64  `gorm:"default:0" json:"complete_time"`                       // 完成时间
	Remark          string `gorm:"type:text" json:"remark"`                              // 备注
	CTime           int64  `gorm:"column:c_time;autoCreateTime;not null" json:"c_time"` // 创建时间
	MTime           int64  `gorm:"column:m_time;autoUpdateTime;not null" json:"m_time"` // 更新时间
}

// TableName 指定表名
func (InventoryCheck) TableName() string {
	return "inventory_checks"
}

// InventoryCheckDetail 库存盘点明细
type InventoryCheckDetail struct {
	ID           uint   `gorm:"primarykey;autoIncrement" json:"id"`
	CheckID      uint   `gorm:"not null;index" json:"check_id"`                       // 盘点单ID
	OrderID      uint   `gorm:"not null;index" json:"order_id"`                       // 订单ID
	OrderNo      string `gorm:"size:50;not null" json:"order_no"`                     // 订单号
	Status       int    `gorm:"not null" json:"status"`                               // 订单状态
	IsFound      int    `gorm:"default:1" json:"is_found"`                            // 是否找到：1=找到，0=未找到
	Remark       string `gorm:"type:text" json:"remark"`                              // 备注
	CTime        int64  `gorm:"column:c_time;autoCreateTime;not null" json:"c_time"` // 创建时间
	MTime        int64  `gorm:"column:m_time;autoUpdateTime;not null" json:"m_time"` // 更新时间
}

// TableName 指定表名
func (InventoryCheckDetail) TableName() string {
	return "inventory_check_details"
}
