package models

// SortingRule 分拣规则
type SortingRule struct {
	ID          uint   `gorm:"primarykey;autoIncrement" json:"id"`
	RuleName    string `gorm:"size:100;not null" json:"rule_name"`
	Country     string `gorm:"size:50;index" json:"country"`
	Province    string `gorm:"size:50;index" json:"province"`
	City        string `gorm:"size:50;index" json:"city"`
	District    string `gorm:"size:50" json:"district"`
	RouteCode   string `gorm:"size:50;not null" json:"route_code"`
	StationID   uint   `gorm:"not null;index" json:"station_id"`
	Priority    int    `gorm:"default:0" json:"priority"`
	Status      int    `gorm:"default:1" json:"status"` // 1:启用 0:禁用
	Description string `gorm:"type:text" json:"description"`
	CTime       int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime       int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (SortingRule) TableName() string {
	return "sorting_rules"
}

// SortingTask 分拣任务
type SortingTask struct {
	ID          uint   `gorm:"primarykey;autoIncrement" json:"id"`
	TaskNo      string `gorm:"uniqueIndex;size:50;not null" json:"task_no"`
	StationID   uint   `gorm:"not null;index" json:"station_id"`
	AssignedTo  uint   `gorm:"index;default:0" json:"assigned_to"`
	TotalCount  int    `gorm:"not null;default:0" json:"total_count"`
	SortedCount int    `gorm:"default:0" json:"sorted_count"`
	Status      string `gorm:"size:20;not null;default:'pending'" json:"status"` // pending/processing/completed/cancelled
	StartTime   int64  `gorm:"default:0" json:"start_time"`
	EndTime     int64  `gorm:"default:0" json:"end_time"`
	Remark      string `gorm:"type:text" json:"remark"`
	CTime       int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime       int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (SortingTask) TableName() string {
	return "sorting_tasks"
}

// SortingRecord 分拣记录
type SortingRecord struct {
	ID            uint   `gorm:"primarykey;autoIncrement" json:"id"`
	TaskID        uint   `gorm:"index;default:0" json:"task_id"`
	OrderID       uint   `gorm:"not null;index" json:"order_id"`
	StationID     uint   `gorm:"not null;index" json:"station_id"`
	RuleID        uint   `gorm:"index;default:0" json:"rule_id"`
	RouteCode     string `gorm:"size:50" json:"route_code"`
	TargetStation uint   `gorm:"not null;index" json:"target_station"`
	SorterID      uint   `gorm:"not null;index" json:"sorter_id"`
	ScanTime      int64  `gorm:"not null" json:"scan_time"`
	IsCorrect     int    `gorm:"default:1" json:"is_correct"` // 1:正确 0:错误
	Remark        string `gorm:"type:text" json:"remark"`
	CTime         int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime         int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (SortingRecord) TableName() string {
	return "sorting_records"
}
