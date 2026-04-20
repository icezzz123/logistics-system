package models

// Warehouse 仓库模型
type Warehouse struct {
	ID        uint   `gorm:"primarykey;autoIncrement" json:"id"`
	Name      string `gorm:"size:100;not null" json:"name"`
	Address   string `gorm:"size:255;not null" json:"address"`
	ManagerID uint   `gorm:"index;default:0" json:"manager_id"`
	Capacity  int    `gorm:"not null" json:"capacity"`
	Status    int    `gorm:"default:1" json:"status"` // 1:启用 0:禁用
	CTime     int64  `gorm:"column:c_time;autoCreateTime;not null" json:"c_time"`
	MTime     int64  `gorm:"column:m_time;autoUpdateTime;not null" json:"m_time"`
}

// TableName 指定表名
func (Warehouse) TableName() string {
	return "warehouses"
}

// Inventory 库存模型
type Inventory struct {
	ID          uint   `gorm:"primarykey;autoIncrement" json:"id"`
	WarehouseID uint   `gorm:"not null;index" json:"warehouse_id"`
	GoodsName   string `gorm:"size:100;not null" json:"goods_name"`
	GoodsCode   string `gorm:"uniqueIndex;size:50;not null" json:"goods_code"`
	Quantity    int    `gorm:"not null;default:0" json:"quantity"`
	Unit        string `gorm:"size:20" json:"unit"`
	Location    string `gorm:"size:50" json:"location"`    // 库位
	MinStock    int    `gorm:"default:0" json:"min_stock"` // 最小库存预警值
	Remark      string `gorm:"type:text" json:"remark"`
	CTime       int64  `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime       int64  `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (Inventory) TableName() string {
	return "inventories"
}
