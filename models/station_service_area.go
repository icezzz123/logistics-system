package models

// StationServiceArea 站点服务范围配置
type StationServiceArea struct {
	ID        uint   `gorm:"primarykey;autoIncrement" json:"id"`
	StationID uint   `gorm:"not null;index" json:"station_id"`
	Country   string `gorm:"size:50;not null;index" json:"country"`
	Province  string `gorm:"size:50;index" json:"province"`
	City      string `gorm:"size:50;index" json:"city"`
	District  string `gorm:"size:50;index" json:"district"`
	Priority  int    `gorm:"not null;default:100" json:"priority"`
	Status    int    `gorm:"not null;default:1;index" json:"status"`
	Remark    string `gorm:"type:text" json:"remark"`
	CTime     int64  `gorm:"column:c_time;autoCreateTime;not null" json:"ctime"`
	MTime     int64  `gorm:"column:m_time;autoUpdateTime;not null" json:"mtime"`
}

func (StationServiceArea) TableName() string {
	return "station_service_areas"
}
