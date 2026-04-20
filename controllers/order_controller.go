package controllers

import (
	"fmt"
	"logistics-system/dto"
	"logistics-system/services"
	"logistics-system/utils"

	"github.com/gin-gonic/gin"
)

type OrderController struct {
	orderService *services.OrderService
}

// NewOrderController 閸掓稑缂撶拋銏犲礋閹貉冨煑閸ｃ劌鐤勬笟?
func NewOrderController() *OrderController {
	return &OrderController{
		orderService: services.NewOrderService(),
	}
}

// CreateOrder 閸掓稑缂撶拋銏犲礋
// @Summary 閸掓稑缂撶拋銏犲礋
// @Description 閸掓稑缂撻弬鎵畱閻椻晜绁︾拋銏犲礋閿涘瞼閮寸紒鐔诲殰閸斻劏顓哥粻妤勭箥鐠?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param body body dto.CreateOrderRequest true "鐠併垹宕熸穱鈩冧紖"
// @Success 200 {object} dto.CreateOrderResponse
// @Router /api/orders [post]
func (ctrl *OrderController) CreateOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "未登录")
		return
	}
	if role := userRole.(int); role != 1 {
		utils.Forbidden(c, "仅客户账号可以创建订单")
		return
	}

	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	req.CustomerID = userID.(uint)
	order, err := ctrl.orderService.CreateOrder(req.CustomerID, &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	packageCount := len(req.Packages)
	if packageCount == 0 {
		packageCount = 1
	}

	response := dto.CreateOrderResponse{
		OrderID:       order.ID,
		OrderNo:       order.OrderNo,
		FreightCharge: order.FreightCharge,
		InsuranceFee:  order.InsuranceFee,
		TotalAmount:   order.TotalAmount,
		EstimatedDays: order.EstimatedDays,
		OrderTime:     order.OrderTime,
		PackageCount:  packageCount,
	}

	utils.Success(c, response)
}

// GetOrderList 閼惧嘲褰囩拋銏犲礋閸掓銆?// @Summary 閼惧嘲褰囩拋銏犲礋閸掓銆?// @Description 閺€顖涘瘮閸掑棝銆夐妴浣规偝缁便垹鎷扮粵娑⑩偓澶屾畱鐠併垹宕熼崚妤勩€冮弻銉嚄
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param page query int false "妞ょ數鐖? default(1)
// @Param page_size query int false "濮ｅ繘銆夐弫浼村櫤" default(10)
// @Param order_no query string false "璁㈠崟鍙凤紙妯＄硦鎼滅储锛?
// @Param status query int false "璁㈠崟鐘舵€?
// @Param sender_country query string false "閸欐垳娆㈤崶钘夘啀"
// @Param receiver_country query string false "閺€鏈垫閸ヨ棄顔?
// @Param start_time query int64 false "瀵偓婵妞傞梻杈剧礄Unix閺冨爼妫块幋绛圭礆"
// @Param end_time query int64 false "缂佹挻娼弮鍫曟？閿涘湶nix閺冨爼妫块幋绛圭礆"
// @Success 200 {object} dto.OrderListResponse
// @Router /api/orders [get]
func (ctrl *OrderController) GetOrderList(c *gin.Context) {
	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定查询参数
	var req dto.OrderQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.orderService.GetOrderList(userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

// GetOrderDetail 閼惧嘲褰囩拋銏犲礋鐠囷附鍎?// @Summary 閼惧嘲褰囩拋銏犲礋鐠囷附鍎?// @Description 閺嶈宓佺拋銏犲礋ID閼惧嘲褰囩拋銏犲礋鐠囷妇绮忔穱鈩冧紖
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Success 200 {object} models.Order
// @Router /api/orders/{id} [get]
func (ctrl *OrderController) GetOrderDetail(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 閺屻儴顕楃拋銏犲礋
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 閺夊啴妾哄Λ鈧弻銉窗閺咁噣鈧氨鏁ら幋宄板涧閼宠姤鐓￠惇瀣殰瀹歌京娈戠拋銏犲礋
	if userRole.(int) != 6 && userRole.(int) != 7 {
		if order.CustomerID != userID.(uint) {
            utils.Forbidden(c, "无权查看此订单")
			return
		}
	}

	detail, err := ctrl.orderService.GetOrderDetailResponse(orderID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, detail)
}

// UpdateOrderStatus 閺囧瓨鏌婄拋銏犲礋閻樿埖鈧?
// @Summary 閺囧瓨鏌婄拋銏犲礋閻樿埖鈧?
// @Description 缁狅紕鎮婇崨妯烘嫲鐠嬪啫瀹抽崨妯哄讲娴犮儲娲块弬鎷岊吂閸楁洜濮搁幀渚婄礉闂団偓闁潧鎯婇悩鑸碘偓浣规簚鐟欏嫬鍨?// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Param body body dto.UpdateOrderStatusRequest true "鐘舵€佷俊鎭?
// @Success 200 {object} utils.Response
// @Router /api/orders/{id}/status [put]
func (ctrl *OrderController) UpdateOrderStatus(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定请求参数
	var req dto.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.orderService.UpdateOrderStatus(orderID, req.Status, userID.(uint), userRole.(int), req.Remark); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}
	utils.Success(c, gin.H{
        "message": "订单状态更新成功",
	})
}

// UpdateOrder 娣囶喗鏁肩拋銏犲礋娣団剝浼?// @Summary 娣囶喗鏁肩拋銏犲礋娣団剝浼?// @Description 娣囶喗鏁肩拋銏犲礋閻ㄥ嫭鏁规禒鏈垫眽娣団剝浼呴崪灞筋槵濞夘煉绱欐禒鍛窡婢跺嫮鎮婇悩鑸碘偓浣稿讲娣囶喗鏁奸敍?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Param body body dto.UpdateOrderRequest true "娣囶喗鏁兼穱鈩冧紖"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id} [put]
func (ctrl *OrderController) UpdateOrder(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定请求参数
	// 绑定请求参数
	var req dto.UpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := ctrl.orderService.UpdateOrder(orderID, userID.(uint), userRole.(int), &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}
	utils.Success(c, gin.H{
		"message": "订单修改成功",
	})
}
// CancelOrder 閸欐牗绉风拋銏犲礋
// @Summary 閸欐牗绉风拋銏犲礋
// @Description 閸欐牗绉风拋銏犲礋閿涘牅绮庡鍛槱閻炲棗鎷板鍙夊复閸楁洜濮搁幀浣稿讲閸欐牗绉烽敍?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id}/cancel [put]
func (ctrl *OrderController) CancelOrder(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 鐠嬪啰鏁ら張宥呭鐏?
	if err := ctrl.orderService.CancelOrder(orderID, userID.(uint), userRole.(int)); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
        "message": "订单已取消",
	})
}

// DeleteOrder 閸掔娀娅庣拋銏犲礋
// @Summary 閸掔娀娅庣拋銏犲礋
// @Description 閸掔娀娅庣拋銏犲礋閿涘牅绮庣粻锛勬倞閸涙ê褰查崚鐘绘珟瀹告彃褰囧☉鍫㈡畱鐠併垹宕熼敍?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Success 200 {object} utils.Response
// @Router /api/orders/{id} [delete]
func (ctrl *OrderController) DeleteOrder(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 鐠嬪啰鏁ら張宥呭鐏?
	if err := ctrl.orderService.DeleteOrder(orderID, userID.(uint), userRole.(int)); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
        "message": "订单删除成功",
	})
}

// GetOrderStatistics 閼惧嘲褰囩拋銏犲礋缂佺喕顓告穱鈩冧紖
// @Summary 閼惧嘲褰囩拋銏犲礋缂佺喕顓?// @Description 閼惧嘲褰囩拋銏犲礋缂佺喕顓告穱鈩冧紖閿涘本鏁幐浣瑰瘻閻樿埖鈧降鈧浇绻嶆潏鎾存煙瀵繈鈧礁娴楃€瑰墎鐡戠紒鏉戝缂佺喕顓?// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param start_time query int64 false "瀵偓婵妞傞梻杈剧礄Unix閺冨爼妫块幋绛圭礆"
// @Param end_time query int64 false "缂佹挻娼弮鍫曟？閿涘湶nix閺冨爼妫块幋绛圭礆"
// @Param group_by query string false "鍒嗙粍鏂瑰紡锛坉ate锛氭寜鏃ユ湡锛?
// @Success 200 {object} dto.OrderStatisticsResponse
// @Router /api/orders/statistics [get]
func (ctrl *OrderController) SplitOrder(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "闁哄啰濮甸弲銉╂儍閸曨噮鍚傞柛妤佹D")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "瑜版挸澧犵憴鎺曞閺冪姵娼堥幏鍡楀礋")
		return
	}

	var req dto.SplitOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	result, err := ctrl.orderService.SplitOrder(orderID, &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) MergeOrders(c *gin.Context) {
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "瑜版挸澧犵憴鎺曞閺冪姵娼堥崥鍫濆礋")
		return
	}

	var req dto.MergeOrdersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	result, err := ctrl.orderService.MergeOrders(&req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) GetOrderCustoms(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "闁哄啰濮甸弲銉╂儍閸曨噮鍚傞柛妤佹D")
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}

	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}
	if userRole.(int) != 6 && userRole.(int) != 7 && order.CustomerID != userID.(uint) {
		utils.Forbidden(c, "闁哄啰濮靛鍫ュ蓟閵壯勭畽婵縿鍊涢褰掑础?")
		return
	}

	detail, err := ctrl.orderService.GetOrderDetailResponse(orderID)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, gin.H{
		"customs":       detail.Customs,
		"customs_nodes": detail.CustomsNodes,
	})
}

func (ctrl *OrderController) SuggestHSCode(c *gin.Context) {
	var req dto.HSCodeSuggestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	result := services.NewHSCodeService().Suggest(&req)
	utils.Success(c, result)
}

func (ctrl *OrderController) UpdateOrderCustoms(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "闁哄啰濮甸弲銉╂儍閸曨噮鍚傞柛妤佹D")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "瑜版挸澧犵憴鎺曞閺冪姵娼堢紒瀛樺Б濞撳懎鍙ф穱鈩冧紖")
		return
	}

	var req dto.UpdateOrderCustomsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	if err := ctrl.orderService.UpdateOrderCustoms(orderID, &req); err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

    utils.Success(c, gin.H{"message": "清关信息已更新"})
}

func (ctrl *OrderController) AddOrderCustomsNode(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "闁哄啰濮甸弲銉╂儍閸曨噮鍚傞柛妤佹D")
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "瑜版挸澧犵憴鎺曞閺冪姵娼堢紒瀛樺Б濞撳懎鍙ч懞鍌滃仯")
		return
	}

	var req dto.CreateOrderCustomsNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	result, err := ctrl.orderService.AddOrderCustomsNode(orderID, userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) CreateOrderCustomsException(c *gin.Context) {
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "闁哄啰濮甸弲銉╂儍閸曨噮鍚傞柛妤佹D")
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	userRole, exists := c.Get("role")
	if !exists {
		utils.Unauthorized(c, "闁哄牜浜炲▍銉ㄣ亹?")
		return
	}
	if role := userRole.(int); role != 5 && role != 6 && role != 7 {
		utils.Forbidden(c, "瑜版挸澧犵憴鎺曞閺冪姵娼堟稉濠冨Г閸忓啿濮熷鍌氱埗")
		return
	}

	var req dto.CreateOrderCustomsExceptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequest(c, "闁告瑥鍊归弳鐔兼煥濞嗘帩鍤? "+err.Error())
		return
	}

	result, err := ctrl.orderService.CreateOrderCustomsException(orderID, userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}

	utils.Success(c, result)
}

func (ctrl *OrderController) GetOrderStatistics(c *gin.Context) {
	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 绑定查询参数
	var req dto.OrderStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	result, err := ctrl.orderService.GetOrderStatistics(userID.(uint), userRole.(int), &req)
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}
	utils.Success(c, result)
}
// GetAllowedStatusTransitions 閼惧嘲褰囩拋銏犲礋閸忎浇顔忛惃鍕Ц閹浇娴嗛幑?
// @Summary 閼惧嘲褰囬崗浣筋啅閻ㄥ嫮濮搁幀浣芥祮閹?
// @Description 閼惧嘲褰囪ぐ鎾冲鐠併垹宕熼悩鑸碘偓浣稿帒鐠佹瓕娴嗛幑銏犲煂閻ㄥ嫮濮搁幀浣稿灙鐞?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Success 200 {object} dto.AllowedTransitionsResponse
// @Router /api/orders/{id}/transitions [get]
func (ctrl *OrderController) GetAllowedStatusTransitions(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涚憴鎺曞
	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 查询订单
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	allowed, err := ctrl.orderService.GetAllowedStatusTransitions(orderID, userRole.(int))
	if err != nil {
		utils.Error(c, 500, err.Error())
		return
	}


	// 閺嬪嫬缂撻崫宥呯安
	response := dto.AllowedTransitionsResponse{
		CurrentStatus:     int(order.Status),
		CurrentStatusName: services.GetOrderStatusName(int(order.Status)),
		AllowedStatuses:   make([]dto.StatusTransitionOption, 0),
	}

	for _, status := range allowed {
		response.AllowedStatuses = append(response.AllowedStatuses, dto.StatusTransitionOption{
			Status:     int(status),
			StatusName: services.GetOrderStatusName(int(status)),
		})
	}

	utils.Success(c, response)
}

// GetOrderStatusLogs 閼惧嘲褰囩拋銏犲礋閻樿埖鈧礁褰夐弴瀛樻）韫?
// @Summary 閼惧嘲褰囩拋銏犲礋閻樿埖鈧礁褰夐弴瀛樻）韫?
// @Description 閼惧嘲褰囩拋銏犲礋閻ㄥ嫭澧嶉張澶屽Ц閹礁褰夐弴鏉戝坊閸欒尪顔囪ぐ?
// @Tags 鐠併垹宕熺粻锛勬倞
// @Accept json
// @Produce json
// @Param id path int true "鐠併垹宕烮D"
// @Success 200 {object} []dto.OrderStatusLogResponse
// @Router /api/orders/{id}/status-logs [get]
func (ctrl *OrderController) GetOrderStatusLogs(c *gin.Context) {
	// 閼惧嘲褰囩拋銏犲礋ID
	orderIDParam := c.Param("id")
	var orderID uint
	if _, err := fmt.Sscanf(orderIDParam, "%d", &orderID); err != nil {
		utils.BadRequest(c, "閺冪姵鏅ラ惃鍕吂閸楁椌D")
		return
	}

	// 閼惧嘲褰囪ぐ鎾冲閻劍鍩涙穱鈩冧紖
	userID, exists := c.Get("user_id")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	userRole, exists := c.Get("role")
	if !exists {
        utils.Unauthorized(c, "未登录")
		return
	}

	// 妤犲矁鐦夌拋銏犲礋鐠佸潡妫堕弶鍐
	order, err := ctrl.orderService.GetOrderByID(orderID)
	if err != nil {
		utils.Error(c, 404, err.Error())
		return
	}

	// 权限检查：客户只能查看自己的订单状态日志
	if userRole.(int) == 1 && order.CustomerID != userID.(uint) {
		utils.Forbidden(c, "无权查看此订单的状态日志")
		return
	}
	// 閼惧嘲褰囬悩鑸碘偓浣稿綁閺囧瓨妫╄箛?
	logs, err := ctrl.orderService.GetOrderStatusLogs(orderID)
	if err != nil {
        utils.Error(c, 500, "获取状态变更日志失败")
		return
	}

	// 閺嬪嫬缂撻崫宥呯安
	response := make([]dto.OrderStatusLogResponse, 0, len(logs))
	for _, log := range logs {
		response = append(response, dto.OrderStatusLogResponse{
			ID:               log.ID,
			OrderID:          log.OrderID,
			FromStatus:       int(log.FromStatus),
			FromStatusName:   services.GetOrderStatusName(int(log.FromStatus)),
			ToStatus:         int(log.ToStatus),
			ToStatusName:     services.GetOrderStatusName(int(log.ToStatus)),
			OperatorID:       log.OperatorID,
			OperatorName:     log.OperatorName,
			OperatorRole:     log.OperatorRole,
			OperatorRoleName: getRoleName(log.OperatorRole),
			Remark:           log.Remark,
			ChangeTime:       log.ChangeTime,
			CreatedAt:        log.CreatedAt,
		})
	}

	utils.Success(c, response)
}

// getRoleName 閼惧嘲褰囩憴鎺曞閸氬秶袨
func getRoleName(role int) string {
	roleNames := map[int]string{
        1: "客户",
        2: "快递员",
        3: "分拣员",
        4: "司机",
        5: "站点管理员",
        6: "调度员",
        7: "管理员",
	}
	if name, ok := roleNames[role]; ok {
		return name
	}
	return "閺堫亞鐓＄憴鎺曞"
}
