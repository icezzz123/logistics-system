package routes_test

import (
	"encoding/json"
	"logistics-system/middleware"
	"logistics-system/routes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAPISmokeAndProtectedRouteUnauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RecoveryMiddleware())
	r.Use(middleware.CORSMiddleware())
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Logistics System API is running"})
	})
	routes.SetupRoutes(r)

	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected health 200, got %d", w1.Code)
	}
	var health map[string]string
	if err := json.Unmarshal(w1.Body.Bytes(), &health); err != nil {
		t.Fatalf("unmarshal health failed: %v", err)
	}
	if health["status"] != "ok" {
		t.Fatalf("expected status ok, got %s", health["status"])
	}

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/api/profile", nil)
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("expected protected profile to reject unauthorized request, got %d", w2.Code)
	}
}
