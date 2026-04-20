package services

import (
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestScanResolverResolveBusinessCodes(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	resolver := NewScanResolverService()

	driver := testutil.CreateTestUser(t, models.RoleDriver)
	vehicle := testutil.CreateTestVehicle(t, driver.ID)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderSorting)

	var pkg models.OrderPackage
	if err := db.Where("order_id = ?", order.ID).First(&pkg).Error; err != nil {
		t.Fatalf("query order package failed: %v", err)
	}

	sortingTask := &models.SortingTask{
		TaskNo:      "ST-RESOLVE-001",
		StationID:   testutil.CreateTestStation(t, models.StationTransit).ID,
		AssignedTo:  driver.ID,
		TotalCount:  1,
		SortedCount: 0,
		Status:      "pending",
	}
	if err := db.Create(sortingTask).Error; err != nil {
		t.Fatalf("create sorting task failed: %v", err)
	}
	t.Cleanup(func() { _ = db.Where("id = ?", sortingTask.ID).Delete(&models.SortingTask{}).Error })

	transportTask := &models.TransportTask{
		TaskNo:     "T-RESOLVE-001",
		OrderID:    order.ID,
		VehicleID:  vehicle.ID,
		DriverID:   driver.ID,
		StartPoint: "上海",
		EndPoint:   "苏州",
		Status:     "pending",
	}
	if err := db.Create(transportTask).Error; err != nil {
		t.Fatalf("create transport task failed: %v", err)
	}
	t.Cleanup(func() { _ = db.Where("id = ?", transportTask.ID).Delete(&models.TransportTask{}).Error })

	batch := &models.BatchSchedule{
		BatchNo:     "B-RESOLVE-001",
		BatchName:   "测试批次",
		VehicleID:   vehicle.ID,
		DriverID:    driver.ID,
		OrderCount:  1,
		TotalWeight: order.GoodsWeight,
		Status:      "pending",
	}
	if err := db.Create(batch).Error; err != nil {
		t.Fatalf("create batch failed: %v", err)
	}
	t.Cleanup(func() { _ = db.Where("id = ?", batch.ID).Delete(&models.BatchSchedule{}).Error })

	cases := []struct {
		code       string
		entityType string
	}{
		{code: order.OrderNo, entityType: "order"},
		{code: pkg.ParcelNo, entityType: "package"},
		{code: sortingTask.TaskNo, entityType: "sorting_task"},
		{code: transportTask.TaskNo, entityType: "transport_task"},
		{code: batch.BatchNo, entityType: "batch"},
	}

	for _, item := range cases {
		resp, err := resolver.Resolve(item.code)
		if err != nil {
			t.Fatalf("resolve code %s failed: %v", item.code, err)
		}
		if resp.EntityType != item.entityType {
			t.Fatalf("expected entity type %s for code %s, got %s", item.entityType, item.code, resp.EntityType)
		}
	}
}
