package models

// Vehicle 车辆模型
type Vehicle struct {
	ID          uint    `gorm:"primarykey;autoIncrement" json:"id"`
	PlateNumber string  `gorm:"uniqueIndex;size:20;not null" json:"plate_number"`
	VehicleType string  `gorm:"size:50" json:"vehicle_type"`
	Capacity    float64 `gorm:"type:decimal(10,2)" json:"capacity"`
	DriverID    uint    `gorm:"index;default:0" json:"driver_id"`
	Status      int     `gorm:"default:1" json:"status"` // 1:可用 0:维修中
	CTime       int64   `gorm:"column:c_time;autoCreateTime;not null" json:"c_time"`
	MTime       int64   `gorm:"column:m_time;autoUpdateTime;not null" json:"m_time"`
}

// TableName 指定表名
func (Vehicle) TableName() string {
	return "vehicles"
}

// TransportTask 运输任务模型
type TransportTask struct {
	ID         uint    `gorm:"primarykey;autoIncrement" json:"id"`
	TaskNo     string  `gorm:"uniqueIndex;size:50;not null" json:"task_no"`
	OrderID    uint    `gorm:"not null;index" json:"order_id"`
	VehicleID  uint    `gorm:"not null;index" json:"vehicle_id"`
	DriverID   uint    `gorm:"not null;index" json:"driver_id"`
	StartPoint string  `gorm:"size:255;not null" json:"start_point"`
	EndPoint   string  `gorm:"size:255;not null" json:"end_point"`
	Distance   float64 `gorm:"type:decimal(10,2)" json:"distance"`
	Status     string  `gorm:"size:20;not null;default:'pending'" json:"status"`
	StartTime  int64   `gorm:"default:0" json:"start_time"`
	EndTime    int64   `gorm:"default:0" json:"end_time"`
	Cost       float64 `gorm:"type:decimal(10,2)" json:"cost"`
	Remark     string  `gorm:"type:text" json:"remark"`
	CTime      int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime      int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (TransportTask) TableName() string {
	return "transport_tasks"
}

// BatchSchedule 批次调度模型
type BatchSchedule struct {
	ID          uint    `gorm:"primarykey;autoIncrement" json:"id"`
	BatchNo     string  `gorm:"uniqueIndex;size:50;not null" json:"batch_no"`
	BatchName   string  `gorm:"size:100;not null" json:"batch_name"`
	VehicleID   uint    `gorm:"not null;index" json:"vehicle_id"`
	DriverID    uint    `gorm:"not null;index" json:"driver_id"`
	OrderCount  int     `gorm:"default:0" json:"order_count"`
	TotalWeight float64 `gorm:"type:decimal(10,2);default:0" json:"total_weight"`
	Status      string  `gorm:"size:20;not null;default:'pending'" json:"status"` // pending/dispatched/in_transit/completed/cancelled
	PlannedTime int64   `gorm:"default:0" json:"planned_time"`
	ActualTime  int64   `gorm:"default:0" json:"actual_time"`
	Remark      string  `gorm:"type:text" json:"remark"`
	CTime       int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime       int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (BatchSchedule) TableName() string { return "batch_schedules" }

// TransportPlan 运输计划模型
type TransportPlan struct {
	ID           uint    `gorm:"primarykey;autoIncrement" json:"id"`
	PlanNo       string  `gorm:"uniqueIndex;size:50;not null" json:"plan_no"`
	PlanName     string  `gorm:"size:100;not null" json:"plan_name"`
	PlanDate     int64   `gorm:"not null;index" json:"plan_date"`
	VehicleID    uint    `gorm:"not null;index" json:"vehicle_id"`
	DriverID     uint    `gorm:"not null;index" json:"driver_id"`
	StartPoint   string  `gorm:"size:255;not null" json:"start_point"`
	EndPoint     string  `gorm:"size:255;not null" json:"end_point"`
	Waypoints    string  `gorm:"type:text" json:"waypoints"`
	Distance     float64 `gorm:"type:decimal(10,2);default:0" json:"distance"`
	EstimatedH   int     `gorm:"default:0" json:"estimated_hours"`
	MaxCapacity  float64 `gorm:"type:decimal(10,2);default:0" json:"max_capacity"`
	UsedCapacity float64 `gorm:"type:decimal(10,2);default:0" json:"used_capacity"`
	Status       string  `gorm:"size:20;not null;default:'draft'" json:"status"` // draft/confirmed/executing/completed/cancelled
	Remark       string  `gorm:"type:text" json:"remark"`
	CTime        int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime        int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (TransportPlan) TableName() string { return "transport_plans" }

// TransportPlanOrder 运输计划-订单关联
type TransportPlanOrder struct {
	ID       uint  `gorm:"primarykey;autoIncrement" json:"id"`
	PlanID   uint  `gorm:"not null;index" json:"plan_id"`
	OrderID  uint  `gorm:"not null;index" json:"order_id"`
	CTime    int64 `gorm:"autoCreateTime;not null" json:"ctime"`
}

func (TransportPlanOrder) TableName() string { return "transport_plan_orders" }