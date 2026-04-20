package services

import (
	"logistics-system/models"
	"testing"
)

func TestOrderStateMachineValidateTransition(t *testing.T) {
	sm := &OrderStateMachine{}

	if err := sm.ValidateTransition(models.OrderPending, models.OrderAccepted, 6); err != nil {
		t.Fatalf("expected dispatcher to accept order, got error: %v", err)
	}
	if err := sm.ValidateTransition(models.OrderPending, models.OrderAccepted, 1); err == nil {
		t.Fatal("expected customer to be blocked from accepting order")
	}
	if err := sm.ValidateTransition(models.OrderSigned, models.OrderDelivered, 7); err == nil {
		t.Fatal("expected signed order to be terminal")
	}
	if err := sm.ValidateTransition(models.OrderInTransit, models.OrderException, 4); err != nil {
		t.Fatalf("expected driver to mark in-transit order as exception, got error: %v", err)
	}
}

func TestOrderStateMachineAllowedTransitions(t *testing.T) {
	sm := &OrderStateMachine{}

	allowedForDriver := sm.GetAllowedTransitions(models.OrderSorting, 4)
	if !containsOrderStatus(allowedForDriver, models.OrderInTransit) || !containsOrderStatus(allowedForDriver, models.OrderException) {
		t.Fatalf("expected driver to be allowed to move sorting orders to in_transit and exception, got %#v", allowedForDriver)
	}

	allowedForDispatcher := sm.GetAllowedTransitions(models.OrderException, 6)
	if len(allowedForDispatcher) == 0 {
		t.Fatal("expected dispatcher to have recovery transitions from exception")
	}

	allowedForSigned := sm.GetAllowedTransitions(models.OrderSigned, 7)
	if len(allowedForSigned) != 0 {
		t.Fatalf("expected signed order to have no transitions, got %#v", allowedForSigned)
	}
}

func containsOrderStatus(list []models.OrderStatus, target models.OrderStatus) bool {
	for _, item := range list {
		if item == target {
			return true
		}
	}
	return false
}
