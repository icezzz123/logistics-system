package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestAssignVehicleIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewTransportService()
	driver := testutil.CreateTestUser(t, models.RoleDriver)
	vehicle := testutil.CreateTestVehicle(t, driver.ID)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order1 := testutil.CreateTestOrder(t, customer.ID, models.OrderSorting)
	order2 := testutil.CreateTestOrder(t, customer.ID, models.OrderSorting)

	resp, err := service.AssignVehicle(&dto.VehicleAssignRequest{OrderIDs: []uint{order1.ID, order2.ID}, VehicleID: vehicle.ID, DriverID: driver.ID})
	if err != nil {
		t.Fatalf("assign vehicle failed: %v", err)
	}
	if resp.SuccessCount != 2 {
		t.Fatalf("expected 2 successful assignments, got %d", resp.SuccessCount)
	}
	if len(resp.Tasks) != 2 {
		t.Fatalf("expected 2 created tasks, got %d", len(resp.Tasks))
	}

	var count int64
	if err := db.Model(&models.TransportTask{}).Where("vehicle_id = ? AND driver_id = ? AND order_id IN ?", vehicle.ID, driver.ID, []uint{order1.ID, order2.ID}).Count(&count).Error; err != nil {
		t.Fatalf("count transport tasks failed: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 persisted transport tasks, got %d", count)
	}
}

func TestDispatchOptimizeRouteIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewDispatchService()
	driver := testutil.CreateTestUser(t, models.RoleDriver)
	vehicle := testutil.CreateTestVehicle(t, driver.ID)
	station1 := testutil.CreateTestStation(t, models.StationOrigin)
	station2 := testutil.CreateTestStation(t, models.StationTransit)
	station3 := testutil.CreateTestStation(t, models.StationDestination)

	if err := db.Model(&models.Station{}).Where("id = ?", station1.ID).Updates(map[string]interface{}{"latitude": 31.2304, "longitude": 121.4737}).Error; err != nil {
		t.Fatalf("update station1 coords failed: %v", err)
	}
	if err := db.Model(&models.Station{}).Where("id = ?", station2.ID).Updates(map[string]interface{}{"latitude": 31.2989, "longitude": 120.5853}).Error; err != nil {
		t.Fatalf("update station2 coords failed: %v", err)
	}
	if err := db.Model(&models.Station{}).Where("id = ?", station3.ID).Updates(map[string]interface{}{"latitude": 30.2741, "longitude": 120.1551}).Error; err != nil {
		t.Fatalf("update station3 coords failed: %v", err)
	}

	resp, err := service.OptimizeRoute(&dto.RouteOptimizeRequest{StationIDs: []uint{station1.ID, station2.ID, station3.ID}, VehicleID: vehicle.ID})
	if err != nil {
		t.Fatalf("optimize route failed: %v", err)
	}
	if len(resp.OptimizedOrder) != 3 {
		t.Fatalf("expected 3 optimized route nodes, got %d", len(resp.OptimizedOrder))
	}
	if resp.OptimizedOrder[0].StationID != station1.ID || resp.OptimizedOrder[len(resp.OptimizedOrder)-1].StationID != station3.ID {
		t.Fatalf("expected first and last stations to stay fixed, got first=%d last=%d", resp.OptimizedOrder[0].StationID, resp.OptimizedOrder[len(resp.OptimizedOrder)-1].StationID)
	}
	if resp.TotalDistance <= 0 {
		t.Fatalf("expected positive total distance, got %v", resp.TotalDistance)
	}
}
