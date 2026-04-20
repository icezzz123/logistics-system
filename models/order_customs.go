package models

const (
	CustomsNodeDeclared       = "declared"
	CustomsNodeDocumentsReady = "documents_ready"
	CustomsNodeReviewing      = "reviewing"
	CustomsNodeDutyPending    = "duty_pending"
	CustomsNodeDutyPaid       = "duty_paid"
	CustomsNodeInspection     = "inspection"
	CustomsNodeReleased       = "released"
	CustomsNodeException      = "customs_exception"
)

type OrderCustomsNode struct {
	ID             uint    `gorm:"primarykey;autoIncrement" json:"id"`
	OrderID        uint    `gorm:"not null;index" json:"order_id"`
	NodeCode       string  `gorm:"size:30;not null;index" json:"node_code"`
	NodeStatus     string  `gorm:"size:20;not null;default:'completed'" json:"node_status"`
	DutyAmount     float64 `gorm:"type:decimal(10,2);default:0" json:"duty_amount"`
	VATAmount      float64 `gorm:"type:decimal(10,2);default:0" json:"vat_amount"`
	OtherTaxAmount float64 `gorm:"type:decimal(10,2);default:0" json:"other_tax_amount"`
	OperatorID     uint    `gorm:"index;default:0" json:"operator_id"`
	Remark         string  `gorm:"type:text" json:"remark"`
	NodeTime       int64   `gorm:"not null" json:"node_time"`
	CTime          int64   `gorm:"autoCreateTime;not null" json:"ctime"`
	MTime          int64   `gorm:"autoUpdateTime;not null" json:"mtime"`
}

func (OrderCustomsNode) TableName() string {
	return "order_customs_nodes"
}
