package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"

	"gorm.io/gorm"
)

func TestOrderServiceCoreCalculations(t *testing.T) {
	service := NewOrderService()
	req := &dto.CreateOrderRequest{
		SenderName:      "发件人",
		SenderPhone:     "13800000001",
		SenderCountry:   "中国",
		SenderCity:      "上海",
		SenderAddress:   "上海地址",
		ReceiverName:    "收件人",
		ReceiverPhone:   "13900000001",
		ReceiverCountry: "美国",
		ReceiverCity:    "纽约",
		ReceiverAddress: "纽约地址",
		GoodsName:       "文件",
		GoodsWeight:     10,
		GoodsVolume:     0.1,
		TransportMode:   1,
	}

	if err := service.validateOrderParams(req); err != nil {
		t.Fatalf("expected valid order params, got error: %v", err)
	}

	freight := service.calculateFreight(req)
	if freight <= 0 {
		t.Fatalf("expected positive freight, got %v", freight)
	}

	estimatedDays := service.estimateDeliveryDays(req.TransportMode, req.SenderCountry, req.ReceiverCountry)
	if estimatedDays <= 0 {
		t.Fatalf("expected positive estimated days, got %d", estimatedDays)
	}
}

func TestCreateOrderAndUpdateStatusFlowIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	admin := testutil.CreateTestUser(t, models.RoleAdmin)
	testutil.CreateTestStation(t, models.StationOrigin)

	req := &dto.CreateOrderRequest{
		SenderName:       "测试发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "上海",
		SenderCity:       "上海",
		SenderAddress:    "上海测试路1号",
		SenderPostcode:   "200000",
		ReceiverName:     "测试收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "中国",
		ReceiverProvince: "江苏",
		ReceiverCity:     "苏州",
		ReceiverAddress:  "苏州测试路8号",
		ReceiverPostcode: "215000",
		GoodsName:        "测试货物",
		GoodsCategory:    "文件",
		GoodsWeight:      3.5,
		GoodsVolume:      0.2,
		GoodsQuantity:    1,
		GoodsValue:       100,
		TransportMode:    3,
		ServiceType:      "standard",
	}

	order, err := service.CreateOrder(customer.ID, req)
	if err != nil {
		t.Fatalf("create order failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	if order.Status != models.OrderPickupPending {
		t.Fatalf("expected initial status pickup pending, got %v", order.Status)
	}

	var pickupTaskCount int64
	if err := db.Model(&models.PickupTask{}).Where("order_id = ?", order.ID).Count(&pickupTaskCount).Error; err != nil {
		t.Fatalf("count pickup tasks failed: %v", err)
	}
	if pickupTaskCount != 1 {
		t.Fatalf("expected 1 auto-created pickup task, got %d", pickupTaskCount)
	}
	if order.OriginStationID == 0 {
		t.Fatal("expected origin station to be auto assigned")
	}

	for _, step := range []int{int(models.OrderPickingUp), int(models.OrderPickedUp), int(models.OrderInWarehouse), int(models.OrderSorting)} {
		if err := service.UpdateOrderStatus(order.ID, step, admin.ID, int(models.RoleAdmin), "自动化测试推进状态"); err != nil {
			t.Fatalf("update order status to %d failed: %v", step, err)
		}
	}

	updated, err := service.GetOrderByID(order.ID)
	if err != nil {
		t.Fatalf("get order by id failed: %v", err)
	}
	if updated.Status != models.OrderSorting {
		t.Fatalf("expected final status sorting, got %v", updated.Status)
	}

	logs, err := service.GetOrderStatusLogs(order.ID)
	if err != nil {
		t.Fatalf("get order status logs failed: %v", err)
	}
	if len(logs) < 6 {
		t.Fatalf("expected at least 6 status logs, got %d", len(logs))
	}
}

func TestCreateOrderWithPackagesCreatesMultipleParcels(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	req := &dto.CreateOrderRequest{
		SenderName:       "测试发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "上海",
		SenderCity:       "上海",
		SenderAddress:    "上海测试路1号",
		SenderPostcode:   "200000",
		ReceiverName:     "测试收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "美国",
		ReceiverProvince: "加州",
		ReceiverCity:     "洛杉矶",
		ReceiverAddress:  "测试大道8号",
		ReceiverPostcode: "90001",
		GoodsName:        "组合货物",
		GoodsCategory:    "包裹",
		GoodsWeight:      1,
		GoodsVolume:      0,
		GoodsQuantity:    1,
		GoodsValue:       0,
		TransportMode:    1,
		ServiceType:      "standard",
		Packages: []dto.OrderPackageRequest{
			{GoodsName: "衣服", Weight: 1.2, Volume: 0.1, Quantity: 1, GoodsValue: 200},
			{GoodsName: "鞋子", Weight: 2.3, Volume: 0.2, Quantity: 2, GoodsValue: 300},
		},
	}

	order, err := service.CreateOrder(customer.ID, req)
	if err != nil {
		t.Fatalf("create order with packages failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	detail, err := service.GetOrderDetailResponse(order.ID)
	if err != nil {
		t.Fatalf("load order detail failed: %v", err)
	}
	if len(detail.Packages) != 2 {
		t.Fatalf("expected 2 packages, got %d", len(detail.Packages))
	}
	if detail.PackageCount != 2 {
		t.Fatalf("expected package_count 2, got %d", detail.PackageCount)
	}
	if detail.GoodsWeight <= 3.4 || detail.GoodsWeight >= 3.6 {
		t.Fatalf("expected aggregated weight about 3.5, got %v", detail.GoodsWeight)
	}
}

func TestCreateOrderDoesNotCrossProvinceAutoAssignPickupStation(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	order, err := service.CreateOrder(customer.ID, &dto.CreateOrderRequest{
		SenderName:       "福建发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "福建",
		SenderCity:       "福州",
		SenderAddress:    "福州测试路1号",
		SenderPostcode:   "350000",
		ReceiverName:     "苏州收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "中国",
		ReceiverProvince: "江苏",
		ReceiverCity:     "苏州",
		ReceiverAddress:  "苏州测试路8号",
		ReceiverPostcode: "215000",
		GoodsName:        "跨省校验货物",
		GoodsCategory:    "文件",
		GoodsWeight:      1.5,
		GoodsVolume:      0.1,
		GoodsQuantity:    1,
		GoodsValue:       50,
		TransportMode:    3,
		ServiceType:      "standard",
	})
	if err != nil {
		t.Fatalf("create order failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	if order.Status != models.OrderPending {
		t.Fatalf("expected order to stay pending without province-matched origin station, got %v", order.Status)
	}
	if order.OriginStationID != 0 {
		t.Fatalf("expected origin station to stay empty, got %d", order.OriginStationID)
	}

	var pickupTaskCount int64
	if err := db.Model(&models.PickupTask{}).Where("order_id = ?", order.ID).Count(&pickupTaskCount).Error; err != nil {
		t.Fatalf("count pickup tasks failed: %v", err)
	}
	if pickupTaskCount != 0 {
		t.Fatalf("expected no auto-created pickup task, got %d", pickupTaskCount)
	}

	var statusLogs []models.OrderStatusLog
	if err := db.Where("order_id = ?", order.ID).Find(&statusLogs).Error; err != nil && err != gorm.ErrRecordNotFound {
		t.Fatalf("query order status logs failed: %v", err)
	}
	if len(statusLogs) != 0 {
		t.Fatalf("expected no auto status logs when station is unresolved, got %d", len(statusLogs))
	}
}

func TestCreateOrderAutoAssignsPickupStationByServiceArea(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)

	beijing := testutil.CreateTestStation(t, models.StationOrigin)
	shenzhen := testutil.CreateTestStation(t, models.StationOrigin)

	if err := db.Model(&models.Station{}).Where("id = ?", beijing.ID).Updates(map[string]interface{}{
		"station_code": "TEST-BJ-OR",
		"name":         "北京始发测试站",
		"province":     "北京市",
		"city":         "北京",
	}).Error; err != nil {
		t.Fatalf("update beijing station failed: %v", err)
	}
	if err := db.Model(&models.Station{}).Where("id = ?", shenzhen.ID).Updates(map[string]interface{}{
		"station_code": "TEST-SZ-OR",
		"province":     "广东",
		"city":         "深圳",
	}).Error; err != nil {
		t.Fatalf("update shenzhen station failed: %v", err)
	}

	serviceArea := &models.StationServiceArea{
		StationID: shenzhen.ID,
		Country:   "中国",
		Province:  "福建",
		Priority:  300,
		Status:    1,
		Remark:    "福建由深圳始发站承接",
	}
	if err := db.Create(serviceArea).Error; err != nil {
		t.Fatalf("create station service area failed: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("id = ?", serviceArea.ID).Delete(&models.StationServiceArea{}).Error
	})

	order, err := service.CreateOrder(customer.ID, &dto.CreateOrderRequest{
		SenderName:       "福建发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "福建",
		SenderCity:       "福州",
		SenderAddress:    "福州测试路1号",
		SenderPostcode:   "350000",
		ReceiverName:     "上海收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "中国",
		ReceiverProvince: "上海",
		ReceiverCity:     "上海",
		ReceiverAddress:  "上海测试路8号",
		ReceiverPostcode: "200000",
		GoodsName:        "服务范围货物",
		GoodsCategory:    "文件",
		GoodsWeight:      1.2,
		GoodsVolume:      0.1,
		GoodsQuantity:    1,
		GoodsValue:       80,
		TransportMode:    3,
		ServiceType:      "standard",
	})
	if err != nil {
		t.Fatalf("create order failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	if order.OriginStationID != shenzhen.ID {
		t.Fatalf("expected order to match shenzhen station %d by service area, got %d", shenzhen.ID, order.OriginStationID)
	}
	if order.Status != models.OrderPickupPending {
		t.Fatalf("expected order status pickup pending, got %v", order.Status)
	}
}

func TestSplitOrderCreatesChildOrdersAndMovesPackages(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	order, err := service.CreateOrder(customer.ID, &dto.CreateOrderRequest{
		SenderName:       "测试发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "上海",
		SenderCity:       "上海",
		SenderAddress:    "上海测试路1号",
		SenderPostcode:   "200000",
		ReceiverName:     "测试收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "中国",
		ReceiverProvince: "江苏",
		ReceiverCity:     "苏州",
		ReceiverAddress:  "苏州测试路8号",
		ReceiverPostcode: "215000",
		GoodsName:        "待拆单订单",
		GoodsCategory:    "包裹",
		GoodsWeight:      1,
		GoodsVolume:      0,
		GoodsQuantity:    1,
		GoodsValue:       0,
		TransportMode:    3,
		ServiceType:      "standard",
		Packages: []dto.OrderPackageRequest{
			{GoodsName: "包裹A", Weight: 1.1, Quantity: 1, GoodsValue: 100},
			{GoodsName: "包裹B", Weight: 1.2, Quantity: 1, GoodsValue: 200},
			{GoodsName: "包裹C", Weight: 1.3, Quantity: 1, GoodsValue: 300},
		},
	})
	if err != nil {
		t.Fatalf("create split source order failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	detail, err := service.GetOrderDetailResponse(order.ID)
	if err != nil {
		t.Fatalf("load source detail failed: %v", err)
	}
	if len(detail.Packages) != 3 {
		t.Fatalf("expected 3 packages before split, got %d", len(detail.Packages))
	}

	result, err := service.SplitOrder(order.ID, &dto.SplitOrderRequest{
		ChildOrders: []dto.SplitOrderChildRequest{
			{PackageIDs: []uint{detail.Packages[0].ID}, Remark: "子单A"},
			{PackageIDs: []uint{detail.Packages[1].ID, detail.Packages[2].ID}, Remark: "子单B"},
		},
	})
	if err != nil {
		t.Fatalf("split order failed: %v", err)
	}
	if len(result.ChildOrders) != 2 {
		t.Fatalf("expected 2 child orders, got %d", len(result.ChildOrders))
	}

	parentDetail, err := service.GetOrderDetailResponse(order.ID)
	if err != nil {
		t.Fatalf("load parent detail failed: %v", err)
	}
	if parentDetail.HierarchyType != models.OrderHierarchyMaster {
		t.Fatalf("expected parent hierarchy master, got %s", parentDetail.HierarchyType)
	}
	if parentDetail.ChildOrderCount != 2 {
		t.Fatalf("expected child_order_count 2, got %d", parentDetail.ChildOrderCount)
	}
	if parentDetail.PackageCount != 3 {
		t.Fatalf("expected parent package_count 3, got %d", parentDetail.PackageCount)
	}
}

func TestMergeOrdersCreatesParentOrder(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	createReq := func(name string, value float64) *dto.CreateOrderRequest {
		return &dto.CreateOrderRequest{
			SenderName:       "测试发件人",
			SenderPhone:      "13812345678",
			SenderCountry:    "中国",
			SenderProvince:   "上海",
			SenderCity:       "上海",
			SenderAddress:    "上海测试路1号",
			SenderPostcode:   "200000",
			ReceiverName:     "测试收件人",
			ReceiverPhone:    "13912345678",
			ReceiverCountry:  "中国",
			ReceiverProvince: "江苏",
			ReceiverCity:     "苏州",
			ReceiverAddress:  "苏州测试路8号",
			ReceiverPostcode: "215000",
			GoodsName:        name,
			GoodsCategory:    "包裹",
			GoodsWeight:      1.5,
			GoodsVolume:      0.2,
			GoodsQuantity:    1,
			GoodsValue:       value,
			TransportMode:    3,
			ServiceType:      "standard",
		}
	}

	orderA, err := service.CreateOrder(customer.ID, createReq("订单A", 100))
	if err != nil {
		t.Fatalf("create orderA failed: %v", err)
	}
	orderB, err := service.CreateOrder(customer.ID, createReq("订单B", 200))
	if err != nil {
		t.Fatalf("create orderB failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, orderA.ID) })
	t.Cleanup(func() { testutil.CleanupOrderData(t, orderB.ID) })

	result, err := service.MergeOrders(&dto.MergeOrdersRequest{
		SourceOrderIDs: []uint{orderA.ID, orderB.ID},
		Remark:         "自动化测试合单",
	})
	if err != nil {
		t.Fatalf("merge orders failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, result.ParentOrderID) })

	parentDetail, err := service.GetOrderDetailResponse(result.ParentOrderID)
	if err != nil {
		t.Fatalf("load merged parent detail failed: %v", err)
	}
	if parentDetail.HierarchyType != models.OrderHierarchyMaster {
		t.Fatalf("expected merge parent hierarchy master, got %s", parentDetail.HierarchyType)
	}
	if parentDetail.ChildOrderCount != 2 {
		t.Fatalf("expected merged child_order_count 2, got %d", parentDetail.ChildOrderCount)
	}
	if parentDetail.PackageCount != 2 {
		t.Fatalf("expected merged package_count 2, got %d", parentDetail.PackageCount)
	}
}

func TestCreateOrderRejectsNonCustomerAccount(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewOrderService()
	admin := testutil.CreateTestUser(t, models.RoleAdmin)

	req := &dto.CreateOrderRequest{
		SenderName:      "测试发件人",
		SenderPhone:     "13812345678",
		SenderCountry:   "中国",
		SenderCity:      "上海",
		SenderAddress:   "上海测试路1号",
		ReceiverName:    "测试收件人",
		ReceiverPhone:   "13912345678",
		ReceiverCountry: "美国",
		ReceiverCity:    "纽约",
		ReceiverAddress: "纽约测试路8号",
		GoodsName:       "测试货物",
		GoodsWeight:     2.5,
		TransportMode:   1,
	}

	if _, err := service.CreateOrder(admin.ID, req); err == nil {
		t.Fatal("expected create order to reject non-customer account")
	}
}
