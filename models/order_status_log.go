package models

// OrderStatusLog 订单状态变更日志
type OrderStatusLog struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	OrderID      uint        `gorm:"not null;index" json:"order_id"`    // 订单ID
	FromStatus   OrderStatus `gorm:"not null" json:"from_status"`       // 原状态
	ToStatus     OrderStatus `gorm:"not null" json:"to_status"`         // 新状态
	OperatorID   uint        `gorm:"not null" json:"operator_id"`       // 操作人ID
	OperatorName string      `gorm:"size:100" json:"operator_name"`     // 操作人姓名
	OperatorRole int         `gorm:"not null" json:"operator_role"`     // 操作人角色
	Remark       string      `gorm:"type:text" json:"remark"`           // 备注
	ChangeTime   int64       `gorm:"not null;index" json:"change_time"` // 变更时间（Unix时间戳）
	CreatedAt    int64       `gorm:"autoCreateTime" json:"created_at"`  // 创建时间（Unix时间戳）
}

// TableName 指定表名
func (OrderStatusLog) TableName() string {
	return "order_status_logs"
}
