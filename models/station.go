package models

// StationType 站点类型（整数枚举）
type StationType int

const (
	StationOrigin      StationType = 1 // 始发站
	StationTransit     StationType = 2 // 中转站
	StationDestination StationType = 3 // 目的站
	StationCustoms     StationType = 4 // 海关站点
)

// Station 站点模型（支持多国站点）
type Station struct {
	ID           uint        `gorm:"primarykey;autoIncrement" json:"id"`
	StationCode  string      `gorm:"uniqueIndex;size:50;not null" json:"station_code"`
	Name         string      `gorm:"size:100;not null" json:"name"`
	Type         StationType `gorm:"type:int;not null" json:"type"`
	Country      string      `gorm:"size:50;not null;index" json:"country"`
	Province     string      `gorm:"size:50;index" json:"province"`
	City         string      `gorm:"size:50;not null;index" json:"city"`
	Address      string      `gorm:"size:255;not null" json:"address"`
	Latitude     float64     `gorm:"type:decimal(10,6)" json:"latitude"`
	Longitude    float64     `gorm:"type:decimal(10,6)" json:"longitude"`
	ManagerID    uint        `gorm:"index;default:0" json:"manager_id"`
	Capacity     int         `gorm:"not null;default:1000" json:"capacity"`
	ContactName  string      `gorm:"size:50" json:"contact_name"`
	ContactPhone string      `gorm:"size:20" json:"contact_phone"`
	WorkingHours string      `gorm:"size:100" json:"working_hours"`
	Status       int         `gorm:"default:1" json:"status"` // 1:启用 0:禁用
	Remark       string      `gorm:"type:text" json:"remark"`
	CTime        int64       `gorm:"column:c_time;autoCreateTime;not null" json:"c_time"`
	MTime        int64       `gorm:"column:m_time;autoUpdateTime;not null" json:"m_time"`
}

// TableName 指定表名
func (Station) TableName() string {
	return "stations"
}

// StationFlow 站点货物流转记录
type StationFlow struct {
	ID            uint    `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID       uint    `gorm:"not null;index" json:"order_id"`
	StationID     uint    `gorm:"not null;index" json:"station_id"`
	FlowType      string  `gorm:"size:20;not null" json:"flow_type"` // in:入库 out:出库
	Quantity      int     `gorm:"not null;default:1" json:"quantity"`
	Weight        float64 `gorm:"type:decimal(10,2)" json:"weight"`
	Volume        float64 `gorm:"type:decimal(10,2)" json:"volume"`
	OperatorID    uint    `gorm:"not null;index" json:"operator_id"`
	NextStationID uint    `gorm:"index;default:0" json:"next_station_id"`
	Remark        string  `gorm:"type:text" json:"remark"`
	CTime         int64   `gorm:"column:c_time;autoCreateTime;not null" json:"ctime"`
	MTime         int64   `gorm:"column:m_time;autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (StationFlow) TableName() string {
	return "station_flows"
}
