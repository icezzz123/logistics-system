package services

import (
	"errors"
	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"
	"regexp"
	"strings"

	"gorm.io/gorm"
)

// UserService 用户服务
type UserService struct{}

// NewUserService 创建用户服务实例
func NewUserService() *UserService {
	return &UserService{}
}

// Register 用户注册
func (s *UserService) Register(req *dto.RegisterRequest) (*models.User, error) {
	// 1. 参数验证
	if err := s.validateRegisterParams(req); err != nil {
		return nil, err
	}

	// 2. 检查用户名是否已存在
	var existUser models.User
	err := database.DB.Where("username = ?", req.Username).First(&existUser).Error
	if err == nil {
		return nil, errors.New("用户名已存在")
	}
	if err != gorm.ErrRecordNotFound {
		return nil, errors.New("数据库查询失败")
	}

	// 3. 检查邮箱是否已被使用（如果提供了邮箱）
	if req.Email != "" {
		err = database.DB.Where("email = ? AND email != ''", req.Email).First(&existUser).Error
		if err == nil {
			return nil, errors.New("邮箱已被使用")
		}
		if err != gorm.ErrRecordNotFound {
			return nil, errors.New("数据库查询失败")
		}
	}

	// 4. 检查手机号是否已被使用（如果提供了手机号）
	if req.Phone != "" {
		err = database.DB.Where("phone = ? AND phone != ''", req.Phone).First(&existUser).Error
		if err == nil {
			return nil, errors.New("手机号已被使用")
		}
		if err != gorm.ErrRecordNotFound {
			return nil, errors.New("数据库查询失败")
		}
	}

	// 5. 加密密码
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("密码加密失败")
	}

	// 6. 创建用户
	// 设置角色：如果请求中指定了角色且有效，则使用指定角色；否则默认为客户
	role := models.RoleCustomer // 默认为客户
	if req.Role > 0 && config.IsValidRole(req.Role) {
		role = models.UserRole(req.Role)
	}

	user := &models.User{
		Username: strings.TrimSpace(req.Username),
		Password: hashedPassword,
		Email:    strings.TrimSpace(req.Email),
		Phone:    strings.TrimSpace(req.Phone),
		RealName: strings.TrimSpace(req.RealName),
		Role:     role,
		Status:   1, // 默认启用
	}

	if err := database.DB.Create(user).Error; err != nil {
		return nil, errors.New("用户创建失败")
	}

	// 7. 清除密码字段，避免返回
	user.Password = ""

	return user, nil
}

// validateRegisterParams 验证注册参数
func (s *UserService) validateRegisterParams(req *dto.RegisterRequest) error {
	// 用户名验证
	if len(req.Username) < 3 {
		return errors.New("用户名长度不能少于3个字符")
	}
	if len(req.Username) > 50 {
		return errors.New("用户名长度不能超过50个字符")
	}
	// 用户名只能包含字母、数字、下划线
	if matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]+$`, req.Username); !matched {
		return errors.New("用户名只能包含字母、数字和下划线")
	}

	// 密码验证
	if len(req.Password) < 6 {
		return errors.New("密码长度不能少于6个字符")
	}
	if len(req.Password) > 50 {
		return errors.New("密码长度不能超过50个字符")
	}

	// 邮箱验证（如果提供）
	if req.Email != "" {
		emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
		if matched, _ := regexp.MatchString(emailRegex, req.Email); !matched {
			return errors.New("邮箱格式不正确")
		}
	}

	// 手机号验证（如果提供）
	if req.Phone != "" {
		// 支持中国大陆手机号格式
		phoneRegex := `^1[3-9]\d{9}$`
		if matched, _ := regexp.MatchString(phoneRegex, req.Phone); !matched {
			return errors.New("手机号格式不正确")
		}
	}

	// 真实姓名验证（如果提供）
	if req.RealName != "" && len(req.RealName) > 50 {
		return errors.New("真实姓名长度不能超过50个字符")
	}

	return nil
}

// Login 用户登录
func (s *UserService) Login(req *dto.LoginRequest) (*models.User, string, error) {
	// 1. 参数验证
	if strings.TrimSpace(req.Username) == "" {
		return nil, "", errors.New("用户名不能为空")
	}
	if strings.TrimSpace(req.Password) == "" {
		return nil, "", errors.New("密码不能为空")
	}

	// 2. 查找用户
	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, "", errors.New("用户名或密码错误")
		}
		return nil, "", errors.New("数据库查询失败")
	}

	// 3. 验证密码
	if !utils.CheckPassword(req.Password, user.Password) {
		return nil, "", errors.New("用户名或密码错误")
	}

	// 4. 检查用户状态
	if user.Status != 1 {
		return nil, "", errors.New("账号已被禁用，请联系管理员")
	}

	// 5. 生成token
	token, err := utils.GenerateToken(user.ID, user.Username, int(user.Role), 24*3600)
	if err != nil {
		return nil, "", errors.New("生成令牌失败")
	}

	// 6. 清除密码字段
	user.Password = ""

	return &user, token, nil
}

// GetUserByID 根据ID获取用户
func (s *UserService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("用户不存在")
		}
		return nil, errors.New("数据库查询失败")
	}

	// 清除密码字段
	user.Password = ""

	return &user, nil
}

// GetUserList 获取用户列表（支持分页、搜索、筛选）
func (s *UserService) GetUserList(req *dto.UserListRequest) (*dto.UserListResponse, error) {
	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100 // 限制最大每页数量
	}

	var users []models.User
	var total int64

	query := database.DB.Model(&models.User{})

	// 关键词搜索（用户名、邮箱、手机号、真实姓名）
	if req.Keyword != "" {
		keyword := "%" + strings.TrimSpace(req.Keyword) + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR phone LIKE ? OR real_name LIKE ?",
			keyword, keyword, keyword, keyword)
	}

	// 按角色筛选
	if req.Role > 0 {
		query = query.Where("role = ?", req.Role)
	}

	// 按状态筛选（只有明确传入status参数时才筛选）
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询用户总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("id DESC").Offset(offset).Limit(req.PageSize).Find(&users).Error; err != nil {
		return nil, errors.New("查询用户列表失败")
	}

	// 转换为DTO
	userList := make([]dto.UserInfo, 0, len(users))
	for _, user := range users {
		userList = append(userList, dto.UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Phone:    user.Phone,
			RealName: user.RealName,
			Role:     int(user.Role),
			RoleName: config.GetRoleName(int(user.Role)),
			Status:   user.Status,
			CTime:    utils.FormatTimestamp(user.CTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.UserListResponse{
		List:     userList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// UpdateUserRole 更新用户角色
func (s *UserService) UpdateUserRole(userID uint, newRole int) error {
	// 验证角色是否有效
	if !config.IsValidRole(newRole) {
		return errors.New("无效的角色ID")
	}

	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("用户不存在")
		}
		return errors.New("数据库查询失败")
	}

	// 更新角色
	if err := database.DB.Model(&user).Update("role", newRole).Error; err != nil {
		return errors.New("更新角色失败")
	}

	return nil
}

// UpdateUserStatus 更新用户状态
func (s *UserService) UpdateUserStatus(userID uint, status int) error {
	// 验证状态值
	if status != 0 && status != 1 {
		return errors.New("无效的状态值")
	}

	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("用户不存在")
		}
		return errors.New("数据库查询失败")
	}

	// 更新状态
	if err := database.DB.Model(&user).Update("status", status).Error; err != nil {
		return errors.New("更新状态失败")
	}

	return nil
}

// UpdateUserInfo 更新用户信息
func (s *UserService) UpdateUserInfo(userID uint, req *dto.UpdateUserRequest) error {
	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("用户不存在")
		}
		return errors.New("数据库查询失败")
	}

	// 验证邮箱格式（如果提供）
	if req.Email != "" {
		emailRegex := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
		if matched, _ := regexp.MatchString(emailRegex, req.Email); !matched {
			return errors.New("邮箱格式不正确")
		}

		// 检查邮箱是否已被使用
		var existUser models.User
		err := database.DB.Where("email = ? AND email != '' AND id != ?", req.Email, userID).First(&existUser).Error
		if err == nil {
			return errors.New("邮箱已被使用")
		}
	}

	// 验证手机号格式（如果提供）
	if req.Phone != "" {
		phoneRegex := `^1[3-9]\d{9}$`
		if matched, _ := regexp.MatchString(phoneRegex, req.Phone); !matched {
			return errors.New("手机号格式不正确")
		}

		// 检查手机号是否已被使用
		var existUser models.User
		err := database.DB.Where("phone = ? AND phone != '' AND id != ?", req.Phone, userID).First(&existUser).Error
		if err == nil {
			return errors.New("手机号已被使用")
		}
	}

	// 更新用户信息
	updates := map[string]interface{}{}
	if req.Email != "" {
		updates["email"] = strings.TrimSpace(req.Email)
	}
	if req.Phone != "" {
		updates["phone"] = strings.TrimSpace(req.Phone)
	}
	if req.RealName != "" {
		updates["real_name"] = strings.TrimSpace(req.RealName)
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			return errors.New("更新用户信息失败")
		}
	}

	return nil
}

// ChangePassword 修改密码
func (s *UserService) ChangePassword(userID uint, req *dto.ChangePasswordRequest) error {
	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("用户不存在")
		}
		return errors.New("数据库查询失败")
	}

	// 验证旧密码
	if !utils.CheckPassword(req.OldPassword, user.Password) {
		return errors.New("原密码错误")
	}

	// 验证新密码
	if len(req.NewPassword) < 6 {
		return errors.New("新密码长度不能少于6个字符")
	}
	if len(req.NewPassword) > 50 {
		return errors.New("新密码长度不能超过50个字符")
	}

	// 加密新密码
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return errors.New("密码加密失败")
	}

	// 更新密码
	if err := database.DB.Model(&user).Update("password", hashedPassword).Error; err != nil {
		return errors.New("更新密码失败")
	}

	return nil
}

// DeleteUser 删除用户（软删除）
func (s *UserService) DeleteUser(userID uint) error {
	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("用户不存在")
		}
		return errors.New("数据库查询失败")
	}

	// 禁用用户（软删除）
	if err := database.DB.Model(&user).Update("status", 0).Error; err != nil {
		return errors.New("删除用户失败")
	}

	return nil
}

// GetCustomerOptions 获取可下单客户选项
func (s *UserService) GetCustomerOptions(req *dto.CustomerOptionRequest) (*dto.CustomerOptionListResponse, error) {
	if req.PageSize < 1 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var users []models.User
	var total int64

	query := database.DB.Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleCustomer, 1)

	if keyword := strings.TrimSpace(req.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ? OR email LIKE ?", like, like, like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询客户总数失败")
	}

	if err := query.Order("id DESC").Limit(req.PageSize).Find(&users).Error; err != nil {
		return nil, errors.New("查询客户列表失败")
	}

	result := make([]dto.CustomerOption, 0, len(users))
	for _, user := range users {
		displayName := strings.TrimSpace(user.RealName)
		if displayName == "" {
			displayName = user.Username
		}
		result = append(result, dto.CustomerOption{
			ID:          user.ID,
			Username:    user.Username,
			RealName:    user.RealName,
			Phone:       user.Phone,
			Email:       user.Email,
			DisplayName: displayName,
		})
	}

	return &dto.CustomerOptionListResponse{
		List:  result,
		Total: total,
	}, nil
}
