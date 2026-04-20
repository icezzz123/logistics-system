package main

import (
	"fmt"
	"log"
	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/models"
	"logistics-system/utils"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

const demoPassword = "Demo@123456"

type demoUsers struct {
	CustomerGlobal models.User
	CustomerEU     models.User
	CourierCN      models.User
	CourierUS      models.User
	CourierDE      models.User
	DriverCN       models.User
	Dispatcher     models.User
	SiteManager    models.User
	Sorter         models.User
}

type demoAssets struct {
	VehicleCN models.Vehicle
}

type demoStations struct {
	ShanghaiOrigin   models.Station
	ShenzhenOrigin   models.Station
	HangzhouTransit  models.Station
	ZhengzhouTransit models.Station
	LAXCustoms       models.Station
	FrankfurtCustoms models.Station
	LAXDest          models.Station
	JFKDest          models.Station
	FrankfurtDest    models.Station
	SingaporeDest    models.Station
}

type createOrderInput struct {
	OrderNo            string
	CustomerID         uint
	SenderName         string
	SenderPhone        string
	SenderCountry      string
	SenderProvince     string
	SenderCity         string
	SenderAddress      string
	SenderPostcode     string
	ReceiverName       string
	ReceiverPhone      string
	ReceiverCountry    string
	ReceiverProvince   string
	ReceiverCity       string
	ReceiverAddress    string
	ReceiverPostcode   string
	GoodsName          string
	GoodsCategory      string
	GoodsWeight        float64
	GoodsVolume        float64
	GoodsQuantity      int
	GoodsValue         float64
	TransportMode      models.TransportMode
	ServiceType        string
	EstimatedDays      int
	OriginStationID    uint
	DestStationID      uint
	CurrentStation     uint
	Status             models.OrderStatus
	OrderTime          int64
	PickupTime         int64
	DeliveryTime       int64
	SignTime           int64
	FreightCharge      float64
	InsuranceFee       float64
	CustomsFee         float64
	OtherFee           float64
	TotalAmount        float64
	Currency           string
	PaymentStatus      string
	Remark             string
	CustomsDeclaration string
	HSCode             string
	DeclaredValue      float64
	CustomsDuty        float64
	CustomsVAT         float64
	CustomsOtherTax    float64
	CustomsStatus      string
	ParcelNo           string
}

func main() {
	loadDotEnvUpward()

	cfg := config.LoadConfig()
	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("init db failed: %v", err)
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := cleanupDemoData(tx); err != nil {
			return err
		}
		users, err := ensureDemoUsers(tx)
		if err != nil {
			return err
		}
		assets, err := ensureDemoAssets(tx, users)
		if err != nil {
			return err
		}
		stations, err := loadDemoStations(tx)
		if err != nil {
			return err
		}
		return seedDemoOrders(tx, users, assets, stations)
	}); err != nil {
		log.Fatalf("seed demo chain failed: %v", err)
	}

	fmt.Println("demo chain seeded successfully")
	fmt.Printf("demo accounts:\n")
	fmt.Printf("- customer: demo_customer_global / %s\n", demoPassword)
	fmt.Printf("- customer: demo_customer_eu / %s\n", demoPassword)
	fmt.Printf("- courier: demo_courier_cn / %s\n", demoPassword)
	fmt.Printf("- courier: demo_courier_us / %s\n", demoPassword)
	fmt.Printf("- courier: demo_courier_de / %s\n", demoPassword)
	fmt.Printf("- driver: demo_driver_cn / %s\n", demoPassword)
	fmt.Printf("- dispatcher: demo_dispatcher_ops / %s\n", demoPassword)
	fmt.Printf("- site manager: demo_site_manager_cn / %s\n", demoPassword)
	fmt.Printf("- sorter: demo_sorter_cn / %s\n", demoPassword)
}

func loadDotEnvUpward() {
	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	dir := cwd
	for {
		candidate := filepath.Join(dir, ".env")
		if _, err := os.Stat(candidate); err == nil {
			_ = godotenv.Load(candidate)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return
		}
		dir = parent
	}
}

func cleanupDemoData(tx *gorm.DB) error {
	var demoOrderIDs []uint
	if err := tx.Model(&models.Order{}).Where("order_no LIKE ?", "DEMO-ORD-%").Pluck("id", &demoOrderIDs).Error; err != nil {
		return err
	}
	if len(demoOrderIDs) > 0 {
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.TransportPlanOrder{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.OrderCustomsNode{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.ExceptionRecord{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.TrackingRecord{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.OrderStatusLog{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.SignRecord{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.PickupTask{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.DeliveryTask{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.DeliveryRecord{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.TransportTask{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.SortingRecord{}).Error
		_ = tx.Where("order_id IN ?", demoOrderIDs).Delete(&models.StationFlow{}).Error
		_ = tx.Where("order_id IN ? OR root_order_id IN ? OR source_order_id IN ?", demoOrderIDs, demoOrderIDs, demoOrderIDs).Delete(&models.OrderPackage{}).Error
		_ = tx.Where("id IN ?", demoOrderIDs).Delete(&models.Order{}).Error
	}
	_ = tx.Where("plate_number LIKE ?", "DEMO-%").Delete(&models.Vehicle{}).Error
	_ = tx.Where("username LIKE ?", "demo_%").Delete(&models.User{}).Error
	return nil
}

func ensureDemoUsers(tx *gorm.DB) (*demoUsers, error) {
	hash, err := utils.HashPassword(demoPassword)
	if err != nil {
		return nil, err
	}
	create := func(username, email, phone, realName string, role models.UserRole) (models.User, error) {
		user := models.User{
			Username: username,
			Password: hash,
			Email:    email,
			Phone:    phone,
			RealName: realName,
			Role:     role,
			Status:   1,
		}
		if err := tx.Create(&user).Error; err != nil {
			return models.User{}, err
		}
		return user, nil
	}

	customerGlobal, err := create("demo_customer_global", "demo.customer.global@test.local", "13800010001", "演示客户-环球电商", models.RoleCustomer)
	if err != nil {
		return nil, err
	}
	customerEU, err := create("demo_customer_eu", "demo.customer.eu@test.local", "13800010002", "演示客户-欧线贸易", models.RoleCustomer)
	if err != nil {
		return nil, err
	}
	courierCN, err := create("demo_courier_cn", "demo.courier.cn@test.local", "13800020001", "演示快递员-华东", models.RoleCourier)
	if err != nil {
		return nil, err
	}
	courierUS, err := create("demo_courier_us", "demo.courier.us@test.local", "13800020002", "演示快递员-北美", models.RoleCourier)
	if err != nil {
		return nil, err
	}
	courierDE, err := create("demo_courier_de", "demo.courier.de@test.local", "13800020003", "演示快递员-欧洲", models.RoleCourier)
	if err != nil {
		return nil, err
	}
	driverCN, err := create("demo_driver_cn", "demo.driver.cn@test.local", "13800040001", "演示司机-跨境干线", models.RoleDriver)
	if err != nil {
		return nil, err
	}
	dispatcher, err := create("demo_dispatcher_ops", "demo.dispatcher@test.local", "13800060001", "演示调度员", models.RoleDispatcher)
	if err != nil {
		return nil, err
	}
	siteManager, err := create("demo_site_manager_cn", "demo.manager@test.local", "13800050001", "演示站点经理", models.RoleSiteManager)
	if err != nil {
		return nil, err
	}
	sorter, err := create("demo_sorter_cn", "demo.sorter@test.local", "13800030001", "演示分拣员", models.RoleSorter)
	if err != nil {
		return nil, err
	}

	return &demoUsers{customerGlobal, customerEU, courierCN, courierUS, courierDE, driverCN, dispatcher, siteManager, sorter}, nil
}

func ensureDemoAssets(tx *gorm.DB, users *demoUsers) (*demoAssets, error) {
	vehicle := models.Vehicle{
		PlateNumber: "DEMO-SH-A1001",
		VehicleType: "9.6米厢式货车",
		Capacity:    18,
		DriverID:    users.DriverCN.ID,
		Status:      1,
	}
	if err := tx.Create(&vehicle).Error; err != nil {
		return nil, err
	}
	return &demoAssets{VehicleCN: vehicle}, nil
}

func loadDemoStations(tx *gorm.DB) (*demoStations, error) {
	get := func(code string) (models.Station, error) {
		var station models.Station
		if err := tx.Where("station_code = ?", code).First(&station).Error; err != nil {
			return models.Station{}, fmt.Errorf("station %s not found, run seed_stations first", code)
		}
		return station, nil
	}

	sha, err := get("CN-SHA-OR-01")
	if err != nil {
		return nil, err
	}
	szx, err := get("CN-SZX-OR-01")
	if err != nil {
		return nil, err
	}
	hgh, err := get("CN-HGH-TR-01")
	if err != nil {
		return nil, err
	}
	cgo, err := get("CN-CGO-TR-01")
	if err != nil {
		return nil, err
	}
	laxCus, err := get("US-LAX-CUS-01")
	if err != nil {
		return nil, err
	}
	fraCus, err := get("DE-FRA-CUS-01")
	if err != nil {
		return nil, err
	}
	laxDest, err := get("US-LAX-DS-01")
	if err != nil {
		return nil, err
	}
	jfkDest, err := get("US-JFK-DS-01")
	if err != nil {
		return nil, err
	}
	fraDest, err := get("DE-FRA-DS-01")
	if err != nil {
		return nil, err
	}
	sinDest, err := get("SG-SIN-DS-01")
	if err != nil {
		return nil, err
	}

	return &demoStations{sha, szx, hgh, cgo, laxCus, fraCus, laxDest, jfkDest, fraDest, sinDest}, nil
}

func createDemoOrder(tx *gorm.DB, input createOrderInput) (*models.Order, error) {
	order := &models.Order{
		OrderNo:            input.OrderNo,
		CustomerID:         input.CustomerID,
		HierarchyType:      models.OrderHierarchyNormal,
		RelationType:       models.OrderRelationNormal,
		SenderName:         input.SenderName,
		SenderPhone:        input.SenderPhone,
		SenderCountry:      input.SenderCountry,
		SenderProvince:     input.SenderProvince,
		SenderCity:         input.SenderCity,
		SenderAddress:      input.SenderAddress,
		SenderPostcode:     input.SenderPostcode,
		ReceiverName:       input.ReceiverName,
		ReceiverPhone:      input.ReceiverPhone,
		ReceiverCountry:    input.ReceiverCountry,
		ReceiverProvince:   input.ReceiverProvince,
		ReceiverCity:       input.ReceiverCity,
		ReceiverAddress:    input.ReceiverAddress,
		ReceiverPostcode:   input.ReceiverPostcode,
		GoodsName:          input.GoodsName,
		GoodsCategory:      input.GoodsCategory,
		GoodsWeight:        input.GoodsWeight,
		GoodsVolume:        input.GoodsVolume,
		GoodsQuantity:      input.GoodsQuantity,
		GoodsValue:         input.GoodsValue,
		TransportMode:      input.TransportMode,
		ServiceType:        input.ServiceType,
		EstimatedDays:      input.EstimatedDays,
		OriginStationID:    input.OriginStationID,
		DestStationID:      input.DestStationID,
		CurrentStation:     input.CurrentStation,
		Status:             input.Status,
		OrderTime:          input.OrderTime,
		PickupTime:         input.PickupTime,
		DeliveryTime:       input.DeliveryTime,
		SignTime:           input.SignTime,
		FreightCharge:      input.FreightCharge,
		InsuranceFee:       input.InsuranceFee,
		CustomsFee:         input.CustomsFee,
		OtherFee:           input.OtherFee,
		TotalAmount:        input.TotalAmount,
		Currency:           defaultString(input.Currency, "CNY"),
		PaymentStatus:      defaultString(input.PaymentStatus, "paid"),
		Remark:             input.Remark,
		CustomsDeclaration: input.CustomsDeclaration,
		HSCode:             input.HSCode,
		DeclaredValue:      input.DeclaredValue,
		CustomsDuty:        input.CustomsDuty,
		CustomsVAT:         input.CustomsVAT,
		CustomsOtherTax:    input.CustomsOtherTax,
		CustomsStatus:      defaultString(input.CustomsStatus, "pending"),
	}
	if err := tx.Create(order).Error; err != nil {
		return nil, err
	}
	order.RootOrderID = order.ID
	if err := tx.Model(&models.Order{}).Where("id = ?", order.ID).Update("root_order_id", order.ID).Error; err != nil {
		return nil, err
	}

	pkg := models.OrderPackage{
		OrderID:       order.ID,
		RootOrderID:   order.ID,
		SourceOrderID: order.ID,
		ParcelNo:      input.ParcelNo,
		PackageType:   models.OrderPackageTypeNormal,
		GoodsName:     input.GoodsName,
		GoodsCategory: input.GoodsCategory,
		Weight:        input.GoodsWeight,
		Volume:        input.GoodsVolume,
		Quantity:      input.GoodsQuantity,
		GoodsValue:    input.GoodsValue,
		Remark:        input.Remark,
	}
	if err := tx.Create(&pkg).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func addStatusChain(tx *gorm.DB, order *models.Order, dispatcher, siteManager, courierCN, sorter, driver, courierDest models.User, statuses []models.OrderStatus, remarks []string, step time.Duration) {
	current := order.OrderTime
	previous := models.OrderPending
	for index, status := range statuses {
		operator := dispatcher
		switch status {
		case models.OrderPickupPending, models.OrderInWarehouse:
			operator = siteManager
		case models.OrderPickingUp, models.OrderPickedUp:
			operator = courierCN
		case models.OrderSorting:
			operator = sorter
		case models.OrderInTransit:
			operator = driver
		case models.OrderDelivering, models.OrderDelivered, models.OrderSigned:
			operator = courierDest
		case models.OrderException:
			if previous == models.OrderDelivering || previous == models.OrderDelivered {
				operator = courierDest
			} else if previous == models.OrderPickupPending || previous == models.OrderPickingUp {
				operator = courierCN
			}
		}
		current += int64(step.Seconds())
		logEntry := models.OrderStatusLog{
			OrderID:      order.ID,
			FromStatus:   previous,
			ToStatus:     status,
			OperatorID:   operator.ID,
			OperatorName: operator.RealName,
			OperatorRole: int(operator.Role),
			Remark:       remarks[index],
			ChangeTime:   current,
			CreatedAt:    current,
		}
		_ = tx.Create(&logEntry).Error
		previous = status
	}
}

func createPickupTask(tx *gorm.DB, taskNo string, orderID, courierID, stationID uint, status string, assignTime, startTime, pickupTime int64, failureReason, remark string) {
	task := models.PickupTask{
		TaskNo:        taskNo,
		OrderID:       orderID,
		CourierID:     courierID,
		StationID:     stationID,
		Status:        status,
		AssignTime:    assignTime,
		StartTime:     startTime,
		PickupTime:    pickupTime,
		FailureReason: failureReason,
		Remark:        remark,
		CTime:         maxNonZero(assignTime, startTime, pickupTime),
		MTime:         maxNonZero(assignTime, startTime, pickupTime),
	}
	_ = tx.Create(&task).Error
}

func createTransportTask(tx *gorm.DB, taskNo string, orderID, vehicleID, driverID uint, startPoint, endPoint string, distance float64, status string, startTime, endTime int64, cost float64, remark string) {
	task := models.TransportTask{
		TaskNo:     taskNo,
		OrderID:    orderID,
		VehicleID:  vehicleID,
		DriverID:   driverID,
		StartPoint: startPoint,
		EndPoint:   endPoint,
		Distance:   distance,
		Status:     status,
		StartTime:  startTime,
		EndTime:    endTime,
		Cost:       cost,
		Remark:     remark,
		CTime:      maxNonZero(startTime-1800, startTime, endTime),
		MTime:      maxNonZero(startTime, endTime),
	}
	_ = tx.Create(&task).Error
}

func createDeliveryTask(tx *gorm.DB, taskNo string, orderID, courierID, stationID uint, status string, assignTime, startTime, deliveredTime, signTime int64, failureReason, remark string) {
	task := models.DeliveryTask{
		TaskNo:        taskNo,
		OrderID:       orderID,
		CourierID:     courierID,
		StationID:     stationID,
		Status:        status,
		AssignTime:    assignTime,
		StartTime:     startTime,
		DeliveredTime: deliveredTime,
		SignTime:      signTime,
		FailureReason: failureReason,
		Remark:        remark,
		CTime:         maxNonZero(assignTime, startTime, deliveredTime, signTime),
		MTime:         maxNonZero(assignTime, startTime, deliveredTime, signTime),
	}
	_ = tx.Create(&task).Error
}

func createStationFlow(tx *gorm.DB, orderID, stationID uint, flowType string, operatorID, nextStationID uint, ctime int64, remark string) {
	flow := models.StationFlow{
		OrderID:       orderID,
		StationID:     stationID,
		FlowType:      flowType,
		Quantity:      1,
		Weight:        1,
		Volume:        0.1,
		OperatorID:    operatorID,
		NextStationID: nextStationID,
		Remark:        remark,
		CTime:         ctime,
		MTime:         ctime,
	}
	_ = tx.Create(&flow).Error
}

func createDeliveryRecord(tx *gorm.DB, orderID, driverID, vehicleID, stationID uint, status string, dispatchTime, deliveryTime int64, failReason, remark string) {
	record := models.DeliveryRecord{
		OrderID:      orderID,
		DriverID:     driverID,
		VehicleID:    vehicleID,
		StationID:    stationID,
		DispatchTime: dispatchTime,
		DeliveryTime: deliveryTime,
		Status:       status,
		FailReason:   failReason,
		Remark:       remark,
		CTime:        maxNonZero(dispatchTime, deliveryTime),
		MTime:        maxNonZero(dispatchTime, deliveryTime),
	}
	_ = tx.Create(&record).Error
}

func createTracking(tx *gorm.DB, orderID uint, location string, lat, lng float64, status, description string, operatorID uint, ctime int64) {
	record := models.TrackingRecord{
		OrderID:     orderID,
		Location:    location,
		Latitude:    lat,
		Longitude:   lng,
		Status:      status,
		Description: description,
		OperatorID:  operatorID,
		CTime:       ctime,
		MTime:       ctime,
	}
	_ = tx.Create(&record).Error
}

func createException(tx *gorm.DB, exceptionNo string, orderID uint, exceptionType models.ExceptionType, stationID, reporterID, handlerID uint, description, solution, result string, status models.ExceptionStatus, reportTime int64) {
	record := models.ExceptionRecord{
		ExceptionNo:      exceptionNo,
		OrderID:          orderID,
		Type:             exceptionType,
		Status:           status,
		StationID:        stationID,
		ReporterID:       reporterID,
		HandlerID:        handlerID,
		Description:      description,
		Solution:         solution,
		Result:           result,
		CompensateAmount: 0,
		ReportTime:       reportTime,
		HandleTime:       reportTime + 1800,
		Remark:           description,
		CTime:            reportTime,
		MTime:            reportTime + 1800,
	}
	_ = tx.Create(&record).Error
}

func createCustomsNode(tx *gorm.DB, orderID uint, nodeCode string, operatorID uint, nodeTime int64, duty, vat, other float64, remark string) {
	node := models.OrderCustomsNode{
		OrderID:        orderID,
		NodeCode:       nodeCode,
		NodeStatus:     "completed",
		DutyAmount:     duty,
		VATAmount:      vat,
		OtherTaxAmount: other,
		OperatorID:     operatorID,
		Remark:         remark,
		NodeTime:       nodeTime,
		CTime:          nodeTime,
		MTime:          nodeTime,
	}
	_ = tx.Create(&node).Error
}

func createSignRecord(tx *gorm.DB, orderID, driverID uint, signerName, signerPhone, relation string, signTime int64, stationCode string, lat, lng float64) {
	record := models.SignRecord{
		OrderID:     orderID,
		SignType:    models.SignSelf,
		SignerName:  signerName,
		SignerPhone: signerPhone,
		Relation:    relation,
		SignTime:    signTime,
		DriverID:    driverID,
		StationCode: stationCode,
		Latitude:    lat,
		Longitude:   lng,
		Remark:      "演示签收完成",
		CTime:       signTime,
		MTime:       signTime,
	}
	_ = tx.Create(&record).Error
}

func defaultString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func maxNonZero(values ...int64) int64 {
	var result int64
	for _, value := range values {
		if value > result {
			result = value
		}
	}
	return result
}

func seedDemoOrders(tx *gorm.DB, users *demoUsers, assets *demoAssets, stations *demoStations) error {
	base := time.Now().Add(-72 * time.Hour)

	orders := make(map[string]*models.Order)
	mustCreate := func(input createOrderInput) error {
		order, err := createDemoOrder(tx, input)
		if err != nil {
			return err
		}
		orders[input.OrderNo] = order
		return nil
	}

	inputs := []createOrderInput{
		{OrderNo: "DEMO-ORD-1001", CustomerID: users.CustomerGlobal.ID, SenderName: "上海灵犀电子有限公司", SenderPhone: "021-66001234", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "浦东新区川沙路1888号", SenderPostcode: "201200", ReceiverName: "Olivia Brown", ReceiverPhone: "+1-626-555-0101", ReceiverCountry: "美国", ReceiverProvince: "California", ReceiverCity: "Los Angeles", ReceiverAddress: "19888 Colima Rd, Walnut, CA", ReceiverPostcode: "91789", GoodsName: "手机配件组合包", GoodsCategory: "3C配件", GoodsWeight: 4.6, GoodsVolume: 0.25, GoodsQuantity: 1, GoodsValue: 860, TransportMode: models.TransportAir, ServiceType: "express", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.LAXDest.ID, Status: models.OrderPending, OrderTime: base.Add(2 * time.Hour).Unix(), FreightCharge: 580, CustomsFee: 96, TotalAmount: 676, Currency: "CNY", PaymentStatus: "unpaid", Remark: "等待客服受理", CustomsDeclaration: "手机壳与充电线", HSCode: "392690", DeclaredValue: 860, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1001"},
		{OrderNo: "DEMO-ORD-1002", CustomerID: users.CustomerEU.ID, SenderName: "深圳潮流服饰有限公司", SenderPhone: "0755-22001111", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "宝安区福永街道国际电商园A3栋", SenderPostcode: "518000", ReceiverName: "Mia Schneider", ReceiverPhone: "+49-69-555-0101", ReceiverCountry: "德国", ReceiverProvince: "Hesse", ReceiverCity: "Frankfurt", ReceiverAddress: "Europa-Allee 88, Frankfurt", ReceiverPostcode: "60327", GoodsName: "春季服饰样衣", GoodsCategory: "服饰", GoodsWeight: 7.2, GoodsVolume: 0.42, GoodsQuantity: 2, GoodsValue: 1200, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.FrankfurtDest.ID, Status: models.OrderAccepted, OrderTime: base.Add(6 * time.Hour).Unix(), FreightCharge: 720, CustomsFee: 135, TotalAmount: 855, Currency: "CNY", PaymentStatus: "paid", Remark: "已接单，等待分配揽收任务", CustomsDeclaration: "服装样衣", HSCode: "620443", DeclaredValue: 1200, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1002"},
		{OrderNo: "DEMO-ORD-1003", CustomerID: users.CustomerGlobal.ID, SenderName: "深圳智达数码商行", SenderPhone: "0755-33002222", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "宝安区西乡街道银田工业区3号楼", SenderPostcode: "518102", ReceiverName: "Ethan Miller", ReceiverPhone: "+1-718-555-0102", ReceiverCountry: "美国", ReceiverProvince: "New York", ReceiverCity: "New York", ReceiverAddress: "37-18 Northern Blvd, Queens, NY", ReceiverPostcode: "11101", GoodsName: "蓝牙耳机", GoodsCategory: "数码", GoodsWeight: 1.4, GoodsVolume: 0.08, GoodsQuantity: 1, GoodsValue: 420, TransportMode: models.TransportAir, ServiceType: "express", EstimatedDays: 5, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.JFKDest.ID, CurrentStation: stations.ShenzhenOrigin.ID, Status: models.OrderPickupPending, OrderTime: base.Add(10 * time.Hour).Unix(), FreightCharge: 230, CustomsFee: 48, TotalAmount: 278, Currency: "CNY", PaymentStatus: "paid", Remark: "待快递员上门揽收", CustomsDeclaration: "蓝牙耳机", HSCode: "851830", DeclaredValue: 420, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1003"},
		{OrderNo: "DEMO-ORD-1004", CustomerID: users.CustomerGlobal.ID, SenderName: "深圳维新智能科技", SenderPhone: "0755-55006666", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "龙岗区坂田街道雪岗路2018号", SenderPostcode: "518129", ReceiverName: "Lucas Meyer", ReceiverPhone: "+49-69-555-0103", ReceiverCountry: "德国", ReceiverProvince: "Hesse", ReceiverCity: "Frankfurt", ReceiverAddress: "Kaiserstrasse 44, Frankfurt", ReceiverPostcode: "60329", GoodsName: "智能手表", GoodsCategory: "穿戴设备", GoodsWeight: 2.1, GoodsVolume: 0.12, GoodsQuantity: 1, GoodsValue: 680, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.FrankfurtDest.ID, CurrentStation: stations.ShenzhenOrigin.ID, Status: models.OrderPickingUp, OrderTime: base.Add(14 * time.Hour).Unix(), FreightCharge: 320, CustomsFee: 76, TotalAmount: 396, Currency: "CNY", PaymentStatus: "paid", Remark: "快递员已开始上门揽收", CustomsDeclaration: "智能手表", HSCode: "910212", DeclaredValue: 680, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1004"},
		{OrderNo: "DEMO-ORD-1005", CustomerID: users.CustomerEU.ID, SenderName: "上海家居优品有限公司", SenderPhone: "021-68001122", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "奉贤区南桥镇金海公路2688号", SenderPostcode: "201400", ReceiverName: "Chloe Tan", ReceiverPhone: "+65-6555-0105", ReceiverCountry: "新加坡", ReceiverProvince: "Singapore", ReceiverCity: "Singapore", ReceiverAddress: "10 Kallang Ave, Singapore", ReceiverPostcode: "339510", GoodsName: "家居收纳套装", GoodsCategory: "家居", GoodsWeight: 5.4, GoodsVolume: 0.31, GoodsQuantity: 2, GoodsValue: 980, TransportMode: models.TransportAir, ServiceType: "express", EstimatedDays: 4, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.SingaporeDest.ID, CurrentStation: stations.ShanghaiOrigin.ID, Status: models.OrderPickedUp, OrderTime: base.Add(18 * time.Hour).Unix(), PickupTime: base.Add(20 * time.Hour).Unix(), FreightCharge: 410, CustomsFee: 88, TotalAmount: 498, Currency: "CNY", PaymentStatus: "paid", Remark: "已揽收，等待站点入库", CustomsDeclaration: "塑料收纳盒", HSCode: "392490", DeclaredValue: 980, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1005"},
		{OrderNo: "DEMO-ORD-1006", CustomerID: users.CustomerGlobal.ID, SenderName: "上海凌峰贸易有限公司", SenderPhone: "021-68881234", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "浦东新区东海路559号", SenderPostcode: "200137", ReceiverName: "Sophia Davis", ReceiverPhone: "+1-323-555-0106", ReceiverCountry: "美国", ReceiverProvince: "California", ReceiverCity: "Los Angeles", ReceiverAddress: "4800 Alameda St, Vernon, CA", ReceiverPostcode: "90058", GoodsName: "跨境美妆礼盒", GoodsCategory: "美妆", GoodsWeight: 6.8, GoodsVolume: 0.38, GoodsQuantity: 3, GoodsValue: 1560, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.LAXDest.ID, CurrentStation: stations.ShanghaiOrigin.ID, Status: models.OrderInWarehouse, OrderTime: base.Add(24 * time.Hour).Unix(), PickupTime: base.Add(26 * time.Hour).Unix(), FreightCharge: 690, CustomsFee: 180, TotalAmount: 870, Currency: "CNY", PaymentStatus: "paid", Remark: "已到站待分拣", CustomsDeclaration: "护肤品礼盒", HSCode: "330499", DeclaredValue: 1560, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1006"},
		{OrderNo: "DEMO-ORD-1007", CustomerID: users.CustomerGlobal.ID, SenderName: "上海锐航科技有限公司", SenderPhone: "021-69993344", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "嘉定区沪宜公路2890号", SenderPostcode: "201800", ReceiverName: "Noah Wilson", ReceiverPhone: "+1-718-555-0107", ReceiverCountry: "美国", ReceiverProvince: "New York", ReceiverCity: "New York", ReceiverAddress: "147-35 175th St, Jamaica, NY", ReceiverPostcode: "11434", GoodsName: "平板电脑配件", GoodsCategory: "电子配件", GoodsWeight: 3.2, GoodsVolume: 0.15, GoodsQuantity: 1, GoodsValue: 930, TransportMode: models.TransportAir, ServiceType: "express", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.JFKDest.ID, CurrentStation: stations.ShanghaiOrigin.ID, Status: models.OrderSorting, OrderTime: base.Add(28 * time.Hour).Unix(), PickupTime: base.Add(30 * time.Hour).Unix(), FreightCharge: 460, CustomsFee: 110, TotalAmount: 570, Currency: "CNY", PaymentStatus: "paid", Remark: "分拣任务执行中", CustomsDeclaration: "平板电脑保护套", HSCode: "420292", DeclaredValue: 930, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1007"},
		{OrderNo: "DEMO-ORD-1008", CustomerID: users.CustomerGlobal.ID, SenderName: "上海灵犀电子有限公司", SenderPhone: "021-66001234", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "浦东新区川沙路1888号", SenderPostcode: "201200", ReceiverName: "Olivia Brown", ReceiverPhone: "+1-626-555-0101", ReceiverCountry: "美国", ReceiverProvince: "California", ReceiverCity: "Los Angeles", ReceiverAddress: "19888 Colima Rd, Walnut, CA", ReceiverPostcode: "91789", GoodsName: "消费电子套装", GoodsCategory: "电子产品", GoodsWeight: 8.5, GoodsVolume: 0.52, GoodsQuantity: 2, GoodsValue: 2480, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.LAXDest.ID, CurrentStation: stations.ShanghaiOrigin.ID, Status: models.OrderInTransit, OrderTime: base.Add(32 * time.Hour).Unix(), PickupTime: base.Add(34 * time.Hour).Unix(), FreightCharge: 960, CustomsFee: 280, TotalAmount: 1240, Currency: "CNY", PaymentStatus: "paid", Remark: "已装车发往美国", CustomsDeclaration: "电子消费品", HSCode: "854370", DeclaredValue: 2480, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1008"},
		{OrderNo: "DEMO-ORD-1009", CustomerID: users.CustomerEU.ID, SenderName: "深圳潮流服饰有限公司", SenderPhone: "0755-22001111", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "宝安区福永街道国际电商园A3栋", SenderPostcode: "518000", ReceiverName: "Mia Schneider", ReceiverPhone: "+49-69-555-0101", ReceiverCountry: "德国", ReceiverProvince: "Hesse", ReceiverCity: "Frankfurt", ReceiverAddress: "Europa-Allee 88, Frankfurt", ReceiverPostcode: "60327", GoodsName: "服饰补货包", GoodsCategory: "服饰", GoodsWeight: 9.1, GoodsVolume: 0.6, GoodsQuantity: 3, GoodsValue: 2650, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.FrankfurtDest.ID, CurrentStation: stations.FrankfurtCustoms.ID, Status: models.OrderCustomsClearing, OrderTime: base.Add(36 * time.Hour).Unix(), PickupTime: base.Add(38 * time.Hour).Unix(), FreightCharge: 1100, CustomsFee: 360, TotalAmount: 1460, Currency: "CNY", PaymentStatus: "paid", Remark: "货物抵达法兰克福关务处理中", CustomsDeclaration: "时尚服饰", HSCode: "620443", DeclaredValue: 2650, CustomsDuty: 180, CustomsVAT: 140, CustomsOtherTax: 40, CustomsStatus: "reviewing", ParcelNo: "DEMO-PKG-1009"},
		{OrderNo: "DEMO-ORD-1010", CustomerID: users.CustomerGlobal.ID, SenderName: "上海凌峰贸易有限公司", SenderPhone: "021-68881234", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "浦东新区东海路559号", SenderPostcode: "200137", ReceiverName: "Sophia Davis", ReceiverPhone: "+1-323-555-0106", ReceiverCountry: "美国", ReceiverProvince: "California", ReceiverCity: "Los Angeles", ReceiverAddress: "4800 Alameda St, Vernon, CA", ReceiverPostcode: "90058", GoodsName: "护肤礼盒", GoodsCategory: "美妆", GoodsWeight: 6.8, GoodsVolume: 0.38, GoodsQuantity: 3, GoodsValue: 1560, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.LAXDest.ID, CurrentStation: stations.LAXDest.ID, Status: models.OrderDestinationSorting, OrderTime: base.Add(40 * time.Hour).Unix(), PickupTime: base.Add(42 * time.Hour).Unix(), FreightCharge: 690, CustomsFee: 180, TotalAmount: 870, Currency: "CNY", PaymentStatus: "paid", Remark: "清关完成，进入目的地分拣", CustomsDeclaration: "护肤品礼盒", HSCode: "330499", DeclaredValue: 1560, CustomsDuty: 90, CustomsVAT: 70, CustomsOtherTax: 20, CustomsStatus: "released", ParcelNo: "DEMO-PKG-1010"},
		{OrderNo: "DEMO-ORD-1011", CustomerID: users.CustomerGlobal.ID, SenderName: "上海灵犀电子有限公司", SenderPhone: "021-66001234", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "浦东新区川沙路1888号", SenderPostcode: "201200", ReceiverName: "Olivia Brown", ReceiverPhone: "+1-626-555-0101", ReceiverCountry: "美国", ReceiverProvince: "California", ReceiverCity: "Los Angeles", ReceiverAddress: "19888 Colima Rd, Walnut, CA", ReceiverPostcode: "91789", GoodsName: "消费电子套装", GoodsCategory: "电子产品", GoodsWeight: 8.5, GoodsVolume: 0.52, GoodsQuantity: 2, GoodsValue: 2480, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 5, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.LAXDest.ID, CurrentStation: stations.LAXDest.ID, Status: models.OrderDelivering, OrderTime: base.Add(44 * time.Hour).Unix(), PickupTime: base.Add(46 * time.Hour).Unix(), FreightCharge: 960, CustomsFee: 280, TotalAmount: 1240, Currency: "CNY", PaymentStatus: "paid", Remark: "北美快递员派送中", CustomsDeclaration: "电子消费品", HSCode: "854370", DeclaredValue: 2480, CustomsDuty: 160, CustomsVAT: 90, CustomsOtherTax: 30, CustomsStatus: "released", ParcelNo: "DEMO-PKG-1011"},
		{OrderNo: "DEMO-ORD-1012", CustomerID: users.CustomerEU.ID, SenderName: "深圳潮流服饰有限公司", SenderPhone: "0755-22001111", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "宝安区福永街道国际电商园A3栋", SenderPostcode: "518000", ReceiverName: "Lukas Braun", ReceiverPhone: "+49-69-555-0155", ReceiverCountry: "德国", ReceiverProvince: "Hesse", ReceiverCity: "Frankfurt", ReceiverAddress: "Langer Kornweg 34A, Kelsterbach", ReceiverPostcode: "65451", GoodsName: "服饰补货包", GoodsCategory: "服饰", GoodsWeight: 9.1, GoodsVolume: 0.6, GoodsQuantity: 3, GoodsValue: 2650, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.FrankfurtDest.ID, CurrentStation: stations.FrankfurtDest.ID, Status: models.OrderDelivered, OrderTime: base.Add(48 * time.Hour).Unix(), PickupTime: base.Add(50 * time.Hour).Unix(), DeliveryTime: base.Add(67 * time.Hour).Unix(), FreightCharge: 1100, CustomsFee: 360, TotalAmount: 1460, Currency: "CNY", PaymentStatus: "paid", Remark: "已送达等待签收确认", CustomsDeclaration: "时尚服饰", HSCode: "620443", DeclaredValue: 2650, CustomsDuty: 180, CustomsVAT: 140, CustomsOtherTax: 40, CustomsStatus: "released", ParcelNo: "DEMO-PKG-1012"},
		{OrderNo: "DEMO-ORD-1013", CustomerID: users.CustomerEU.ID, SenderName: "上海家居优品有限公司", SenderPhone: "021-68001122", SenderCountry: "中国", SenderProvince: "上海", SenderCity: "上海", SenderAddress: "奉贤区南桥镇金海公路2688号", SenderPostcode: "201400", ReceiverName: "Chloe Tan", ReceiverPhone: "+65-6555-0105", ReceiverCountry: "新加坡", ReceiverProvince: "Singapore", ReceiverCity: "Singapore", ReceiverAddress: "10 Kallang Ave, Singapore", ReceiverPostcode: "339510", GoodsName: "家居收纳套装", GoodsCategory: "家居", GoodsWeight: 5.4, GoodsVolume: 0.31, GoodsQuantity: 2, GoodsValue: 980, TransportMode: models.TransportAir, ServiceType: "express", EstimatedDays: 4, OriginStationID: stations.ShanghaiOrigin.ID, DestStationID: stations.SingaporeDest.ID, CurrentStation: stations.SingaporeDest.ID, Status: models.OrderSigned, OrderTime: base.Add(52 * time.Hour).Unix(), PickupTime: base.Add(54 * time.Hour).Unix(), DeliveryTime: base.Add(68 * time.Hour).Unix(), SignTime: base.Add(69 * time.Hour).Unix(), FreightCharge: 410, CustomsFee: 88, TotalAmount: 498, Currency: "CNY", PaymentStatus: "paid", Remark: "已妥投并签收完成", CustomsDeclaration: "塑料收纳盒", HSCode: "392490", DeclaredValue: 980, CustomsStatus: "released", ParcelNo: "DEMO-PKG-1013"},
		{OrderNo: "DEMO-ORD-1014", CustomerID: users.CustomerGlobal.ID, SenderName: "深圳维新智能科技", SenderPhone: "0755-55006666", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "龙岗区坂田街道雪岗路2018号", SenderPostcode: "518129", ReceiverName: "Michael Reed", ReceiverPhone: "+1-917-555-0199", ReceiverCountry: "美国", ReceiverProvince: "New York", ReceiverCity: "New York", ReceiverAddress: "Queens Blvd 200, New York", ReceiverPostcode: "11373", GoodsName: "智能手表", GoodsCategory: "穿戴设备", GoodsWeight: 2.1, GoodsVolume: 0.12, GoodsQuantity: 1, GoodsValue: 680, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.JFKDest.ID, CurrentStation: stations.ShenzhenOrigin.ID, Status: models.OrderException, OrderTime: base.Add(56 * time.Hour).Unix(), FreightCharge: 320, CustomsFee: 76, TotalAmount: 396, Currency: "CNY", PaymentStatus: "paid", Remark: "揽收失败待处理", CustomsDeclaration: "智能手表", HSCode: "910212", DeclaredValue: 680, CustomsStatus: "pending", ParcelNo: "DEMO-PKG-1014"},
		{OrderNo: "DEMO-ORD-1015", CustomerID: users.CustomerEU.ID, SenderName: "深圳潮流服饰有限公司", SenderPhone: "0755-22001111", SenderCountry: "中国", SenderProvince: "广东", SenderCity: "深圳", SenderAddress: "宝安区福永街道国际电商园A3栋", SenderPostcode: "518000", ReceiverName: "Lukas Braun", ReceiverPhone: "+49-69-555-0155", ReceiverCountry: "德国", ReceiverProvince: "Hesse", ReceiverCity: "Frankfurt", ReceiverAddress: "Langer Kornweg 34A, Kelsterbach", ReceiverPostcode: "65451", GoodsName: "秋季服饰补货包", GoodsCategory: "服饰", GoodsWeight: 6.6, GoodsVolume: 0.4, GoodsQuantity: 2, GoodsValue: 1880, TransportMode: models.TransportAir, ServiceType: "priority", EstimatedDays: 6, OriginStationID: stations.ShenzhenOrigin.ID, DestStationID: stations.FrankfurtDest.ID, CurrentStation: stations.FrankfurtDest.ID, Status: models.OrderException, OrderTime: base.Add(58 * time.Hour).Unix(), PickupTime: base.Add(60 * time.Hour).Unix(), DeliveryTime: base.Add(70 * time.Hour).Unix(), FreightCharge: 880, CustomsFee: 220, TotalAmount: 1100, Currency: "CNY", PaymentStatus: "paid", Remark: "派送失败待处理", CustomsDeclaration: "服饰", HSCode: "620443", DeclaredValue: 1880, CustomsStatus: "released", ParcelNo: "DEMO-PKG-1015"},
	}

	for _, input := range inputs {
		if err := mustCreate(input); err != nil {
			return err
		}
	}

	return seedLifecycleRecords(tx, users, assets, stations, orders)
}

func seedLifecycleRecords(tx *gorm.DB, users *demoUsers, assets *demoAssets, stations *demoStations, orders map[string]*models.Order) error {
	addStatusChain(tx, orders["DEMO-ORD-1002"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierDE, []models.OrderStatus{models.OrderAccepted}, []string{"调度员已接单"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1003"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending}, []string{"调度员已接单", "已生成待揽收任务"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1004"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierDE, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1005"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1006"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1007"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1008"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往美国"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1009"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierDE, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderCustomsClearing}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往德国", "进入清关处理"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1010"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderCustomsClearing, models.OrderDestinationSorting}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往美国", "清关处理中", "进入目的地分拣"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1011"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderDestinationSorting, models.OrderDelivering}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往美国", "进入目的地分拣", "快递员开始派送"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1012"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierDE, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderCustomsClearing, models.OrderDestinationSorting, models.OrderDelivering, models.OrderDelivered}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往德国", "清关处理中", "进入目的地分拣", "快递员开始派送", "确认已送达"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1013"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderDestinationSorting, models.OrderDelivering, models.OrderDelivered, models.OrderSigned}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往新加坡", "进入目的地分拣", "快递员开始派送", "确认已送达", "客户完成签收"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1014"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierUS, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderException}, []string{"调度员已接单", "已生成待揽收任务", "揽收失败转异常"}, time.Hour)
	addStatusChain(tx, orders["DEMO-ORD-1015"], users.Dispatcher, users.SiteManager, users.CourierCN, users.Sorter, users.DriverCN, users.CourierDE, []models.OrderStatus{models.OrderAccepted, models.OrderPickupPending, models.OrderPickingUp, models.OrderPickedUp, models.OrderInWarehouse, models.OrderSorting, models.OrderInTransit, models.OrderCustomsClearing, models.OrderDestinationSorting, models.OrderDelivering, models.OrderException}, []string{"调度员已接单", "已生成待揽收任务", "快递员开始揽收", "快递员完成揽收", "站点完成入库", "分拣员开始分拣", "装车发往德国", "清关处理中", "进入目的地分拣", "快递员开始派送", "派送失败转异常"}, time.Hour)

	createPickupTask(tx, "DEMO-PU-1003", orders["DEMO-ORD-1003"].ID, users.CourierCN.ID, stations.ShenzhenOrigin.ID, "pending", 0, 0, 0, "", "待上门揽收")
	createPickupTask(tx, "DEMO-PU-1004", orders["DEMO-ORD-1004"].ID, users.CourierCN.ID, stations.ShenzhenOrigin.ID, "picking_up", orders["DEMO-ORD-1004"].OrderTime+1800, orders["DEMO-ORD-1004"].OrderTime+2700, 0, "", "正在上门揽收")
	createPickupTask(tx, "DEMO-PU-1005", orders["DEMO-ORD-1005"].ID, users.CourierCN.ID, stations.ShanghaiOrigin.ID, "picked_up", orders["DEMO-ORD-1005"].OrderTime+1800, orders["DEMO-ORD-1005"].OrderTime+2400, orders["DEMO-ORD-1005"].PickupTime, "", "已完成揽收")
	createPickupTask(tx, "DEMO-PU-1014", orders["DEMO-ORD-1014"].ID, users.CourierCN.ID, stations.ShenzhenOrigin.ID, "failed", orders["DEMO-ORD-1014"].OrderTime+1200, orders["DEMO-ORD-1014"].OrderTime+1800, 0, "发件人电话无人接听", "揽收失败等待处理")

	createStationFlow(tx, orders["DEMO-ORD-1006"].ID, stations.ShanghaiOrigin.ID, "in", users.SiteManager.ID, 0, orders["DEMO-ORD-1006"].PickupTime+1800, "站点完成入库")
	createStationFlow(tx, orders["DEMO-ORD-1007"].ID, stations.ShanghaiOrigin.ID, "in", users.SiteManager.ID, 0, orders["DEMO-ORD-1007"].PickupTime+1800, "站点完成入库")
	createStationFlow(tx, orders["DEMO-ORD-1008"].ID, stations.ShanghaiOrigin.ID, "in", users.SiteManager.ID, 0, orders["DEMO-ORD-1008"].PickupTime+1200, "入库待发运")
	createStationFlow(tx, orders["DEMO-ORD-1008"].ID, stations.ShanghaiOrigin.ID, "out", users.DriverCN.ID, stations.HangzhouTransit.ID, orders["DEMO-ORD-1008"].PickupTime+7200, "已出库发车")
	createStationFlow(tx, orders["DEMO-ORD-1009"].ID, stations.ShenzhenOrigin.ID, "out", users.DriverCN.ID, stations.FrankfurtCustoms.ID, orders["DEMO-ORD-1009"].PickupTime+10800, "发往法兰克福关务中心")
	createStationFlow(tx, orders["DEMO-ORD-1010"].ID, stations.LAXDest.ID, "in", users.SiteManager.ID, 0, orders["DEMO-ORD-1010"].OrderTime+36000, "目的站接收入库")

	createTransportTask(tx, "DEMO-TK-1008", orders["DEMO-ORD-1008"].ID, assets.VehicleCN.ID, users.DriverCN.ID, stations.ShanghaiOrigin.Name, stations.HangzhouTransit.Name, 180, "in_progress", orders["DEMO-ORD-1008"].PickupTime+7200, 0, 8600, "华东转运干线")
	createDeliveryRecord(tx, orders["DEMO-ORD-1008"].ID, users.DriverCN.ID, assets.VehicleCN.ID, stations.ShanghaiOrigin.ID, "loaded", orders["DEMO-ORD-1008"].PickupTime+7200, 0, "", "已装车待发")
	createTransportTask(tx, "DEMO-TK-1009", orders["DEMO-ORD-1009"].ID, assets.VehicleCN.ID, users.DriverCN.ID, stations.ShenzhenOrigin.Name, stations.FrankfurtCustoms.Name, 9300, "completed", orders["DEMO-ORD-1009"].PickupTime+10800, orders["DEMO-ORD-1009"].OrderTime+34000, 15400, "深圳至法兰克福航线")
	createDeliveryRecord(tx, orders["DEMO-ORD-1009"].ID, users.DriverCN.ID, assets.VehicleCN.ID, stations.ShenzhenOrigin.ID, "loaded", orders["DEMO-ORD-1009"].PickupTime+10800, 0, "", "深圳起飞")
	createDeliveryRecord(tx, orders["DEMO-ORD-1009"].ID, users.DriverCN.ID, assets.VehicleCN.ID, stations.FrankfurtCustoms.ID, "unloaded", 0, orders["DEMO-ORD-1009"].OrderTime+34000, "", "抵达法兰克福")
	createTransportTask(tx, "DEMO-TK-1010", orders["DEMO-ORD-1010"].ID, assets.VehicleCN.ID, users.DriverCN.ID, stations.ShanghaiOrigin.Name, stations.LAXDest.Name, 10450, "completed", orders["DEMO-ORD-1010"].OrderTime+9600, orders["DEMO-ORD-1010"].OrderTime+36000, 16800, "上海至洛杉矶航线")
	createDeliveryRecord(tx, orders["DEMO-ORD-1010"].ID, users.DriverCN.ID, assets.VehicleCN.ID, stations.ShanghaiOrigin.ID, "loaded", orders["DEMO-ORD-1010"].OrderTime+9600, 0, "", "装车发往航空口岸")
	createDeliveryRecord(tx, orders["DEMO-ORD-1010"].ID, users.DriverCN.ID, assets.VehicleCN.ID, stations.LAXCustoms.ID, "unloaded", 0, orders["DEMO-ORD-1010"].OrderTime+30000, "", "到达洛杉矶监管仓")
	createTransportTask(tx, "DEMO-TK-1012", orders["DEMO-ORD-1012"].ID, assets.VehicleCN.ID, users.DriverCN.ID, stations.ShenzhenOrigin.Name, stations.FrankfurtDest.Name, 9200, "completed", orders["DEMO-ORD-1012"].OrderTime+9600, orders["DEMO-ORD-1012"].OrderTime+42000, 15200, "深圳至法兰克福航线")
	createTransportTask(tx, "DEMO-TK-1013", orders["DEMO-ORD-1013"].ID, assets.VehicleCN.ID, users.DriverCN.ID, stations.ShanghaiOrigin.Name, stations.SingaporeDest.Name, 3800, "completed", orders["DEMO-ORD-1013"].OrderTime+8400, orders["DEMO-ORD-1013"].OrderTime+30000, 8800, "上海至新加坡航线")

	createDeliveryTask(tx, "DEMO-DL-1010", orders["DEMO-ORD-1010"].ID, users.CourierUS.ID, stations.LAXDest.ID, "pending", 0, 0, 0, 0, "", "等待北美快递员认领")
	createDeliveryTask(tx, "DEMO-DL-1011", orders["DEMO-ORD-1011"].ID, users.CourierUS.ID, stations.LAXDest.ID, "delivering", orders["DEMO-ORD-1011"].OrderTime+43000, orders["DEMO-ORD-1011"].OrderTime+43800, 0, 0, "", "派送中")
	createDeliveryTask(tx, "DEMO-DL-1012", orders["DEMO-ORD-1012"].ID, users.CourierDE.ID, stations.FrankfurtDest.ID, "delivered", orders["DEMO-ORD-1012"].OrderTime+43000, orders["DEMO-ORD-1012"].OrderTime+44000, orders["DEMO-ORD-1012"].DeliveryTime, 0, "", "已送达待签收")
	createDeliveryTask(tx, "DEMO-DL-1013", orders["DEMO-ORD-1013"].ID, users.CourierUS.ID, stations.SingaporeDest.ID, "signed", orders["DEMO-ORD-1013"].OrderTime+31000, orders["DEMO-ORD-1013"].OrderTime+32000, orders["DEMO-ORD-1013"].DeliveryTime, orders["DEMO-ORD-1013"].SignTime, "", "已完成签收")
	createDeliveryTask(tx, "DEMO-DL-1015", orders["DEMO-ORD-1015"].ID, users.CourierDE.ID, stations.FrankfurtDest.ID, "failed", orders["DEMO-ORD-1015"].OrderTime+37000, orders["DEMO-ORD-1015"].OrderTime+37600, 0, 0, "收件地址无人签收", "派送失败等待客服处理")

	createDeliveryRecord(tx, orders["DEMO-ORD-1011"].ID, users.CourierUS.ID, 0, stations.LAXDest.ID, "delivering", orders["DEMO-ORD-1011"].OrderTime+43800, 0, "", "快递员已出发")
	createDeliveryRecord(tx, orders["DEMO-ORD-1012"].ID, users.CourierDE.ID, 0, stations.FrankfurtDest.ID, "delivered", orders["DEMO-ORD-1012"].OrderTime+44000, orders["DEMO-ORD-1012"].DeliveryTime, "", "已送达待签收")
	createDeliveryRecord(tx, orders["DEMO-ORD-1015"].ID, users.CourierDE.ID, 0, stations.FrankfurtDest.ID, "failed", orders["DEMO-ORD-1015"].OrderTime+37600, orders["DEMO-ORD-1015"].OrderTime+39400, "收件地址无人签收", "派送失败")

	createSignRecord(tx, orders["DEMO-ORD-1013"].ID, users.CourierUS.ID, "Chloe Tan", "+65-6555-0105", "本人", orders["DEMO-ORD-1013"].SignTime, stations.SingaporeDest.StationCode, stations.SingaporeDest.Latitude, stations.SingaporeDest.Longitude)

	createException(tx, "DEMO-EX-1014", orders["DEMO-ORD-1014"].ID, models.ExceptionOther, stations.ShenzhenOrigin.ID, users.CourierCN.ID, users.Dispatcher.ID, "揽收失败，发件人电话无人接听，约定重新上门", "等待客户重新预约", "待二次揽收", models.ExceptionPending, orders["DEMO-ORD-1014"].OrderTime+3600)
	createException(tx, "DEMO-EX-1015", orders["DEMO-ORD-1015"].ID, models.ExceptionAddressErr, stations.FrankfurtDest.ID, users.CourierDE.ID, users.Dispatcher.ID, "派送失败，地址楼层信息缺失", "联系客户补充地址", "待补充门牌信息", models.ExceptionProcessing, orders["DEMO-ORD-1015"].OrderTime+39600)

	createCustomsNode(tx, orders["DEMO-ORD-1009"].ID, models.CustomsNodeDeclared, users.Dispatcher.ID, orders["DEMO-ORD-1009"].OrderTime+24000, 0, 0, 0, "已提交进口申报")
	createCustomsNode(tx, orders["DEMO-ORD-1009"].ID, models.CustomsNodeReviewing, users.Dispatcher.ID, orders["DEMO-ORD-1009"].OrderTime+28000, 180, 140, 40, "等待海关审核")
	createCustomsNode(tx, orders["DEMO-ORD-1010"].ID, models.CustomsNodeReleased, users.Dispatcher.ID, orders["DEMO-ORD-1010"].OrderTime+33000, 90, 70, 20, "税费结清并放行")

	createTracking(tx, orders["DEMO-ORD-1001"].ID, "上海", stations.ShanghaiOrigin.Latitude, stations.ShanghaiOrigin.Longitude, "待处理", "订单已创建，等待客服受理", users.CustomerGlobal.ID, orders["DEMO-ORD-1001"].OrderTime)
	createTracking(tx, orders["DEMO-ORD-1002"].ID, "深圳", stations.ShenzhenOrigin.Latitude, stations.ShenzhenOrigin.Longitude, "已接单", "调度员已接单，待生成揽收任务", users.Dispatcher.ID, orders["DEMO-ORD-1002"].OrderTime+1800)
	createTracking(tx, orders["DEMO-ORD-1003"].ID, stations.ShenzhenOrigin.Name, stations.ShenzhenOrigin.Latitude, stations.ShenzhenOrigin.Longitude, "待揽收", "订单已进入快递员待揽收池", users.SiteManager.ID, orders["DEMO-ORD-1003"].OrderTime+1200)
	createTracking(tx, orders["DEMO-ORD-1004"].ID, "深圳龙岗", stations.ShenzhenOrigin.Latitude, stations.ShenzhenOrigin.Longitude, "揽收中", "快递员已开始上门揽收", users.CourierCN.ID, orders["DEMO-ORD-1004"].OrderTime+2700)
	createTracking(tx, orders["DEMO-ORD-1005"].ID, stations.ShanghaiOrigin.Name, stations.ShanghaiOrigin.Latitude, stations.ShanghaiOrigin.Longitude, "已揽收", "快递员完成揽收，等待站点入库", users.CourierCN.ID, orders["DEMO-ORD-1005"].PickupTime)
	createTracking(tx, orders["DEMO-ORD-1006"].ID, stations.ShanghaiOrigin.Name, stations.ShanghaiOrigin.Latitude, stations.ShanghaiOrigin.Longitude, "已入库", "货物已完成站点入库", users.SiteManager.ID, orders["DEMO-ORD-1006"].PickupTime+1800)
	createTracking(tx, orders["DEMO-ORD-1007"].ID, stations.ShanghaiOrigin.Name, stations.ShanghaiOrigin.Latitude, stations.ShanghaiOrigin.Longitude, "分拣中", "分拣任务已启动，等待装车", users.Sorter.ID, orders["DEMO-ORD-1007"].OrderTime+28800)
	createTracking(tx, orders["DEMO-ORD-1008"].ID, stations.ShanghaiOrigin.Name, stations.ShanghaiOrigin.Latitude, stations.ShanghaiOrigin.Longitude, "运输中", "已装车发往美国", users.DriverCN.ID, orders["DEMO-ORD-1008"].PickupTime+7200)
	createTracking(tx, orders["DEMO-ORD-1009"].ID, stations.FrankfurtCustoms.Name, stations.FrankfurtCustoms.Latitude, stations.FrankfurtCustoms.Longitude, "清关中", "货物已抵达法兰克福关务中心", users.Dispatcher.ID, orders["DEMO-ORD-1009"].OrderTime+34000)
	createTracking(tx, orders["DEMO-ORD-1010"].ID, stations.LAXDest.Name, stations.LAXDest.Latitude, stations.LAXDest.Longitude, "目的地分拣", "清关放行，进入目的地分拣", users.SiteManager.ID, orders["DEMO-ORD-1010"].OrderTime+36000)
	createTracking(tx, orders["DEMO-ORD-1011"].ID, stations.LAXDest.Name, stations.LAXDest.Latitude, stations.LAXDest.Longitude, "配送中", "北美快递员已开始派送", users.CourierUS.ID, orders["DEMO-ORD-1011"].OrderTime+43800)
	createTracking(tx, orders["DEMO-ORD-1012"].ID, stations.FrankfurtDest.Name, stations.FrankfurtDest.Latitude, stations.FrankfurtDest.Longitude, "已送达", "货物已送达等待签收", users.CourierDE.ID, orders["DEMO-ORD-1012"].DeliveryTime)
	createTracking(tx, orders["DEMO-ORD-1013"].ID, stations.SingaporeDest.Name, stations.SingaporeDest.Latitude, stations.SingaporeDest.Longitude, "已签收", "客户已完成签收", users.CourierUS.ID, orders["DEMO-ORD-1013"].SignTime)
	createTracking(tx, orders["DEMO-ORD-1014"].ID, stations.ShenzhenOrigin.Name, stations.ShenzhenOrigin.Latitude, stations.ShenzhenOrigin.Longitude, "揽收失败", "揽收失败，已转异常处理", users.CourierCN.ID, orders["DEMO-ORD-1014"].OrderTime+3600)
	createTracking(tx, orders["DEMO-ORD-1015"].ID, stations.FrankfurtDest.Name, stations.FrankfurtDest.Latitude, stations.FrankfurtDest.Longitude, "派送失败", "派送失败，等待补充地址", users.CourierDE.ID, orders["DEMO-ORD-1015"].OrderTime+39600)

	return nil
}
