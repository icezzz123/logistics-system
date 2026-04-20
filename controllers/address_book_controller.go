package controllers

import (
	"fmt"
	"logistics-system/dto"
	"logistics-system/middleware"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type AddressBookController struct {
	addressBookService *services.AddressBookService
}

func NewAddressBookController() *AddressBookController {
	return &AddressBookController{
		addressBookService: services.NewAddressBookService(),
	}
}

func (ctrl *AddressBookController) GetAddressList(c *gin.Context) {
	requesterID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	requesterRole, exists := middleware.GetCurrentUserRole(c)
	if !exists {
		utils.Forbidden(c, "无权限访问")
		return
	}

	var req dto.AddressBookListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.addressBookService.GetAddressList(requesterID, requesterRole, &req)
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	utils.Success(c, result)
}

func (ctrl *AddressBookController) CreateAddress(c *gin.Context) {
	requesterID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	requesterRole, exists := middleware.GetCurrentUserRole(c)
	if !exists {
		utils.Forbidden(c, "无权限访问")
		return
	}

	var req dto.CreateAddressBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.addressBookService.CreateAddress(requesterID, requesterRole, &req)
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "地址已保存到地址簿", result)
}

func (ctrl *AddressBookController) UpdateAddress(c *gin.Context) {
	requesterID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	requesterRole, exists := middleware.GetCurrentUserRole(c)
	if !exists {
		utils.Forbidden(c, "无权限访问")
		return
	}

	addressID, ok := parseAddressBookID(c)
	if !ok {
		return
	}

	var req dto.UpdateAddressBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.addressBookService.UpdateAddress(requesterID, requesterRole, addressID, &req)
	if err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	utils.SuccessWithMessage(c, "地址簿已更新", result)
}

func (ctrl *AddressBookController) DeleteAddress(c *gin.Context) {
	requesterID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	requesterRole, exists := middleware.GetCurrentUserRole(c)
	if !exists {
		utils.Forbidden(c, "无权限访问")
		return
	}

	addressID, ok := parseAddressBookID(c)
	if !ok {
		return
	}

	if err := ctrl.addressBookService.DeleteAddress(requesterID, requesterRole, addressID); err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	utils.Success(c, gin.H{"message": "地址簿记录已删除"})
}

func (ctrl *AddressBookController) SetDefaultAddress(c *gin.Context) {
	requesterID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	requesterRole, exists := middleware.GetCurrentUserRole(c)
	if !exists {
		utils.Forbidden(c, "无权限访问")
		return
	}

	addressID, ok := parseAddressBookID(c)
	if !ok {
		return
	}

	if err := ctrl.addressBookService.SetDefaultAddress(requesterID, requesterRole, addressID); err != nil {
		utils.Error(c, 400, err.Error())
		return
	}
	utils.Success(c, gin.H{"message": "默认地址已更新"})
}

func parseAddressBookID(c *gin.Context) (uint, bool) {
	var addressID uint
	if _, err := fmt.Sscanf(c.Param("id"), "%d", &addressID); err != nil {
		utils.BadRequest(c, "无效的ID")
		return 0, false
	}
	return addressID, true
}
