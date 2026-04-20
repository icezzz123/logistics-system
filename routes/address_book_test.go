package routes_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"logistics-system/middleware"
	"logistics-system/models"
	"logistics-system/routes"
	"logistics-system/testutil"
	"logistics-system/utils"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type addressBookEnvelope struct {
	Code int `json:"code"`
	Data struct {
		ID     uint  `json:"id"`
		UserID uint  `json:"user_id"`
		Total  int64 `json:"total"`
		List   []struct {
			ID          uint   `json:"id"`
			UserID      uint   `json:"user_id"`
			Label       string `json:"label"`
			AddressType string `json:"address_type"`
			IsDefault   int    `json:"is_default"`
		} `json:"list"`
	} `json:"data"`
}

func TestCustomerCanCreateAndListAddressBook(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	token, err := utils.GenerateToken(customer.ID, customer.Username, int(customer.Role), 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	routes.SetupRoutes(r)

	createBody := mustJSON(t, map[string]interface{}{
		"label":         "家里",
		"address_type":  "sender",
		"contact_name":  "张三",
		"contact_phone": "13800000001",
		"country":       "中国",
		"province":      "上海",
		"city":          "上海",
		"address":       "浦东新区世纪大道100号",
		"postcode":      "200120",
		"is_default":    1,
	})

	createReq := httptest.NewRequest(http.MethodPost, "/api/address-book", bytes.NewBuffer(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)

	createResp := httptest.NewRecorder()
	r.ServeHTTP(createResp, createReq)
	if createResp.Code != http.StatusOK {
		t.Fatalf("expected create status 200, got %d, body=%s", createResp.Code, createResp.Body.String())
	}

	var created addressBookEnvelope
	if err := json.Unmarshal(createResp.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create response failed: %v", err)
	}
	if created.Data.ID == 0 || created.Data.UserID != customer.ID {
		t.Fatalf("unexpected create response: %s", createResp.Body.String())
	}

	t.Cleanup(func() {
		_ = db.Where("id = ?", created.Data.ID).Delete(&models.UserAddress{}).Error
	})

	listReq := httptest.NewRequest(http.MethodGet, "/api/address-book?type=sender", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)

	listResp := httptest.NewRecorder()
	r.ServeHTTP(listResp, listReq)
	if listResp.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listResp.Code, listResp.Body.String())
	}

	var listed addressBookEnvelope
	if err := json.Unmarshal(listResp.Body.Bytes(), &listed); err != nil {
		t.Fatalf("unmarshal list response failed: %v", err)
	}
	if listed.Data.Total < 1 {
		t.Fatalf("expected address list total >= 1, got %d", listed.Data.Total)
	}
	found := false
	for _, item := range listed.Data.List {
		if item.ID == created.Data.ID {
			found = true
			if item.AddressType != "sender" || item.IsDefault != 1 {
				t.Fatalf("unexpected address item: %+v", item)
			}
		}
	}
	if !found {
		t.Fatalf("created address not found in list response: %s", listResp.Body.String())
	}
}

func TestCourierCanCreateAddressForCustomer(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	courier := testutil.CreateTestUser(t, models.RoleCourier)
	token, err := utils.GenerateToken(courier.ID, courier.Username, int(courier.Role), 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	routes.SetupRoutes(r)

	createBody := mustJSON(t, map[string]interface{}{
		"customer_id":   customer.ID,
		"label":         "纽约办公室",
		"address_type":  "receiver",
		"contact_name":  "Mike",
		"contact_phone": "0012025550100",
		"country":       "美国",
		"province":      "NY",
		"city":          "New York",
		"address":       "5th Avenue 20",
		"postcode":      "10001",
	})

	createReq := httptest.NewRequest(http.MethodPost, "/api/address-book", bytes.NewBuffer(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)

	createResp := httptest.NewRecorder()
	r.ServeHTTP(createResp, createReq)
	if createResp.Code != http.StatusOK {
		t.Fatalf("expected proxy create status 200, got %d, body=%s", createResp.Code, createResp.Body.String())
	}

	var created addressBookEnvelope
	if err := json.Unmarshal(createResp.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal create response failed: %v", err)
	}
	if created.Data.UserID != customer.ID {
		t.Fatalf("expected owner %d, got %d", customer.ID, created.Data.UserID)
	}

	t.Cleanup(func() {
		_ = db.Where("id = ?", created.Data.ID).Delete(&models.UserAddress{}).Error
	})

	listReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/address-book?customer_id=%d&type=receiver", customer.ID), nil)
	listReq.Header.Set("Authorization", "Bearer "+token)

	listResp := httptest.NewRecorder()
	r.ServeHTTP(listResp, listReq)
	if listResp.Code != http.StatusOK {
		t.Fatalf("expected proxy list status 200, got %d, body=%s", listResp.Code, listResp.Body.String())
	}

	var listed addressBookEnvelope
	if err := json.Unmarshal(listResp.Body.Bytes(), &listed); err != nil {
		t.Fatalf("unmarshal list response failed: %v", err)
	}
	found := false
	for _, item := range listed.Data.List {
		if item.ID == created.Data.ID && item.UserID == customer.ID {
			found = true
		}
	}
	if !found {
		t.Fatalf("proxy-created address not found in list response: %s", listResp.Body.String())
	}
}

func mustJSON(t *testing.T, payload map[string]interface{}) []byte {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload failed: %v", err)
	}
	return body
}
