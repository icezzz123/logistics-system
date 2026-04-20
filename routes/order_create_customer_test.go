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

func TestAdminCannotCreateOrderForCustomer(t *testing.T) {
	admin := testutil.CreateTestUser(t, models.RoleAdmin)
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	token, err := utils.GenerateToken(admin.ID, admin.Username, int(admin.Role), 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	payload := map[string]interface{}{
		"customer_id":       customer.ID,
		"sender_name":       "管理员发件人",
		"sender_phone":      "13812345678",
		"sender_country":    "中国",
		"sender_province":   "上海",
		"sender_city":       "上海",
		"sender_address":    "上海测试路1号",
		"sender_postcode":   "200000",
		"receiver_name":     "测试收件人",
		"receiver_phone":    "13912345678",
		"receiver_country":  "美国",
		"receiver_province": "加州",
		"receiver_city":     "洛杉矶",
		"receiver_address":  "测试大道8号",
		"receiver_postcode": "90001",
		"goods_name":        "测试货物",
		"goods_category":    "文件",
		"goods_weight":      3.2,
		"goods_volume":      0.2,
		"goods_quantity":    1,
		"goods_value":       100,
		"is_insured":        0,
		"insured_amount":    0,
		"transport_mode":    1,
		"service_type":      "standard",
		"remark":            "非客户越权录单测试",
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

	req := httptest.NewRequest(http.MethodPost, "/api/orders", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for delegated create order, got %d, body=%s", w.Code, w.Body.String())
	}
}
