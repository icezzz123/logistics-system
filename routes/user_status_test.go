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

type apiResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func TestAdminCanDisableUserWithStatusZero(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	admin := testutil.CreateTestUser(t, models.RoleAdmin)
	targetUser := testutil.CreateTestUser(t, models.RoleCustomer)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	routes.SetupRoutes(r)

	token, err := utils.GenerateToken(admin.ID, admin.Username, int(admin.Role), 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	body := bytes.NewBufferString(`{"status":0}`)
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/admin/users/%d/status", targetUser.ID), body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 when disabling user with status 0, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp apiResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if resp.Code != 200 {
		t.Fatalf("expected response code 200, got %d, body=%s", resp.Code, w.Body.String())
	}

	var refreshed models.User
	if err := db.First(&refreshed, targetUser.ID).Error; err != nil {
		t.Fatalf("reload user failed: %v", err)
	}
	if refreshed.Status != 0 {
		t.Fatalf("expected user status to be 0 after disable request, got %d", refreshed.Status)
	}
}
