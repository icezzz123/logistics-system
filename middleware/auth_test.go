package middleware

import (
	"encoding/json"
	"logistics-system/config"
	"logistics-system/utils"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAuthMiddlewareRejectsMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/protected", AuthMiddleware(), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddlewareSetsContextWithValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	utils.InitJWT("test-secret")
	token, err := utils.GenerateToken(42, "tester", 7, 3600)
	if err != nil {
		t.Fatalf("generate token failed: %v", err)
	}

	r := gin.New()
	r.GET("/protected", AuthMiddleware(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id":  c.MustGet("user_id"),
			"username": c.MustGet("username"),
			"role":     c.MustGet("role"),
		})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if int(body["user_id"].(float64)) != 42 {
		t.Fatalf("expected user_id 42, got %v", body["user_id"])
	}
	if body["username"].(string) != "tester" {
		t.Fatalf("expected username tester, got %v", body["username"])
	}
	if int(body["role"].(float64)) != 7 {
		t.Fatalf("expected role 7, got %v", body["role"])
	}
}

func TestRequirePermissionBlocksAndAllowsByRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		role := c.GetHeader("X-Role")
		if role == "admin" {
			c.Set("role", 7)
		} else {
			c.Set("role", 1)
		}
		c.Next()
	})
	r.GET("/permissions", RequirePermission(config.PermTrackingView), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	r.GET("/exceptions", RequirePermission(config.PermExceptionUpdate), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest(http.MethodGet, "/permissions", nil)
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("expected tracking:view for customer to be allowed, got %d", w1.Code)
	}

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/exceptions", nil)
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusForbidden {
		t.Fatalf("expected customer exception:update to be forbidden, got %d", w2.Code)
	}

	w3 := httptest.NewRecorder()
	req3 := httptest.NewRequest(http.MethodGet, "/exceptions", nil)
	req3.Header.Set("X-Role", "admin")
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("expected admin exception:update to be allowed, got %d", w3.Code)
	}
}
