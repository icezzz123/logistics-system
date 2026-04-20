package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestPickupTaskCourierFlowIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewPickupService()

	station := testutil.CreateTestStation(t, models.StationTransit)
	manager := testutil.CreateTestUser(t, models.RoleSiteManager)
	courier := testutil.CreateTestUser(t, models.RoleCourier)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderAccepted)

	task, err := service.CreatePickupTask(manager.ID, int(manager.Role), &dto.CreatePickupTaskRequest{
		OrderID:   order.ID,
		StationID: station.ID,
		Remark:    "测试创建揽收任务",
	})
	if err != nil {
		t.Fatalf("create pickup task failed: %v", err)
	}

	if _, err := service.ClaimPickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskActionRequest{}); err != nil {
		t.Fatalf("claim pickup task failed: %v", err)
	}

	if _, err := service.StartPickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskActionRequest{Remark: "开始揽收"}); err != nil {
		t.Fatalf("start pickup task failed: %v", err)
	}

	if _, err := service.CompletePickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskActionRequest{Remark: "完成揽收"}); err != nil {
		t.Fatalf("complete pickup task failed: %v", err)
	}

	updatedTask, err := service.GetPickupTaskByID(task.ID, courier.ID, int(courier.Role))
	if err != nil {
		t.Fatalf("get updated pickup task failed: %v", err)
	}
	if updatedTask.Status != "picked_up" {
		t.Fatalf("expected pickup task status picked_up, got %s", updatedTask.Status)
	}

	orderService := NewOrderService()
	updatedOrder, err := orderService.GetOrderByID(order.ID)
	if err != nil {
		t.Fatalf("get updated order failed: %v", err)
	}
	if updatedOrder.Status != models.OrderPickedUp {
		t.Fatalf("expected order status picked_up after pickup, got %v", updatedOrder.Status)
	}
	if updatedOrder.PickupTime == 0 {
		t.Fatal("expected order pickup time to be set")
	}

	var trackingCount int64
	if err := db.Model(&models.TrackingRecord{}).Where("order_id = ?", order.ID).Count(&trackingCount).Error; err != nil {
		t.Fatalf("count tracking records failed: %v", err)
	}
	if trackingCount < 4 {
		t.Fatalf("expected at least 4 tracking records, got %d", trackingCount)
	}
}

func TestPickupTaskFailureCreatesException(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewPickupService()

	station := testutil.CreateTestStation(t, models.StationTransit)
	manager := testutil.CreateTestUser(t, models.RoleSiteManager)
	courier := testutil.CreateTestUser(t, models.RoleCourier)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderAccepted)

	task, err := service.CreatePickupTask(manager.ID, int(manager.Role), &dto.CreatePickupTaskRequest{
		OrderID:   order.ID,
		StationID: station.ID,
	})
	if err != nil {
		t.Fatalf("create pickup task failed: %v", err)
	}

	if _, err := service.ClaimPickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskActionRequest{}); err != nil {
		t.Fatalf("claim pickup task failed: %v", err)
	}

	if _, err := service.StartPickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskActionRequest{}); err != nil {
		t.Fatalf("start pickup task failed: %v", err)
	}

	if _, err := service.FailPickupTask(task.ID, courier.ID, int(courier.Role), &dto.PickupTaskFailRequest{
		ExceptionType: int(models.ExceptionOther),
		Reason:        "发件人电话无人接听",
		Remark:        "测试揽收失败",
	}); err != nil {
		t.Fatalf("fail pickup task failed: %v", err)
	}

	updatedTask, err := service.GetPickupTaskByID(task.ID, courier.ID, int(courier.Role))
	if err != nil {
		t.Fatalf("get failed pickup task failed: %v", err)
	}
	if updatedTask.Status != "failed" {
		t.Fatalf("expected pickup task status failed, got %s", updatedTask.Status)
	}

	orderService := NewOrderService()
	updatedOrder, err := orderService.GetOrderByID(order.ID)
	if err != nil {
		t.Fatalf("get updated order failed: %v", err)
	}
	if updatedOrder.Status != models.OrderException {
		t.Fatalf("expected order status exception, got %v", updatedOrder.Status)
	}

	var exception models.ExceptionRecord
	if err := db.Where("order_id = ?", order.ID).First(&exception).Error; err != nil {
		t.Fatalf("expected exception record to exist: %v", err)
	}
}
