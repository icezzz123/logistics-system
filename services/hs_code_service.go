package services

import (
	"errors"
	"logistics-system/dto"
	"regexp"
	"sort"
	"strings"
)

type hsCodeCatalogItem struct {
	HSCode             string
	CustomsDeclaration string
	Category           string
	Keywords           []string
}

type hsCodeScoredItem struct {
	item   hsCodeCatalogItem
	score  int
	reason string
}

type HSCodeService struct{}

func NewHSCodeService() *HSCodeService {
	return &HSCodeService{}
}

var (
	hsCodeDigitsPattern = regexp.MustCompile(`\D`)
	commonHSCodeCatalog = []hsCodeCatalogItem{
		{HSCode: "851713", CustomsDeclaration: "智能手机", Category: "电子产品", Keywords: []string{"智能手机", "手机", "smartphone", "mobile phone", "iphone", "android"}},
		{HSCode: "847130", CustomsDeclaration: "便携式计算机", Category: "电子产品", Keywords: []string{"笔记本电脑", "手提电脑", "laptop", "notebook", "portable computer", "平板电脑", "tablet"}},
		{HSCode: "851830", CustomsDeclaration: "耳机", Category: "电子产品", Keywords: []string{"耳机", "headphone", "earphone", "headset", "蓝牙耳机"}},
		{HSCode: "850440", CustomsDeclaration: "电源适配器", Category: "电子配件", Keywords: []string{"充电器", "适配器", "charger", "power adapter"}},
		{HSCode: "854442", CustomsDeclaration: "带接头电缆", Category: "电子配件", Keywords: []string{"数据线", "充电线", "线缆", "cable", "usb cable"}},
		{HSCode: "420292", CustomsDeclaration: "背包及类似容器", Category: "箱包", Keywords: []string{"背包", "书包", "箱包", "包", "bag", "backpack", "handbag"}},
		{HSCode: "640411", CustomsDeclaration: "橡胶或塑料底运动鞋", Category: "鞋靴", Keywords: []string{"运动鞋", "鞋", "sneaker", "shoes", "footwear"}},
		{HSCode: "610910", CustomsDeclaration: "棉制针织T恤", Category: "服装", Keywords: []string{"t恤", "T恤", "上衣", "服装", "衣服", "t-shirt", "shirt", "apparel", "clothing"}},
		{HSCode: "330499", CustomsDeclaration: "护肤化妆品", Category: "化妆品", Keywords: []string{"护肤品", "化妆品", "面霜", "乳液", "cosmetic", "skincare", "makeup"}},
		{HSCode: "711719", CustomsDeclaration: "仿首饰", Category: "饰品", Keywords: []string{"饰品", "项链", "手链", "耳饰", "首饰", "jewelry", "accessory"}},
		{HSCode: "950300", CustomsDeclaration: "玩具", Category: "玩具", Keywords: []string{"玩具", "toy", "doll", "积木", "拼装玩具"}},
		{HSCode: "490199", CustomsDeclaration: "书籍及类似印刷品", Category: "图书", Keywords: []string{"书", "图书", "书籍", "book", "books", "printed"}},
	}
)

func normalizeHSCodeInput(value string) string {
	return hsCodeDigitsPattern.ReplaceAllString(strings.TrimSpace(value), "")
}

func validateHSCodeFormat(value string) (string, error) {
	normalized := normalizeHSCodeInput(value)
	if normalized == "" {
		return "", nil
	}
	switch len(normalized) {
	case 6, 8, 10:
		return normalized, nil
	default:
		return "", errors.New("HS Code必须为6位、8位或10位数字")
	}
}

func buildHSCodeTexts(req *dto.HSCodeSuggestRequest) []string {
	texts := make([]string, 0, 2+len(req.Packages)*2)
	for _, value := range []string{req.GoodsName, req.GoodsCategory, req.CustomsDeclaration} {
		text := strings.ToLower(strings.TrimSpace(value))
		if text != "" {
			texts = append(texts, text)
		}
	}
	for _, pkg := range req.Packages {
		for _, value := range []string{pkg.GoodsName, pkg.GoodsCategory} {
			text := strings.ToLower(strings.TrimSpace(value))
			if text != "" {
				texts = append(texts, text)
			}
		}
	}
	return texts
}

func scoreHSCodeItem(item hsCodeCatalogItem, texts []string) hsCodeScoredItem {
	score := 0
	matchedKeyword := ""
	for _, keyword := range item.Keywords {
		loweredKeyword := strings.ToLower(keyword)
		for _, text := range texts {
			if text == loweredKeyword {
				score += 100
				matchedKeyword = keyword
				break
			}
			if strings.Contains(text, loweredKeyword) || strings.Contains(loweredKeyword, text) {
				score += 60
				if matchedKeyword == "" {
					matchedKeyword = keyword
				}
			}
		}
	}
	reason := ""
	if matchedKeyword != "" {
		reason = "匹配关键词：" + matchedKeyword
	}
	return hsCodeScoredItem{
		item:   item,
		score:  score,
		reason: reason,
	}
}

func hsCodeConfidence(score int) string {
	switch {
	case score >= 160:
		return "high"
	case score >= 80:
		return "medium"
	default:
		return "low"
	}
}

func (s *HSCodeService) Suggest(req *dto.HSCodeSuggestRequest) *dto.HSCodeSuggestResponse {
	texts := buildHSCodeTexts(req)
	if len(texts) == 0 {
		return &dto.HSCodeSuggestResponse{
			Matched:      false,
			Alternatives: []dto.HSCodeSuggestionItem{},
			Note:         "请先填写货物名称、货物分类或申报品名后再进行自动匹配",
		}
	}

	scored := make([]hsCodeScoredItem, 0, len(commonHSCodeCatalog))
	for _, item := range commonHSCodeCatalog {
		entry := scoreHSCodeItem(item, texts)
		if entry.score > 0 {
			scored = append(scored, entry)
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		if scored[i].score == scored[j].score {
			return scored[i].item.HSCode < scored[j].item.HSCode
		}
		return scored[i].score > scored[j].score
	})

	response := &dto.HSCodeSuggestResponse{
		Matched:      len(scored) > 0,
		Alternatives: []dto.HSCodeSuggestionItem{},
		Note:         "自动匹配基于常见货物关键词，仅作申报建议，最终请以实际海关归类为准",
	}

	if len(scored) == 0 {
		return response
	}

	topN := 3
	if len(scored) < topN {
		topN = len(scored)
	}
	for index := 0; index < topN; index++ {
		item := scored[index]
		suggestion := dto.HSCodeSuggestionItem{
			HSCode:             item.item.HSCode,
			CustomsDeclaration: item.item.CustomsDeclaration,
			Category:           item.item.Category,
			Confidence:         hsCodeConfidence(item.score),
			Reason:             item.reason,
		}
		if index == 0 {
			response.Suggestion = &suggestion
		}
		response.Alternatives = append(response.Alternatives, suggestion)
	}

	return response
}

func applyHSCodeDefaults(req *dto.CreateOrderRequest) {
	service := NewHSCodeService()
	if req.HSCode != "" {
		if normalized, err := validateHSCodeFormat(req.HSCode); err == nil {
			req.HSCode = normalized
		}
		return
	}

	suggestion := service.Suggest(&dto.HSCodeSuggestRequest{
		GoodsName:          req.GoodsName,
		GoodsCategory:      req.GoodsCategory,
		CustomsDeclaration: req.CustomsDeclaration,
		Packages:           req.Packages,
	})
	if suggestion.Suggestion == nil {
		return
	}
	req.HSCode = suggestion.Suggestion.HSCode
	if strings.TrimSpace(req.CustomsDeclaration) == "" {
		req.CustomsDeclaration = suggestion.Suggestion.CustomsDeclaration
	}
}
