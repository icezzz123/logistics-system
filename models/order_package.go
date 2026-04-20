package models

const (
	OrderPackageTypeNormal     = "normal"
	OrderPackageTypeSplitChild = "split_child"
	OrderPackageTypeMergeChild = "merge_child"
)

type OrderPackage struct {
	ID            uint    `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID       uint    `gorm:"not null;index" json:"order_id"`
	RootOrderID   uint    `gorm:"not null;index" json:"root_order_id"`
	SourceOrderID uint    `gorm:"not null;index" json:"source_order_id"`
	ParcelNo      string  `gorm:"uniqueIndex;size:50;not null" json:"parcel_no"`
	PackageType   string  `gorm:"size:20;not null;default:'normal'" json:"package_type"`
	GoodsName     string  `gorm:"size:100;not null" json:"goods_name"`
	GoodsCategory string  `gorm:"size:50" json:"goods_category"`
	Weight        float64 `gorm:"type:decimal(10,2);not null" json:"weight"`
	Volume        float64 `gorm:"type:decimal(10,2)" json:"volume"`
	Quantity      int     `gorm:"default:1" json:"quantity"`
	GoodsValue    float64 `gorm:"type:decimal(10,2)" json:"goods_value"`
	InsuredAmount float64 `gorm:"type:decimal(10,2);default:0" json:"insured_amount"`
	Remark        string  `gorm:"type:text" json:"remark"`
	CTime         int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime         int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (OrderPackage) TableName() string {
	return "order_packages"
}
