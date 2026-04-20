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
	"gorm.io/gorm/clause"
)

type PickupService struct{}

func NewPickupService() *PickupService {
	return &PickupService{}
}

var activePickupTaskStatuses = []string{"pending", "picking_up", "picked_up"}

func (s *PickupService) CreatePickupTask(userID uint, userRole int, req *dto.CreatePickupTaskRequest) (*dto.PickupTaskInfo, error) {
	if userRole != int(models.RoleSiteManager) && userRole != int(models.RoleDispatcher) && userRole != int(models.RoleAdmin) {
		return nil, errors.New("当前角色无权创建揽收任务")
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	order, err := s.resolveOrderByIdentifierTx(tx, req.OrderID, req.OrderNo)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if order.Status != models.OrderAccepted && order.Status != models.OrderPickupPending {
		tx.Rollback()
		return nil, errors.New("只有已接单或待揽收的订单才能创建揽收任务")
	}

	if _, err := s.getStationByIDTx(tx, req.StationID); err != nil {
		tx.Rollback()
		return nil, err
	}

	task, _, err := s.ensurePickupTaskTx(tx, order, req.StationID, userID, userRole, strings.TrimSpace(req.Remark))
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	if req.CourierID > 0 {
		if err := s.assignCourierTx(tx, task, req.CourierID, userID); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交揽收任务失败")
	}

	return s.GetPickupTaskByID(task.ID, userID, userRole)
}

func (s *PickupService) GetPickupTaskList(userID uint, userRole int, req *dto.PickupTaskQueryRequest) (*dto.PickupTaskListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	query := database.DB.Model(&models.PickupTask{})

	if taskNo := strings.TrimSpace(req.TaskNo); taskNo != "" {
		query = query.Where("task_no LIKE ?", "%"+taskNo+"%")
	}
	if req.StationID > 0 {
		query = query.Where("station_id = ?", req.StationID)
	}
	if req.CourierID > 0 {
		query = query.Where("courier_id = ?", req.CourierID)
	}
	if status := strings.TrimSpace(req.Status); status != "" {
		if !s.isValidPickupTaskStatus(status) {
			return nil, errors.New("无效的揽收任务状态")
		}
		query = query.Where("status = ?", status)
	}
	if orderNo := strings.TrimSpace(req.OrderNo); orderNo != "" {
		var order models.Order
		err := database.DB.Select("id").Where("order_no = ?", orderNo).First(&order).Error
		if err == gorm.ErrRecordNotFound {
			return &dto.PickupTaskListResponse{List: []dto.PickupTaskInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
		}
		if err != nil {
			return nil, errors.New("查询订单失败")
		}
		query = query.Where("order_id = ?", order.ID)
	}

	scope := strings.TrimSpace(req.Scope)
	switch userRole {
	case int(models.RoleCourier):
		switch scope {
		case "", "my":
			query = query.Where("courier_id = ?", userID)
		case "pool":
			query = query.Where("courier_id = 0 AND status = ?", "pending")
		default:
			return nil, errors.New("当前角色无权查看该揽收任务范围")
		}
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		switch scope {
		case "", "all":
		case "pool":
			query = query.Where("courier_id = 0 AND status = ?", "pending")
		case "my":
			query = query.Where("courier_id = ?", userID)
		default:
			return nil, errors.New("无效的揽收任务范围")
		}
	default:
		return nil, errors.New("当前角色无权查看揽收任务")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询揽收任务总数失败")
	}

	var tasks []models.PickupTask
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&tasks).Error; err != nil {
		return nil, errors.New("查询揽收任务列表失败")
	}
	if len(tasks) == 0 {
		return &dto.PickupTaskListResponse{List: []dto.PickupTaskInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
	}

	list, err := s.buildPickupTaskInfoList(tasks)
	if err != nil {
		return nil, err
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}
	return &dto.PickupTaskListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

func (s *PickupService) GetPickupTaskSummary(userID uint, userRole int) (*dto.PickupTaskSummaryResponse, error) {
	resp := &dto.PickupTaskSummaryResponse{}

	switch userRole {
	case int(models.RoleCourier):
		resp.PendingPool = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = 0 AND status = ?", "pending"))
		resp.PendingAssigned = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = ? AND status = ?", userID, "pending"))
		resp.PickingUp = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = ? AND status = ?", userID, "picking_up"))
		resp.PickedUp = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = ? AND status = ?", userID, "picked_up"))
		resp.Failed = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = ? AND status = ?", userID, "failed"))
		resp.Total = resp.PendingPool + resp.PendingAssigned + resp.PickingUp + resp.PickedUp + resp.Failed
		return resp, nil
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		resp.PendingPool = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id = 0 AND status = ?", "pending"))
		resp.PendingAssigned = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("courier_id > 0 AND status = ?", "pending"))
		resp.PickingUp = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("status = ?", "picking_up"))
		resp.PickedUp = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("status = ?", "picked_up"))
		resp.Failed = s.countPickupTasks(database.DB.Model(&models.PickupTask{}).Where("status = ?", "failed"))
		resp.Total = s.countPickupTasks(database.DB.Model(&models.PickupTask{}))
		return resp, nil
	default:
		return nil, errors.New("当前角色无权查看揽收概览")
	}
}

func (s *PickupService) GetPickupTaskByID(id uint, userID uint, userRole int) (*dto.PickupTaskInfo, error) {
	var task models.PickupTask
	if err := database.DB.First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("揽收任务不存在")
		}
		return nil, errors.New("查询揽收任务失败")
	}
	if err := s.ensureTaskAccess(task, userID, userRole, true); err != nil {
		return nil, err
	}
	list, err := s.buildPickupTaskInfoList([]models.PickupTask{task})
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, errors.New("揽收任务不存在")
	}
	return &list[0], nil
}

func (s *PickupService) ClaimPickupTask(id uint, userID uint, userRole int, req *dto.PickupTaskActionRequest) (*dto.PickupTaskInfo, error) {
	if userRole != int(models.RoleCourier) {
		return nil, errors.New("只有快递员可以认领揽收任务")
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	task, order, station, err := s.loadTaskBundleForUpdate(tx, id)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if task.Status != "pending" {
		tx.Rollback()
		return nil, errors.New("当前揽收任务不可认领")
	}
	if task.CourierID > 0 && task.CourierID != userID {
		tx.Rollback()
		return nil, errors.New("揽收任务已被其他快递员认领")
	}
	if task.CourierID == userID {
		tx.Rollback()
		return s.GetPickupTaskByID(id, userID, userRole)
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.PickupTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"courier_id":  userID,
		"assign_time": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("认领揽收任务失败")
	}

	description := "快递员已认领揽收任务"
	if remark := strings.TrimSpace(req.Remark); remark != "" {
		description = fmt.Sprintf("%s：%s", description, remark)
	}
	if err := s.createTrackingRecordTx(tx, order.ID, station.Name, "已认领揽收", description, userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交认领揽收任务失败")
	}

	return s.GetPickupTaskByID(id, userID, userRole)
}

func (s *PickupService) StartPickupTask(id uint, userID uint, userRole int, req *dto.PickupTaskActionRequest) (*dto.PickupTaskInfo, error) {
	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	task, order, station, err := s.loadTaskBundleForUpdate(tx, id)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := s.ensureTaskAccess(*task, userID, userRole, false); err != nil {
		tx.Rollback()
		return nil, err
	}
	if task.Status == "picking_up" {
		tx.Rollback()
		return s.GetPickupTaskByID(id, userID, userRole)
	}
	if task.Status != "pending" {
		tx.Rollback()
		return nil, errors.New("当前揽收任务不可开始")
	}

	now := time.Now().Unix()
	courierID := task.CourierID
	updates := map[string]interface{}{
		"status":     "picking_up",
		"start_time": now,
	}
	if courierID == 0 {
		if userRole != int(models.RoleCourier) {
			tx.Rollback()
			return nil, errors.New("未认领的揽收任务只能由快递员开始")
		}
		courierID = userID
		updates["courier_id"] = userID
		updates["assign_time"] = now
	}
	if err := tx.Model(&models.PickupTask{}).Where("id = ?", task.ID).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新揽收任务状态失败")
	}

	if order.Status != models.OrderPickingUp {
		if err := s.updateOrderStatusTx(tx, order, models.OrderPickingUp, userID, userRole, "快递员开始揽收"); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.pickupLocation(*order, station), "揽收中", s.composeTrackingDescription("快递员开始上门揽收", req.Remark), courierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交开始揽收失败")
	}
	return s.GetPickupTaskByID(id, userID, userRole)
}

func (s *PickupService) CompletePickupTask(id uint, userID uint, userRole int, req *dto.PickupTaskActionRequest) (*dto.PickupTaskInfo, error) {
	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	task, order, station, err := s.loadTaskBundleForUpdate(tx, id)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := s.ensureTaskAccess(*task, userID, userRole, false); err != nil {
		tx.Rollback()
		return nil, err
	}
	if task.Status == "picked_up" {
		tx.Rollback()
		return s.GetPickupTaskByID(id, userID, userRole)
	}
	if task.Status != "picking_up" {
		tx.Rollback()
		return nil, errors.New("当前揽收任务不可确认完成")
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.PickupTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"status":      "picked_up",
		"pickup_time": now,
		"remark":      strings.TrimSpace(req.Remark),
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新揽收任务失败")
	}

	if order.Status != models.OrderPickedUp {
		if err := s.updateOrderStatusTx(tx, order, models.OrderPickedUp, userID, userRole, "快递员完成揽收"); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.pickupLocation(*order, station), "已揽收", s.composeTrackingDescription("快递员已完成揽收，等待站点入库", req.Remark), task.CourierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交完成揽收失败")
	}
	return s.GetPickupTaskByID(id, userID, userRole)
}

func (s *PickupService) FailPickupTask(id uint, userID uint, userRole int, req *dto.PickupTaskFailRequest) (*dto.PickupTaskInfo, error) {
	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, errors.New("开启事务失败")
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	task, order, station, err := s.loadTaskBundleForUpdate(tx, id)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := s.ensureTaskAccess(*task, userID, userRole, false); err != nil {
		tx.Rollback()
		return nil, err
	}
	if task.Status == "failed" {
		tx.Rollback()
		return s.GetPickupTaskByID(id, userID, userRole)
	}
	if task.Status != "pending" && task.Status != "picking_up" {
		tx.Rollback()
		return nil, errors.New("当前揽收任务不可标记为失败")
	}

	reason := strings.TrimSpace(req.Reason)
	now := time.Now().Unix()
	if err := tx.Model(&models.PickupTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"status":         "failed",
		"failure_reason": reason,
		"remark":         strings.TrimSpace(req.Remark),
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新揽收任务失败状态失败")
	}

	exceptionService := NewExceptionService()
	if order.Status != models.OrderException {
		if err := exceptionService.ensureNoActiveException(order.ID); err != nil {
			tx.Rollback()
			return nil, err
		}
		exceptionType := models.ExceptionOther
		if req.ExceptionType >= int(models.ExceptionDamaged) && req.ExceptionType <= int(models.ExceptionOther) {
			exceptionType = models.ExceptionType(req.ExceptionType)
		}
		exception := &models.ExceptionRecord{
			ExceptionNo: s.generatePickupExceptionNo(),
			OrderID:     order.ID,
			Type:        exceptionType,
			Status:      models.ExceptionPending,
			StationID:   task.StationID,
			ReporterID:  userID,
			Description: reason,
			ReportTime:  now,
			Remark:      strings.TrimSpace(req.Remark),
		}
		if err := tx.Create(exception).Error; err != nil {
			tx.Rollback()
			return nil, errors.New("创建揽收异常记录失败")
		}
		if err := exceptionService.updateOrderStatusForException(tx, order, models.OrderException, userID, userRole, fmt.Sprintf("揽收失败并生成异常单 %s", exception.ExceptionNo)); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.pickupLocation(*order, station), "揽收失败", s.composeTrackingDescription(reason, req.Remark), task.CourierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交揽收失败结果失败")
	}
	return s.GetPickupTaskByID(id, userID, userRole)
}

func (s *PickupService) ensurePickupTaskTx(tx *gorm.DB, order *models.Order, stationID uint, operatorID uint, operatorRole int, remark string) (*models.PickupTask, bool, error) {
	if order.Status != models.OrderAccepted && order.Status != models.OrderPickupPending {
		return nil, false, errors.New("订单当前不处于可揽收阶段")
	}

	var existing models.PickupTask
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("order_id = ? AND status IN ?", order.ID, activePickupTaskStatuses).
		Order("id DESC").
		First(&existing).Error
	if err == nil {
		return &existing, false, nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, false, errors.New("查询揽收任务失败")
	}

	task := &models.PickupTask{
		TaskNo:    s.generatePickupTaskNo(),
		OrderID:   order.ID,
		StationID: stationID,
		Status:    "pending",
		Remark:    strings.TrimSpace(remark),
	}
	if err := tx.Create(task).Error; err != nil {
		return nil, false, errors.New("创建揽收任务失败")
	}

	if order.Status == models.OrderAccepted {
		if err := s.updateOrderStatusTx(tx, order, models.OrderPickupPending, operatorID, operatorRole, "已生成待揽收任务"); err != nil {
			return nil, false, err
		}
	}

	station, err := s.getStationByIDTx(tx, stationID)
	if err != nil {
		return nil, false, err
	}
	description := "订单已进入待揽收池"
	if task.Remark != "" {
		description = fmt.Sprintf("%s：%s", description, task.Remark)
	}
	if err := s.createTrackingRecordTx(tx, order.ID, station.Name, "待揽收", description, operatorID); err != nil {
		return nil, false, err
	}
	return task, true, nil
}

func (s *PickupService) assignCourierTx(tx *gorm.DB, task *models.PickupTask, courierID uint, operatorID uint) error {
	if task.CourierID > 0 && task.CourierID != courierID {
		return errors.New("揽收任务已分配给其他快递员")
	}
	if task.CourierID == courierID {
		return nil
	}

	courier, err := s.getCourierByIDTx(tx, courierID)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.PickupTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"courier_id":  courier.ID,
		"assign_time": now,
	}).Error; err != nil {
		return errors.New("分配快递员失败")
	}

	order, err := s.getOrderByIDTx(tx, task.OrderID)
	if err != nil {
		return err
	}
	station, err := s.getStationByIDTx(tx, task.StationID)
	if err != nil {
		return err
	}
	description := fmt.Sprintf("揽收任务已分配给%s", s.getPickupUserDisplayName(*courier))
	return s.createTrackingRecordTx(tx, order.ID, station.Name, "已分配快递员", description, operatorID)
}

func (s *PickupService) buildPickupTaskInfoList(tasks []models.PickupTask) ([]dto.PickupTaskInfo, error) {
	orderIDs := make([]uint, 0, len(tasks))
	stationIDs := make([]uint, 0, len(tasks))
	courierIDs := make([]uint, 0, len(tasks))
	for _, task := range tasks {
		orderIDs = append(orderIDs, task.OrderID)
		stationIDs = append(stationIDs, task.StationID)
		if task.CourierID > 0 {
			courierIDs = append(courierIDs, task.CourierID)
		}
	}

	orderMap := make(map[uint]models.Order)
	stationMap := make(map[uint]models.Station)
	courierMap := make(map[uint]models.User)

	var orders []models.Order
	if err := database.DB.Where("id IN ?", orderIDs).Find(&orders).Error; err != nil {
		return nil, errors.New("查询揽收任务关联订单失败")
	}
	for _, order := range orders {
		orderMap[order.ID] = order
	}

	var stations []models.Station
	if err := database.DB.Where("id IN ?", stationIDs).Find(&stations).Error; err != nil {
		return nil, errors.New("查询揽收任务关联站点失败")
	}
	for _, station := range stations {
		stationMap[station.ID] = station
	}

	if len(courierIDs) > 0 {
		var couriers []models.User
		if err := database.DB.Where("id IN ?", courierIDs).Find(&couriers).Error; err != nil {
			return nil, errors.New("查询快递员信息失败")
		}
		for _, courier := range couriers {
			courierMap[courier.ID] = courier
		}
	}

	list := make([]dto.PickupTaskInfo, 0, len(tasks))
	for _, task := range tasks {
		order := orderMap[task.OrderID]
		station := stationMap[task.StationID]
		courier := courierMap[task.CourierID]
		list = append(list, dto.PickupTaskInfo{
			ID:              task.ID,
			TaskNo:          task.TaskNo,
			OrderID:         task.OrderID,
			OrderNo:         order.OrderNo,
			CourierID:       task.CourierID,
			CourierName:     s.getPickupUserDisplayName(courier),
			StationID:       task.StationID,
			StationName:     station.Name,
			Status:          task.Status,
			StatusName:      s.getPickupTaskStatusName(task.Status),
			OrderStatus:     int(order.Status),
			OrderStatusName: GetOrderStatusName(int(order.Status)),
			SenderName:      order.SenderName,
			SenderPhone:     order.SenderPhone,
			SenderAddress:   s.pickupLocation(order, station),
			AssignTime:      task.AssignTime,
			StartTime:       task.StartTime,
			PickupTime:      task.PickupTime,
			FailureReason:   task.FailureReason,
			Remark:          task.Remark,
			CreateTime:      utils.FormatTimestamp(task.CTime),
			UpdateTime:      utils.FormatTimestamp(task.MTime),
		})
	}
	return list, nil
}

func (s *PickupService) loadTaskBundleForUpdate(tx *gorm.DB, taskID uint) (*models.PickupTask, *models.Order, models.Station, error) {
	var task models.PickupTask
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&task, taskID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil, models.Station{}, errors.New("揽收任务不存在")
		}
		return nil, nil, models.Station{}, errors.New("查询揽收任务失败")
	}

	order, err := s.getOrderByIDTx(tx, task.OrderID)
	if err != nil {
		return nil, nil, models.Station{}, err
	}
	station, err := s.getStationByIDTx(tx, task.StationID)
	if err != nil {
		return nil, nil, models.Station{}, err
	}
	return &task, order, station, nil
}

func (s *PickupService) ensureTaskAccess(task models.PickupTask, userID uint, userRole int, allowPool bool) error {
	switch userRole {
	case int(models.RoleCourier):
		if task.CourierID == userID {
			return nil
		}
		if allowPool && task.CourierID == 0 && task.Status == "pending" {
			return nil
		}
		return errors.New("无权操作该揽收任务")
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		return nil
	default:
		return errors.New("无权操作该揽收任务")
	}
}

func (s *PickupService) createTrackingRecordTx(tx *gorm.DB, orderID uint, location, status, description string, operatorID uint) error {
	now := time.Now().Unix()
	record := models.TrackingRecord{
		OrderID:     orderID,
		Location:    strings.TrimSpace(location),
		Status:      strings.TrimSpace(status),
		Description: strings.TrimSpace(description),
		OperatorID:  operatorID,
		CTime:       now,
		MTime:       now,
	}
	if record.Location == "" {
		record.Location = "未知位置"
	}
	if err := tx.Create(&record).Error; err != nil {
		return errors.New("创建追踪记录失败")
	}
	return nil
}

func (s *PickupService) resolveOrderByIdentifierTx(tx *gorm.DB, orderID uint, orderNo string) (*models.Order, error) {
	var order models.Order
	switch {
	case orderID > 0:
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("订单不存在")
			}
			return nil, errors.New("查询订单失败")
		}
	case strings.TrimSpace(orderNo) != "":
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("order_no = ?", strings.TrimSpace(orderNo)).First(&order).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, errors.New("订单不存在")
			}
			return nil, errors.New("查询订单失败")
		}
	default:
		return nil, errors.New("请提供订单ID或订单号")
	}
	return &order, nil
}

func (s *PickupService) getOrderByIDTx(tx *gorm.DB, orderID uint) (*models.Order, error) {
	var order models.Order
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}
	return &order, nil
}

func (s *PickupService) getStationByIDTx(tx *gorm.DB, stationID uint) (models.Station, error) {
	var station models.Station
	if err := tx.Select("id", "name", "station_code", "country", "province", "city", "address").First(&station, stationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.Station{}, errors.New("站点不存在")
		}
		return models.Station{}, errors.New("查询站点失败")
	}
	return station, nil
}

func (s *PickupService) getCourierByIDTx(tx *gorm.DB, courierID uint) (*models.User, error) {
	var courier models.User
	if err := tx.Where("id = ? AND role = ? AND status = 1", courierID, models.RoleCourier).First(&courier).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("快递员不存在或已禁用")
		}
		return nil, errors.New("查询快递员失败")
	}
	return &courier, nil
}

func (s *PickupService) countPickupTasks(query *gorm.DB) int64 {
	var count int64
	_ = query.Count(&count).Error
	return count
}

func (s *PickupService) isValidPickupTaskStatus(status string) bool {
	switch status {
	case "pending", "picking_up", "picked_up", "failed", "cancelled":
		return true
	default:
		return false
	}
}

func (s *PickupService) getPickupTaskStatusName(status string) string {
	switch status {
	case "pending":
		return "待揽收"
	case "picking_up":
		return "揽收中"
	case "picked_up":
		return "已揽收"
	case "failed":
		return "揽收失败"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}

func (s *PickupService) generatePickupTaskNo() string {
	now := time.Now()
	return fmt.Sprintf("PU%s%03d", now.Format("20060102150405"), now.Nanosecond()/1000000)
}

func (s *PickupService) generatePickupExceptionNo() string {
	now := time.Now()
	return fmt.Sprintf("PEX%s%03d", now.Format("20060102150405"), now.Nanosecond()/1000000)
}

func (s *PickupService) updateOrderStatusTx(tx *gorm.DB, order *models.Order, targetStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	stateMachine := &OrderStateMachine{}
	if err := stateMachine.ValidateTransition(order.Status, targetStatus, operatorRole); err != nil {
		return err
	}

	updates := map[string]interface{}{
		"status": int(targetStatus),
	}
	currentTime := time.Now().Unix()
	if targetStatus == models.OrderPickedUp {
		updates["pickup_time"] = currentTime
	}
	if strings.TrimSpace(remark) != "" {
		updates["remark"] = strings.TrimSpace(remark)
	}

	oldStatus := order.Status
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		return errors.New("更新订单状态失败")
	}

	transportService := &TransportService{}
	if err := transportService.createOrderStatusLogTx(tx, order.ID, oldStatus, targetStatus, operatorID, operatorRole, remark); err != nil {
		return err
	}

	order.Status = targetStatus
	if targetStatus == models.OrderPickedUp {
		order.PickupTime = currentTime
	}
	return nil
}

func (s *PickupService) composeTrackingDescription(base, remark string) string {
	base = strings.TrimSpace(base)
	remark = strings.TrimSpace(remark)
	if remark == "" {
		return base
	}
	return fmt.Sprintf("%s：%s", base, remark)
}

func (s *PickupService) getPickupUserDisplayName(user models.User) string {
	if strings.TrimSpace(user.RealName) != "" {
		return strings.TrimSpace(user.RealName)
	}
	return strings.TrimSpace(user.Username)
}

func (s *PickupService) pickupLocation(order models.Order, station models.Station) string {
	parts := make([]string, 0, 4)
	if strings.TrimSpace(order.SenderCountry) != "" {
		parts = append(parts, strings.TrimSpace(order.SenderCountry))
	}
	if strings.TrimSpace(order.SenderProvince) != "" {
		parts = append(parts, strings.TrimSpace(order.SenderProvince))
	}
	if strings.TrimSpace(order.SenderCity) != "" {
		parts = append(parts, strings.TrimSpace(order.SenderCity))
	}
	if strings.TrimSpace(order.SenderAddress) != "" {
		parts = append(parts, strings.TrimSpace(order.SenderAddress))
	}
	if len(parts) > 0 {
		return strings.Join(parts, " ")
	}
	if strings.TrimSpace(station.Name) != "" {
		return station.Name
	}
	return "待揽收地址"
}
