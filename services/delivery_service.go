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

type DeliveryService struct{}

func NewDeliveryService() *DeliveryService {
	return &DeliveryService{}
}

var activeDeliveryTaskStatuses = []string{"pending", "delivering", "delivered"}

func (s *DeliveryService) CreateDeliveryTask(userID uint, userRole int, req *dto.CreateDeliveryTaskRequest) (*dto.DeliveryTaskInfo, error) {
	if userRole != int(models.RoleSiteManager) && userRole != int(models.RoleDispatcher) && userRole != int(models.RoleAdmin) {
		return nil, errors.New("当前角色无权创建派送任务")
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
	if order.Status != models.OrderDestinationSorting {
		tx.Rollback()
		return nil, errors.New("只有处于目的地分拣状态的订单才能创建派送任务")
	}

	if _, err := s.getStationByIDTx(tx, req.StationID); err != nil {
		tx.Rollback()
		return nil, err
	}

	task, _, err := s.ensurePendingTaskTx(tx, order, req.StationID, userID, strings.TrimSpace(req.Remark))
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
		return nil, errors.New("提交派送任务失败")
	}

	return s.GetDeliveryTaskByID(task.ID, userID, userRole)
}

func (s *DeliveryService) GetDeliveryTaskList(userID uint, userRole int, req *dto.DeliveryTaskQueryRequest) (*dto.DeliveryTaskListResponse, error) {
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100
	}

	query := database.DB.Model(&models.DeliveryTask{})

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
		if !s.isValidDeliveryTaskStatus(status) {
			return nil, errors.New("无效的派送任务状态")
		}
		query = query.Where("status = ?", status)
	}
	if orderNo := strings.TrimSpace(req.OrderNo); orderNo != "" {
		var order models.Order
		err := database.DB.Select("id").Where("order_no = ?", orderNo).First(&order).Error
		if err == gorm.ErrRecordNotFound {
			return &dto.DeliveryTaskListResponse{List: []dto.DeliveryTaskInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
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
			return nil, errors.New("当前角色无权查看该派送任务范围")
		}
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		switch scope {
		case "", "all":
		case "pool":
			query = query.Where("courier_id = 0 AND status = ?", "pending")
		case "my":
			query = query.Where("courier_id = ?", userID)
		default:
			return nil, errors.New("无效的派送任务范围")
		}
	default:
		return nil, errors.New("当前角色无权查看派送任务")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, errors.New("查询派送任务总数失败")
	}

	var tasks []models.DeliveryTask
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&tasks).Error; err != nil {
		return nil, errors.New("查询派送任务列表失败")
	}
	if len(tasks) == 0 {
		return &dto.DeliveryTaskListResponse{List: []dto.DeliveryTaskInfo{}, Total: 0, Page: req.Page, PageSize: req.PageSize, Pages: 0}, nil
	}

	list, err := s.buildDeliveryTaskInfoList(tasks)
	if err != nil {
		return nil, err
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.DeliveryTaskListResponse{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
		Pages:    pages,
	}, nil
}

func (s *DeliveryService) GetDeliveryTaskSummary(userID uint, userRole int) (*dto.DeliveryTaskSummaryResponse, error) {
	resp := &dto.DeliveryTaskSummaryResponse{}

	switch userRole {
	case int(models.RoleCourier):
		resp.PendingPool = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = 0 AND status = ?", "pending"))
		resp.PendingAssigned = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = ? AND status = ?", userID, "pending"))
		resp.Delivering = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = ? AND status = ?", userID, "delivering"))
		resp.Delivered = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = ? AND status = ?", userID, "delivered"))
		resp.Signed = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = ? AND status = ?", userID, "signed"))
		resp.Failed = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = ? AND status = ?", userID, "failed"))
		resp.Total = resp.PendingPool + resp.PendingAssigned + resp.Delivering + resp.Delivered + resp.Signed + resp.Failed
		return resp, nil
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		resp.PendingPool = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id = 0 AND status = ?", "pending"))
		resp.PendingAssigned = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("courier_id > 0 AND status = ?", "pending"))
		resp.Delivering = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("status = ?", "delivering"))
		resp.Delivered = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("status = ?", "delivered"))
		resp.Signed = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("status = ?", "signed"))
		resp.Failed = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}).Where("status = ?", "failed"))
		resp.Total = s.countDeliveryTasks(database.DB.Model(&models.DeliveryTask{}))
		return resp, nil
	default:
		return nil, errors.New("当前角色无权查看派送概览")
	}
}

func (s *DeliveryService) GetDeliveryTaskByID(id uint, userID uint, userRole int) (*dto.DeliveryTaskInfo, error) {
	var task models.DeliveryTask
	if err := database.DB.First(&task, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("派送任务不存在")
		}
		return nil, errors.New("查询派送任务失败")
	}

	if err := s.ensureTaskAccess(task, userID, userRole, true); err != nil {
		return nil, err
	}

	list, err := s.buildDeliveryTaskInfoList([]models.DeliveryTask{task})
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, errors.New("派送任务不存在")
	}
	return &list[0], nil
}

func (s *DeliveryService) ClaimDeliveryTask(id uint, userID uint, userRole int, req *dto.DeliveryTaskActionRequest) (*dto.DeliveryTaskInfo, error) {
	if userRole != int(models.RoleCourier) {
		return nil, errors.New("只有快递员可以认领派送任务")
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
		return nil, errors.New("当前派送任务不可认领")
	}
	if task.CourierID > 0 && task.CourierID != userID {
		tx.Rollback()
		return nil, errors.New("派送任务已被其他快递员认领")
	}
	if task.CourierID == userID {
		tx.Rollback()
		return s.GetDeliveryTaskByID(id, userID, userRole)
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"courier_id":  userID,
		"assign_time": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("认领派送任务失败")
	}

	description := "快递员已认领派送任务"
	if remark := strings.TrimSpace(req.Remark); remark != "" {
		description = fmt.Sprintf("%s：%s", description, remark)
	}
	if err := s.createTrackingRecordTx(tx, order.ID, station.Name, "已认领", description, userID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交认领派送任务失败")
	}

	return s.GetDeliveryTaskByID(id, userID, userRole)
}

func (s *DeliveryService) StartDeliveryTask(id uint, userID uint, userRole int, req *dto.DeliveryTaskActionRequest) (*dto.DeliveryTaskInfo, error) {
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
	if task.Status == "delivering" {
		tx.Rollback()
		return s.GetDeliveryTaskByID(id, userID, userRole)
	}
	if task.Status != "pending" {
		tx.Rollback()
		return nil, errors.New("当前派送任务不可开始派送")
	}

	now := time.Now().Unix()
	courierID := task.CourierID
	updates := map[string]interface{}{
		"status":     "delivering",
		"start_time": now,
	}
	if courierID == 0 {
		if userRole != int(models.RoleCourier) {
			tx.Rollback()
			return nil, errors.New("未认领的派送任务只能由快递员开始派送")
		}
		courierID = userID
		updates["courier_id"] = userID
		updates["assign_time"] = now
	}
	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新派送任务状态失败")
	}

	task.CourierID = courierID
	task.Status = "delivering"
	task.StartTime = now
	if task.AssignTime == 0 {
		task.AssignTime = now
	}

	if order.Status != models.OrderDelivering {
		if err := s.updateOrderStatusTx(tx, order, models.OrderDelivering, userID, userRole, "快递员开始派送"); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	record := models.DeliveryRecord{
		OrderID:      order.ID,
		DriverID:     courierID,
		StationID:    task.StationID,
		DispatchTime: now,
		Status:       "delivering",
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建派送记录失败")
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.deliveryLocation(*order, station), "派送中", s.composeTrackingDescription("快递员已开始派送", req.Remark), courierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交开始派送失败")
	}

	return s.GetDeliveryTaskByID(id, userID, userRole)
}

func (s *DeliveryService) CompleteDeliveryTask(id uint, userID uint, userRole int, req *dto.DeliveryTaskActionRequest) (*dto.DeliveryTaskInfo, error) {
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
	if task.Status == "delivered" {
		tx.Rollback()
		return s.GetDeliveryTaskByID(id, userID, userRole)
	}
	if task.Status != "delivering" {
		tx.Rollback()
		return nil, errors.New("当前派送任务不可标记为已送达")
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"status":         "delivered",
		"delivered_time": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新派送任务失败")
	}
	task.Status = "delivered"
	task.DeliveredTime = now

	if order.Status != models.OrderDelivered {
		if err := s.updateOrderStatusTx(tx, order, models.OrderDelivered, userID, userRole, "快递员确认已送达"); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	record := models.DeliveryRecord{
		OrderID:      order.ID,
		DriverID:     task.CourierID,
		StationID:    task.StationID,
		DeliveryTime: now,
		Status:       "delivered",
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建送达记录失败")
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.deliveryLocation(*order, station), "已送达", s.composeTrackingDescription("订单已送达，等待签收", req.Remark), task.CourierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交送达失败")
	}

	return s.GetDeliveryTaskByID(id, userID, userRole)
}

func (s *DeliveryService) SignDeliveryTask(id uint, userID uint, userRole int, req *dto.DeliveryTaskSignRequest) (*dto.DeliveryTaskInfo, error) {
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
	if task.Status == "signed" {
		tx.Rollback()
		return s.GetDeliveryTaskByID(id, userID, userRole)
	}
	if task.Status != "delivered" {
		tx.Rollback()
		return nil, errors.New("只有已送达的派送任务才能执行签收")
	}

	now := time.Now().Unix()
	var signRecord models.SignRecord
	err = tx.Where("order_id = ?", order.ID).First(&signRecord).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			tx.Rollback()
			return nil, errors.New("查询签收记录失败")
		}

		signRecord = models.SignRecord{
			OrderID:      order.ID,
			SignType:     models.SignType(req.SignType),
			SignerName:   strings.TrimSpace(req.SignerName),
			SignerPhone:  strings.TrimSpace(req.SignerPhone),
			SignerIDCard: strings.TrimSpace(req.SignerIDCard),
			Relation:     strings.TrimSpace(req.Relation),
			SignTime:     now,
			SignImage:    strings.TrimSpace(req.SignImage),
			Latitude:     req.Latitude,
			Longitude:    req.Longitude,
			LockerCode:   strings.TrimSpace(req.LockerCode),
			StationCode:  strings.TrimSpace(req.StationCode),
			DriverID:     task.CourierID,
			Remark:       strings.TrimSpace(req.Remark),
		}
		if err := tx.Create(&signRecord).Error; err != nil {
			tx.Rollback()
			return nil, errors.New("创建签收记录失败")
		}
	}

	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"status":    "signed",
		"sign_time": signRecord.SignTime,
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新派送任务签收状态失败")
	}
	task.Status = "signed"
	task.SignTime = signRecord.SignTime

	if order.Status != models.OrderSigned {
		if err := s.updateOrderStatusTx(tx, order, models.OrderSigned, userID, userRole, "快递员完成签收"); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.deliveryLocation(*order, station), "已签收", s.composeTrackingDescription("订单已完成签收", req.Remark), task.CourierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交签收失败")
	}

	return s.GetDeliveryTaskByID(id, userID, userRole)
}

func (s *DeliveryService) FailDeliveryTask(id uint, userID uint, userRole int, req *dto.DeliveryTaskFailRequest) (*dto.DeliveryTaskInfo, error) {
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
		return s.GetDeliveryTaskByID(id, userID, userRole)
	}
	if task.Status != "pending" && task.Status != "delivering" {
		tx.Rollback()
		return nil, errors.New("当前派送任务不可标记为失败")
	}

	now := time.Now().Unix()
	reason := strings.TrimSpace(req.Reason)
	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"status":         "failed",
		"failure_reason": reason,
		"remark":         strings.TrimSpace(req.Remark),
	}).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("更新派送任务失败状态失败")
	}
	task.Status = "failed"
	task.FailureReason = reason
	task.Remark = strings.TrimSpace(req.Remark)

	record := models.DeliveryRecord{
		OrderID:      order.ID,
		DriverID:     task.CourierID,
		StationID:    task.StationID,
		DeliveryTime: now,
		Status:       "failed",
		FailReason:   reason,
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := tx.Create(&record).Error; err != nil {
		tx.Rollback()
		return nil, errors.New("创建派送失败记录失败")
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
			ExceptionNo: s.generateDeliveryExceptionNo(),
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
			return nil, errors.New("创建派送异常记录失败")
		}

		if err := exceptionService.updateOrderStatusForException(tx, order, models.OrderException, userID, userRole, fmt.Sprintf("派送失败并生成异常单 %s", exception.ExceptionNo)); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := s.createTrackingRecordTx(tx, order.ID, s.deliveryLocation(*order, station), "派送失败", s.composeTrackingDescription(reason, req.Remark), task.CourierID); err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, errors.New("提交派送失败结果失败")
	}

	return s.GetDeliveryTaskByID(id, userID, userRole)
}

func (s *DeliveryService) ensurePendingTaskTx(tx *gorm.DB, order *models.Order, stationID uint, operatorID uint, remark string) (*models.DeliveryTask, bool, error) {
	if order.Status != models.OrderDestinationSorting {
		return nil, false, errors.New("订单当前不处于待派送阶段")
	}

	var existing models.DeliveryTask
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("order_id = ? AND status IN ?", order.ID, activeDeliveryTaskStatuses).
		Order("id DESC").
		First(&existing).Error
	if err == nil {
		return &existing, false, nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, false, errors.New("查询派送任务失败")
	}

	task := &models.DeliveryTask{
		TaskNo:    s.generateDeliveryTaskNo(),
		OrderID:   order.ID,
		StationID: stationID,
		Status:    "pending",
		Remark:    strings.TrimSpace(remark),
	}
	if err := tx.Create(task).Error; err != nil {
		return nil, false, errors.New("创建派送任务失败")
	}

	station, err := s.getStationByIDTx(tx, stationID)
	if err != nil {
		return nil, false, err
	}
	description := "订单已进入待派送池"
	if task.Remark != "" {
		description = fmt.Sprintf("%s：%s", description, task.Remark)
	}
	if err := s.createTrackingRecordTx(tx, order.ID, station.Name, "待派送", description, operatorID); err != nil {
		return nil, false, err
	}

	return task, true, nil
}

func (s *DeliveryService) assignCourierTx(tx *gorm.DB, task *models.DeliveryTask, courierID uint, operatorID uint) error {
	if task.CourierID > 0 && task.CourierID != courierID {
		return errors.New("派送任务已分配给其他快递员")
	}
	if task.CourierID == courierID {
		return nil
	}

	courier, err := s.getCourierByIDTx(tx, courierID)
	if err != nil {
		return err
	}

	now := time.Now().Unix()
	if err := tx.Model(&models.DeliveryTask{}).Where("id = ?", task.ID).Updates(map[string]interface{}{
		"courier_id":  courier.ID,
		"assign_time": now,
	}).Error; err != nil {
		return errors.New("分配快递员失败")
	}
	task.CourierID = courier.ID
	task.AssignTime = now

	order, err := s.getOrderByIDTx(tx, task.OrderID)
	if err != nil {
		return err
	}
	station, err := s.getStationByIDTx(tx, task.StationID)
	if err != nil {
		return err
	}
	description := fmt.Sprintf("派送任务已分配给%s", s.getDeliveryUserDisplayName(*courier))
	return s.createTrackingRecordTx(tx, order.ID, station.Name, "已分配快递员", description, operatorID)
}

func (s *DeliveryService) buildDeliveryTaskInfoList(tasks []models.DeliveryTask) ([]dto.DeliveryTaskInfo, error) {
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
		return nil, errors.New("查询派送任务关联订单失败")
	}
	for _, order := range orders {
		orderMap[order.ID] = order
	}

	var stations []models.Station
	if err := database.DB.Where("id IN ?", stationIDs).Find(&stations).Error; err != nil {
		return nil, errors.New("查询派送任务关联站点失败")
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

	list := make([]dto.DeliveryTaskInfo, 0, len(tasks))
	for _, task := range tasks {
		order := orderMap[task.OrderID]
		station := stationMap[task.StationID]
		courier := courierMap[task.CourierID]
		list = append(list, dto.DeliveryTaskInfo{
			ID:              task.ID,
			TaskNo:          task.TaskNo,
			OrderID:         task.OrderID,
			OrderNo:         order.OrderNo,
			CourierID:       task.CourierID,
			CourierName:     s.getDeliveryUserDisplayName(courier),
			StationID:       task.StationID,
			StationName:     station.Name,
			Status:          task.Status,
			StatusName:      s.getDeliveryTaskStatusName(task.Status),
			OrderStatus:     int(order.Status),
			OrderStatusName: GetOrderStatusName(int(order.Status)),
			ReceiverName:    order.ReceiverName,
			ReceiverPhone:   order.ReceiverPhone,
			ReceiverAddress: s.deliveryLocation(order, station),
			AssignTime:      task.AssignTime,
			StartTime:       task.StartTime,
			DeliveredTime:   task.DeliveredTime,
			SignTime:        task.SignTime,
			FailureReason:   task.FailureReason,
			Remark:          task.Remark,
			CreateTime:      utils.FormatTimestamp(task.CTime),
			UpdateTime:      utils.FormatTimestamp(task.MTime),
		})
	}

	return list, nil
}

func (s *DeliveryService) loadTaskBundleForUpdate(tx *gorm.DB, taskID uint) (*models.DeliveryTask, *models.Order, models.Station, error) {
	var task models.DeliveryTask
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&task, taskID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil, models.Station{}, errors.New("派送任务不存在")
		}
		return nil, nil, models.Station{}, errors.New("查询派送任务失败")
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

func (s *DeliveryService) ensureTaskAccess(task models.DeliveryTask, userID uint, userRole int, allowPool bool) error {
	switch userRole {
	case int(models.RoleCourier):
		if task.CourierID == userID {
			return nil
		}
		if allowPool && task.CourierID == 0 && task.Status == "pending" {
			return nil
		}
		return errors.New("无权操作该派送任务")
	case int(models.RoleSiteManager), int(models.RoleDispatcher), int(models.RoleAdmin):
		return nil
	default:
		return errors.New("无权操作该派送任务")
	}
}

func (s *DeliveryService) updateOrderStatusTx(tx *gorm.DB, order *models.Order, targetStatus models.OrderStatus, operatorID uint, operatorRole int, remark string) error {
	stateMachine := &OrderStateMachine{}
	if err := stateMachine.ValidateTransition(order.Status, targetStatus, operatorRole); err != nil {
		return err
	}

	updates := map[string]interface{}{
		"status": int(targetStatus),
	}
	if strings.TrimSpace(remark) != "" {
		updates["remark"] = strings.TrimSpace(remark)
	}

	currentTime := time.Now().Unix()
	switch targetStatus {
	case models.OrderDelivered:
		updates["delivery_time"] = currentTime
	case models.OrderSigned:
		updates["sign_time"] = currentTime
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
	return nil
}

func (s *DeliveryService) createTrackingRecordTx(tx *gorm.DB, orderID uint, location, status, description string, operatorID uint) error {
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

func (s *DeliveryService) resolveOrderByIdentifierTx(tx *gorm.DB, orderID uint, orderNo string) (*models.Order, error) {
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

func (s *DeliveryService) getOrderByIDTx(tx *gorm.DB, orderID uint) (*models.Order, error) {
	var order models.Order
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("订单不存在")
		}
		return nil, errors.New("查询订单失败")
	}
	return &order, nil
}

func (s *DeliveryService) getStationByIDTx(tx *gorm.DB, stationID uint) (models.Station, error) {
	var station models.Station
	if err := tx.Select("id", "name", "station_code", "country", "province", "city", "address").First(&station, stationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return models.Station{}, errors.New("站点不存在")
		}
		return models.Station{}, errors.New("查询站点失败")
	}
	return station, nil
}

func (s *DeliveryService) getCourierByIDTx(tx *gorm.DB, courierID uint) (*models.User, error) {
	var courier models.User
	if err := tx.Where("id = ? AND role = ? AND status = 1", courierID, models.RoleCourier).First(&courier).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("快递员不存在或已禁用")
		}
		return nil, errors.New("查询快递员失败")
	}
	return &courier, nil
}

func (s *DeliveryService) countDeliveryTasks(query *gorm.DB) int64 {
	var count int64
	_ = query.Count(&count).Error
	return count
}

func (s *DeliveryService) isValidDeliveryTaskStatus(status string) bool {
	switch status {
	case "pending", "delivering", "delivered", "signed", "failed", "cancelled":
		return true
	default:
		return false
	}
}

func (s *DeliveryService) getDeliveryTaskStatusName(status string) string {
	switch status {
	case "pending":
		return "待派送"
	case "delivering":
		return "派送中"
	case "delivered":
		return "已送达"
	case "signed":
		return "已签收"
	case "failed":
		return "派送失败"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}

func (s *DeliveryService) generateDeliveryTaskNo() string {
	now := time.Now()
	return fmt.Sprintf("DL%s%03d", now.Format("20060102150405"), now.Nanosecond()/1000000)
}

func (s *DeliveryService) generateDeliveryExceptionNo() string {
	now := time.Now()
	return fmt.Sprintf("DEX%s%03d", now.Format("20060102150405"), now.Nanosecond()/1000000)
}

func (s *DeliveryService) composeTrackingDescription(base, remark string) string {
	base = strings.TrimSpace(base)
	remark = strings.TrimSpace(remark)
	if remark == "" {
		return base
	}
	return fmt.Sprintf("%s：%s", base, remark)
}

func (s *DeliveryService) getDeliveryUserDisplayName(user models.User) string {
	if strings.TrimSpace(user.RealName) != "" {
		return strings.TrimSpace(user.RealName)
	}
	return strings.TrimSpace(user.Username)
}

func (s *DeliveryService) deliveryLocation(order models.Order, station models.Station) string {
	parts := make([]string, 0, 4)
	if strings.TrimSpace(order.ReceiverCountry) != "" {
		parts = append(parts, strings.TrimSpace(order.ReceiverCountry))
	}
	if strings.TrimSpace(order.ReceiverProvince) != "" {
		parts = append(parts, strings.TrimSpace(order.ReceiverProvince))
	}
	if strings.TrimSpace(order.ReceiverCity) != "" {
		parts = append(parts, strings.TrimSpace(order.ReceiverCity))
	}
	if strings.TrimSpace(order.ReceiverAddress) != "" {
		parts = append(parts, strings.TrimSpace(order.ReceiverAddress))
	}
	if len(parts) > 0 {
		return strings.Join(parts, " ")
	}
	if strings.TrimSpace(station.Name) != "" {
		return station.Name
	}
	return "待派送站点"
}
