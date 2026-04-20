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

type DispatchService struct{}

func NewDispatchService() *DispatchService {
	return &DispatchService{}
}

// ---- 路径优化 ----

// OptimizeRoute 路径优化（最近邻算法）
// 给定一组站点，从第一个站点出发，每次选择距离最近的未访问站点
func (s *DispatchService) OptimizeRoute(req *dto.RouteOptimizeRequest) (*dto.RouteOptimizeResponse, error) {
	db := database.DB

	if len(req.StationIDs) < 2 {
		return nil, errors.New("至少需要2个站点")
	}

	// 查询所有站点信息
	var stations []models.Station
	if err := db.Where("id IN ?", req.StationIDs).Find(&stations).Error; err != nil {
		return nil, errors.New("查询站点信息失败")
	}

	if len(stations) != len(req.StationIDs) {
		return nil, errors.New("部分站点不存在")
	}

	// 建立站点映射
	stationMap := make(map[uint]models.Station)
	for _, st := range stations {
		stationMap[st.ID] = st
	}

	// 构建原始顺序
	original := make([]dto.RouteStationInfo, 0, len(req.StationIDs))
	for i, id := range req.StationIDs {
		st := stationMap[id]
		dist := float64(0)
		if i < len(req.StationIDs)-1 {
			next := stationMap[req.StationIDs[i+1]]
			dist = s.haversineDistance(st.Latitude, st.Longitude, next.Latitude, next.Longitude)
		}
		original = append(original, dto.RouteStationInfo{
			StationID:   st.ID,
			StationName: st.Name,
			Latitude:    st.Latitude,
			Longitude:   st.Longitude,
			Sequence:    i + 1,
			Distance:    dist,
		})
	}
	originalDist := s.totalDistance(original)

	// 最近邻算法优化（固定起点和终点，优化中间节点顺序）
	optimized := s.nearestNeighborOptimize(req.StationIDs, stationMap)
	optimizedDist := s.totalDistance(optimized)

	saved := originalDist - optimizedDist
	if saved < 0 {
		saved = 0
	}

	// 预计耗时：平均速度 60km/h，转换为分钟
	estimatedMin := int(optimizedDist / 60.0 * 60)

	return &dto.RouteOptimizeResponse{
		OriginalOrder:  original,
		OptimizedOrder: optimized,
		TotalDistance:  math.Round(optimizedDist*100) / 100,
		SavedDistance:  math.Round(saved*100) / 100,
		EstimatedTime:  estimatedMin,
	}, nil
}

// nearestNeighborOptimize 最近邻算法（固定首尾，优化中间）
func (s *DispatchService) nearestNeighborOptimize(ids []uint, stationMap map[uint]models.Station) []dto.RouteStationInfo {
	if len(ids) <= 2 {
		result := make([]dto.RouteStationInfo, 0, len(ids))
		for i, id := range ids {
			st := stationMap[id]
			dist := float64(0)
			if i < len(ids)-1 {
				next := stationMap[ids[i+1]]
				dist = s.haversineDistance(st.Latitude, st.Longitude, next.Latitude, next.Longitude)
			}
			result = append(result, dto.RouteStationInfo{
				StationID: st.ID, StationName: st.Name,
				Latitude: st.Latitude, Longitude: st.Longitude,
				Sequence: i + 1, Distance: dist,
			})
		}
		return result
	}

	start := ids[0]
	end := ids[len(ids)-1]
	middle := ids[1 : len(ids)-1]

	visited := make(map[uint]bool)
	ordered := []uint{start}
	current := start

	for len(visited) < len(middle) {
		minDist := math.MaxFloat64
		var nearest uint
		cur := stationMap[current]
		for _, id := range middle {
			if visited[id] {
				continue
			}
			st := stationMap[id]
			d := s.haversineDistance(cur.Latitude, cur.Longitude, st.Latitude, st.Longitude)
			if d < minDist {
				minDist = d
				nearest = id
			}
		}
		if nearest == 0 {
			break
		}
		visited[nearest] = true
		ordered = append(ordered, nearest)
		current = nearest
	}
	ordered = append(ordered, end)

	result := make([]dto.RouteStationInfo, 0, len(ordered))
	for i, id := range ordered {
		st := stationMap[id]
		dist := float64(0)
		if i < len(ordered)-1 {
			next := stationMap[ordered[i+1]]
			dist = s.haversineDistance(st.Latitude, st.Longitude, next.Latitude, next.Longitude)
		}
		result = append(result, dto.RouteStationInfo{
			StationID: st.ID, StationName: st.Name,
			Latitude: st.Latitude, Longitude: st.Longitude,
			Sequence: i + 1, Distance: math.Round(dist*100) / 100,
		})
	}
	return result
}

// haversineDistance 使用 Haversine 公式计算两点间球面距离（公里）
func (s *DispatchService) haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// totalDistance 计算路径总距离
func (s *DispatchService) totalDistance(route []dto.RouteStationInfo) float64 {
	total := float64(0)
	for _, r := range route {
		total += r.Distance
	}
	return total
}

// ---- 批次调度 ----

func (s *DispatchService) generateBatchNo() string {
	now := time.Now()
	return fmt.Sprintf("B%s%06d", now.Format("20060102150405"), now.Nanosecond()/1000)
}

// CreateBatchSchedule 创建批次调度
func (s *DispatchService) CreateBatchSchedule(req *dto.CreateBatchScheduleRequest) (*dto.BatchScheduleResponse, error) {
	db := database.DB

	// 验证车辆
	var vehicle models.Vehicle
	if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&vehicle).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("车辆不存在或不可用")
		}
		return nil, errors.New("查询车辆失败")
	}

	// 验证司机
	var driver models.User
	if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("司机不存在或权限不足")
		}
		return nil, errors.New("查询司机失败")
	}

	// 验证订单并计算总重量
	var orders []models.Order
	if err := db.Where("id IN ?", req.OrderIDs).Find(&orders).Error; err != nil {
		return nil, errors.New("查询订单失败")
	}
	if len(orders) != len(req.OrderIDs) {
		return nil, errors.New("部分订单不存在")
	}

	totalWeight := float64(0)
	for _, o := range orders {
		totalWeight += o.GoodsWeight
	}

	// 检查载重
	if vehicle.Capacity > 0 && totalWeight > vehicle.Capacity {
		return nil, fmt.Errorf("订单总重量 %.2f 吨超过车辆载重 %.2f 吨", totalWeight, vehicle.Capacity)
	}

	// 创建批次
	batch := &models.BatchSchedule{
		BatchNo:     s.generateBatchNo(),
		BatchName:   strings.TrimSpace(req.BatchName),
		VehicleID:   req.VehicleID,
		DriverID:    req.DriverID,
		OrderCount:  len(req.OrderIDs),
		TotalWeight: totalWeight,
		Status:      "pending",
		PlannedTime: req.PlannedTime,
		Remark:      strings.TrimSpace(req.Remark),
	}

	if err := db.Create(batch).Error; err != nil {
		return nil, errors.New("创建批次调度失败")
	}

	// 为每个订单创建运输任务
	tasks := make([]dto.TransportTaskResponse, 0, len(orders))
	for _, order := range orders {
		// 检查是否已有有效任务
		var existing models.TransportTask
		if err := db.Where("order_id = ? AND status NOT IN ('cancelled')", order.ID).First(&existing).Error; err == nil {
			continue
		}

		task := &models.TransportTask{
			TaskNo:     fmt.Sprintf("T%s%d", time.Now().Format("20060102150405.000000"), order.ID),
			OrderID:    order.ID,
			VehicleID:  req.VehicleID,
			DriverID:   req.DriverID,
			StartPoint: order.SenderAddress,
			EndPoint:   order.ReceiverAddress,
			Status:     "pending",
		}
		if err := db.Create(task).Error; err == nil {
			driverName := driver.RealName
			if driverName == "" {
				driverName = driver.Username
			}
			tasks = append(tasks, dto.TransportTaskResponse{
				ID:          task.ID,
				TaskNo:      task.TaskNo,
				OrderID:     task.OrderID,
				OrderNo:     order.OrderNo,
				VehicleID:   task.VehicleID,
				PlateNumber: vehicle.PlateNumber,
				DriverID:    task.DriverID,
				DriverName:  driverName,
				StartPoint:  task.StartPoint,
				EndPoint:    task.EndPoint,
				Status:      task.Status,
				StatusName:  "待执行",
				CreateTime:  utils.FormatTimestamp(task.CTime),
				UpdateTime:  utils.FormatTimestamp(task.MTime),
			})
		}
	}

	driverName := driver.RealName
	if driverName == "" {
		driverName = driver.Username
	}

	return &dto.BatchScheduleResponse{
		ID:          batch.ID,
		BatchNo:     batch.BatchNo,
		BatchName:   batch.BatchName,
		VehicleID:   batch.VehicleID,
		PlateNumber: vehicle.PlateNumber,
		DriverID:    batch.DriverID,
		DriverName:  driverName,
		OrderCount:  batch.OrderCount,
		TotalWeight: batch.TotalWeight,
		Status:      batch.Status,
		StatusName:  s.getBatchStatusName(batch.Status),
		PlannedTime: batch.PlannedTime,
		Tasks:       tasks,
		Remark:      batch.Remark,
		CreateTime:  utils.FormatTimestamp(batch.CTime),
		UpdateTime:  utils.FormatTimestamp(batch.MTime),
	}, nil
}

// GetBatchScheduleList 获取批次调度列表
func (s *DispatchService) GetBatchScheduleList(req *dto.BatchScheduleQueryRequest) (*dto.BatchScheduleListResponse, error) {
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

	var batches []models.BatchSchedule
	var total int64

	query := db.Model(&models.BatchSchedule{})

	if req.BatchName != "" {
		query = query.Where("batch_name LIKE ?", "%"+req.BatchName+"%")
	}
	if req.VehicleID > 0 {
		query = query.Where("vehicle_id = ?", req.VehicleID)
	}
	if req.DriverID > 0 {
		query = query.Where("driver_id = ?", req.DriverID)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}
	if req.StartTime > 0 {
		query = query.Where("planned_time >= ?", req.StartTime)
	}
	if req.EndTime > 0 {
		query = query.Where("planned_time <= ?", req.EndTime)
	}

	query.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("c_time DESC").Offset(offset).Limit(req.PageSize).Find(&batches).Error; err != nil {
		return nil, errors.New("查询批次调度列表失败")
	}

	// 获取关联信息
	vehicleMap := make(map[uint]string)
	driverMap := make(map[uint]string)
	if len(batches) > 0 {
		var vIDs, dIDs []uint
		for _, b := range batches {
			vIDs = append(vIDs, b.VehicleID)
			dIDs = append(dIDs, b.DriverID)
		}
		var vehicles []models.Vehicle
		if err := db.Where("id IN ?", vIDs).Find(&vehicles).Error; err == nil {
			for _, v := range vehicles {
				vehicleMap[v.ID] = v.PlateNumber
			}
		}
		var drivers []models.User
		if err := db.Where("id IN ?", dIDs).Find(&drivers).Error; err == nil {
			for _, d := range drivers {
				name := d.RealName
				if name == "" {
					name = d.Username
				}
				driverMap[d.ID] = name
			}
		}
	}

	list := make([]dto.BatchScheduleResponse, 0, len(batches))
	for _, b := range batches {
		list = append(list, dto.BatchScheduleResponse{
			ID:          b.ID,
			BatchNo:     b.BatchNo,
			BatchName:   b.BatchName,
			VehicleID:   b.VehicleID,
			PlateNumber: vehicleMap[b.VehicleID],
			DriverID:    b.DriverID,
			DriverName:  driverMap[b.DriverID],
			OrderCount:  b.OrderCount,
			TotalWeight: b.TotalWeight,
			Status:      b.Status,
			StatusName:  s.getBatchStatusName(b.Status),
			PlannedTime: b.PlannedTime,
			ActualTime:  b.ActualTime,
			Remark:      b.Remark,
			CreateTime:  utils.FormatTimestamp(b.CTime),
			UpdateTime:  utils.FormatTimestamp(b.MTime),
		})
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.BatchScheduleListResponse{
		List: list, Total: total,
		Page: req.Page, PageSize: req.PageSize, Pages: pages,
	}, nil
}

// UpdateBatchScheduleStatus 更新批次调度状态
func (s *DispatchService) UpdateBatchScheduleStatus(id uint, req *dto.BatchScheduleStatusRequest) error {
	db := database.DB

	var batch models.BatchSchedule
	if err := db.First(&batch, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("批次调度不存在")
		}
		return errors.New("查询批次调度失败")
	}

	updates := map[string]interface{}{"status": req.Status}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}
	if req.Status == "dispatched" && batch.ActualTime == 0 {
		updates["actual_time"] = time.Now().Unix()
	}

	if err := db.Model(&models.BatchSchedule{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新批次状态失败")
	}
	return nil
}

// GetDispatchSuggestion 智能调度建议（贪心装箱算法）
func (s *DispatchService) GetDispatchSuggestion(req *dto.DispatchSuggestionRequest) (*dto.DispatchSuggestionResponse, error) {
	db := database.DB

	// 查询待调度订单
	var orders []models.Order
	if err := db.Where("id IN ?", req.OrderIDs).Find(&orders).Error; err != nil {
		return nil, errors.New("查询订单失败")
	}

	// 查询可用车辆
	var vehicles []models.Vehicle
	if err := db.Where("status = 1").Order("capacity DESC").Find(&vehicles).Error; err != nil {
		return nil, errors.New("查询车辆失败")
	}

	if len(vehicles) == 0 {
		return nil, errors.New("当前没有可用车辆")
	}

	// 查询司机信息
	driverMap := make(map[uint]string)
	var driverIDs []uint
	for _, v := range vehicles {
		if v.DriverID > 0 {
			driverIDs = append(driverIDs, v.DriverID)
		}
	}
	if len(driverIDs) > 0 {
		var drivers []models.User
		if err := db.Where("id IN ?", driverIDs).Find(&drivers).Error; err == nil {
			for _, d := range drivers {
				name := d.RealName
				if name == "" {
					name = d.Username
				}
				driverMap[d.ID] = name
			}
		}
	}

	// 贪心装箱：按重量降序排列订单，依次装入容量足够的车辆
	type vehicleBin struct {
		vehicle    models.Vehicle
		orderIDs   []uint
		usedWeight float64
	}

	bins := make([]vehicleBin, len(vehicles))
	for i, v := range vehicles {
		bins[i] = vehicleBin{vehicle: v}
	}

	unassigned := make([]uint, 0)

	// 按重量降序排列订单
	for i := 0; i < len(orders)-1; i++ {
		for j := i + 1; j < len(orders); j++ {
			if orders[j].GoodsWeight > orders[i].GoodsWeight {
				orders[i], orders[j] = orders[j], orders[i]
			}
		}
	}

	for _, order := range orders {
		assigned := false
		for i := range bins {
			cap := bins[i].vehicle.Capacity
			// 如果车辆没有设置容量限制，或者还有剩余容量
			if cap == 0 || bins[i].usedWeight+order.GoodsWeight <= cap {
				bins[i].orderIDs = append(bins[i].orderIDs, order.ID)
				bins[i].usedWeight += order.GoodsWeight
				assigned = true
				break
			}
		}
		if !assigned {
			unassigned = append(unassigned, order.ID)
		}
	}

	suggestions := make([]dto.BatchSuggestion, 0)
	usedVehicles := 0
	for _, bin := range bins {
		if len(bin.orderIDs) == 0 {
			continue
		}
		usedVehicles++
		loadRate := "无限制"
		if bin.vehicle.Capacity > 0 {
			loadRate = fmt.Sprintf("%.1f%%", bin.usedWeight/bin.vehicle.Capacity*100)
		}
		suggestions = append(suggestions, dto.BatchSuggestion{
			VehicleID:   bin.vehicle.ID,
			PlateNumber: bin.vehicle.PlateNumber,
			DriverID:    bin.vehicle.DriverID,
			DriverName:  driverMap[bin.vehicle.DriverID],
			OrderIDs:    bin.orderIDs,
			TotalWeight: bin.usedWeight,
			Capacity:    bin.vehicle.Capacity,
			LoadRate:    loadRate,
		})
	}

	return &dto.DispatchSuggestionResponse{
		Suggestions:      suggestions,
		UnassignedOrders: unassigned,
		Summary: dto.DispatchSummary{
			TotalOrders:    len(orders),
			AssignedOrders: len(orders) - len(unassigned),
			TotalVehicles:  len(vehicles),
			UsedVehicles:   usedVehicles,
		},
	}, nil
}

func (s *DispatchService) getBatchStatusName(status string) string {
	switch status {
	case "pending":
		return "待发车"
	case "dispatched":
		return "已发车"
	case "in_transit":
		return "运输中"
	case "completed":
		return "已完成"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}

// ---- 运输计划 ----

func (s *DispatchService) generatePlanNo() string {
	now := time.Now()
	return fmt.Sprintf("P%s%06d", now.Format("20060102150405"), now.Nanosecond()/1000)
}

// CreateTransportPlan 创建运输计划
func (s *DispatchService) CreateTransportPlan(req *dto.CreateTransportPlanRequest) (*models.TransportPlan, error) {
	db := database.DB

	// 验证车辆
	var vehicle models.Vehicle
	if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&vehicle).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("车辆不存在或不可用")
		}
		return nil, errors.New("查询车辆失败")
	}

	// 验证司机
	var driver models.User
	if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&driver).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("司机不存在或权限不足")
		}
		return nil, errors.New("查询司机失败")
	}

	plan := &models.TransportPlan{
		PlanNo:      s.generatePlanNo(),
		PlanName:    strings.TrimSpace(req.PlanName),
		PlanDate:    req.PlanDate,
		VehicleID:   req.VehicleID,
		DriverID:    req.DriverID,
		StartPoint:  strings.TrimSpace(req.StartPoint),
		EndPoint:    strings.TrimSpace(req.EndPoint),
		Waypoints:   strings.TrimSpace(req.Waypoints),
		Distance:    req.Distance,
		EstimatedH:  req.EstimatedH,
		MaxCapacity: req.MaxCapacity,
		Status:      "draft",
		Remark:      strings.TrimSpace(req.Remark),
	}

	if err := db.Create(plan).Error; err != nil {
		return nil, errors.New("创建运输计划失败")
	}
	return plan, nil
}

// GetTransportPlanByID 根据ID获取运输计划
func (s *DispatchService) GetTransportPlanByID(id uint) (*models.TransportPlan, error) {
	var plan models.TransportPlan
	if err := database.DB.First(&plan, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("运输计划不存在")
		}
		return nil, errors.New("查询运输计划失败")
	}
	return &plan, nil
}

// GetTransportPlanList 获取运输计划列表
func (s *DispatchService) GetTransportPlanList(req *dto.TransportPlanQueryRequest) (*dto.TransportPlanListResponse, error) {
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

	var plans []models.TransportPlan
	var total int64

	query := db.Model(&models.TransportPlan{})

	if req.PlanName != "" {
		query = query.Where("plan_name LIKE ?", "%"+req.PlanName+"%")
	}
	if req.VehicleID > 0 {
		query = query.Where("vehicle_id = ?", req.VehicleID)
	}
	if req.DriverID > 0 {
		query = query.Where("driver_id = ?", req.DriverID)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}
	if req.StartDate > 0 {
		query = query.Where("plan_date >= ?", req.StartDate)
	}
	if req.EndDate > 0 {
		query = query.Where("plan_date <= ?", req.EndDate)
	}

	query.Count(&total)

	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("plan_date DESC, c_time DESC").Offset(offset).Limit(req.PageSize).Find(&plans).Error; err != nil {
		return nil, errors.New("查询运输计划列表失败")
	}

	// 获取关联信息
	vehicleMap := make(map[uint]string)
	driverMap := make(map[uint]string)
	if len(plans) > 0 {
		var vIDs, dIDs []uint
		for _, p := range plans {
			vIDs = append(vIDs, p.VehicleID)
			dIDs = append(dIDs, p.DriverID)
		}
		var vehicles []models.Vehicle
		if err := db.Where("id IN ?", vIDs).Find(&vehicles).Error; err == nil {
			for _, v := range vehicles {
				vehicleMap[v.ID] = v.PlateNumber
			}
		}
		var drivers []models.User
		if err := db.Where("id IN ?", dIDs).Find(&drivers).Error; err == nil {
			for _, d := range drivers {
				name := d.RealName
				if name == "" {
					name = d.Username
				}
				driverMap[d.ID] = name
			}
		}
	}

	list := make([]dto.TransportPlanResponse, 0, len(plans))
	for _, p := range plans {
		list = append(list, dto.TransportPlanResponse{
			ID:           p.ID,
			PlanNo:       p.PlanNo,
			PlanName:     p.PlanName,
			PlanDate:     p.PlanDate,
			VehicleID:    p.VehicleID,
			PlateNumber:  vehicleMap[p.VehicleID],
			DriverID:     p.DriverID,
			DriverName:   driverMap[p.DriverID],
			StartPoint:   p.StartPoint,
			EndPoint:     p.EndPoint,
			Waypoints:    p.Waypoints,
			Distance:     p.Distance,
			EstimatedH:   p.EstimatedH,
			MaxCapacity:  p.MaxCapacity,
			UsedCapacity: p.UsedCapacity,
			Status:       p.Status,
			StatusName:   s.getPlanStatusName(p.Status),
			Remark:       p.Remark,
			CreateTime:   utils.FormatTimestamp(p.CTime),
			UpdateTime:   utils.FormatTimestamp(p.MTime),
		})
	}

	pages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		pages++
	}

	return &dto.TransportPlanListResponse{
		List: list, Total: total,
		Page: req.Page, PageSize: req.PageSize, Pages: pages,
	}, nil
}

// UpdateTransportPlan 更新运输计划
func (s *DispatchService) UpdateTransportPlan(id uint, req *dto.UpdateTransportPlanRequest) error {
	db := database.DB

	plan, err := s.GetTransportPlanByID(id)
	if err != nil {
		return err
	}

	if plan.Status == "executing" || plan.Status == "completed" || plan.Status == "cancelled" {
		return errors.New("当前状态不允许修改")
	}

	updates := make(map[string]interface{})

	if req.PlanName != "" {
		updates["plan_name"] = strings.TrimSpace(req.PlanName)
	}
	if req.VehicleID > 0 && req.VehicleID != plan.VehicleID {
		var v models.Vehicle
		if err := db.Where("id = ? AND status = 1", req.VehicleID).First(&v).Error; err != nil {
			return errors.New("车辆不存在或不可用")
		}
		updates["vehicle_id"] = req.VehicleID
	}
	if req.DriverID > 0 && req.DriverID != plan.DriverID {
		var d models.User
		if err := db.Where("id = ? AND role >= 3", req.DriverID).First(&d).Error; err != nil {
			return errors.New("司机不存在或权限不足")
		}
		updates["driver_id"] = req.DriverID
	}
	if req.StartPoint != "" {
		updates["start_point"] = strings.TrimSpace(req.StartPoint)
	}
	if req.EndPoint != "" {
		updates["end_point"] = strings.TrimSpace(req.EndPoint)
	}
	if req.Waypoints != "" {
		updates["waypoints"] = strings.TrimSpace(req.Waypoints)
	}
	if req.Distance != plan.Distance {
		updates["distance"] = req.Distance
	}
	if req.EstimatedH != plan.EstimatedH {
		updates["estimated_hours"] = req.EstimatedH
	}
	if req.MaxCapacity != plan.MaxCapacity {
		updates["max_capacity"] = req.MaxCapacity
	}
	if req.Remark != plan.Remark {
		updates["remark"] = strings.TrimSpace(req.Remark)
	}

	if len(updates) == 0 {
		return errors.New("没有要更新的字段")
	}

	if err := db.Model(&models.TransportPlan{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新运输计划失败")
	}
	return nil
}

// UpdateTransportPlanStatus 更新运输计划状态
func (s *DispatchService) UpdateTransportPlanStatus(id uint, req *dto.TransportPlanStatusRequest) error {
	db := database.DB

	var plan models.TransportPlan
	if err := db.First(&plan, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("运输计划不存在")
		}
		return errors.New("查询运输计划失败")
	}

	updates := map[string]interface{}{"status": req.Status}
	if req.Remark != "" {
		updates["remark"] = req.Remark
	}

	if err := db.Model(&models.TransportPlan{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return errors.New("更新运输计划状态失败")
	}
	return nil
}

// AssignOrdersToPlan 将订单加入运输计划
func (s *DispatchService) AssignOrdersToPlan(planID uint, req *dto.AssignOrderToPlanRequest) error {
	db := database.DB

	plan, err := s.GetTransportPlanByID(planID)
	if err != nil {
		return err
	}

	if plan.Status == "completed" || plan.Status == "cancelled" {
		return errors.New("已完成或已取消的计划不能添加订单")
	}

	// 查询订单总重量
	var orders []models.Order
	if err := db.Where("id IN ?", req.OrderIDs).Find(&orders).Error; err != nil {
		return errors.New("查询订单失败")
	}

	addWeight := float64(0)
	for _, o := range orders {
		addWeight += o.GoodsWeight
	}

	// 检查载重
	if plan.MaxCapacity > 0 && plan.UsedCapacity+addWeight > plan.MaxCapacity {
		return fmt.Errorf("添加后总重量 %.2f 超过计划最大载重 %.2f", plan.UsedCapacity+addWeight, plan.MaxCapacity)
	}

	// 批量插入关联记录（忽略重复）
	for _, orderID := range req.OrderIDs {
		var existing models.TransportPlanOrder
		if err := db.Where("plan_id = ? AND order_id = ?", planID, orderID).First(&existing).Error; err == gorm.ErrRecordNotFound {
			db.Create(&models.TransportPlanOrder{PlanID: planID, OrderID: orderID})
		}
	}

	// 更新已用载重
	db.Model(&models.TransportPlan{}).Where("id = ?", planID).
		Update("used_capacity", plan.UsedCapacity+addWeight)

	return nil
}

func (s *DispatchService) getPlanStatusName(status string) string {
	switch status {
	case "draft":
		return "草稿"
	case "confirmed":
		return "已确认"
	case "executing":
		return "执行中"
	case "completed":
		return "已完成"
	case "cancelled":
		return "已取消"
	default:
		return "未知"
	}
}
