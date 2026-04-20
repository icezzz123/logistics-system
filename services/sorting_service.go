package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"

	"gorm.io/gorm"
)

type SortingService struct{}

func NewSortingService() *SortingService {
	return &SortingService{}
}

// CreateSortingRule 创建分拣规则
func (s *SortingService) CreateSortingRule(req *dto.CreateSortingRuleRequest) (*models.SortingRule, error) {
	db := database.DB

	// 验证站点是否存在
	var station models.Station
	if err := db.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("目标站点不存在或已禁用")
		}
		return nil, errors.New("查询站点信息失败")
	}

	// 检查规则名称是否重复
	var existingRule models.SortingRule
	if err := db.Where("rule_name = ?", req.RuleName).First(&existingRule).Error; err == nil {
		return nil, errors.New("规则名称已存在")
	}

	// 检查是否存在相同的地址规则（避免冲突）
	if err := s.checkRuleConflict(req.Country, req.Province, req.City, req.District, 0); err != nil {
		return nil, err
	}

	// 创建分拣规则
	rule := &models.SortingRule{
		RuleName:    strings.TrimSpace(req.RuleName),
		Country:     strings.TrimSpace(req.Country),
		Province:    strings.TrimSpace(req.Province),
		City:        strings.TrimSpace(req.City),
		District:    strings.TrimSpace(req.District),
		RouteCode:   strings.TrimSpace(req.RouteCode),
		StationID:   req.StationID,
		Priority:    req.Priority,
		Status:      1, // 默认启用
		Description: strings.TrimSpace(req.Description),
	}

	if err := db.Create(rule).Error; err != nil {
		return nil, errors.New("创建分拣规则失败")
	}

	return rule, nil
}

// GetSortingRuleByID 根据ID获取分拣规则
func (s *SortingService) GetSortingRuleByID(id uint) (*models.SortingRule, error) {
	var rule models.SortingRule
	if err := database.DB.First(&rule, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("分拣规则不存在")
		}
		return nil, errors.New("查询分拣规则失败")
	}
	return &rule, nil
}

// GetSortingRuleList 获取分拣规则列表
func (s *SortingService) GetSortingRuleList(req *dto.SortingRuleQueryRequest) (*dto.SortingRuleListResponse, error) {
	db := database.DB

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	var rules []models.SortingRule
	var total int64

	query := db.Model(&models.SortingRule{})

	// 按规则名称搜索
	if req.RuleName != "" {
		query = query.Where("rule_name LIKE ?", "%"+strings.TrimSpace(req.RuleName)+"%")
	}

	// 按国家筛选
	if req.Country != "" {
		query = query.Where("country = ?", strings.TrimSpace(req.Country))
	}

	// 按省份筛选
	if req.Province != "" {
		query = query.Where("province = ?", strings.TrimSpace(req.Province))
	}

	// 按城市筛选
	if req.City != "" {
		query = query.Where("city = ?", strings.TrimSpace(req.City))
	}

	// 按站点筛选
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	// 按状态筛选
	if req.Status >= 0 {
		query = query.Where("status = ?", req.Status)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询分拣规则总数失败")
	}

	// 分页查询，按优先级降序，创建时间降序
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("priority DESC, c_time DESC").Offset(offset).Limit(req.PageSize).Find(&rules).Error; err != nil {
		return nil, errors.New("查询分拣规则列表失败")
	}

	// 获取站点信息
	stationMap := make(map[uint]string)
	if len(rules) > 0 {
		var stationIDs []uint
		for _, rule := range rules {
			stationIDs = append(stationIDs, rule.StationID)
		}

		var stations []models.Station
		if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
			for _, station := range stations {
				stationMap[station.ID] = station.Name
			}
		}
	}

	// 转换为DTO
	ruleList := make([]dto.SortingRuleResponse, 0, len(rules))
	for _, rule := range rules {
		ruleList = append(ruleList, dto.SortingRuleResponse{
			ID:          rule.ID,
			RuleName:    rule.RuleName,
			Country:     rule.Country,
			Province:    rule.Province,
			City:        rule.City,
			District:    rule.District,
			RouteCode:   rule.RouteCode,
			StationID:   rule.StationID,
			StationName: stationMap[rule.StationID],
			Priority:    rule.Priority,
			Status:      rule.Status,
			StatusName:  s.getRuleStatusName(rule.Status),
			Description: rule.Description,
			CreateTime:  utils.FormatTimestamp(rule.CTime),
			UpdateTime:  utils.FormatTimestamp(rule.MTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.SortingRuleListResponse{
		List:     ruleList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// UpdateSortingRule 更新分拣规则
func (s *SortingService) UpdateSortingRule(id uint, req *dto.UpdateSortingRuleRequest) error {
	db := database.DB

	// 查询规则是否存在
	rule, err := s.GetSortingRuleByID(id)
	if err != nil {
		return err
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.RuleName != "" {
		// 检查规则名称是否重复（排除自己）
		var existingRule models.SortingRule
		if err := db.Where("rule_name = ? AND id != ?", req.RuleName, id).First(&existingRule).Error; err == nil {
			return errors.New("规则名称已存在")
		}
		updates["rule_name"] = strings.TrimSpace(req.RuleName)
	}

	if req.Country != "" {
		updates["country"] = strings.TrimSpace(req.Country)
	}

	if req.Province != "" {
		updates["province"] = strings.TrimSpace(req.Province)
	}

	if req.City != "" {
		updates["city"] = strings.TrimSpace(req.City)
	}

	if req.District != "" {
		updates["district"] = strings.TrimSpace(req.District)
	}

	if req.RouteCode != "" {
		updates["route_code"] = strings.TrimSpace(req.RouteCode)
	}

	if req.StationID > 0 {
		// 验证站点是否存在
		var station models.Station
		if err := db.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("目标站点不存在或已禁用")
			}
			return errors.New("查询站点信息失败")
		}
		updates["station_id"] = req.StationID
	}

	if req.Priority != rule.Priority {
		updates["priority"] = req.Priority
	}

	if req.Description != rule.Description {
		updates["description"] = strings.TrimSpace(req.Description)
	}

	// 如果没有要更新的字段
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	// 执行更新
	if err := db.Model(&models.SortingRule{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新分拣规则失败")
	}

	return nil
}

// UpdateSortingRuleStatus 更新分拣规则状态
func (s *SortingService) UpdateSortingRuleStatus(id uint, status int) error {
	// 查询规则是否存在
	_, err := s.GetSortingRuleByID(id)
	if err != nil {
		return err
	}

	// 更新状态
	if err := database.DB.Model(&models.SortingRule{}).Where("id = ?", id).Update("status", status).Error; err != nil {
		return errors.New("更新规则状态失败")
	}

	return nil
}

// DeleteSortingRule 删除分拣规则
func (s *SortingService) DeleteSortingRule(id uint) error {
	// 查询规则是否存在
	_, err := s.GetSortingRuleByID(id)
	if err != nil {
		return err
	}

	// 检查是否有分拣记录使用此规则
	var recordCount int64
	if err := database.DB.Model(&models.SortingRecord{}).Where("rule_id = ?", id).Count(&recordCount).Error; err != nil {
		return errors.New("查询分拣记录失败")
	}

	if recordCount > 0 {
		return errors.New("该规则已被使用，不能删除，建议禁用")
	}

	// 删除规则
	if err := database.DB.Delete(&models.SortingRule{}, id).Error; err != nil {
		return errors.New("删除分拣规则失败")
	}

	return nil
}

// MatchRoute 路由匹配算法
func (s *SortingService) MatchRoute(req *dto.RouteMatchRequest) (*dto.RouteMatchResponse, error) {
	db := database.DB

	// 查询所有启用的分拣规则，按优先级降序
	var rules []models.SortingRule
	if err := db.Where("status = 1").Order("priority DESC, c_time ASC").Find(&rules).Error; err != nil {
		return nil, errors.New("查询分拣规则失败")
	}

	response := &dto.RouteMatchResponse{
		Matched:     false,
		Suggestions: make([]dto.SortingRuleResponse, 0),
	}

	// 获取站点信息
	stationMap := make(map[uint]string)
	if len(rules) > 0 {
		var stationIDs []uint
		for _, rule := range rules {
			stationIDs = append(stationIDs, rule.StationID)
		}

		var stations []models.Station
		if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
			for _, station := range stations {
				stationMap[station.ID] = station.Name
			}
		}
	}

	// 匹配算法：按精确度从高到低匹配
	var matchedRule *models.SortingRule
	var matchLevel string

	// 1. 精确匹配（国家+省份+城市+区县）
	if req.District != "" {
		for _, rule := range rules {
			if s.exactMatch(rule, req.Country, req.Province, req.City, req.District) {
				matchedRule = &rule
				matchLevel = "exact"
				break
			}
		}
	}

	// 2. 城市级匹配（国家+省份+城市）
	if matchedRule == nil && req.City != "" {
		for _, rule := range rules {
			if s.cityMatch(rule, req.Country, req.Province, req.City) {
				matchedRule = &rule
				matchLevel = "city"
				break
			}
		}
	}

	// 3. 省份级匹配（国家+省份）
	if matchedRule == nil && req.Province != "" {
		for _, rule := range rules {
			if s.provinceMatch(rule, req.Country, req.Province) {
				matchedRule = &rule
				matchLevel = "province"
				break
			}
		}
	}

	// 4. 国家级匹配（国家）
	if matchedRule == nil {
		for _, rule := range rules {
			if s.countryMatch(rule, req.Country) {
				matchedRule = &rule
				matchLevel = "country"
				break
			}
		}
	}

	// 如果找到匹配规则
	if matchedRule != nil {
		response.Matched = true
		response.Rule = &dto.SortingRuleResponse{
			ID:          matchedRule.ID,
			RuleName:    matchedRule.RuleName,
			Country:     matchedRule.Country,
			Province:    matchedRule.Province,
			City:        matchedRule.City,
			District:    matchedRule.District,
			RouteCode:   matchedRule.RouteCode,
			StationID:   matchedRule.StationID,
			StationName: stationMap[matchedRule.StationID],
			Priority:    matchedRule.Priority,
			Status:      matchedRule.Status,
			StatusName:  s.getRuleStatusName(matchedRule.Status),
			Description: matchedRule.Description,
			CreateTime:  utils.FormatTimestamp(matchedRule.CTime),
			UpdateTime:  utils.FormatTimestamp(matchedRule.MTime),
		}
		response.RouteCode = matchedRule.RouteCode
		response.StationID = matchedRule.StationID
		response.StationName = stationMap[matchedRule.StationID]
		response.MatchLevel = matchLevel
	}

	// 提供建议规则（相似的规则）
	suggestions := s.findSimilarRules(rules, req, stationMap)
	response.Suggestions = suggestions

	return response, nil
}

// BatchMatchRoute 批量路由匹配
func (s *SortingService) BatchMatchRoute(req *dto.BatchRouteRequest) (*dto.BatchRouteResponse, error) {
	results := make([]dto.RouteMatchResponse, 0, len(req.Addresses))
	matched := 0

	for _, address := range req.Addresses {
		result, err := s.MatchRoute(&address)
		if err != nil {
			// 如果单个地址匹配失败，返回未匹配结果
			result = &dto.RouteMatchResponse{
				Matched:     false,
				Suggestions: make([]dto.SortingRuleResponse, 0),
			}
		}

		if result.Matched {
			matched++
		}

		results = append(results, *result)
	}

	total := len(req.Addresses)
	unmatched := total - matched
	matchRate := "0.0%"
	if total > 0 {
		matchRate = fmt.Sprintf("%.1f%%", float64(matched)/float64(total)*100)
	}

	return &dto.BatchRouteResponse{
		Results: results,
		Summary: dto.BatchRouteSummary{
			Total:     total,
			Matched:   matched,
			Unmatched: unmatched,
			MatchRate: matchRate,
		},
	}, nil
}

// GetSortingRuleStats 获取分拣规则统计
func (s *SortingService) GetSortingRuleStats() (*dto.SortingRuleStatsResponse, error) {
	db := database.DB

	response := &dto.SortingRuleStatsResponse{
		CountryStats:  make([]dto.CountryRuleStats, 0),
		StationStats:  make([]dto.StationRuleStats, 0),
		PriorityStats: make([]dto.PriorityRuleStats, 0),
	}

	// 总体统计
	var totalRules, enabledRules, disabledRules int64
	db.Model(&models.SortingRule{}).Count(&totalRules)
	db.Model(&models.SortingRule{}).Where("status = 1").Count(&enabledRules)
	db.Model(&models.SortingRule{}).Where("status = 0").Count(&disabledRules)

	response.TotalRules = int(totalRules)
	response.EnabledRules = int(enabledRules)
	response.DisabledRules = int(disabledRules)

	// 按国家统计
	var countryStats []struct {
		Country string `json:"country"`
		Count   int    `json:"count"`
	}
	db.Model(&models.SortingRule{}).
		Select("country, COUNT(*) as count").
		Group("country").
		Order("count DESC").
		Find(&countryStats)

	for _, stat := range countryStats {
		response.CountryStats = append(response.CountryStats, dto.CountryRuleStats{
			Country: stat.Country,
			Count:   stat.Count,
		})
	}

	// 按站点统计
	var stationStats []struct {
		StationID uint `json:"station_id"`
		Count     int  `json:"count"`
	}
	db.Model(&models.SortingRule{}).
		Select("station_id, COUNT(*) as count").
		Group("station_id").
		Order("count DESC").
		Find(&stationStats)

	// 获取站点名称
	stationMap := make(map[uint]string)
	if len(stationStats) > 0 {
		var stationIDs []uint
		for _, stat := range stationStats {
			stationIDs = append(stationIDs, stat.StationID)
		}

		var stations []models.Station
		if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
			for _, station := range stations {
				stationMap[station.ID] = station.Name
			}
		}
	}

	for _, stat := range stationStats {
		response.StationStats = append(response.StationStats, dto.StationRuleStats{
			StationID:   stat.StationID,
			StationName: stationMap[stat.StationID],
			Count:       stat.Count,
		})
	}

	// 按优先级统计
	var priorityStats []struct {
		Priority int `json:"priority"`
		Count    int `json:"count"`
	}
	db.Model(&models.SortingRule{}).
		Select("priority, COUNT(*) as count").
		Group("priority").
		Order("priority DESC").
		Find(&priorityStats)

	// 将优先级分组
	priorityGroups := map[string]int{
		"高优先级(≥100)":  0,
		"中优先级(10-99)": 0,
		"低优先级(1-9)":   0,
		"默认优先级(0)":    0,
		"负优先级(<0)":    0,
	}

	for _, stat := range priorityStats {
		switch {
		case stat.Priority >= 100:
			priorityGroups["高优先级(≥100)"] += stat.Count
		case stat.Priority >= 10:
			priorityGroups["中优先级(10-99)"] += stat.Count
		case stat.Priority >= 1:
			priorityGroups["低优先级(1-9)"] += stat.Count
		case stat.Priority == 0:
			priorityGroups["默认优先级(0)"] += stat.Count
		default:
			priorityGroups["负优先级(<0)"] += stat.Count
		}
	}

	for priority, count := range priorityGroups {
		if count > 0 {
			response.PriorityStats = append(response.PriorityStats, dto.PriorityRuleStats{
				Priority: priority,
				Count:    count,
			})
		}
	}

	return response, nil
}

// checkRuleConflict 检查规则冲突
func (s *SortingService) checkRuleConflict(country, province, city, district string, excludeID uint) error {
	db := database.DB

	query := db.Model(&models.SortingRule{}).Where("status = 1")

	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}

	// 检查是否存在完全相同的地址规则
	var existingRule models.SortingRule
	err := query.Where("country = ? AND province = ? AND city = ? AND district = ?",
		country, province, city, district).First(&existingRule).Error

	if err == nil {
		return fmt.Errorf("已存在相同地址的规则: %s", existingRule.RuleName)
	}

	if err != gorm.ErrRecordNotFound {
		return errors.New("检查规则冲突失败")
	}

	return nil
}

// exactMatch 精确匹配（国家+省份+城市+区县）
func (s *SortingService) exactMatch(rule models.SortingRule, country, province, city, district string) bool {
	return strings.EqualFold(rule.Country, country) &&
		strings.EqualFold(rule.Province, province) &&
		strings.EqualFold(rule.City, city) &&
		strings.EqualFold(rule.District, district)
}

// cityMatch 城市级匹配（国家+省份+城市，区县为空）
func (s *SortingService) cityMatch(rule models.SortingRule, country, province, city string) bool {
	return strings.EqualFold(rule.Country, country) &&
		strings.EqualFold(rule.Province, province) &&
		strings.EqualFold(rule.City, city) &&
		rule.District == ""
}

// provinceMatch 省份级匹配（国家+省份，城市和区县为空）
func (s *SortingService) provinceMatch(rule models.SortingRule, country, province string) bool {
	return strings.EqualFold(rule.Country, country) &&
		strings.EqualFold(rule.Province, province) &&
		rule.City == "" &&
		rule.District == ""
}

// countryMatch 国家级匹配（国家，省份、城市、区县为空）
func (s *SortingService) countryMatch(rule models.SortingRule, country string) bool {
	return strings.EqualFold(rule.Country, country) &&
		rule.Province == "" &&
		rule.City == "" &&
		rule.District == ""
}

// findSimilarRules 查找相似规则
func (s *SortingService) findSimilarRules(rules []models.SortingRule, req *dto.RouteMatchRequest, stationMap map[uint]string) []dto.SortingRuleResponse {
	var suggestions []dto.SortingRuleResponse

	// 查找同国家的规则作为建议
	for _, rule := range rules {
		if strings.EqualFold(rule.Country, req.Country) && len(suggestions) < 5 {
			suggestions = append(suggestions, dto.SortingRuleResponse{
				ID:          rule.ID,
				RuleName:    rule.RuleName,
				Country:     rule.Country,
				Province:    rule.Province,
				City:        rule.City,
				District:    rule.District,
				RouteCode:   rule.RouteCode,
				StationID:   rule.StationID,
				StationName: stationMap[rule.StationID],
				Priority:    rule.Priority,
				Status:      rule.Status,
				StatusName:  s.getRuleStatusName(rule.Status),
				Description: rule.Description,
				CreateTime:  utils.FormatTimestamp(rule.CTime),
				UpdateTime:  utils.FormatTimestamp(rule.MTime),
			})
		}
	}

	return suggestions
}

// getRuleStatusName 获取规则状态名称
func (s *SortingService) getRuleStatusName(status int) string {
	switch status {
	case 1:
		return "启用"
	case 0:
		return "禁用"
	default:
		return "未知"
	}
}

// generateTaskNo 生成任务编号
func (s *SortingService) generateTaskNo() string {
	return fmt.Sprintf("ST%d", time.Now().Unix())
}

// CreateSortingTask 创建分拣任务
func (s *SortingService) CreateSortingTask(req *dto.CreateSortingTaskRequest) (*models.SortingTask, error) {
	db := database.DB

	// 验证站点是否存在
	var station models.Station
	if err := db.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("站点不存在或已禁用")
		}
		return nil, errors.New("查询站点信息失败")
	}

	// 如果指定了分拣员，验证分拣员是否存在
	if req.AssignedTo > 0 {
		var sorter models.User
		if err := db.Where("id = ? AND role >= 2", req.AssignedTo).First(&sorter).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("指定的分拣员不存在或权限不足")
			}
			return nil, errors.New("查询分拣员信息失败")
		}
	}

	// 创建分拣任务
	task := &models.SortingTask{
		TaskNo:     s.generateTaskNo(),
		StationID:  req.StationID,
		AssignedTo: req.AssignedTo,
		TotalCount: req.TotalCount,
		Status:     "pending",
		Remark:     strings.TrimSpace(req.Remark),
	}

	if err := db.Create(task).Error; err != nil {
		return nil, errors.New("创建分拣任务失败")
	}

	return task, nil
}

// GetSortingTaskByID 根据ID获取分拣任务
func (s *SortingService) GetSortingTaskByID(id uint) (*models.SortingTask, error) {
	var task models.SortingTask
	if err := database.DB.First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("分拣任务不存在")
		}
		return nil, errors.New("查询分拣任务失败")
	}
	return &task, nil
}

// GetSortingTaskList 获取分拣任务列表
func (s *SortingService) GetSortingTaskList(req *dto.SortingTaskQueryRequest) (*dto.SortingTaskListResponse, error) {
	db := database.DB

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	var tasks []models.SortingTask
	var total int64

	query := db.Model(&models.SortingTask{})

	// 按任务编号搜索
	if req.TaskNo != "" {
		query = query.Where("task_no LIKE ?", "%"+strings.TrimSpace(req.TaskNo)+"%")
	}

	// 按站点筛选
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	// 按分拣员筛选
	if req.AssignedTo > 0 {
		query = query.Where("assigned_to = ?", req.AssignedTo)
	}

	// 按状态筛选
	if req.Status != "" {
		query = query.Where("status = ?", strings.TrimSpace(req.Status))
	}

	// 按时间范围筛选
	if req.StartTime > 0 {
		query = query.Where("c_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("c_time <= ?", req.EndTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询分拣任务总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&tasks).Error; err != nil {
		return nil, errors.New("查询分拣任务列表失败")
	}

	// 获取关联信息
	stationMap := make(map[uint]string)
	sorterMap := make(map[uint]string)

	if len(tasks) > 0 {
		// 获取站点信息
		var stationIDs []uint
		var sorterIDs []uint

		for _, task := range tasks {
			stationIDs = append(stationIDs, task.StationID)
			if task.AssignedTo > 0 {
				sorterIDs = append(sorterIDs, task.AssignedTo)
			}
		}

		// 查询站点
		if len(stationIDs) > 0 {
			var stations []models.Station
			if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
				for _, station := range stations {
					stationMap[station.ID] = station.Name
				}
			}
		}

		// 查询分拣员
		if len(sorterIDs) > 0 {
			var sorters []models.User
			if err := db.Where("id IN ?", sorterIDs).Find(&sorters).Error; err == nil {
				for _, sorter := range sorters {
					name := sorter.RealName
					if name == "" {
						name = sorter.Username
					}
					sorterMap[sorter.ID] = name
				}
			}
		}
	}

	// 转换为DTO
	taskList := make([]dto.SortingTaskResponse, 0, len(tasks))
	for _, task := range tasks {
		progress := float64(0)
		if task.TotalCount > 0 {
			progress = float64(task.SortedCount) / float64(task.TotalCount) * 100
		}

		duration := int64(0)
		if task.StartTime > 0 && task.EndTime > 0 {
			duration = task.EndTime - task.StartTime
		}

		taskList = append(taskList, dto.SortingTaskResponse{
			ID:           task.ID,
			TaskNo:       task.TaskNo,
			StationID:    task.StationID,
			StationName:  stationMap[task.StationID],
			AssignedTo:   task.AssignedTo,
			AssignedName: sorterMap[task.AssignedTo],
			TotalCount:   task.TotalCount,
			SortedCount:  task.SortedCount,
			Progress:     progress,
			Status:       task.Status,
			StatusName:   s.getTaskStatusName(task.Status),
			StartTime:    task.StartTime,
			EndTime:      task.EndTime,
			Duration:     duration,
			Remark:       task.Remark,
			CreateTime:   utils.FormatTimestamp(task.CTime),
			UpdateTime:   utils.FormatTimestamp(task.MTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.SortingTaskListResponse{
		List:     taskList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// UpdateSortingTask 更新分拣任务
func (s *SortingService) UpdateSortingTask(id uint, req *dto.UpdateSortingTaskRequest) error {
	db := database.DB

	// 查询任务是否存在
	task, err := s.GetSortingTaskByID(id)
	if err != nil {
		return err
	}

	// 检查任务状态，已完成或已取消的任务不能修改
	if task.Status == "completed" || task.Status == "cancelled" {
		return errors.New("已完成或已取消的任务不能修改")
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.AssignedTo != task.AssignedTo {
		// 如果指定了分拣员，验证分拣员是否存在
		if req.AssignedTo > 0 {
			var sorter models.User
			if err := db.Where("id = ? AND role >= 2", req.AssignedTo).First(&sorter).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return errors.New("指定的分拣员不存在或权限不足")
				}
				return errors.New("查询分拣员信息失败")
			}
		}
		updates["assigned_to"] = req.AssignedTo
	}

	if req.TotalCount != task.TotalCount {
		updates["total_count"] = req.TotalCount
	}

	if req.Remark != task.Remark {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	// 如果没有要更新的字段
	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	// 执行更新
	if err := db.Model(&models.SortingTask{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新分拣任务失败")
	}

	return nil
}

// UpdateSortingTaskStatus 更新分拣任务状态
func (s *SortingService) UpdateSortingTaskStatus(id uint, req *dto.SortingTaskStatusRequest) error {
	db := database.DB

	// 查询任务是否存在
	task, err := s.GetSortingTaskByID(id)
	if err != nil {
		return err
	}

	// 状态转换验证
	if !s.isValidTaskStatusTransition(task.Status, req.Status) {
		return errors.New("无效的状态转换")
	}

	// 构建更新数据
	updates := map[string]interface{}{
		"status": req.Status,
	}

	if req.Remark != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	// 根据状态设置时间
	now := time.Now().Unix()
	switch req.Status {
	case "processing":
		if task.StartTime == 0 {
			updates["start_time"] = now
		}
	case "completed":
		if task.EndTime == 0 {
			updates["end_time"] = now
		}
	}

	// 执行更新
	if err := db.Model(&models.SortingTask{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新分拣任务状态失败")
	}

	return nil
}

// SortingScan 分拣扫描功能
func (s *SortingService) SortingScan(req *dto.SortingScanRequest, sorterID uint) (*dto.SortingScanResponse, error) {
	db := database.DB

	var order models.Order
	switch {
	case strings.TrimSpace(req.OrderNo) != "":
		if err := db.Where("order_no = ?", strings.TrimSpace(req.OrderNo)).First(&order).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("订单不存在")
			}
			return nil, errors.New("查询订单失败")
		}
	case req.OrderID > 0:
		if err := db.First(&order, req.OrderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("订单不存在")
			}
			return nil, errors.New("查询订单失败")
		}
	default:
		return nil, errors.New("请提供订单号")
	}

	// 验证站点是否存在
	var station models.Station
	if err := db.Where("id = ? AND status = 1", req.StationID).First(&station).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("站点不存在或已禁用")
		}
		return nil, errors.New("查询站点信息失败")
	}

	// 检查是否已经扫描过
	var existingRecord models.SortingRecord
	if err := db.Where("order_id = ? AND station_id = ?", order.ID, req.StationID).First(&existingRecord).Error; err == nil {
		return nil, errors.New("该订单在此站点已扫描过")
	}

	// 进行路由匹配
	routeReq := &dto.RouteMatchRequest{
		Country:  order.ReceiverCountry,
		Province: order.ReceiverProvince,
		City:     order.ReceiverCity,
		District: "", // Order模型中没有区县字段
	}

	routeResult, err := s.MatchRoute(routeReq)
	if err != nil {
		return nil, errors.New("路由匹配失败: " + err.Error())
	}

	// 创建分拣记录
	record := &models.SortingRecord{
		TaskID:    req.TaskID,
		OrderID:   order.ID,
		StationID: req.StationID,
		SorterID:  sorterID,
		ScanTime:  time.Now().Unix(),
		IsCorrect: 1, // 默认正确
		Remark:    strings.TrimSpace(req.Remark),
	}

	if routeResult.Matched {
		record.RuleID = routeResult.Rule.ID
		record.RouteCode = routeResult.RouteCode
		record.TargetStation = routeResult.StationID
	}

	// 保存分拣记录
	if err := db.Create(record).Error; err != nil {
		return nil, errors.New("创建分拣记录失败")
	}

	// 如果指定了任务ID，更新任务进度
	if req.TaskID > 0 {
		s.updateTaskProgress(req.TaskID)
	}

	// 构建响应
	response := &dto.SortingScanResponse{
		RecordID:     record.ID,
		OrderID:      order.ID,
		OrderNo:      order.OrderNo,
		RouteMatched: routeResult.Matched,
		Message:      "分拣扫描成功",
	}

	if routeResult.Matched {
		response.RouteCode = routeResult.RouteCode
		response.TargetStation = routeResult.StationID
		response.StationName = routeResult.StationName
		response.MatchLevel = routeResult.MatchLevel
		response.Rule = routeResult.Rule
		response.Message = fmt.Sprintf("分拣成功，目标站点：%s", routeResult.StationName)
	} else {
		response.Suggestions = routeResult.Suggestions
		response.Message = "未找到匹配的路由规则，请手动处理"
	}

	return response, nil
}

// GetSortingRecordList 获取分拣记录列表
func (s *SortingService) GetSortingRecordList(req *dto.SortingRecordQueryRequest) (*dto.SortingRecordListResponse, error) {
	db := database.DB

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	var records []models.SortingRecord
	var total int64

	query := db.Model(&models.SortingRecord{})

	// 按任务ID筛选
	if req.TaskID > 0 {
		query = query.Where("task_id = ?", req.TaskID)
	}

	// 按订单ID筛选
	if req.OrderID > 0 {
		query = query.Where("order_id = ?", req.OrderID)
	}

	// 按站点筛选
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	// 按目标站点筛选
	if req.TargetStation > 0 {
		query = query.Where("target_station = ?", req.TargetStation)
	}

	// 按分拣员筛选
	if req.SorterID > 0 {
		query = query.Where("sorter_id = ?", req.SorterID)
	}

	// 按路由代码筛选
	if req.RouteCode != "" {
		query = query.Where("route_code = ?", strings.TrimSpace(req.RouteCode))
	}

	// 按正确性筛选（-1表示全部，0和1表示具体状态）
	if req.IsCorrect != -1 {
		query = query.Where("is_correct = ?", req.IsCorrect)
	}

	// 按时间范围筛选
	if req.StartTime > 0 {
		query = query.Where("scan_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("scan_time <= ?", req.EndTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询分拣记录总数失败")
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("scan_time DESC").Offset(offset).Limit(req.PageSize).Find(&records).Error; err != nil {
		return nil, errors.New("查询分拣记录列表失败")
	}

	// 获取关联信息
	taskMap := make(map[uint]string)
	orderMap := make(map[uint]string)
	stationMap := make(map[uint]string)
	ruleMap := make(map[uint]string)
	sorterMap := make(map[uint]string)

	if len(records) > 0 {
		var taskIDs, orderIDs, stationIDs, ruleIDs, sorterIDs []uint

		for _, record := range records {
			if record.TaskID > 0 {
				taskIDs = append(taskIDs, record.TaskID)
			}
			orderIDs = append(orderIDs, record.OrderID)
			stationIDs = append(stationIDs, record.StationID)
			if record.TargetStation > 0 {
				stationIDs = append(stationIDs, record.TargetStation)
			}
			if record.RuleID > 0 {
				ruleIDs = append(ruleIDs, record.RuleID)
			}
			sorterIDs = append(sorterIDs, record.SorterID)
		}

		// 查询任务
		if len(taskIDs) > 0 {
			var tasks []models.SortingTask
			if err := db.Where("id IN ?", taskIDs).Find(&tasks).Error; err == nil {
				for _, task := range tasks {
					taskMap[task.ID] = task.TaskNo
				}
			}
		}

		// 查询订单
		if len(orderIDs) > 0 {
			var orders []models.Order
			if err := db.Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
				for _, order := range orders {
					orderMap[order.ID] = order.OrderNo
				}
			}
		}

		// 查询站点
		if len(stationIDs) > 0 {
			var stations []models.Station
			if err := db.Where("id IN ?", stationIDs).Find(&stations).Error; err == nil {
				for _, station := range stations {
					stationMap[station.ID] = station.Name
				}
			}
		}

		// 查询规则
		if len(ruleIDs) > 0 {
			var rules []models.SortingRule
			if err := db.Where("id IN ?", ruleIDs).Find(&rules).Error; err == nil {
				for _, rule := range rules {
					ruleMap[rule.ID] = rule.RuleName
				}
			}
		}

		// 查询分拣员
		if len(sorterIDs) > 0 {
			var sorters []models.User
			if err := db.Where("id IN ?", sorterIDs).Find(&sorters).Error; err == nil {
				for _, sorter := range sorters {
					name := sorter.RealName
					if name == "" {
						name = sorter.Username
					}
					sorterMap[sorter.ID] = name
				}
			}
		}
	}

	// 转换为DTO
	recordList := make([]dto.SortingRecordResponse, 0, len(records))
	for _, record := range records {
		recordList = append(recordList, dto.SortingRecordResponse{
			ID:             record.ID,
			TaskID:         record.TaskID,
			TaskNo:         taskMap[record.TaskID],
			OrderID:        record.OrderID,
			OrderNo:        orderMap[record.OrderID],
			StationID:      record.StationID,
			StationName:    stationMap[record.StationID],
			RuleID:         record.RuleID,
			RuleName:       ruleMap[record.RuleID],
			RouteCode:      record.RouteCode,
			TargetStation:  record.TargetStation,
			TargetName:     stationMap[record.TargetStation],
			SorterID:       record.SorterID,
			SorterName:     sorterMap[record.SorterID],
			ScanTime:       record.ScanTime,
			ScanTimeFormat: utils.FormatTimestamp(record.ScanTime),
			IsCorrect:      record.IsCorrect,
			IsCorrectName:  s.getCorrectStatusName(record.IsCorrect),
			Remark:         record.Remark,
			CreateTime:     utils.FormatTimestamp(record.CTime),
			UpdateTime:     utils.FormatTimestamp(record.MTime),
		})
	}

	// 计算总页数
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.SortingRecordListResponse{
		List:     recordList,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

// GetSortingStats 获取分拣统计
func (s *SortingService) GetSortingStats() (*dto.SortingStatsResponse, error) {
	db := database.DB

	stats := &dto.SortingStatsResponse{}

	// 任务统计
	var taskStats dto.SortingTaskStatsData
	var totalTasks, pendingTasks, processingTasks, completedTasks, cancelledTasks int64
	var totalItems, sortedItems int64

	db.Model(&models.SortingTask{}).Count(&totalTasks)
	db.Model(&models.SortingTask{}).Where("status = 'pending'").Count(&pendingTasks)
	db.Model(&models.SortingTask{}).Where("status = 'processing'").Count(&processingTasks)
	db.Model(&models.SortingTask{}).Where("status = 'completed'").Count(&completedTasks)
	db.Model(&models.SortingTask{}).Where("status = 'cancelled'").Count(&cancelledTasks)

	db.Model(&models.SortingTask{}).Select("COALESCE(SUM(total_count), 0)").Scan(&totalItems)
	db.Model(&models.SortingTask{}).Select("COALESCE(SUM(sorted_count), 0)").Scan(&sortedItems)

	avgProgress := float64(0)
	if totalItems > 0 {
		avgProgress = float64(sortedItems) / float64(totalItems) * 100
	}

	taskStats.TotalTasks = int(totalTasks)
	taskStats.PendingTasks = int(pendingTasks)
	taskStats.ProcessingTasks = int(processingTasks)
	taskStats.CompletedTasks = int(completedTasks)
	taskStats.CancelledTasks = int(cancelledTasks)
	taskStats.AvgProgress = avgProgress
	taskStats.TotalItems = int(totalItems)
	taskStats.SortedItems = int(sortedItems)
	stats.TaskStats = taskStats

	// 记录统计
	var recordStats dto.SortingRecordStatsData
	var totalRecords, correctRecords, errorRecords int64

	db.Model(&models.SortingRecord{}).Count(&totalRecords)
	db.Model(&models.SortingRecord{}).Where("is_correct = 1").Count(&correctRecords)
	db.Model(&models.SortingRecord{}).Where("is_correct = 0").Count(&errorRecords)

	accuracyRate := "0.0%"
	if totalRecords > 0 {
		accuracyRate = fmt.Sprintf("%.1f%%", float64(correctRecords)/float64(totalRecords)*100)
	}

	recordStats.TotalRecords = int(totalRecords)
	recordStats.CorrectRecords = int(correctRecords)
	recordStats.ErrorRecords = int(errorRecords)
	recordStats.AccuracyRate = accuracyRate
	stats.RecordStats = recordStats

	// 分拣员统计
	var sorterStats []dto.SorterStatsData
	sorterRows, err := db.Raw(`
		SELECT 
			r.sorter_id,
			u.real_name as sorter_name,
			COUNT(DISTINCT r.task_id) as task_count,
			COUNT(*) as record_count,
			SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
			SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) as error_count
		FROM sorting_records r
		LEFT JOIN users u ON r.sorter_id = u.id
		GROUP BY r.sorter_id, u.real_name
		ORDER BY record_count DESC
		LIMIT 10
	`).Rows()
	if err == nil {
		defer sorterRows.Close()
		for sorterRows.Next() {
			var stat dto.SorterStatsData
			sorterRows.Scan(&stat.SorterID, &stat.SorterName, &stat.TaskCount,
				&stat.RecordCount, &stat.CorrectCount, &stat.ErrorCount)

			if stat.SorterName == "" {
				stat.SorterName = "未知分拣员"
			}

			if stat.RecordCount > 0 {
				stat.AccuracyRate = fmt.Sprintf("%.1f%%",
					float64(stat.CorrectCount)/float64(stat.RecordCount)*100)
			} else {
				stat.AccuracyRate = "0.0%"
			}

			sorterStats = append(sorterStats, stat)
		}
	}
	stats.SorterStats = sorterStats

	// 站点统计
	var stationStats []dto.StationSortingStats
	stationRows, err := db.Raw(`
		SELECT 
			r.station_id,
			s.name as station_name,
			COUNT(DISTINCT r.task_id) as task_count,
			COUNT(*) as record_count,
			COUNT(*) as item_count
		FROM sorting_records r
		LEFT JOIN stations s ON r.station_id = s.id
		GROUP BY r.station_id, s.name
		ORDER BY record_count DESC
		LIMIT 10
	`).Rows()
	if err == nil {
		defer stationRows.Close()
		for stationRows.Next() {
			var stat dto.StationSortingStats
			stationRows.Scan(&stat.StationID, &stat.StationName,
				&stat.TaskCount, &stat.RecordCount, &stat.ItemCount)

			if stat.StationName == "" {
				stat.StationName = "未知站点"
			}

			stationStats = append(stationStats, stat)
		}
	}
	stats.StationStats = stationStats

	// 准确率统计
	var accuracyStats dto.SortingAccuracyStats
	accuracyStats.OverallRate = accuracyRate
	stats.AccuracyStats = accuracyStats

	return stats, nil
}

// updateTaskProgress 更新任务进度
func (s *SortingService) updateTaskProgress(taskID uint) {
	db := database.DB

	// 统计任务的分拣记录数
	var recordCount int64
	db.Model(&models.SortingRecord{}).Where("task_id = ?", taskID).Count(&recordCount)

	// 只更新已分拣数量，不修改总数量
	// 总数量应该在任务创建时或手动设置，而不是动态计算
	updates := map[string]interface{}{
		"sorted_count": recordCount,
	}

	db.Model(&models.SortingTask{}).Where("id = ?", taskID).Updates(updates)
}

// getTaskStatusName 获取任务状态名称
func (s *SortingService) getTaskStatusName(status string) string {
	switch status {
	case "pending":
		return "待处理"
	case "processing":
		return "处理中"
	case "completed":
		return "已完成"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}

// getCorrectStatusName 获取正确性状态名称
func (s *SortingService) getCorrectStatusName(isCorrect int) string {
	switch isCorrect {
	case 1:
		return "正确"
	case 0:
		return "错误"
	default:
		return "未知"
	}
}

// isValidTaskStatusTransition 验证任务状态转换是否有效
func (s *SortingService) isValidTaskStatusTransition(from, to string) bool {
	validTransitions := map[string][]string{
		"pending":    {"processing", "cancelled"},
		"processing": {"completed", "cancelled"},
		"completed":  {}, // 已完成不能转换到其他状态
		"cancelled":  {}, // 已取消不能转换到其他状态
	}

	allowedStates, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, state := range allowedStates {
		if state == to {
			return true
		}
	}
	return false
}
