package dto

// PageRequest 分页请求
type PageRequest struct {
	Page     int `form:"page" json:"page" binding:"omitempty,min=1"`                   // 页码
	PageSize int `form:"page_size" json:"page_size" binding:"omitempty,min=1,max=100"` // 每页数量
}

// PageResponse 分页响应
type PageResponse struct {
	Total    int64       `json:"total"`     // 总数
	Page     int         `json:"page"`      // 当前页
	PageSize int         `json:"page_size"` // 每页数量
	Data     interface{} `json:"data"`      // 数据列表
}

// IDRequest ID请求
type IDRequest struct {
	ID uint `uri:"id" json:"id" binding:"required,min=1"`
}
