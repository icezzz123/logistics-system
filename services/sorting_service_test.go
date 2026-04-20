package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestSortingRouteMatchAndScanFlowIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewSortingService()
	targetStation := testutil.CreateTestStation(t, models.StationDestination)
	sorter := testutil.CreateTestUser(t, models.RoleSorter)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderInWarehouse)
	receiverCountry := testutil.Unique("country")
	receiverProvince := testutil.Unique("province")
	receiverCity := testutil.Unique("city")
	order.ReceiverCountry = receiverCountry
	order.ReceiverProvince = receiverProvince
	order.ReceiverCity = receiverCity
	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
		"receiver_country":  order.ReceiverCountry,
		"receiver_province": order.ReceiverProvince,
		"receiver_city":     order.ReceiverCity,
	}).Error; err != nil {
		t.Fatalf("update test order receiver address failed: %v", err)
	}

	rule := &models.SortingRule{
		RuleName:    testutil.Unique("sorting_rule"),
		Country:     receiverCountry,
		Province:    receiverProvince,
		City:        receiverCity,
		District:    "",
		RouteCode:   testutil.Unique("R"),
		StationID:   targetStation.ID,
		Priority:    100,
		Status:      1,
		Description: "自动化测试规则",
	}
	if err := db.Create(rule).Error; err != nil {
		t.Fatalf("create sorting rule failed: %v", err)
	}
	t.Cleanup(func() { _ = db.Where("id = ?", rule.ID).Delete(&models.SortingRule{}).Error })

	task := &models.SortingTask{
		TaskNo:      testutil.Unique("sorting_task"),
		StationID:   targetStation.ID,
		AssignedTo:  sorter.ID,
		TotalCount:  1,
		SortedCount: 0,
		Status:      "pending",
	}
	if err := db.Create(task).Error; err != nil {
		t.Fatalf("create sorting task failed: %v", err)
	}
	t.Cleanup(func() { _ = db.Where("id = ?", task.ID).Delete(&models.SortingTask{}).Error })

	matchResp, err := service.MatchRoute(&dto.RouteMatchRequest{
		Country:  receiverCountry,
		Province: receiverProvince,
		City:     receiverCity,
		District: "",
	})
	if err != nil {
		t.Fatalf("match route failed: %v", err)
	}
	if !matchResp.Matched || matchResp.StationID != targetStation.ID {
		t.Fatalf("expected route match to target station %d, got matched=%v station=%d", targetStation.ID, matchResp.Matched, matchResp.StationID)
	}

	var pkg models.OrderPackage
	if err := db.Where("order_id = ?", order.ID).First(&pkg).Error; err != nil {
		t.Fatalf("query order package failed: %v", err)
	}

	scanResp, err := service.SortingScanByCode(&dto.SortingScanRequest{
		ScanCode:  pkg.ParcelNo,
		StationID: targetStation.ID,
		TaskCode:  task.TaskNo,
		Remark:    "自动化测试扫描",
	}, sorter.ID)
	if err != nil {
		t.Fatalf("sorting scan failed: %v", err)
	}
	if !scanResp.RouteMatched {
		t.Fatal("expected sorting scan to match a route")
	}
	if scanResp.OrderNo != order.OrderNo {
		t.Fatalf("expected scan response order no %s, got %s", order.OrderNo, scanResp.OrderNo)
	}
	if scanResp.ParcelNo != pkg.ParcelNo {
		t.Fatalf("expected scan response parcel no %s, got %s", pkg.ParcelNo, scanResp.ParcelNo)
	}
	if scanResp.TaskNo != task.TaskNo {
		t.Fatalf("expected scan response task no %s, got %s", task.TaskNo, scanResp.TaskNo)
	}

	updatedTask, err := service.GetSortingTaskByID(task.ID)
	if err != nil {
		t.Fatalf("get sorting task failed: %v", err)
	}
	if updatedTask.SortedCount != 1 {
		t.Fatalf("expected sorted count 1, got %d", updatedTask.SortedCount)
	}

	orderService := NewOrderService()
	updatedOrder, err := orderService.GetOrderByID(order.ID)
	if err != nil {
		t.Fatalf("get updated order failed: %v", err)
	}
	if updatedOrder.Status != models.OrderSorting {
		t.Fatalf("expected order status sorting after scan, got %v", updatedOrder.Status)
	}

	var statusLog models.OrderStatusLog
	if err := db.Where("order_id = ? AND from_status = ? AND to_status = ?", order.ID, models.OrderInWarehouse, models.OrderSorting).First(&statusLog).Error; err != nil {
		t.Fatalf("expected auto status log from in_warehouse to sorting, got error: %v", err)
	}
}
