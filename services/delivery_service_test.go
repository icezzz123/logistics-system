package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestDeliveryTaskCourierFlowIntegration(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewDeliveryService()

	station := testutil.CreateTestStation(t, models.StationDestination)
	manager := testutil.CreateTestUser(t, models.RoleSiteManager)
	courier := testutil.CreateTestUser(t, models.RoleCourier)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderDestinationSorting)

	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Update("current_station", station.ID).Error; err != nil {
		t.Fatalf("update order current station failed: %v", err)
	}

	task, err := service.CreateDeliveryTask(manager.ID, int(manager.Role), &dto.CreateDeliveryTaskRequest{
		OrderNo:   order.OrderNo,
		StationID: station.ID,
		Remark:    "测试创建派送任务",
	})
	if err != nil {
		t.Fatalf("create delivery task failed: %v", err)
	}

	if _, err := service.ClaimDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskActionRequest{}); err != nil {
		t.Fatalf("claim delivery task failed: %v", err)
	}

	if _, err := service.StartDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskActionRequest{Remark: "开始派送"}); err != nil {
		t.Fatalf("start delivery task failed: %v", err)
	}

	if _, err := service.CompleteDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskActionRequest{Remark: "确认送达"}); err != nil {
		t.Fatalf("complete delivery task failed: %v", err)
	}

	if _, err := service.SignDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskSignRequest{
		SignType:   int(models.SignSelf),
		SignerName: "张三",
		Remark:     "本人签收",
	}); err != nil {
		t.Fatalf("sign delivery task failed: %v", err)
	}

	updatedTask, err := service.GetDeliveryTaskByID(task.ID, courier.ID, int(courier.Role))
	if err != nil {
		t.Fatalf("get updated delivery task failed: %v", err)
	}
	if updatedTask.Status != "signed" {
		t.Fatalf("expected delivery task status signed, got %s", updatedTask.Status)
	}

	orderService := NewOrderService()
	updatedOrder, err := orderService.GetOrderByID(order.ID)
	if err != nil {
		t.Fatalf("get updated order failed: %v", err)
	}
	if updatedOrder.Status != models.OrderSigned {
		t.Fatalf("expected order status signed, got %v", updatedOrder.Status)
	}

	var signRecord models.SignRecord
	if err := db.Where("order_id = ?", order.ID).First(&signRecord).Error; err != nil {
		t.Fatalf("expected sign record to exist: %v", err)
	}

	var trackingCount int64
	if err := db.Model(&models.TrackingRecord{}).Where("order_id = ?", order.ID).Count(&trackingCount).Error; err != nil {
		t.Fatalf("count tracking records failed: %v", err)
	}
	if trackingCount < 4 {
		t.Fatalf("expected at least 4 tracking records, got %d", trackingCount)
	}
}

func TestDeliveryTaskFailureCreatesException(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewDeliveryService()

	station := testutil.CreateTestStation(t, models.StationDestination)
	manager := testutil.CreateTestUser(t, models.RoleSiteManager)
	courier := testutil.CreateTestUser(t, models.RoleCourier)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderDestinationSorting)

	if err := db.Model(&models.Order{}).Where("id = ?", order.ID).Update("current_station", station.ID).Error; err != nil {
		t.Fatalf("update order current station failed: %v", err)
	}

	task, err := service.CreateDeliveryTask(manager.ID, int(manager.Role), &dto.CreateDeliveryTaskRequest{
		OrderID:   order.ID,
		StationID: station.ID,
	})
	if err != nil {
		t.Fatalf("create delivery task failed: %v", err)
	}

	if _, err := service.ClaimDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskActionRequest{}); err != nil {
		t.Fatalf("claim delivery task failed: %v", err)
	}

	if _, err := service.StartDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskActionRequest{}); err != nil {
		t.Fatalf("start delivery task failed: %v", err)
	}

	if _, err := service.FailDeliveryTask(task.ID, courier.ID, int(courier.Role), &dto.DeliveryTaskFailRequest{
		ExceptionType: int(models.ExceptionAddressErr),
		Reason:        "收件地址无法联系",
		Remark:        "测试派送失败",
	}); err != nil {
		t.Fatalf("fail delivery task failed: %v", err)
	}

	updatedTask, err := service.GetDeliveryTaskByID(task.ID, courier.ID, int(courier.Role))
	if err != nil {
		t.Fatalf("get failed delivery task failed: %v", err)
	}
	if updatedTask.Status != "failed" {
		t.Fatalf("expected delivery task status failed, got %s", updatedTask.Status)
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
