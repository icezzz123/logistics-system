package models

// UserRole 用户角色（整数枚举）
type UserRole int

const (
	RoleCustomer    UserRole = 1 // 客户（默认）
	RoleCourier     UserRole = 2 // 快递员
	RoleSorter      UserRole = 3 // 分拣员
	RoleDriver      UserRole = 4 // 司机
	RoleSiteManager UserRole = 5 // 站点管理员
	RoleDispatcher  UserRole = 6 // 调度员
	RoleAdmin       UserRole = 7 // 管理员
)

// User 用户模型
type User struct {
	ID       uint     `gorm:"primarykey;autoIncrement" json:"id"`
	Username string   `gorm:"uniqueIndex;size:50;not null" json:"username"`
	Password string   `gorm:"size:255;not null" json:"-"`
	Email    string   `gorm:"size:100" json:"email"`
	Phone    string   `gorm:"size:20" json:"phone"`
	RealName string   `gorm:"size:50" json:"real_name"`
	Role     UserRole `gorm:"type:int;not null;default:1" json:"role"` // 默认为客户
	Status   int      `gorm:"default:1" json:"status"`                 // 1:启用 0:禁用
	CTime    int64    `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime    int64    `gorm:"autoUpdateTime;not null" json:"mtime"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
