package services

import (
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
	"time"
)

func TestGetExceptionByIDHandlesMissingUsers(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	service := NewExceptionService()

	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	reporter := testutil.CreateTestUser(t, models.RoleAdmin)
	handler := testutil.CreateTestUser(t, models.RoleDispatcher)
	station := testutil.CreateTestStation(t, models.StationOrigin)
	order := testutil.CreateTestOrder(t, customer.ID, models.OrderInTransit)

	exception := &models.ExceptionRecord{
		ExceptionNo:      "EXTEST" + time.Now().Format("20060102150405"),
		OrderID:          order.ID,
		Type:             models.ExceptionDelay,
		Status:           models.ExceptionClosed,
		StationID:        station.ID,
		ReporterID:       reporter.ID,
		HandlerID:        handler.ID,
		Description:      "测试异常详情降级逻辑",
		Images:           `["https://example.com/test.jpg"]`,
		Solution:         "测试方案",
		Result:           "测试结果",
		CompensateAmount: 12.5,
		ReportTime:       time.Now().Unix(),
		HandleTime:       time.Now().Unix(),
		CloseTime:        time.Now().Unix(),
		Remark:           "测试备注",
	}
	if err := db.Create(exception).Error; err != nil {
		t.Fatalf("create exception failed: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Where("id = ?", exception.ID).Delete(&models.ExceptionRecord{}).Error
	})

	if err := db.Where("id IN ?", []uint{reporter.ID, handler.ID}).Delete(&models.User{}).Error; err != nil {
		t.Fatalf("delete linked users failed: %v", err)
	}

	info, err := service.GetExceptionByID(exception.ID)
	if err != nil {
		t.Fatalf("GetExceptionByID failed: %v", err)
	}
	if info == nil {
		t.Fatal("expected exception info, got nil")
	}
	if info.ExceptionNo != exception.ExceptionNo {
		t.Fatalf("expected exception no %s, got %s", exception.ExceptionNo, info.ExceptionNo)
	}
	if info.ReporterName != "" {
		t.Fatalf("expected empty reporter name when linked user is missing, got %q", info.ReporterName)
	}
	if info.HandlerName != "" {
		t.Fatalf("expected empty handler name when linked user is missing, got %q", info.HandlerName)
	}
}
