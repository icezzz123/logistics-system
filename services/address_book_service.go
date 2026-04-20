package services

import (
	"errors"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"

	"gorm.io/gorm"
)

type AddressBookService struct{}

func NewAddressBookService() *AddressBookService {
	return &AddressBookService{}
}

func (s *AddressBookService) GetAddressList(requesterID uint, requesterRole int, req *dto.AddressBookListRequest) (*dto.AddressBookListResponse, error) {
	ownerID, err := s.resolveOwnerID(requesterID, requesterRole, req.CustomerID)
	if err != nil {
		return nil, err
	}

	var records []models.UserAddress
	query := database.DB.Model(&models.UserAddress{}).Where("user_id = ?", ownerID)

	if req.Type != "" {
		query = query.Where("address_type = ?", req.Type)
	}
	if keyword := strings.TrimSpace(req.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			"label LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ? OR city LIKE ? OR address LIKE ?",
			like, like, like, like, like,
		)
	}

	if err := query.Order("address_type ASC, is_default DESC, m_time DESC, id DESC").Find(&records).Error; err != nil {
		return nil, errors.New("查询地址簿失败")
	}

	items := make([]dto.AddressBookItem, 0, len(records))
	for _, record := range records {
		items = append(items, s.toAddressBookItem(record))
	}

	return &dto.AddressBookListResponse{
		List:  items,
		Total: int64(len(items)),
	}, nil
}

func (s *AddressBookService) CreateAddress(requesterID uint, requesterRole int, req *dto.CreateAddressBookRequest) (*dto.AddressBookItem, error) {
	ownerID, err := s.resolveOwnerID(requesterID, requesterRole, req.CustomerID)
	if err != nil {
		return nil, err
	}

	record := s.buildAddressModel(
		ownerID,
		req.Label,
		req.AddressType,
		req.ContactName,
		req.ContactPhone,
		req.Country,
		req.Province,
		req.City,
		req.Address,
		req.Postcode,
		req.Remark,
		req.IsDefault,
	)
	if err := s.validateAddressModel(record); err != nil {
		return nil, err
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if record.IsDefault == 1 {
			if err := tx.Model(&models.UserAddress{}).
				Where("user_id = ? AND address_type = ?", ownerID, record.AddressType).
				Update("is_default", 0).Error; err != nil {
				return err
			}
		}
		return tx.Create(record).Error
	}); err != nil {
		return nil, errors.New("创建地址簿失败")
	}

	item := s.toAddressBookItem(*record)
	return &item, nil
}

func (s *AddressBookService) UpdateAddress(requesterID uint, requesterRole int, addressID uint, req *dto.UpdateAddressBookRequest) (*dto.AddressBookItem, error) {
	var record models.UserAddress
	if err := database.DB.First(&record, addressID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("地址簿记录不存在")
		}
		return nil, errors.New("查询地址簿失败")
	}

	if err := s.ensureEntryAccess(requesterID, requesterRole, record.UserID); err != nil {
		return nil, err
	}

	updated := s.buildAddressModel(
		record.UserID,
		req.Label,
		req.AddressType,
		req.ContactName,
		req.ContactPhone,
		req.Country,
		req.Province,
		req.City,
		req.Address,
		req.Postcode,
		req.Remark,
		req.IsDefault,
	)
	if err := s.validateAddressModel(updated); err != nil {
		return nil, err
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if updated.IsDefault == 1 {
			if err := tx.Model(&models.UserAddress{}).
				Where("user_id = ? AND address_type = ? AND id <> ?", record.UserID, updated.AddressType, record.ID).
				Update("is_default", 0).Error; err != nil {
				return err
			}
		}

		updates := map[string]interface{}{
			"label":         updated.Label,
			"address_type":  updated.AddressType,
			"contact_name":  updated.ContactName,
			"contact_phone": updated.ContactPhone,
			"country":       updated.Country,
			"province":      updated.Province,
			"city":          updated.City,
			"address":       updated.Address,
			"postcode":      updated.Postcode,
			"remark":        updated.Remark,
			"is_default":    updated.IsDefault,
		}
		return tx.Model(&record).Updates(updates).Error
	}); err != nil {
		return nil, errors.New("更新地址簿失败")
	}

	if err := database.DB.First(&record, addressID).Error; err != nil {
		return nil, errors.New("读取更新后的地址簿失败")
	}

	item := s.toAddressBookItem(record)
	return &item, nil
}

func (s *AddressBookService) DeleteAddress(requesterID uint, requesterRole int, addressID uint) error {
	var record models.UserAddress
	if err := database.DB.First(&record, addressID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("地址簿记录不存在")
		}
		return errors.New("查询地址簿失败")
	}

	if err := s.ensureEntryAccess(requesterID, requesterRole, record.UserID); err != nil {
		return err
	}

	if err := database.DB.Delete(&record).Error; err != nil {
		return errors.New("删除地址簿失败")
	}
	return nil
}

func (s *AddressBookService) SetDefaultAddress(requesterID uint, requesterRole int, addressID uint) error {
	var record models.UserAddress
	if err := database.DB.First(&record, addressID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("地址簿记录不存在")
		}
		return errors.New("查询地址簿失败")
	}

	if err := s.ensureEntryAccess(requesterID, requesterRole, record.UserID); err != nil {
		return err
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.UserAddress{}).
			Where("user_id = ? AND address_type = ?", record.UserID, record.AddressType).
			Update("is_default", 0).Error; err != nil {
			return err
		}
		return tx.Model(&record).Update("is_default", 1).Error
	}); err != nil {
		return errors.New("设置默认地址失败")
	}

	return nil
}

func (s *AddressBookService) buildAddressModel(ownerID uint, label string, addressType string, contactName string, contactPhone string, country string, province string, city string, address string, postcode string, remark string, isDefault int) *models.UserAddress {
	return &models.UserAddress{
		UserID:       ownerID,
		Label:        strings.TrimSpace(label),
		AddressType:  models.UserAddressType(strings.TrimSpace(addressType)),
		ContactName:  strings.TrimSpace(contactName),
		ContactPhone: strings.TrimSpace(contactPhone),
		Country:      strings.TrimSpace(country),
		Province:     strings.TrimSpace(province),
		City:         strings.TrimSpace(city),
		Address:      strings.TrimSpace(address),
		Postcode:     strings.TrimSpace(postcode),
		Remark:       strings.TrimSpace(remark),
		IsDefault:    isDefault,
	}
}

func (s *AddressBookService) validateAddressModel(record *models.UserAddress) error {
	if record.Label == "" {
		return errors.New("地址标签不能为空")
	}
	if record.ContactName == "" {
		return errors.New("联系人不能为空")
	}
	if record.ContactPhone == "" {
		return errors.New("联系电话不能为空")
	}
	if record.Country == "" {
		return errors.New("国家不能为空")
	}
	if record.City == "" {
		return errors.New("城市不能为空")
	}
	if record.Address == "" {
		return errors.New("详细地址不能为空")
	}
	if record.AddressType != models.UserAddressTypeSender && record.AddressType != models.UserAddressTypeReceiver {
		return errors.New("地址类型不正确")
	}
	if record.IsDefault != 0 && record.IsDefault != 1 {
		return errors.New("默认标记不正确")
	}
	return nil
}

func (s *AddressBookService) resolveOwnerID(requesterID uint, requesterRole int, targetCustomerID uint) (uint, error) {
	if targetCustomerID == 0 || targetCustomerID == requesterID {
		return requesterID, nil
	}
	if !s.canProxyCustomerAddressBook(requesterRole) {
		return 0, errors.New("无权限访问其他客户地址簿")
	}
	if err := s.ensureCustomerUser(targetCustomerID); err != nil {
		return 0, err
	}
	return targetCustomerID, nil
}

func (s *AddressBookService) ensureEntryAccess(requesterID uint, requesterRole int, ownerID uint) error {
	if ownerID == requesterID {
		return nil
	}
	if !s.canProxyCustomerAddressBook(requesterRole) {
		return errors.New("无权限操作该地址簿记录")
	}
	return s.ensureCustomerUser(ownerID)
}

func (s *AddressBookService) ensureCustomerUser(userID uint) error {
	var user models.User
	if err := database.DB.Select("id", "role").First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("目标客户不存在")
		}
		return errors.New("查询目标客户失败")
	}
	if user.Role != models.RoleCustomer {
		return errors.New("只能操作客户地址簿")
	}
	return nil
}

func (s *AddressBookService) canProxyCustomerAddressBook(role int) bool {
	return role == int(models.RoleCourier) || role == int(models.RoleSiteManager) || role == int(models.RoleAdmin)
}

func (s *AddressBookService) toAddressBookItem(record models.UserAddress) dto.AddressBookItem {
	return dto.AddressBookItem{
		ID:              record.ID,
		UserID:          record.UserID,
		Label:           record.Label,
		AddressType:     string(record.AddressType),
		AddressTypeName: s.addressTypeName(record.AddressType),
		ContactName:     record.ContactName,
		ContactPhone:    record.ContactPhone,
		Country:         record.Country,
		Province:        record.Province,
		City:            record.City,
		Address:         record.Address,
		Postcode:        record.Postcode,
		Remark:          record.Remark,
		IsDefault:       record.IsDefault,
		CTime:           record.CTime,
		MTime:           record.MTime,
	}
}

func (s *AddressBookService) addressTypeName(addressType models.UserAddressType) string {
	switch addressType {
	case models.UserAddressTypeSender:
		return "发件地址"
	case models.UserAddressTypeReceiver:
		return "收件地址"
	default:
		return "地址"
	}
}
