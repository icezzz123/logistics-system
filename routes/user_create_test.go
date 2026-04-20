package routes_test

import (
	"bytes"
	"encoding/json"
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

func TestAdminCanCreateUser(t *testing.T) {
	db := testutil.EnsureTestDB(t)
	admin := testutil.CreateTestUser(t, models.RoleAdmin)

	token, err := utils.GenerateToken(admin.ID, admin.Username, int(admin.Role), 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	payload := map[string]interface{}{
		"username":  testutil.Unique("admin_create_user"),
		"password":  "Pass1234",
		"role":      1,
		"real_name": "管理员创建用户",
		"phone":     "13812345678",
		"email":     testutil.Unique("admin_create_user") + "@test.local",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload failed: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	routes.SetupRoutes(r)

	req := httptest.NewRequest(http.MethodPost, "/api/admin/users", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for admin create user, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Code int `json:"code"`
		Data struct {
			ID       uint   `json:"id"`
			Username string `json:"username"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if resp.Code != 200 || resp.Data.ID == 0 {
		t.Fatalf("unexpected response body: %s", w.Body.String())
	}

	t.Cleanup(func() {
		_ = db.Where("id = ?", resp.Data.ID).Delete(&models.User{}).Error
	})

	var created models.User
	if err := db.First(&created, resp.Data.ID).Error; err != nil {
		t.Fatalf("query created user failed: %v", err)
	}
	if created.Username != payload["username"] {
		t.Fatalf("expected username %s, got %s", payload["username"], created.Username)
	}
}
