package dto

// RegisterRequest 用户注册请求
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6,max=50"`
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty"`
	RealName string `json:"real_name" binding:"omitempty,max=50"`
	Role     int    `json:"role"` // 角色（1-7），可选，默认为1（客户）
}

// LoginRequest 用户登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token    string      `json:"token"`
	UserInfo interface{} `json:"user_info"`
}

// UpdateUserRequest 更新用户信息请求
type UpdateUserRequest struct {
	Email    string `json:"email" binding:"omitempty,email"`
	Phone    string `json:"phone" binding:"omitempty"`
	RealName string `json:"real_name" binding:"omitempty,max=50"`
}

// UpdateUserStatusRequest 更新用户状态请求
type UpdateUserStatusRequest struct {
	Status *int `json:"status" binding:"required,oneof=0 1"` // 0=禁用，1=启用
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=50"`
}

// UserListRequest 用户列表查询请求
type UserListRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`      // 页码
	PageSize int    `form:"page_size" binding:"omitempty,min=1"` // 每页数量
	Keyword  string `form:"keyword"`                             // 搜索关键词（用户名、邮箱、手机号、真实姓名）
	Role     int    `form:"role" binding:"omitempty,min=0"`      // 角色筛选（0=全部）
	Status   *int   `form:"status" binding:"omitempty,min=-1"`   // 状态筛选（nil=全部，0=禁用，1=启用）
}

// UserInfo 用户信息
type UserInfo struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	RealName string `json:"real_name"`
	Role     int    `json:"role"`
	RoleName string `json:"role_name"`
	Status   int    `json:"status"`
	CTime    string `json:"c_time"`
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	List     []UserInfo `json:"list"`      // 用户列表
	Total    int64      `json:"total"`     // 总数
	Page     int        `json:"page"`      // 当前页
	PageSize int        `json:"page_size"` // 每页数量
	Pages    int        `json:"pages"`     // 总页数
}

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	RoleID int `json:"role_id" binding:"required,min=1,max=7"` // 角色ID（1-7）
}

// CustomerOptionRequest 客户选项查询请求
type CustomerOptionRequest struct {
	Keyword  string `form:"keyword"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=50"`
}

// CustomerOption 客户选项
type CustomerOption struct {
	ID          uint   `json:"id"`
	Username    string `json:"username"`
	RealName    string `json:"real_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

// CustomerOptionListResponse 客户选项列表响应
type CustomerOptionListResponse struct {
	List  []CustomerOption `json:"list"`
	Total int64            `json:"total"`
}
