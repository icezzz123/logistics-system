package models

type UserAddressType string

const (
	UserAddressTypeSender   UserAddressType = "sender"
	UserAddressTypeReceiver UserAddressType = "receiver"
)

type UserAddress struct {
	ID           uint            `gorm:"primarykey;autoIncrement" json:"id"`
	UserID       uint            `gorm:"not null;index;index:idx_user_addresses_owner_type_default,priority:1" json:"user_id"`
	Label        string          `gorm:"size:50;not null" json:"label"`
	AddressType  UserAddressType `gorm:"size:20;not null;index:idx_user_addresses_owner_type_default,priority:2" json:"address_type"`
	ContactName  string          `gorm:"size:50;not null" json:"contact_name"`
	ContactPhone string          `gorm:"size:20;not null" json:"contact_phone"`
	Country      string          `gorm:"size:50;not null" json:"country"`
	Province     string          `gorm:"size:50" json:"province"`
	City         string          `gorm:"size:50;not null" json:"city"`
	Address      string          `gorm:"size:255;not null" json:"address"`
	Postcode     string          `gorm:"size:20" json:"postcode"`
	Remark       string          `gorm:"size:255" json:"remark"`
	IsDefault    int             `gorm:"type:tinyint;not null;default:0;index:idx_user_addresses_owner_type_default,priority:3" json:"is_default"`
	CTime        int64           `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime        int64           `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (UserAddress) TableName() string {
	return "user_addresses"
}
