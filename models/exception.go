package models

// ExceptionType 异常类型（整数枚举）
type ExceptionType int

const (
	ExceptionDamaged    ExceptionType = 1 // 破损
	ExceptionLost       ExceptionType = 2 // 丢失
	ExceptionDelay      ExceptionType = 3 // 延误
	ExceptionRefused    ExceptionType = 4 // 拒收
	ExceptionAddressErr ExceptionType = 5 // 地址错误
	ExceptionCustoms    ExceptionType = 6 // 海关扣留
	ExceptionOther      ExceptionType = 7 // 其他
)

// ExceptionStatus 异常处理状态（整数枚举）
type ExceptionStatus int

const (
	ExceptionPending    ExceptionStatus = 1 // 待处理
	ExceptionProcessing ExceptionStatus = 2 // 处理中
	ExceptionResolved   ExceptionStatus = 3 // 已解决
	ExceptionClosed     ExceptionStatus = 4 // 已关闭
)

// ExceptionRecord 异常件记录
type ExceptionRecord struct {
	ID               uint            `gorm:"primarykey;autoIncrement" json:"id"`
	ExceptionNo      string          `gorm:"uniqueIndex;size:50;not null" json:"exception_no"`
	OrderID          uint            `gorm:"not null;index" json:"order_id"`
	Type             ExceptionType   `gorm:"type:int;not null;index" json:"type"`
	Status           ExceptionStatus `gorm:"type:int;not null;default:1" json:"status"` // 默认待处理
	StationID        uint            `gorm:"index;default:0" json:"station_id"`
	ReporterID       uint            `gorm:"not null;index" json:"reporter_id"`
	HandlerID        uint            `gorm:"index;default:0" json:"handler_id"`
	Description      string          `gorm:"type:text;not null" json:"description"`
	Images           string          `gorm:"type:text" json:"images"`
	Solution         string          `gorm:"type:text" json:"solution"`
	Result           string          `gorm:"type:text" json:"result"`
	CompensateAmount float64         `gorm:"type:decimal(10,2);default:0" json:"compensate_amount"`
	ReportTime       int64           `gorm:"not null" json:"report_time"`
	HandleTime       int64           `gorm:"default:0" json:"handle_time"`
	CloseTime        int64           `gorm:"default:0" json:"close_time"`
	Remark           string          `gorm:"type:text" json:"remark"`
	CTime            int64           `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime            int64           `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (ExceptionRecord) TableName() string {
	return "exception_records"
}
