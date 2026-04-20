package services

import (
	"errors"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"strings"

	"gorm.io/gorm"
)

func (s *ExceptionService) getAccessibleOrderByUser(orderID uint, userID uint, userRole int) (*models.Order, error) {
	order, err := s.getOrderByID(orderID)
	if err != nil {
		return nil, err
	}
	if userRole == int(models.RoleCustomer) && order.CustomerID != userID {
		return nil, errors.New("无权访问此订单异常信息")
	}
	return order, nil
}

func (s *ExceptionService) CreateExceptionForUser(userID uint, userRole int, req *dto.CreateExceptionRequest) (*dto.ExceptionInfo, error) {
	if _, err := s.getAccessibleOrderByUser(req.OrderID, userID, userRole); err != nil {
		return nil, err
	}
	return s.CreateException(userID, userRole, req)
}

func (s *ExceptionService) GetExceptionListForUser(userID uint, userRole int, req *dto.ExceptionQueryRequest) (*dto.ExceptionListResponse, error) {
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

	query := db.Model(&models.ExceptionRecord{})
	if userRole == int(models.RoleCustomer) {
		query = query.Joins("JOIN orders exception_orders ON exception_records.order_id = exception_orders.id").
			Where("exception_orders.customer_id = ?", userID)
	}
	if req.Type > 0 {
		query = query.Where("type = ?", req.Type)
	}
	if req.Status > 0 {
		query = query.Where("status = ?", req.Status)
	}
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}
	if req.ReporterID > 0 {
		query = query.Where("reporter_id = ?", req.ReporterID)
	}
	if req.HandlerID > 0 {
		query = query.Where("handler_id = ?", req.HandlerID)
	}
	if req.StartTime > 0 {
		query = query.Where("report_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("report_time <= ?", req.EndTime)
	}
	if req.OrderNo != "" {
		var order models.Order
		err := db.Select("id, customer_id").Where("order_no = ?", strings.TrimSpace(req.OrderNo)).First(&order).Error
		if err == gorm.ErrRecordNotFound {
			return &dto.ExceptionListResponse{List: []dto.ExceptionInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
		}
		if err != nil {
			return nil, errors.New("查询订单失败")
		}
		if userRole == int(models.RoleCustomer) && order.CustomerID != userID {
			return &dto.ExceptionListResponse{List: []dto.ExceptionInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
		}
		query = query.Where("order_id = ?", order.ID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询异常总数失败")
	}

	var items []models.ExceptionRecord
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("report_time DESC").Offset(offset).Limit(req.PageSize).Find(&items).Error; err != nil {
		return nil, errors.New("查询异常列表失败")
	}
	if len(items) == 0 {
		return &dto.ExceptionListResponse{List: []dto.ExceptionInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
	}

	orderMap, stationMap, userMap := s.loadExceptionRelationMaps(items)
	list := make([]dto.ExceptionInfo, 0, len(items))
	for _, item := range items {
		list = append(list, s.buildExceptionInfo(item, orderMap[item.OrderID], stationMap[item.StationID], userMap[item.ReporterID], userMap[item.HandlerID]))
	}
	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}
	return &dto.ExceptionListResponse{List: list, Total: total, Page: req.Page, PageSize: req.PageSize, Pages: pages}, nil
}

func (s *ExceptionService) GetExceptionByIDForUser(id uint, userID uint, userRole int) (*dto.ExceptionInfo, error) {
	var item models.ExceptionRecord
	if err := database.DB.First(&item, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("异常记录不存在")
		}
		return nil, errors.New("查询异常记录失败")
	}

	order, err := s.getAccessibleOrderByUser(item.OrderID, userID, userRole)
	if err != nil {
		return nil, err
	}

	station, _ := s.getStationByID(item.StationID)
	var reporter models.User
	if loadedReporter, err := s.getUserByID(item.ReporterID); err == nil && loadedReporter != nil {
		reporter = *loadedReporter
	}
	var handler models.User
	if loadedHandler, err := s.getUserByID(item.HandlerID); err == nil && loadedHandler != nil {
		handler = *loadedHandler
	}

	info := s.buildExceptionInfo(item, *order, station, reporter, handler)
	return &info, nil
}
