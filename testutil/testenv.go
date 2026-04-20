package testutil

import (
	"fmt"
	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/models"
	"logistics-system/utils"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

var (
	initOnce sync.Once
	initErr  error
)

func EnsureTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	initOnce.Do(func() {
		loadDotEnvUpward()
		cfg := config.LoadConfig()
		utils.InitJWT(cfg.JWT.Secret)
		initErr = database.InitDB(cfg)
	})
	if initErr != nil {
		t.Skipf("skip integration test: %v", initErr)
	}
	if database.DB == nil {
		t.Skip("skip integration test: database is nil")
	}
	return database.DB
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

func Unique(prefix string) string {
	return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
}

func UniquePhone() string {
	n := time.Now().UnixNano()%1000000000 + 100000000
	prefix := 3 + time.Now().UnixNano()%7
	return fmt.Sprintf("1%d%d", prefix, n)
}

func CreateTestUser(t *testing.T, role models.UserRole) *models.User {
	t.Helper()
	db := EnsureTestDB(t)
	hash, err := utils.HashPassword("Pass1234")
	if err != nil {
		t.Fatalf("hash password failed: %v", err)
	}
	user := &models.User{
		Username: Unique("test_user"),
		Password: hash,
		Email:    Unique("test_user") + "@test.local",
		Phone:    UniquePhone(),
		RealName: Unique("测试用户"),
		Role:     role,
		Status:   1,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("create test user failed: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("id = ?", user.ID).Delete(&models.User{}).Error
	})
	return user
}

func CreateTestStation(t *testing.T, stationType models.StationType) *models.Station {
	t.Helper()
	db := EnsureTestDB(t)
	station := &models.Station{
		StationCode: fmt.Sprintf("ST%d", time.Now().UnixNano()),
		Name:        Unique("测试站点"),
		Type:        stationType,
		Country:     "中国",
		Province:    "上海",
		City:        "上海",
		Address:     Unique("测试地址"),
		Latitude:    31.2304,
		Longitude:   121.4737,
		Capacity:    1000,
		Status:      1,
	}
	if err := db.Create(station).Error; err != nil {
		t.Fatalf("create test station failed: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("station_id = ?", station.ID).Delete(&models.SortingRule{}).Error
		_ = db.Where("station_id = ?", station.ID).Delete(&models.DeliveryRecord{}).Error
		_ = db.Where("station_id = ?", station.ID).Delete(&models.ExceptionRecord{}).Error
		_ = db.Where("id = ?", station.ID).Delete(&models.Station{}).Error
	})
	return station
}

func CreateTestVehicle(t *testing.T, driverID uint) *models.Vehicle {
	t.Helper()
	db := EnsureTestDB(t)
	vehicle := &models.Vehicle{
		PlateNumber: fmt.Sprintf("TEST%d", time.Now().UnixNano()%1000000),
		VehicleType: "测试车辆",
		Capacity:    10,
		DriverID:    driverID,
		Status:      1,
	}
	if err := db.Create(vehicle).Error; err != nil {
		t.Fatalf("create test vehicle failed: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("vehicle_id = ?", vehicle.ID).Delete(&models.DeliveryRecord{}).Error
		_ = db.Where("vehicle_id = ?", vehicle.ID).Delete(&models.TransportTask{}).Error
		_ = db.Where("vehicle_id = ?", vehicle.ID).Delete(&models.BatchSchedule{}).Error
		_ = db.Where("vehicle_id = ?", vehicle.ID).Delete(&models.TransportPlan{}).Error
		_ = db.Where("id = ?", vehicle.ID).Delete(&models.Vehicle{}).Error
	})
	return vehicle
}

func CreateTestOrder(t *testing.T, customerID uint, status models.OrderStatus) *models.Order {
	t.Helper()
	db := EnsureTestDB(t)
	order := &models.Order{
		OrderNo:          fmt.Sprintf("TORD%d", time.Now().UnixNano()),
		CustomerID:       customerID,
		HierarchyType:    models.OrderHierarchyNormal,
		RelationType:     models.OrderRelationNormal,
		SenderName:       "测试发件人",
		SenderPhone:      "13800000001",
		SenderCountry:    "中国",
		SenderProvince:   "上海",
		SenderCity:       "上海",
		SenderAddress:    "测试发件地址1号",
		SenderPostcode:   "200000",
		ReceiverName:     "测试收件人",
		ReceiverPhone:    "13900000001",
		ReceiverCountry:  "中国",
		ReceiverProvince: "江苏",
		ReceiverCity:     "苏州",
		ReceiverAddress:  "测试收件地址8号",
		ReceiverPostcode: "215000",
		GoodsName:        "测试货物",
		GoodsCategory:    "文件",
		GoodsWeight:      5.5,
		GoodsVolume:      0.6,
		GoodsQuantity:    1,
		GoodsValue:       300,
		TransportMode:    models.TransportLand,
		ServiceType:      "standard",
		EstimatedDays:    3,
		FreightCharge:    55,
		TotalAmount:      55,
		Currency:         "CNY",
		PaymentStatus:    "unpaid",
		Status:           status,
		OrderTime:        time.Now().Unix(),
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("create test order failed: %v", err)
	}
	order.RootOrderID = order.ID
	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Update("root_order_id", order.ID).Error; err != nil {
		t.Fatalf("update test order root failed: %v", err)
	}
	pkg := &models.OrderPackage{
		OrderID:       order.ID,
		RootOrderID:   order.ID,
		SourceOrderID: order.ID,
		ParcelNo:      fmt.Sprintf("TPKG%d", time.Now().UnixNano()),
		PackageType:   models.OrderPackageTypeNormal,
		GoodsName:     order.GoodsName,
		GoodsCategory: order.GoodsCategory,
		Weight:        order.GoodsWeight,
		Volume:        order.GoodsVolume,
		Quantity:      order.GoodsQuantity,
		GoodsValue:    order.GoodsValue,
		InsuredAmount: order.InsuredAmount,
	}
	if err := db.Create(pkg).Error; err != nil {
		t.Fatalf("create test order package failed: %v", err)
	}
	t.Cleanup(func() {
		CleanupOrderData(t, order.ID)
	})
	return order
}

func CleanupOrderData(t *testing.T, orderID uint) {
	t.Helper()
	db := EnsureTestDB(t)

	var order models.Order
	if err := db.Select("id, parent_order_id, root_order_id").Where("id = ?", orderID).First(&order).Error; err != nil {
		return
	}

	rootOrderID := order.RootOrderID
	if rootOrderID == 0 {
		if order.ParentOrderID > 0 {
			rootOrderID = order.ParentOrderID
		} else {
			rootOrderID = order.ID
		}
	}

	var orderIDs []uint
	_ = db.Model(&models.Order{}).
		Where("id = ? OR root_order_id = ? OR parent_order_id = ?", rootOrderID, rootOrderID, rootOrderID).
		Pluck("id", &orderIDs).Error
	if len(orderIDs) == 0 {
		orderIDs = []uint{orderID}
	}

	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.TransportPlanOrder{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.ExceptionRecord{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.TrackingRecord{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.OrderStatusLog{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.SignRecord{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.DeliveryRecord{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.TransportTask{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.SortingRecord{}).Error
	_ = db.Where("order_id IN ?", orderIDs).Delete(&models.StationFlow{}).Error
	_ = db.Where("order_id IN ? OR root_order_id = ? OR source_order_id IN ?", orderIDs, rootOrderID, orderIDs).Delete(&models.OrderPackage{}).Error
	_ = db.Where("id IN ?", orderIDs).Delete(&models.Order{}).Error
}
