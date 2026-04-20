package services

import (
	"logistics-system/dto"
	"logistics-system/models"
	"logistics-system/testutil"
	"testing"
)

func TestValidateHSCodeFormat(t *testing.T) {
	value, err := validateHSCodeFormat("8517.13")
	if err != nil {
		t.Fatalf("expected hs code to be valid, got error: %v", err)
	}
	if value != "851713" {
		t.Fatalf("expected normalized hs code 851713, got %s", value)
	}

	if _, err := validateHSCodeFormat("ABC123"); err == nil {
		t.Fatal("expected invalid hs code format to fail")
	}
}

func TestHSCodeSuggestCommonGoods(t *testing.T) {
	service := NewHSCodeService()
	result := service.Suggest(&dto.HSCodeSuggestRequest{
		GoodsName:          "智能手机",
		GoodsCategory:      "电子产品",
		CustomsDeclaration: "",
	})
	if !result.Matched || result.Suggestion == nil {
		t.Fatal("expected hs code suggestion to be matched")
	}
	if result.Suggestion.HSCode != "851713" {
		t.Fatalf("expected smartphone hs code 851713, got %s", result.Suggestion.HSCode)
	}
}

func TestCreateOrderAutoFillsHSCode(t *testing.T) {
	testutil.EnsureTestDB(t)
	service := NewOrderService()
	customer := testutil.CreateTestUser(t, models.RoleCustomer)
	testutil.CreateTestStation(t, models.StationOrigin)

	order, err := service.CreateOrder(customer.ID, &dto.CreateOrderRequest{
		SenderName:       "测试发件人",
		SenderPhone:      "13812345678",
		SenderCountry:    "中国",
		SenderProvince:   "上海",
		SenderCity:       "上海",
		SenderAddress:    "上海测试路1号",
		SenderPostcode:   "200000",
		ReceiverName:     "测试收件人",
		ReceiverPhone:    "13912345678",
		ReceiverCountry:  "美国",
		ReceiverProvince: "加州",
		ReceiverCity:     "洛杉矶",
		ReceiverAddress:  "测试大道8号",
		ReceiverPostcode: "90001",
		GoodsName:        "智能手机",
		GoodsCategory:    "电子产品",
		GoodsWeight:      1.2,
		GoodsQuantity:    1,
		GoodsValue:       3000,
		TransportMode:    1,
		ServiceType:      "standard",
	})
	if err != nil {
		t.Fatalf("create order failed: %v", err)
	}
	t.Cleanup(func() { testutil.CleanupOrderData(t, order.ID) })

	detail, err := service.GetOrderDetailResponse(order.ID)
	if err != nil {
		t.Fatalf("load order detail failed: %v", err)
	}
	if detail.Customs.HSCode != "851713" {
		t.Fatalf("expected auto-filled hs code 851713, got %s", detail.Customs.HSCode)
	}
	if detail.Customs.CustomsDeclaration == "" {
		t.Fatal("expected customs declaration to be auto-filled")
	}
}
