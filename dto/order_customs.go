package dto

type OrderCustomsInfo struct {
	CustomsDeclaration string  `json:"customs_declaration"`
	HSCode             string  `json:"hs_code"`
	DeclaredValue      float64 `json:"declared_value"`
	CustomsDuty        float64 `json:"customs_duty"`
	CustomsVAT         float64 `json:"customs_vat"`
	CustomsOtherTax    float64 `json:"customs_other_tax"`
	CustomsFee         float64 `json:"customs_fee"`
	CustomsStatus      string  `json:"customs_status"`
	CustomsStatusName  string  `json:"customs_status_name"`
}

type OrderCustomsNodeInfo struct {
	ID             uint    `json:"id"`
	NodeCode       string  `json:"node_code"`
	NodeName       string  `json:"node_name"`
	NodeStatus     string  `json:"node_status"`
	NodeStatusName string  `json:"node_status_name"`
	DutyAmount     float64 `json:"duty_amount"`
	VATAmount      float64 `json:"vat_amount"`
	OtherTaxAmount float64 `json:"other_tax_amount"`
	OperatorID     uint    `json:"operator_id"`
	OperatorName   string  `json:"operator_name"`
	Remark         string  `json:"remark"`
	NodeTime       int64   `json:"node_time"`
	NodeTimeText   string  `json:"node_time_text"`
}

type UpdateOrderCustomsRequest struct {
	CustomsDeclaration string  `json:"customs_declaration" binding:"omitempty,max=100"`
	HSCode             string  `json:"hs_code" binding:"omitempty,max=30"`
	DeclaredValue      float64 `json:"declared_value" binding:"omitempty,gte=0"`
	CustomsDuty        float64 `json:"customs_duty" binding:"omitempty,gte=0"`
	CustomsVAT         float64 `json:"customs_vat" binding:"omitempty,gte=0"`
	CustomsOtherTax    float64 `json:"customs_other_tax" binding:"omitempty,gte=0"`
	CustomsStatus      string  `json:"customs_status" binding:"omitempty,max=30"`
	Remark             string  `json:"remark" binding:"omitempty,max=500"`
}

type CreateOrderCustomsNodeRequest struct {
	NodeCode       string  `json:"node_code" binding:"required,max=30"`
	NodeStatus     string  `json:"node_status" binding:"omitempty,max=20"`
	DutyAmount     float64 `json:"duty_amount" binding:"omitempty,gte=0"`
	VATAmount      float64 `json:"vat_amount" binding:"omitempty,gte=0"`
	OtherTaxAmount float64 `json:"other_tax_amount" binding:"omitempty,gte=0"`
	NodeTime       int64   `json:"node_time" binding:"omitempty,gte=0"`
	Remark         string  `json:"remark" binding:"omitempty,max=500"`
}

type CreateOrderCustomsExceptionRequest struct {
	Description string `json:"description" binding:"required,max=2000"`
	Remark      string `json:"remark" binding:"omitempty,max=1000"`
}

type CreateOrderCustomsExceptionResponse struct {
	ExceptionID uint   `json:"exception_id"`
	ExceptionNo string `json:"exception_no"`
}

type HSCodeSuggestRequest struct {
	GoodsName          string                `json:"goods_name" binding:"omitempty,max=100"`
	GoodsCategory      string                `json:"goods_category" binding:"omitempty,max=50"`
	CustomsDeclaration string                `json:"customs_declaration" binding:"omitempty,max=100"`
	Packages           []OrderPackageRequest `json:"packages" binding:"omitempty,dive"`
}

type HSCodeSuggestionItem struct {
	HSCode             string `json:"hs_code"`
	CustomsDeclaration string `json:"customs_declaration"`
	Category           string `json:"category"`
	Confidence         string `json:"confidence"`
	Reason             string `json:"reason"`
}

type HSCodeSuggestResponse struct {
	Matched      bool                   `json:"matched"`
	Suggestion   *HSCodeSuggestionItem  `json:"suggestion,omitempty"`
	Alternatives []HSCodeSuggestionItem `json:"alternatives"`
	Note         string                 `json:"note"`
}
