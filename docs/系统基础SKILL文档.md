# 跨境物流作业系统 - 基础 SKILL 文档

## 系统概览

### 项目定位
基于 Go + Gin + GORM + MySQL + Redis 的跨境物流作业系统，采用单体架构与模块化设计，支持订单全生命周期管理、智能分拣、运输调度、全程追踪和异常处理。

### 技术栈
- **后端框架**: Go 1.21+ / Gin
- **ORM**: GORM
- **数据库**: MySQL 8+
- **缓存**: Redis 6+
- **认证**: JWT
- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **测试**: Go test + httptest

### 核心特性
- 跨境物流全流程管理（15个订单状态）
- 基于 RBAC 的权限体系（7种角色）
- 智能分拣路由匹配
- 运输任务调度与成本核算
- 全程货物追踪与时效预警
- 异常处理与统计分析
- 包裹级管理（一单多包、拆单、合单）
- 清关业务支持（HS Code、税费计算）

---

## 系统架构

### 分层架构
```
HTTP Request
  -> Middleware (认证/日志/跨域/恢复)
  -> Controller (参数绑定/响应封装)
  -> Service (业务逻辑/事务控制)
  -> Model (数据模型)
  -> Database (MySQL/Redis)
```

### 目录结构
```
logistics-system/
├── controllers/      # HTTP 控制器层
├── services/         # 业务逻辑层
├── models/           # 数据模型层
├── dto/              # 请求/响应对象
├── routes/           # 路由注册
├── middleware/       # 中间件（认证/日志/跨域/恢复）
├── database/         # 数据库初始化
├── config/           # 配置管理（含权限定义）
├── utils/            # 工具函数（JWT/密码/响应/时间）
├── testutil/         # 测试工具
├── frontend/         # Vue 3 前端项目
├── docs/             # 项目文档
├── main.go           # 程序入口
└── Makefile          # 常用命令
```

---

## 核心业务模块

### 1. 用户与权限模块
**功能**: 用户注册、登录、JWT 认证、RBAC 权限控制

**角色体系**:
- 客户 (RoleCustomer = 1)
- 快递员 (RoleCourier = 2)
- 分拣员 (RoleSorter = 3)
- 司机 (RoleDriver = 4)
- 站点管理员 (RoleSiteManager = 5)
- 调度员 (RoleDispatcher = 6)
- 管理员 (RoleAdmin = 7)

**权限类型**: 用户、订单、站点、仓储、分拣、运输、追踪、异常、系统配置等

**核心文件**:
- `models/user.go` - 用户模型
- `models/role.go` - 角色模型
- `config/permissions.go` - 权限定义与映射
- `controllers/auth_controller.go` - 认证控制器
- `controllers/user_controller.go` - 用户管理控制器
- `middleware/auth.go` - JWT 认证中间件

### 2. 订单模块
**功能**: 订单创建、查询、更新、取消、状态流转、统计分析

**订单状态流转**:
```
pending(待处理) → accepted(已接单) → pickup_pending(待揽收) 
→ picking_up(揽收中) → picked_up(已揽收) → in_warehouse(已入库) 
→ sorting(分拣中) → in_transit(运输中) → customs_clearing(清关中) 
→ destination_sorting(目的地分拣) → delivering(派送中) 
→ delivered(已送达) → signed(已签收)
```

**特殊状态**: exception(异常)、cancelled(已取消)

**订单层级**:
- normal: 普通订单
- master: 母单（一单多包）
- child: 子单/包裹

**订单关系**:
- split: 拆单（一单拆多单）
- merge: 合单（多单合一单）

**核心字段**:
- 跨境字段: sender_country, receiver_country, customs_declaration, hs_code
- 清关字段: declared_value, customs_duty, customs_vat, customs_status
- 费用字段: freight_charge, customs_fee, insurance_fee, total_amount
- 时间字段: order_time, pickup_time, delivery_time, sign_time

**核心文件**:
- `models/order.go` - 订单模型
- `models/order_package.go` - 包裹模型
- `models/order_customs.go` - 清关信息模型
- `models/order_status_log.go` - 状态日志模型
- `services/order_service.go` - 订单服务
- `services/order_state_machine.go` - 状态机
- `services/order_hierarchy_service.go` - 订单层级服务
- `controllers/order_controller.go` - 订单控制器

### 3. 站点与仓储模块
**功能**: 站点管理、入库/出库扫描、库存查询、库存预警、盘点、统计报表

**站点类型**:
- 集散中心
- 转运中心
- 配送站点
- 海关监管仓

**库存管理**:
- 实时库存查询
- 库存预警（低库存/高库存/滞留）
- 库存盘点（创建/执行/完成）
- 库存统计报表（按站点/按时间）

**核心文件**:
- `models/station.go` - 站点模型
- `models/warehouse.go` - 仓库流转记录模型
- `models/inventory_check.go` - 库存盘点模型
- `services/station_service.go` - 站点服务
- `services/warehouse_service.go` - 仓储服务
- `controllers/station_controller.go` - 站点控制器
- `controllers/warehouse_controller.go` - 仓储控制器

### 4. 分拣模块
**功能**: 分拣规则管理、路由匹配、分拣任务、扫描作业、统计分析

**分拣规则**:
- 按目的地国家/省/市/区县配置路由
- 支持优先级排序
- 支持启用/禁用状态

**分拣流程**:
1. 创建分拣任务
2. 扫描订单/包裹
3. 路由匹配（单个/批量）
4. 记录分拣结果
5. 统计准确率

**核心文件**:
- `models/sorting.go` - 分拣规则/任务/记录模型
- `services/sorting_service.go` - 分拣服务
- `services/sorting_scan_service.go` - 分拣扫描服务
- `controllers/sorting_controller.go` - 分拣控制器

### 5. 运输模块
**功能**: 车辆管理、运输任务、装卸扫描、运输监控、成本核算、统计分析

**运输方式**:
- 空运 (TransportAir = 1)
- 海运 (TransportSea = 2)
- 陆运 (TransportLand = 3)
- 铁路 (TransportRail = 4)
- 快递 (TransportExpress = 5)

**运输任务状态**:
- pending: 待执行
- loading: 装车中
- in_transit: 运输中
- unloading: 卸车中
- completed: 已完成
- cancelled: 已取消

**装卸管理**:
- 装车扫描（记录装车时间、数量）
- 卸车扫描（记录卸车时间、数量）
- 装卸记录查询

**运输监控**:
- 运输概览（总任务数/进行中/已完成）
- 任务监控（实时位置/预计到达时间）
- 异常预警（延误/超时/异常）

**成本核算**:
- 燃油成本
- 人工成本
- 过路费
- 其他费用
- 总成本统计

**核心文件**:
- `models/transport.go` - 车辆/运输任务模型
- `services/transport_service.go` - 运输服务
- `services/transport_scan_service.go` - 装卸扫描服务
- `controllers/transport_controller.go` - 运输控制器

### 6. 追踪模块
**功能**: 追踪记录、历史查询、时间轴展示、时效预警

**追踪节点**:
- 订单创建
- 揽收
- 入库
- 分拣
- 发车
- 到达
- 清关
- 派送
- 签收

**预警机制**:
- 延误预警（超过预计时间）
- 滞留预警（长时间无更新）
- 异常预警（状态异常）

**核心文件**:
- `models/tracking.go` - 追踪记录模型
- `services/tracking_service.go` - 追踪服务
- `controllers/tracking_controller.go` - 追踪控制器

### 7. 异常模块
**功能**: 异常创建、分配、处理、关闭、统计分析

**异常类型**:
- 破损
- 丢失
- 延误
- 拒收
- 地址错误
- 海关扣留
- 其他

**异常状态**:
- pending: 待处理
- assigned: 已分配
- processing: 处理中
- resolved: 已解决
- closed: 已关闭

**异常处理流程**:
1. 创建异常
2. 分配处理人
3. 处理异常（记录处理方案）
4. 关闭异常（记录处理结果）

**核心文件**:
- `models/exception.go` - 异常记录模型
- `services/exception_service.go` - 异常服务
- `services/exception_access_service.go` - 异常权限服务
- `controllers/exception_controller.go` - 异常控制器

### 8. 调度模块
**功能**: 路径优化、批次调度、运输计划、调度建议

**路径优化**:
- 基于站点距离优化路径
- 支持多站点路径规划

**批次调度**:
- 创建调度批次
- 分配订单到批次
- 批次状态管理

**运输计划**:
- 创建运输计划
- 订单加入计划
- 计划状态管理（待执行/执行中/已完成）

**调度建议**:
- 基于订单目的地、重量、体积
- 推荐最优车辆和路线

**核心文件**:
- `services/dispatch_service.go` - 调度服务
- `controllers/dispatch_controller.go` - 调度控制器

---

## 数据库设计

### 核心数据表（15张）

#### 用户管理（1张）
- `users` - 用户表

#### 订单管理（4张）
- `orders` - 订单表
- `order_packages` - 包裹表
- `order_customs` - 清关信息表
- `order_status_logs` - 状态日志表

#### 站点管理（4张）
- `stations` - 站点表
- `station_flows` - 站点流转记录表
- `warehouses` - 仓库流转记录表
- `inventory_checks` - 库存盘点表

#### 分拣管理（3张）
- `sorting_rules` - 分拣规则表
- `sorting_tasks` - 分拣任务表
- `sorting_records` - 分拣记录表

#### 运输管理（3张）
- `vehicles` - 车辆表
- `transport_tasks` - 运输任务表
- `transport_records` - 装卸记录表

#### 追踪与异常（2张）
- `tracking_records` - 追踪记录表
- `exception_records` - 异常记录表

### 数据库特性
- 支持跨境字段（国家/省/市）
- 支持多币种（currency）
- 支持软删除（deleted_at）
- 完善的索引策略
- 时间戳自动管理（ctime/mtime）

---

## API 接口规范

### 基础约定
- **基础地址**: `http://localhost:8080`
- **认证方式**: `Authorization: Bearer <token>`
- **统一响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 公开接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /health` - 健康检查

### 认证接口
- `GET /api/profile` - 获取当前用户信息
- `GET /api/permissions` - 获取当前用户权限
- `PUT /api/user/password` - 修改密码

### 用户管理接口
- `GET /api/users` - 用户列表
- `PUT /api/users/:id` - 更新用户
- `PUT /api/admin/users/:id/role` - 分配角色
- `PUT /api/admin/users/:id/status` - 更新状态
- `DELETE /api/admin/users/:id` - 删除用户

### 订单接口
- `POST /api/orders` - 创建订单
- `GET /api/orders` - 订单列表
- `GET /api/orders/:id` - 订单详情
- `PUT /api/orders/:id` - 更新订单
- `PUT /api/orders/:id/status` - 更新状态
- `PUT /api/orders/:id/cancel` - 取消订单
- `GET /api/orders/:id/status-logs` - 状态日志
- `GET /api/orders/statistics` - 订单统计

### 站点与仓储接口
- `GET /api/stations` - 站点列表
- `POST /api/stations` - 创建站点
- `POST /api/warehouse/inbound` - 入库扫描
- `POST /api/warehouse/outbound` - 出库扫描
- `GET /api/stations/inventory` - 库存查询
- `GET /api/stations/inventory/warnings` - 库存预警
- `POST /api/stations/inventory/check` - 创建盘点

### 分拣接口
- `GET /api/sorting/rules` - 分拣规则列表
- `POST /api/sorting/rules` - 创建规则
- `POST /api/sorting/route/match` - 路由匹配
- `POST /api/sorting/scan` - 分拣扫描
- `GET /api/sorting/stats` - 分拣统计

### 运输接口
- `GET /api/transport/vehicles` - 车辆列表
- `POST /api/transport/vehicles` - 创建车辆
- `GET /api/transport/tasks` - 运输任务列表
- `POST /api/transport/tasks` - 创建任务
- `POST /api/transport/tasks/:id/load-scan` - 装车扫描
- `POST /api/transport/tasks/:id/unload-scan` - 卸车扫描
- `GET /api/transport/monitor/overview` - 运输监控
- `GET /api/transport/costs/overview` - 成本概览

### 追踪接口
- `POST /api/tracking/records` - 创建追踪记录
- `GET /api/tracking/orders/:order_id/history` - 追踪历史
- `GET /api/tracking/orders/:order_id/timeline` - 时间轴
- `GET /api/tracking/warnings` - 追踪预警

### 异常接口
- `POST /api/exceptions` - 创建异常
- `GET /api/exceptions` - 异常列表
- `PUT /api/exceptions/:id/assign` - 分配处理人
- `PUT /api/exceptions/:id/process` - 处理异常
- `PUT /api/exceptions/:id/close` - 关闭异常
- `GET /api/exceptions/stats` - 异常统计

### 调度接口
- `POST /api/dispatch/route/optimize` - 路径优化
- `POST /api/dispatch/batches` - 创建批次调度
- `POST /api/dispatch/plans` - 创建运输计划
- `POST /api/dispatch/suggestion` - 调度建议

---

## 开发指南

### 环境要求
- Go 1.21+
- MySQL 8+
- Redis 6+（可选）
- Node.js 16+（前端开发）

### 快速启动

#### 1. 安装依赖
```bash
make deps
# 或
go mod download
```

#### 2. 配置环境变量
创建 `.env` 文件：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=logistics_system
JWT_SECRET=your_jwt_secret
SERVER_PORT=8080
```

#### 3. 创建数据库
```sql
CREATE DATABASE logistics_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 4. 启动服务
```bash
make run
# 或
go run main.go
```

#### 5. 运行测试
```bash
make test
# 或
go test ./...
```

### 常用命令
```bash
make help     # 查看所有命令
make build    # 编译项目
make run      # 运行项目
make clean    # 清理编译文件
make test     # 运行测试
make deps     # 下载依赖
```

### 代码规范

#### Controller 层
- 负责参数绑定和响应封装
- 不包含业务逻辑
- 使用 `utils.Success()` 和 `utils.Error()` 返回响应

#### Service 层
- 包含所有业务逻辑
- 处理事务控制
- 返回 error 而不是直接响应

#### Model 层
- 定义数据结构
- 使用 GORM 标签
- 实现 `TableName()` 方法

#### DTO 层
- 定义请求和响应结构
- 使用 `binding` 标签进行参数校验

---

## 测试指南

### 测试结构
```
logistics-system/
├── middleware/
│   └── auth_test.go          # 中间件测试
├── services/
│   ├── user_service_test.go  # 用户服务测试
│   ├── order_service_test.go # 订单服务测试
│   └── ...
├── routes/
│   └── smoke_test.go         # API 冒烟测试
└── testutil/
    └── testenv.go            # 测试工具
```

### 测试工具
`testutil` 包提供：
- 自动加载 `.env`
- 初始化测试数据库
- 创建测试数据（用户/订单/站点/车辆）
- 自动清理测试数据

### 运行测试
```bash
# 运行所有测试
go test ./...

# 运行详细输出
go test -v ./...

# 运行特定包
go test ./services/...

# 运行特定测试
go test -v -run TestUserService ./services/
```

---

## 部署指南

### 开发环境
```bash
# 启动 MySQL
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=logistics_system \
  -p 3306:3306 mysql:8

# 启动 Redis（可选）
docker run -d --name redis -p 6379:6379 redis:6

# 启动后端
make run

# 启动前端（另一个终端）
cd frontend
npm install
npm run dev
```

### 生产环境
```bash
# 编译后端
make build

# 运行编译后的程序
./logistics-system

# 或使用 systemd 管理服务
```

---

## 前端开发

### 技术栈
- Vue 3 (Composition API)
- Vite
- Element Plus
- Vue Router
- Pinia (状态管理)
- Axios (HTTP 客户端)

### 项目结构
```
frontend/
├── src/
│   ├── api/          # API 接口封装
│   ├── components/   # 公共组件
│   ├── views/        # 页面组件
│   ├── router/       # 路由配置
│   ├── stores/       # Pinia 状态管理
│   ├── utils/        # 工具函数
│   └── App.vue       # 根组件
├── public/           # 静态资源
└── package.json      # 依赖配置
```

### 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 构建前端
```bash
npm run build
```

---

## 常见问题

### 1. 数据库连接失败
- 检查 MySQL 是否启动
- 检查 `.env` 配置是否正确
- 检查数据库是否已创建

### 2. Redis 连接失败
- Redis 是可选的，不影响主流程
- 如需使用，确保 Redis 已启动

### 3. JWT 认证失败
- 检查 `JWT_SECRET` 是否配置
- 检查 token 是否过期
- 检查 `Authorization` 头格式是否正确

### 4. 权限不足
- 检查用户角色是否正确
- 检查接口所需权限
- 参考 `config/permissions.go` 权限配置

---

## 文档索引

### 核心文档
- [README.md](../README.md) - 项目说明
- [开发工作计划](./跨境物流作业系统开发工作计划.md) - 开发计划
- [项目结构说明](./项目结构说明.md) - 目录结构
- [统一API文档](./统一API文档.md) - API 接口
- [数据库设计总结](./数据库设计总结.md) - 数据库设计

### 模块文档
- [用户模块文档](./用户模块/) - 用户注册/登录/权限
- [订单模块文档](./订单模块/) - 订单管理/状态机
- [站点模块文档](./站点模块/) - 站点/仓储/库存
- [分拣模块文档](./分拣模块/) - 分拣规则/任务
- [运输模块文档](./运输模块/) - 运输任务/调度
- [追踪模块文档](./追踪模块/) - 追踪记录/预警
- [异常模块文档](./异常模块/) - 异常处理

### 测试文档
- [自动化测试说明文档](./自动化测试说明文档.md) - 测试指南
- [联调与回归测试报告](./联调与回归测试报告.md) - 测试报告

---

## 联系与支持

### 项目仓库
- GitHub: [待补充]

### 技术支持
- 文档: `docs/` 目录
- Postman 集合: `logistics-system.postman_collection.json`

---

## 版本历史

### v1.0.0 (2026-03-21)
- ✅ 完成后端核心业务模块
- ✅ 完成自动化测试基线
- ✅ 完成前端骨架初始化
- ✅ 完成 API 文档与测试报告

### 下一步计划
- [ ] 前端核心页面开发
- [ ] 前后端联调
- [ ] 部署与验收准备
- [ ] 论文材料整理

---

## 附录

### A. 枚举类型映射

#### 用户角色
```go
RoleCustomer    = 1  // 客户
RoleCourier     = 2  // 快递员
RoleSorter      = 3  // 分拣员
RoleDriver      = 4  // 司机
RoleSiteManager = 5  // 站点管理员
RoleDispatcher  = 6  // 调度员
RoleAdmin       = 7  // 管理员
```

#### 订单状态
```go
OrderPending            = 1   // 待处理
OrderAccepted           = 2   // 已接单
OrderPickupPending      = 13  // 待揽收
OrderPickingUp          = 14  // 揽收中
OrderPickedUp           = 15  // 已揽收
OrderInWarehouse        = 3   // 已入库
OrderSorting            = 4   // 分拣中
OrderInTransit          = 5   // 运输中
OrderCustomsClearing    = 6   // 清关中
OrderDestinationSorting = 7   // 目的地分拣
OrderDelivering         = 8   // 派送中
OrderDelivered          = 9   // 已送达
OrderSigned             = 10  // 已签收
OrderException          = 11  // 异常
OrderCancelled          = 12  // 已取消
```

#### 运输方式
```go
TransportAir     = 1  // 空运
TransportSea     = 2  // 海运
TransportLand    = 3  // 陆运
TransportRail    = 4  // 铁路
TransportExpress = 5  // 快递
```

### B. 权限列表

#### 用户权限
- `user:view` - 查看用户
- `user:create` - 创建用户
- `user:update` - 更新用户
- `user:delete` - 删除用户

#### 订单权限
- `order:view` - 查看订单
- `order:create` - 创建订单
- `order:update` - 更新订单
- `order:delete` - 删除订单
- `order:assign` - 分配订单

#### 站点权限
- `station:view` - 查看站点
- `station:create` - 创建站点
- `station:update` - 更新站点
- `station:delete` - 删除站点

#### 仓储权限
- `warehouse:view` - 查看仓储
- `warehouse:create` - 入库操作
- `warehouse:update` - 出库操作
- `warehouse:delete` - 删除记录

#### 分拣权限
- `sorting:view` - 查看分拣
- `sorting:create` - 创建分拣任务
- `sorting:update` - 更新分拣任务

#### 运输权限
- `transport:view` - 查看运输
- `transport:create` - 创建运输任务
- `transport:update` - 更新运输任务
- `transport:delete` - 删除运输任务

#### 追踪权限
- `tracking:view` - 查看追踪
- `tracking:update` - 更新追踪

#### 异常权限
- `exception:view` - 查看异常
- `exception:create` - 创建异常
- `exception:update` - 处理异常
- `exception:delete` - 删除异常

#### 系统权限
- `system:config` - 系统配置
- `system:log` - 系统日志

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-15  
**维护者**: 系统开发团队
