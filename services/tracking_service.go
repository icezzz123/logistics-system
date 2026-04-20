package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"

	"gorm.io/gorm"
)

type TrackingService struct{}

func NewTrackingService() *TrackingService {
	return &TrackingService{}
}

func (s *TrackingService) CreateTrackingRecord(userID uint, userRole int, req *dto.CreateTrackingRecordRequest) (*dto.TrackingRecordInfo, error) {
	order, err := s.getAccessibleOrder(req.OrderID, userID, userRole)
	if err != nil {
		return nil, err
	}

	trackTime := req.TrackTime
	if trackTime <= 0 {
		trackTime = time.Now().Unix()
	}
	if trackTime > time.Now().Unix()+300 {
		return nil, errors.New("追踪时间不能晚于当前时间")
	}

	record := &models.TrackingRecord{
		OrderID:     order.ID,
		Location:    strings.TrimSpace(req.Location),
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		Status:      strings.TrimSpace(req.Status),
		Description: strings.TrimSpace(req.Description),
		OperatorID:  userID,
		CTime:       trackTime,
		MTime:       trackTime,
	}

	if err := database.DB.Create(record).Error; err != nil {
		return nil, errors.New("创建追踪记录失败")
	}

	var operator models.User
	if err := database.DB.Select("id,username,real_name").First(&operator, userID).Error; err != nil {
		return nil, errors.New("查询操作人信息失败")
	}

	info := s.buildTrackingRecordInfo(*record, *order, operator)
	return &info, nil
}

func (s *TrackingService) GetTrackingRecordList(userID uint, userRole int, req *dto.TrackingRecordQueryRequest) (*dto.TrackingRecordListResponse, error) {
	db := database.DB
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	query := db.Model(&models.TrackingRecord{})
	joinedOrder := false
	if userRole == 1 || req.OrderNo != "" {
		query = query.Joins("JOIN orders tracking_orders ON tracking_records.order_id = tracking_orders.id")
		joinedOrder = true
	}
	if userRole == 1 {
		query = query.Where("tracking_orders.customer_id = ?", userID)
	}
	if req.OrderID > 0 {
		order, err := s.getAccessibleOrder(req.OrderID, userID, userRole)
		if err != nil {
			if err.Error() == "订单不存在" || err.Error() == "无权查看此订单的追踪信息" {
				return s.emptyTrackingRecordListResponse(req.Page, req.PageSize), nil
			}
			return nil, err
		}
		query = query.Where("tracking_records.order_id = ?", order.ID)
	}
	if req.OrderNo != "" {
		if !joinedOrder {
			query = query.Joins("JOIN orders tracking_orders ON tracking_records.order_id = tracking_orders.id")
		}
		query = query.Where("tracking_orders.order_no = ?", strings.TrimSpace(req.OrderNo))
	}
	if req.Status != "" {
		query = query.Where("tracking_records.status = ?", strings.TrimSpace(req.Status))
	}
	if req.OperatorID > 0 {
		query = query.Where("tracking_records.operator_id = ?", req.OperatorID)
	}
	if req.StartTime > 0 {
		query = query.Where("tracking_records.c_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("tracking_records.c_time <= ?", req.EndTime)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询追踪记录总数失败")
	}

	var records []models.TrackingRecord
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("tracking_records.c_time DESC").Offset(offset).Limit(req.PageSize).Find(&records).Error; err != nil {
		return nil, errors.New("查询追踪记录失败")
	}
	if len(records) == 0 {
		return s.emptyTrackingRecordListResponse(req.Page, req.PageSize), nil
	}

	orderMap, operatorMap := s.loadTrackingOrderAndOperatorMaps(records)
	list := make([]dto.TrackingRecordInfo, 0, len(records))
	for _, record := range records {
		list = append(list, s.buildTrackingRecordInfo(record, orderMap[record.OrderID], operatorMap[record.OperatorID]))
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.TrackingRecordListResponse{List: list, Total: total, Page: req.Page, PageSize: req.PageSize, Pages: pages}, nil
}

func (s *TrackingService) GetTrackingRecordByID(id uint, userID uint, userRole int) (*dto.TrackingRecordInfo, error) {
	var record models.TrackingRecord
	if err := database.DB.First(&record, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("追踪记录不存在")
		}
		return nil, errors.New("查询追踪记录失败")
	}

	order, err := s.getAccessibleOrder(record.OrderID, userID, userRole)
	if err != nil {
		return nil, err
	}
	var operator models.User
	if err := database.DB.Select("id,username,real_name").Where("id = ?", record.OperatorID).First(&operator).Error; err != nil {
		operator = models.User{ID: record.OperatorID}
	}

	info := s.buildTrackingRecordInfo(record, *order, operator)
	return &info, nil
}

func (s *TrackingService) GetOrderTrackingHistory(orderID uint, userID uint, userRole int) (*dto.OrderTrackingHistoryResponse, error) {
	order, err := s.getAccessibleOrder(orderID, userID, userRole)
	if err != nil {
		return nil, err
	}

	var records []models.TrackingRecord
	if err := database.DB.Where("order_id = ?", order.ID).Order("c_time DESC").Find(&records).Error; err != nil {
		return nil, errors.New("查询订单追踪历史失败")
	}
	operatorMap := s.loadTrackingOperatorMap(records)
	list := make([]dto.TrackingRecordInfo, 0, len(records))
	for _, record := range records {
		list = append(list, s.buildTrackingRecordInfo(record, *order, operatorMap[record.OperatorID]))
	}

	return &dto.OrderTrackingHistoryResponse{
		OrderID:           order.ID,
		OrderNo:           order.OrderNo,
		CurrentStatus:     int(order.Status),
		CurrentStatusName: GetOrderStatusName(int(order.Status)),
		List:              list,
	}, nil
}

func (s *TrackingService) GetOrderTrackingTimeline(orderID uint, userID uint, userRole int) (*dto.TrackingTimelineResponse, error) {
	order, err := s.getAccessibleOrder(orderID, userID, userRole)
	if err != nil {
		return nil, err
	}

	var records []models.TrackingRecord
	if err := database.DB.Where("order_id = ?", order.ID).Order("c_time ASC").Find(&records).Error; err != nil {
		return nil, errors.New("查询追踪时间轴失败")
	}
	operatorMap := s.loadTrackingOperatorMap(records)
	timeline := make([]dto.TrackingTimelineItem, 0, len(records))
	latestLocation := ""
	latestTrackTime := int64(0)
	for _, record := range records {
		operator := operatorMap[record.OperatorID]
		item := dto.TrackingTimelineItem{
			RecordID:     record.ID,
			Status:       record.Status,
			Description:  record.Description,
			Location:     record.Location,
			Latitude:     record.Latitude,
			Longitude:    record.Longitude,
			OperatorID:   record.OperatorID,
			OperatorName: s.getUserDisplayName(operator),
			TrackTime:    record.CTime,
			DisplayTime:  utils.FormatTimestamp(record.CTime),
		}
		timeline = append(timeline, item)
		if record.CTime >= latestTrackTime {
			latestTrackTime = record.CTime
			latestLocation = record.Location
		}
	}

	expectedTime := s.getExpectedDeliveryTime(*order)
	isDelayed, delayHours := s.evaluateDelay(expectedTime)
	return &dto.TrackingTimelineResponse{
		OrderID:              order.ID,
		OrderNo:              order.OrderNo,
		CurrentStatus:        int(order.Status),
		CurrentStatusName:    GetOrderStatusName(int(order.Status)),
		ExpectedDeliveryTime: expectedTime,
		IsDelayed:            isDelayed,
		DelayHours:           delayHours,
		LatestLocation:       latestLocation,
		LatestTrackTime:      latestTrackTime,
		Timeline:             timeline,
	}, nil
}

func (s *TrackingService) GetTrackingWarnings(userID uint, userRole int, req *dto.TrackingWarningQueryRequest) (*dto.TrackingWarningListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}
	if req.WarningLevel != "" && req.WarningLevel != "warning" && req.WarningLevel != "critical" {
		return nil, errors.New("无效的预警级别")
	}
	if req.WarningType != "" && req.WarningType != "timeliness" && req.WarningType != "delay" && req.WarningType != "stale_update" {
		return nil, errors.New("无效的预警类型")
	}

	query := database.DB.Model(&models.Order{}).Where("status NOT IN ?", []models.OrderStatus{models.OrderSigned, models.OrderCancelled})
	if userRole == 1 {
		query = query.Where("customer_id = ?", userID)
	}
	if req.OrderNo != "" {
		query = query.Where("order_no = ?", strings.TrimSpace(req.OrderNo))
	}

	var orders []models.Order
	if err := query.Order("order_time DESC").Find(&orders).Error; err != nil {
		return nil, errors.New("查询预警订单失败")
	}
	if len(orders) == 0 {
		return &dto.TrackingWarningListResponse{List: []dto.TrackingWarningInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
	}

	orderIDs := make([]uint, 0, len(orders))
	for _, order := range orders {
		orderIDs = append(orderIDs, order.ID)
	}
	latestRecordMap := s.loadLatestTrackingRecordMap(orderIDs)

	warnings := make([]dto.TrackingWarningInfo, 0)
	var warningCount int64
	var criticalCount int64
	for _, order := range orders {
		latest, hasLatest := latestRecordMap[order.ID]
		warning, ok := s.buildTrackingWarningInfo(order, latest, hasLatest)
		if !ok {
			continue
		}
		if req.WarningLevel != "" && warning.WarningLevel != req.WarningLevel {
			continue
		}
		if req.WarningType != "" && warning.WarningType != req.WarningType {
			continue
		}
		if warning.WarningLevel == "warning" {
			warningCount++
		}
		if warning.WarningLevel == "critical" {
			criticalCount++
		}
		warnings = append(warnings, warning)
	}

	total := len(warnings)
	pages := 0
	if total > 0 {
		pages = total / req.PageSize
		if total%req.PageSize > 0 {
			pages++
		}
	}
	start := (req.Page - 1) * req.PageSize
	if start > total {
		start = total
	}
	end := start + req.PageSize
	if end > total {
		end = total
	}
	paged := warnings[start:end]

	return &dto.TrackingWarningListResponse{
		List:          paged,
		Total:         int64(total),
		Page:          req.Page,
		PageSize:      req.PageSize,
		Pages:         pages,
		WarningCount:  warningCount,
		CriticalCount: criticalCount,
	}, nil
}

func (s *TrackingService) getAccessibleOrder(orderID uint, userID uint, userRole int) (*models.Order, error) {
	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}
	if userRole == 1 && order.CustomerID != userID {
		return nil, errors.New("无权查看此订单的追踪信息")
	}
	return &order, nil
}

func (s *TrackingService) emptyTrackingRecordListResponse(page, pageSize int) *dto.TrackingRecordListResponse {
	return &dto.TrackingRecordListResponse{List: []dto.TrackingRecordInfo{}, Total: 0, Page: page, PageSize: pageSize, Pages: 0}
}

func (s *TrackingService) loadTrackingOrderAndOperatorMaps(records []models.TrackingRecord) (map[uint]models.Order, map[uint]models.User) {
	orderIDs := make([]uint, 0, len(records))
	operatorIDs := make([]uint, 0, len(records))
	for _, record := range records {
		orderIDs = append(orderIDs, record.OrderID)
		if record.OperatorID > 0 {
			operatorIDs = append(operatorIDs, record.OperatorID)
		}
	}

	orderMap := make(map[uint]models.Order)
	operatorMap := make(map[uint]models.User)
	var orders []models.Order
	if len(orderIDs) > 0 {
		database.DB.Where("id IN ?", orderIDs).Find(&orders)
		for _, order := range orders {
			orderMap[order.ID] = order
		}
	}
	if len(operatorIDs) > 0 {
		var operators []models.User
		database.DB.Select("id,username,real_name").Where("id IN ?", operatorIDs).Find(&operators)
		for _, operator := range operators {
			operatorMap[operator.ID] = operator
		}
	}
	return orderMap, operatorMap
}

func (s *TrackingService) loadTrackingOperatorMap(records []models.TrackingRecord) map[uint]models.User {
	operatorIDs := make([]uint, 0, len(records))
	for _, record := range records {
		if record.OperatorID > 0 {
			operatorIDs = append(operatorIDs, record.OperatorID)
		}
	}
	operatorMap := make(map[uint]models.User)
	if len(operatorIDs) > 0 {
		var operators []models.User
		database.DB.Select("id,username,real_name").Where("id IN ?", operatorIDs).Find(&operators)
		for _, operator := range operators {
			operatorMap[operator.ID] = operator
		}
	}
	return operatorMap
}

func (s *TrackingService) buildTrackingRecordInfo(record models.TrackingRecord, order models.Order, operator models.User) dto.TrackingRecordInfo {
	return dto.TrackingRecordInfo{
		ID:           record.ID,
		OrderID:      record.OrderID,
		OrderNo:      order.OrderNo,
		Location:     record.Location,
		Latitude:     record.Latitude,
		Longitude:    record.Longitude,
		Status:       record.Status,
		Description:  record.Description,
		OperatorID:   record.OperatorID,
		OperatorName: s.getUserDisplayName(operator),
		TrackTime:    record.CTime,
		CreateTime:   utils.FormatTimestamp(record.CTime),
		UpdateTime:   utils.FormatTimestamp(record.MTime),
	}
}

func (s *TrackingService) getUserDisplayName(user models.User) string {
	if user.RealName != "" {
		return user.RealName
	}
	if user.Username != "" {
		return user.Username
	}
	return ""
}

func (s *TrackingService) getExpectedDeliveryTime(order models.Order) int64 {
	if order.EstimatedDays <= 0 || order.OrderTime <= 0 {
		return 0
	}
	return order.OrderTime + int64(order.EstimatedDays)*86400
}

func (s *TrackingService) evaluateDelay(expectedTime int64) (bool, float64) {
	if expectedTime <= 0 {
		return false, 0
	}
	now := time.Now().Unix()
	if now <= expectedTime {
		return false, 0
	}
	overdueHours := float64(now-expectedTime) / 3600.0
	return true, s.round2(overdueHours)
}

func (s *TrackingService) loadLatestTrackingRecordMap(orderIDs []uint) map[uint]models.TrackingRecord {
	recordMap := make(map[uint]models.TrackingRecord)
	if len(orderIDs) == 0 {
		return recordMap
	}
	var records []models.TrackingRecord
	if err := database.DB.Where("order_id IN ?", orderIDs).Order("c_time DESC").Find(&records).Error; err == nil {
		for _, record := range records {
			if _, exists := recordMap[record.OrderID]; !exists {
				recordMap[record.OrderID] = record
			}
		}
	}
	return recordMap
}

func (s *TrackingService) buildTrackingWarningInfo(order models.Order, latest models.TrackingRecord, hasLatest bool) (dto.TrackingWarningInfo, bool) {
	now := time.Now().Unix()
	expectedTime := s.getExpectedDeliveryTime(order)
	remainingHours := float64(0)
	overdueHours := float64(0)
	if expectedTime > 0 {
		remainingHours = s.round2(float64(expectedTime-now) / 3600.0)
		if now > expectedTime {
			overdueHours = s.round2(float64(now-expectedTime) / 3600.0)
		}
	}

	info := dto.TrackingWarningInfo{
		OrderID:              order.ID,
		OrderNo:              order.OrderNo,
		CurrentStatus:        int(order.Status),
		CurrentStatusName:    GetOrderStatusName(int(order.Status)),
		ExpectedDeliveryTime: expectedTime,
		RemainingHours:       remainingHours,
		OverdueHours:         overdueHours,
	}
	if hasLatest {
		info.LatestTrackingStatus = latest.Status
		info.LatestLocation = latest.Location
		info.LatestTrackTime = latest.CTime
	}

	if expectedTime > 0 && now > expectedTime {
		info.WarningLevel = "critical"
		info.WarningType = "delay"
		info.WarningTypeName = "延误预警"
		info.WarningMessage = fmt.Sprintf("订单已超出预计送达时间 %.1f 小时", overdueHours)
		return info, true
	}

	activeStatus := order.Status == models.OrderInTransit || order.Status == models.OrderCustomsClearing || order.Status == models.OrderDestinationSorting || order.Status == models.OrderDelivering
	if hasLatest && activeStatus {
		staleHours := float64(now-latest.CTime) / 3600.0
		if staleHours >= 48 {
			info.WarningLevel = "warning"
			info.WarningType = "stale_update"
			info.WarningTypeName = "长时间无更新预警"
			info.WarningMessage = fmt.Sprintf("订单已超过 %.1f 小时无追踪更新", s.round2(staleHours))
			return info, true
		}
	}

	if expectedTime > 0 && now <= expectedTime && expectedTime-now <= 24*3600 {
		info.WarningLevel = "warning"
		info.WarningType = "timeliness"
		info.WarningTypeName = "时效预警"
		info.WarningMessage = fmt.Sprintf("订单距离预计送达时间不足 %.1f 小时", math.Abs(remainingHours))
		return info, true
	}

	return dto.TrackingWarningInfo{}, false
}

func (s *TrackingService) round2(value float64) float64 {
	return math.Round(value*100) / 100
}
