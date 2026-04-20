package dto

type AddressBookListRequest struct {
	CustomerID uint   `form:"customer_id" binding:"omitempty,min=1"`
	Type       string `form:"type" binding:"omitempty,oneof=sender receiver"`
	Keyword    string `form:"keyword"`
}

type CreateAddressBookRequest struct {
	CustomerID   uint   `json:"customer_id" binding:"omitempty,min=1"`
	Label        string `json:"label" binding:"required,max=50"`
	AddressType  string `json:"address_type" binding:"required,oneof=sender receiver"`
	ContactName  string `json:"contact_name" binding:"required,max=50"`
	ContactPhone string `json:"contact_phone" binding:"required,max=20"`
	Country      string `json:"country" binding:"required,max=50"`
	Province     string `json:"province" binding:"omitempty,max=50"`
	City         string `json:"city" binding:"required,max=50"`
	Address      string `json:"address" binding:"required,max=255"`
	Postcode     string `json:"postcode" binding:"omitempty,max=20"`
	Remark       string `json:"remark" binding:"omitempty,max=255"`
	IsDefault    int    `json:"is_default" binding:"omitempty,oneof=0 1"`
}

type UpdateAddressBookRequest struct {
	Label        string `json:"label" binding:"required,max=50"`
	AddressType  string `json:"address_type" binding:"required,oneof=sender receiver"`
	ContactName  string `json:"contact_name" binding:"required,max=50"`
	ContactPhone string `json:"contact_phone" binding:"required,max=20"`
	Country      string `json:"country" binding:"required,max=50"`
	Province     string `json:"province" binding:"omitempty,max=50"`
	City         string `json:"city" binding:"required,max=50"`
	Address      string `json:"address" binding:"required,max=255"`
	Postcode     string `json:"postcode" binding:"omitempty,max=20"`
	Remark       string `json:"remark" binding:"omitempty,max=255"`
	IsDefault    int    `json:"is_default" binding:"omitempty,oneof=0 1"`
}

type AddressBookItem struct {
	ID              uint   `json:"id"`
	UserID          uint   `json:"user_id"`
	Label           string `json:"label"`
	AddressType     string `json:"address_type"`
	AddressTypeName string `json:"address_type_name"`
	ContactName     string `json:"contact_name"`
	ContactPhone    string `json:"contact_phone"`
	Country         string `json:"country"`
	Province        string `json:"province"`
	City            string `json:"city"`
	Address         string `json:"address"`
	Postcode        string `json:"postcode"`
	Remark          string `json:"remark"`
	IsDefault       int    `json:"is_default"`
	CTime           int64  `json:"ctime"`
	MTime           int64  `json:"mtime"`
}

type AddressBookListResponse struct {
	List  []AddressBookItem `json:"list"`
	Total int64             `json:"total"`
}
