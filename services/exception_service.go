package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/utils"

	"gorm.io/gorm"
)

type ExceptionService struct{}

func NewExceptionService() *ExceptionService {
	return &ExceptionService{}
}

func (s *ExceptionService) CreateException(userID uint, userRole int, req *dto.CreateExceptionRequest) (*dto.ExceptionInfo, error) {
	db := database.DB
	order, err := s.getOrderByID(req.OrderID)
	if err != nil {
		return nil, err
	}

	if err := s.validateExceptionCreate(order.Status, userRole); err != nil {
		return nil, err
	}
	if err := s.ensureNoActiveException(order.ID); err != nil {
		return nil, err
	}

	station, err := s.getStationByID(req.StationID)
	if err != nil {
		return nil, err
	}
	reporter, err := s.getUserByID(userID)
	if err != nil {
		return nil, err
	}
	imagesText, err := s.encodeImages(req.Images)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	exception := &models.ExceptionRecord{
		ExceptionNo:      s.generateExceptionNo(),
		OrderID:          order.ID,
		Type:             models.ExceptionType(req.Type),
		Status:           models.ExceptionPending,
		StationID:        req.StationID,
		ReporterID:       userID,
		Description:      strings.TrimSpace(req.Description),
		Images:           imagesText,
		CompensateAmount: 0,
		ReportTime:       now,
		Remark:           strings.TrimSpace(req.Remark),
	}

	tx := db.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	if err := tx.Create(exception).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建异常记录失败")
	}

	if order.Status != models.OrderException {
		if err := s.updateOrderStatusForException(tx, order, models.OrderException, userID, userRole, fmt.Sprintf("创建异常单 %s", exception.ExceptionNo)); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交事务失败")
	}

	info := s.buildExceptionInfo(*exception, *order, station, *reporter, models.User{})
	return &info, nil
}

func (s *ExceptionService) GetExceptionList(req *dto.ExceptionQueryRequest) (*dto.ExceptionListResponse, error) {
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
		err := db.Select("id").Where("order_no = ?", strings.TrimSpace(req.OrderNo)).First(&order).Error
		if err == gorm.ErrRecordNotFound {
			return &dto.ExceptionListResponse{List: []dto.ExceptionInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
		}
		if err != nil {
			return nil, errors.New("查询订单失败")
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

func (s *ExceptionService) GetExceptionByID(id uint) (*dto.ExceptionInfo, error) {
	var item models.ExceptionRecord
	if err := database.DB.First(&item, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("异常记录不存在")
		}
		return nil, errors.New("查询异常记录失败")
	}

	var order models.Order
	if loadedOrder, err := s.getOrderByID(item.OrderID); err == nil && loadedOrder != nil {
		order = *loadedOrder
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

	info := s.buildExceptionInfo(item, order, station, reporter, handler)
	return &info, nil
}

func (s *ExceptionService) AssignException(id uint, userID uint, req *dto.AssignExceptionRequest) error {
	item, err := s.getExceptionRecordByID(id)
	if err != nil {
		return err
	}
	if item.Status == models.ExceptionClosed {
		return errors.New("已关闭的异常不能再分配处理人")
	}
	handler, err := s.getUserByID(req.HandlerID)
	if err != nil {
		return err
	}
	if !s.isValidExceptionHandler(int(handler.Role)) {
		return errors.New("指定的处理人角色不允许处理异常")
	}

	updates := map[string]interface{}{
		"handler_id": req.HandlerID,
	}
	if strings.TrimSpace(req.Remark) != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}
	if err := database.DB.Model(&models.ExceptionRecord{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("分配处理人失败")
	}
	return nil
}

func (s *ExceptionService) ProcessException(id uint, userID uint, req *dto.ProcessExceptionRequest) error {
	item, err := s.getExceptionRecordByID(id)
	if err != nil {
		return err
	}
	if item.Status == models.ExceptionClosed {
		return errors.New("已关闭的异常不能再处理")
	}
	if item.HandlerID == 0 {
		return errors.New("请先分配处理人")
	}
	if req.Status == int(models.ExceptionResolved) && strings.TrimSpace(req.Result) == "" && strings.TrimSpace(req.Solution) == "" {
		return errors.New("异常已解决时需填写处理方案或处理结果")
	}

	updates := map[string]interface{}{
		"status":            req.Status,
		"solution":          strings.TrimSpace(req.Solution),
		"result":            strings.TrimSpace(req.Result),
		"compensate_amount": req.CompensateAmount,
		"handle_time":       time.Now().Unix(),
	}
	if strings.TrimSpace(req.Remark) != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}
	if err := database.DB.Model(&models.ExceptionRecord{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("处理异常失败")
	}
	return nil
}

func (s *ExceptionService) CloseException(id uint, userID uint, userRole int, req *dto.CloseExceptionRequest) error {
	item, err := s.getExceptionRecordByID(id)
	if err != nil {
		return err
	}
	if item.Status == models.ExceptionClosed {
		return errors.New("异常已关闭")
	}
	if item.Status != models.ExceptionResolved {
		return errors.New("仅已解决的异常允许关闭")
	}
	order, err := s.getOrderByID(item.OrderID)
	if err != nil {
		return err
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		return errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	updates := map[string]interface{}{
		"status":     int(models.ExceptionClosed),
		"close_time": time.Now().Unix(),
	}
	if strings.TrimSpace(req.Remark) != "" {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}
	if strings.TrimSpace(req.Result) != "" {
		updates["result"] = strings.TrimSpace(req.Result)
	}
	if err := tx.Model(&models.ExceptionRecord{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		tx.Rollback()
		return errors.New("关闭异常失败")
	}

	if req.ResumeStatus != nil {
		if order.Status != models.OrderException {
			tx.Rollback()
			return errors.New("订单当前不处于异常状态，无法恢复")
		}
		if err := s.updateOrderStatusForException(tx, order, models.OrderStatus(*req.ResumeStatus), userID, userRole, fmt.Sprintf("关闭异常单 %s 并恢复订单状态", item.ExceptionNo)); err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return errors.New("提交事务失败")
	}
	return nil
}

func (s *ExceptionService) GetExceptionStats(req *dto.ExceptionStatsQueryRequest) (*dto.ExceptionStatsResponse, error) {
	query := database.DB.Model(&models.ExceptionRecord{})
	if req.StartTime > 0 {
		query = query.Where("report_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("report_time <= ?", req.EndTime)
	}
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}

	var items []models.ExceptionRecord
	if err := query.Find(&items).Error; err != nil {
		return nil, errors.New("查询异常统计数据失败")
	}

	resp := &dto.ExceptionStatsResponse{}
	typeMap := make(map[int]int64)
	statusMap := make(map[int]int64)
	stationMap := make(map[uint]int64)
	dateMap := make(map[string]int64)
	stationIDs := make([]uint, 0)

	for _, item := range items {
		resp.Summary.TotalExceptions++
		typeMap[int(item.Type)]++
		statusMap[int(item.Status)]++
		resp.Summary.TotalCompensation += item.CompensateAmount
		if item.StationID > 0 {
			stationMap[item.StationID]++
			stationIDs = append(stationIDs, item.StationID)
		}
		date := time.Unix(item.ReportTime, 0).Format("2006-01-02")
		dateMap[date]++
		switch item.Status {
		case models.ExceptionPending:
			resp.Summary.PendingExceptions++
		case models.ExceptionProcessing:
			resp.Summary.ProcessingExceptions++
		case models.ExceptionResolved:
			resp.Summary.ResolvedExceptions++
		case models.ExceptionClosed:
			resp.Summary.ClosedExceptions++
		}
	}
	resp.Summary.TotalCompensation = s.round2(resp.Summary.TotalCompensation)

	for k, v := range typeMap {
		resp.ByType = append(resp.ByType, dto.ExceptionTypeStats{Type: k, TypeName: s.getExceptionTypeName(models.ExceptionType(k)), Count: v})
	}
	for k, v := range statusMap {
		resp.ByStatus = append(resp.ByStatus, dto.ExceptionStatusStats{Status: k, StatusName: s.getExceptionStatusName(models.ExceptionStatus(k)), Count: v})
	}
	if len(stationMap) > 0 {
		var stations []models.Station
		database.DB.Where("id IN ?", stationIDs).Find(&stations)
		nameMap := make(map[uint]string)
		for _, st := range stations {
			nameMap[st.ID] = st.Name
		}
		for id, count := range stationMap {
			resp.ByStation = append(resp.ByStation, dto.ExceptionStationStats{StationID: id, StationName: nameMap[id], Count: count})
		}
	}
	for date, count := range dateMap {
		resp.ByDate = append(resp.ByDate, dto.ExceptionDateStats{Date: date, Count: count})
	}
	return resp, nil
}

func (s *ExceptionService) getOrderByID(id uint) (*models.Order, error) {
	var order models.Order
	if err := database.DB.First(&order, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}
	return &order, nil
}

func (s *ExceptionService) getUserByID(id uint) (*models.User, error) {
	if id == 0 {
		return &models.User{}, nil
	}
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("用户不存在")
		}
		return nil, errors.New("查询用户失败")
	}
	return &user, nil
}

func (s *ExceptionService) getStationByID(id uint) (models.Station, error) {
	if id == 0 {
		return models.Station{}, nil
	}
	var station models.Station
	if err := database.DB.First(&station, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.Station{}, errors.New("站点不存在")
		}
		return models.Station{}, errors.New("查询站点失败")
	}
	return station, nil
}

func (s *ExceptionService) getExceptionRecordByID(id uint) (*models.ExceptionRecord, error) {
	var item models.ExceptionRecord
	if err := database.DB.First(&item, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("异常记录不存在")
		}
		return nil, errors.New("查询异常记录失败")
	}
	return &item, nil
}

func (s *ExceptionService) validateExceptionCreate(orderStatus models.OrderStatus, userRole int) error {
	stateMachine := &OrderStateMachine{}
	if orderStatus == models.OrderException {
		return errors.New("订单当前已处于异常状态，请先处理现有异常")
	}
	effectiveRole := userRole
	if userRole == int(models.RoleCustomer) {
		effectiveRole = int(models.RoleAdmin)
	}
	if err := stateMachine.ValidateTransition(orderStatus, models.OrderException, effectiveRole); err != nil {
		return err
	}
	return nil
}

func (s *ExceptionService) ensureNoActiveException(orderID uint) error {
	var count int64
	if err := database.DB.Model(&models.ExceptionRecord{}).Where("order_id = ? AND status IN ?", orderID, []models.ExceptionStatus{models.ExceptionPending, models.ExceptionProcessing, models.ExceptionResolved}).Count(&count).Error; err != nil {
		return errors.New("查询异常记录失败")
	}
	if count > 0 {
		return errors.New("该订单存在未关闭的异常记录")
	}
	return nil
}

func (s *ExceptionService) updateOrderStatusForException(tx *gorm.DB, order *models.Order, targetStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	stateMachine := &OrderStateMachine{}
	effectiveRole := operatorRole
	if operatorRole == int(models.RoleCustomer) && targetStatus == models.OrderException {
		effectiveRole = int(models.RoleAdmin)
	}
	if err := stateMachine.ValidateTransition(order.Status, targetStatus, effectiveRole); err != nil {
		return err
	}
	oldStatus := order.Status
	updates := map[string]interface{}{"status": int(targetStatus)}
	if strings.TrimSpace(remark) != "" {
		updates["remark"] = strings.TrimSpace(remark)
	}
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		return errors.New("更新订单状态失败")
	}
	if err := s.createOrderStatusLogTx(tx, order.ID, oldStatus, targetStatus, operatorID, operatorRole, remark); err != nil {
		return err
	}
	order.Status = targetStatus
	return nil
}

func (s *ExceptionService) createOrderStatusLogTx(tx *gorm.DB, orderID uint, fromStatus, toStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	var user models.User
	if err := tx.Select("username", "real_name").Where("id = ?", operatorID).First(&user).Error; err != nil {
		return errors.New("查询操作人信息失败")
	}
	operatorName := user.RealName
	if operatorName == "" {
		operatorName = user.Username
	}
	log := models.OrderStatusLog{
		OrderID:      orderID,
		FromStatus:   fromStatus,
		ToStatus:     toStatus,
		OperatorID:   operatorID,
		OperatorName: operatorName,
		OperatorRole: operatorRole,
		Remark:       remark,
		ChangeTime:   time.Now().Unix(),
	}
	if err := tx.Create(&log).Error; err != nil {
		return errors.New("创建订单状态日志失败")
	}
	return nil
}

func (s *ExceptionService) loadExceptionRelationMaps(items []models.ExceptionRecord) (map[uint]models.Order, map[uint]models.Station, map[uint]models.User) {
	orderIDs := make([]uint, 0, len(items))
	stationIDs := make([]uint, 0, len(items))
	userIDs := make([]uint, 0, len(items)*2)
	for _, item := range items {
		orderIDs = append(orderIDs, item.OrderID)
		if item.StationID > 0 {
			stationIDs = append(stationIDs, item.StationID)
		}
		if item.ReporterID > 0 {
			userIDs = append(userIDs, item.ReporterID)
		}
		if item.HandlerID > 0 {
			userIDs = append(userIDs, item.HandlerID)
		}
	}
	orderMap := make(map[uint]models.Order)
	stationMap := make(map[uint]models.Station)
	userMap := make(map[uint]models.User)
	if len(orderIDs) > 0 {
		var orders []models.Order
		database.DB.Where("id IN ?", orderIDs).Find(&orders)
		for _, order := range orders {
			orderMap[order.ID] = order
		}
	}
	if len(stationIDs) > 0 {
		var stations []models.Station
		database.DB.Where("id IN ?", stationIDs).Find(&stations)
		for _, station := range stations {
			stationMap[station.ID] = station
		}
	}
	if len(userIDs) > 0 {
		var users []models.User
		database.DB.Where("id IN ?", userIDs).Find(&users)
		for _, user := range users {
			userMap[user.ID] = user
		}
	}
	return orderMap, stationMap, userMap
}

func (s *ExceptionService) buildExceptionInfo(item models.ExceptionRecord, order models.Order, station models.Station, reporter models.User, handler models.User) dto.ExceptionInfo {
	images, _ := s.decodeImages(item.Images)
	return dto.ExceptionInfo{
		ID:               item.ID,
		ExceptionNo:      item.ExceptionNo,
		OrderID:          item.OrderID,
		OrderNo:          order.OrderNo,
		OrderStatus:      int(order.Status),
		OrderStatusName:  GetOrderStatusName(int(order.Status)),
		Type:             int(item.Type),
		TypeName:         s.getExceptionTypeName(item.Type),
		Status:           int(item.Status),
		StatusName:       s.getExceptionStatusName(item.Status),
		StationID:        item.StationID,
		StationName:      station.Name,
		ReporterID:       item.ReporterID,
		ReporterName:     s.getUserDisplayName(reporter),
		HandlerID:        item.HandlerID,
		HandlerName:      s.getUserDisplayName(handler),
		Description:      item.Description,
		Images:           images,
		Solution:         item.Solution,
		Result:           item.Result,
		CompensateAmount: item.CompensateAmount,
		ReportTime:       item.ReportTime,
		HandleTime:       item.HandleTime,
		CloseTime:        item.CloseTime,
		Remark:           item.Remark,
		CreateTime:       utils.FormatTimestamp(item.CTime),
		UpdateTime:       utils.FormatTimestamp(item.MTime),
	}
}

func (s *ExceptionService) generateExceptionNo() string {
	now := time.Now()
	return fmt.Sprintf("EX%s%03d", now.Format("20060102150405"), now.Nanosecond()/1000000)
}

func (s *ExceptionService) encodeImages(images []string) (string, error) {
	if len(images) == 0 {
		return "", nil
	}
	bytes, err := json.Marshal(images)
	if err != nil {
		return "", errors.New("图片数据格式错误")
	}
	return string(bytes), nil
}

func (s *ExceptionService) decodeImages(images string) ([]string, error) {
	if strings.TrimSpace(images) == "" {
		return []string{}, nil
	}
	var result []string
	if err := json.Unmarshal([]byte(images), &result); err != nil {
		return []string{}, err
	}
	return result, nil
}

func (s *ExceptionService) getUserDisplayName(user models.User) string {
	if user.RealName != "" {
		return user.RealName
	}
	if user.Username != "" {
		return user.Username
	}
	return ""
}

func (s *ExceptionService) isValidExceptionHandler(role int) bool {
	return role == int(models.RoleSiteManager) || role == int(models.RoleDispatcher) || role == int(models.RoleAdmin) || config.HasPermission(role, config.PermExceptionUpdate)
}

func (s *ExceptionService) getExceptionTypeName(exceptionType models.ExceptionType) string {
	switch exceptionType {
	case models.ExceptionDamaged:
		return "破损"
	case models.ExceptionLost:
		return "丢失"
	case models.ExceptionDelay:
		return "延误"
	case models.ExceptionRefused:
		return "拒收"
	case models.ExceptionAddressErr:
		return "地址错误"
	case models.ExceptionCustoms:
		return "清关异常"
	case models.ExceptionOther:
		return "其他"
	default:
		return "未知"
	}
}

func (s *ExceptionService) getExceptionStatusName(status models.ExceptionStatus) string {
	switch status {
	case models.ExceptionPending:
		return "待处理"
	case models.ExceptionProcessing:
		return "处理中"
	case models.ExceptionResolved:
		return "已解决"
	case models.ExceptionClosed:
		return "已关闭"
	default:
		return "未知"
	}
}

func (s *ExceptionService) round2(value float64) float64 {
	return math.Round(value*100) / 100
}
