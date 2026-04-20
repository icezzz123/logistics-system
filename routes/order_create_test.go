package routes_test

import (
	"bytes"
	"encoding/json"
	"logistics-system/middleware"
	"logistics-system/routes"
	"logistics-system/utils"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCustomerCreateOrderRequiresValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	utils.InitJWT("test-secret")

	token, err := utils.GenerateToken(1, "customer_user", 1, 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	routes.SetupRoutes(r)

	req := httptest.NewRequest(http.MethodPost, "/api/orders", bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid customer create order request, got %d, body=%s", w.Code, w.Body.String())
	}

	var resp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected response code 400, got %d", resp.Code)
	}
}
