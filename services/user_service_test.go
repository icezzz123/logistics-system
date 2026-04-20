package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"strings"
	"testing"
)

func TestValidateRegisterParams(t *testing.T) {
	service := NewUserService()

	validReq := &dto.RegisterRequest{
		Username: "valid_user",
		Password: "Pass1234",
		Email:    "valid@test.local",
		Phone:    "13812345678",
		RealName: "测试用户",
	}
	if err := service.validateRegisterParams(validReq); err != nil {
		t.Fatalf("expected valid params, got error: %v", err)
	}

	invalidReqs := []struct {
		name string
		req  dto.RegisterRequest
	}{
		{"short username", dto.RegisterRequest{Username: "ab", Password: "Pass1234"}},
		{"invalid username chars", dto.RegisterRequest{Username: "bad-user", Password: "Pass1234"}},
		{"short password", dto.RegisterRequest{Username: "validuser", Password: "123"}},
		{"invalid email", dto.RegisterRequest{Username: "validuser", Password: "Pass1234", Email: "bademail"}},
		{"invalid phone", dto.RegisterRequest{Username: "validuser", Password: "Pass1234", Phone: "123"}},
	}

	for _, tc := range invalidReqs {
		if err := service.validateRegisterParams(&tc.req); err == nil {
			t.Fatalf("expected error for case %q, got nil", tc.name)
		}
	}
}

func TestRegisterAndLoginIntegration(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewUserService()

	username := testutil.Unique("register_login")
	req := &dto.RegisterRequest{
		Username: username,
		Password: "Pass1234",
		Email:    username + "@test.local",
		Phone:    testutil.UniquePhone(),
		RealName: "自动化测试用户",
		Role:     int(models.RoleCustomer),
	}

	user, err := service.Register(req)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	t.Cleanup(func() {
		if user != nil {
			testutil.EnsureTestDB(t).Where("id = ?", user.ID).Delete(&models.User{})
		}
	})

	if user.ID == 0 {
		t.Fatal("expected registered user ID to be set")
	}
	if user.Password != "" {
		t.Fatal("expected returned user password to be cleared")
	}

	loggedInUser, token, err := service.Login(&dto.LoginRequest{Username: username, Password: "Pass1234"})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected login token to be non-empty")
	}
	if loggedInUser.Username != username {
		t.Fatalf("expected username %s, got %s", username, loggedInUser.Username)
	}
	if !strings.Contains(loggedInUser.Email, "@test.local") {
		t.Fatalf("expected test email, got %s", loggedInUser.Email)
	}
}
