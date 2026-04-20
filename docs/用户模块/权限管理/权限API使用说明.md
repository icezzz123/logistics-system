# 权限API使用说明

## API接口

### 1. 获取当前用户权限

**接口地址**：`GET /api/permissions`

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应** (200)：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "role": 1,
    "role_name": "客户",
    "permissions": [
      "order:view",
      "order:create",
      "tracking:view"
    ]
  }
}
```

**使用示例**：
```bash
curl -X GET http://localhost:8080/api/permissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**PowerShell示例**：
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/permissions" -Method Get -Headers $headers
$response.data.permissions
```

## 中间件使用

### 1. RequirePermission - 要求特定权限

**用途**：限制接口只能由拥有特定权限的用户访问

**使用方法**：
```go
import (
    "logistics-system/config"
    "logistics-system/middleware"
)

// 在路由中使用
router.GET("/orders", 
    middleware.AuthMiddleware(),
    middleware.RequirePermission(config.PermOrderView),
    orderController.GetOrderList)
```

**示例场景**：
- 查看订单列表需要`order:view`权限
- 创建订单需要`order:create`权限
- 删除订单需要`order:delete`权限

### 2. RequireAnyPermission - 要求任一权限

**用途**：用户只需拥有其中一个权限即可访问

**使用方法**：
```go
// 拥有查看或更新权限都可以访问
router.GET("/orders/:id",
    middleware.AuthMiddleware(),
    middleware.RequireAnyPermission(
        config.PermOrderView,
        config.PermOrderUpdate,
    ),
    orderController.GetOrderDetail)
```

**示例场景**：
- 查看订单详情：客户可以查看自己的订单，管理员可以查看所有订单
- 处理异常：站点管理员和调度员都可以处理

### 3. RequireAllPermissions - 要求所有权限

**用途**：用户必须同时拥有所有指定权限才能访问

**使用方法**：
```go
// 必须同时拥有查看和更新权限
router.PUT("/orders/:id",
    middleware.AuthMiddleware(),
    middleware.RequireAllPermissions(
        config.PermOrderView,
        config.PermOrderUpdate,
    ),
    orderController.UpdateOrder)
```

**示例场景**：
- 更新订单：需要同时有查看和更新权限
- 分配任务：需要查看和分配权限

### 4. 角色快捷中间件

**RequireAdmin**：
```go
// 只允许管理员访问
admin := router.Group("/admin")
admin.Use(middleware.RequireAdmin())
{
    admin.GET("/users", userController.GetAllUsers)
    admin.POST("/users", userController.CreateUser)
}
```

**RequireStaff**：
```go
// 允许所有员工访问（快递员、分拣员、司机、管理员等）
staff := router.Group("/staff")
staff.Use(middleware.RequireStaff())
{
    staff.GET("/tasks", taskController.GetMyTasks)
}
```

**RequireManager**：
```go
// 允许管理层访问（站点管理员、调度员、管理员）
manager := router.Group("/manager")
manager.Use(middleware.RequireManager())
{
    manager.GET("/reports", reportController.GetReports)
}
```

## 控制器中使用

### 1. HasPermission - 检查权限

**用途**：在控制器逻辑中动态检查权限

**使用方法**：
```go
func (ctrl *OrderController) GetOrderDetail(c *gin.Context) {
    orderID := c.Param("id")
    
    // 获取订单
    order := getOrder(orderID)
    
    // 检查权限：客户只能查看自己的订单
    userID, _ := middleware.GetCurrentUserID(c)
    if order.UserID != userID {
        // 检查是否有管理员权限
        if !middleware.IsAdmin(c) {
            utils.Forbidden(c, "无权限查看此订单")
            return
        }
    }
    
    // 返回订单详情
    utils.Success(c, order)
}
```

### 2. 获取用户信息

**GetCurrentUserID**：
```go
userID, exists := middleware.GetCurrentUserID(c)
if !exists {
    utils.Unauthorized(c, "未登录")
    return
}
```

**GetCurrentUsername**：
```go
username, exists := middleware.GetCurrentUsername(c)
if !exists {
    utils.Unauthorized(c, "未登录")
    return
}
```

**GetCurrentUserRole**：
```go
role, exists := middleware.GetCurrentUserRole(c)
if !exists {
    utils.Unauthorized(c, "未登录")
    return
}
```

### 3. 辅助判断函数

**IsAdmin**：
```go
if middleware.IsAdmin(c) {
    // 管理员可以执行特殊操作
    performAdminAction()
}
```

**IsStaff**：
```go
if middleware.IsStaff(c) {
    // 员工可以查看内部信息
    showInternalInfo()
}
```

**IsManager**：
```go
if middleware.IsManager(c) {
    // 管理层可以查看报表
    showReports()
}
```

## 权限配置函数

### 1. HasPermission - 检查角色权限

```go
import "logistics-system/config"

// 检查角色1（客户）是否有订单查看权限
hasPermission := config.HasPermission(1, config.PermOrderView)
// 返回: true
```

### 2. GetRolePermissions - 获取角色权限列表

```go
// 获取客户的所有权限
permissions := config.GetRolePermissions(1)
// 返回: [order:view, order:create, tracking:view]
```

### 3. GetRoleName - 获取角色名称

```go
// 获取角色名称
roleName := config.GetRoleName(1)
// 返回: "客户"
```

### 4. IsValidRole - 验证角色ID

```go
// 验证角色ID是否有效
isValid := config.IsValidRole(1)
// 返回: true

isValid := config.IsValidRole(99)
// 返回: false
```

## 完整使用示例

### 示例1：订单管理路由

```go
func SetupOrderRoutes(r *gin.Engine) {
    orders := r.Group("/api/orders")
    orders.Use(middleware.AuthMiddleware())
    {
        // 查看订单列表 - 需要order:view权限
        orders.GET("", 
            middleware.RequirePermission(config.PermOrderView),
            orderCtrl.GetOrderList)
        
        // 创建订单 - 需要order:create权限
        orders.POST("", 
            middleware.RequirePermission(config.PermOrderCreate),
            orderCtrl.CreateOrder)
        
        // 查看订单详情 - 需要order:view权限
        orders.GET("/:id", 
            middleware.RequirePermission(config.PermOrderView),
            orderCtrl.GetOrderDetail)
        
        // 更新订单 - 需要order:update权限
        orders.PUT("/:id", 
            middleware.RequirePermission(config.PermOrderUpdate),
            orderCtrl.UpdateOrder)
        
        // 删除订单 - 需要order:delete权限（仅管理员）
        orders.DELETE("/:id", 
            middleware.RequireAdmin(),
            orderCtrl.DeleteOrder)
        
        // 分配订单 - 需要order:assign权限
        orders.POST("/:id/assign", 
            middleware.RequirePermission(config.PermOrderAssign),
            orderCtrl.AssignOrder)
    }
}
```

### 示例2：资源所有权检查

```go
func (ctrl *OrderController) UpdateOrder(c *gin.Context) {
    orderID := c.Param("id")
    
    // 获取订单
    order, err := ctrl.orderService.GetOrderByID(orderID)
    if err != nil {
        utils.NotFound(c, "订单不存在")
        return
    }
    
    // 获取当前用户ID
    currentUserID, _ := middleware.GetCurrentUserID(c)
    
    // 权限检查：只有订单所有者或管理员可以更新
    if order.UserID != currentUserID && !middleware.IsAdmin(c) {
        utils.Forbidden(c, "无权限更新此订单")
        return
    }
    
    // 更新订单逻辑...
    utils.Success(c, "更新成功")
}
```

### 示例3：前端权限控制

**获取权限列表**：
```javascript
// 登录后获取用户权限
async function getUserPermissions() {
    const response = await fetch('/api/permissions', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    return data.data.permissions;
}

// 存储到状态管理
const permissions = await getUserPermissions();
store.commit('setPermissions', permissions);
```

**前端权限判断**：
```javascript
// 检查是否有权限
function hasPermission(permission) {
    const permissions = store.state.permissions;
    return permissions.includes(permission);
}

// 在组件中使用
if (hasPermission('order:create')) {
    // 显示创建订单按钮
    showCreateButton();
}

if (hasPermission('order:delete')) {
    // 显示删除按钮
    showDeleteButton();
}
```

**Vue组件示例**：
```vue
<template>
  <div>
    <button v-if="hasPermission('order:create')" @click="createOrder">
      创建订单
    </button>
    <button v-if="hasPermission('order:update')" @click="updateOrder">
      更新订单
    </button>
    <button v-if="hasPermission('order:delete')" @click="deleteOrder">
      删除订单
    </button>
  </div>
</template>

<script>
export default {
  computed: {
    permissions() {
      return this.$store.state.permissions;
    }
  },
  methods: {
    hasPermission(perm) {
      return this.permissions.includes(perm);
    }
  }
}
</script>
```

## 测试示例

### PowerShell测试脚本

```powershell
# 登录获取Token
$loginBody = '{"username":"testuser","password":"123456"}'
$loginResp = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
    -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResp.data.token

# 获取权限列表
$headers = @{ "Authorization" = "Bearer $token" }
$permResp = Invoke-RestMethod -Uri "http://localhost:8080/api/permissions" `
    -Method Get -Headers $headers

Write-Host "Role: $($permResp.data.role_name)"
Write-Host "Permissions:"
$permResp.data.permissions | ForEach-Object { Write-Host "  - $_" }

# 测试有权限的接口
$orderResp = Invoke-RestMethod -Uri "http://localhost:8080/api/orders" `
    -Method Get -Headers $headers
Write-Host "Orders: $($orderResp.data.length) items"

# 测试无权限的接口（应该返回403）
try {
    $adminResp = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/users" `
        -Method Get -Headers $headers
} catch {
    Write-Host "Access denied (expected): $($_.Exception.Message)"
}
```

## 常见问题

### Q1: 如何给用户临时授予权限？

A: 当前系统基于角色授权，如需临时权限，可以：
1. 临时修改用户角色
2. 创建临时角色并分配权限
3. 实现基于时间的权限系统（需要扩展）

### Q2: 如何实现资源级权限控制？

A: 在控制器中检查资源所有权：
```go
if order.UserID != currentUserID && !middleware.IsAdmin(c) {
    utils.Forbidden(c, "无权限访问")
    return
}
```

### Q3: 权限检查的性能如何？

A: 权限检查基于内存映射，性能很高。如需优化：
1. 将权限信息缓存到Redis
2. 在JWT Token中包含权限列表
3. 使用权限位图（Bitmap）

### Q4: 如何记录权限检查日志？

A: 在中间件中添加日志：
```go
func RequirePermission(permission config.Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, _ := c.Get("role")
        userID, _ := c.Get("user_id")
        
        if !config.HasPermission(role.(int), permission) {
            // 记录拒绝日志
            log.Printf("Permission denied: user=%d, role=%d, permission=%s", 
                userID, role, permission)
            utils.Forbidden(c, "无权限执行此操作")
            c.Abort()
            return
        }
        
        // 记录允许日志
        log.Printf("Permission granted: user=%d, role=%d, permission=%s", 
            userID, role, permission)
        c.Next()
    }
}
```

## 最佳实践

1. **前后端双重验证**：前端控制UI显示，后端控制实际权限
2. **最小权限原则**：只授予必要的权限
3. **权限组合使用**：使用`RequireAllPermissions`确保多重验证
4. **资源所有权检查**：除了角色权限，还要检查资源归属
5. **日志记录**：记录所有权限拒绝事件
6. **定期审计**：定期检查用户权限是否合理
