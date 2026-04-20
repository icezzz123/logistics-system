---
name: logistics-system
description: 跨境物流作业系统的核心知识库，包含系统架构、业务模块、API接口、数据库设计等完整信息
trigger: 当用户询问系统功能、技术实现、业务逻辑、API接口、数据库设计等问题时自动触发
---

# 跨境物流作业系统 SKILL

## 系统概览

### 项目定位
基于 Go + Gin + GORM + MySQL + Redis 的跨境物流作业系统，采用单体架构与模块化设计，支持订单全生命周期管理、智能分拣、运输调度、全程追踪和异常处理。

### 技术栈
- **后端**: Go 1.21+ / Gin / GORM / MySQL 8+ / Redis 6+
- **前端**: Vue 3 / Vite / Element Plus / Pinia / Axios
- **认证**: JWT
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
├── middleware/       # 中间件
├── database/         # 数据库初始化
├── config/           # 配置管理（含权限定义）
├── utils/            # 工具函数
├── testutil/         # 测试工具
├── frontend/         # Vue 3 前端项目
├── docs/             # 项目文档
├── main.go           # 程序入口
└── Makefile          # 常用命令
```

---

## 核心业务模块

### 1. 用户与权限模块
**角色体系**（7种角色）:
- 客户 (RoleCustomer = 1)
- 快递员 (RoleCourier = 2)
- 分拣员 (RoleSorter = 3)
- 司机 (RoleDriver = 4)
- 站点管理员 (RoleSiteManager = 5)
- 调度员 (RoleDispatcher = 6)
- 管理员 (RoleAdmin = 7)

**核心文件**:
- `models/user.go` - 用户模型
- `config/permissions.go` - 权限定义
- `controllers/auth_controller.go` - 认证控制器
- `middleware/auth.go` - JWT 中间件

### 2. 订单模块
**订单状态流转**（15个状态）:
```
pending → accepted → pickup_pending → picking_up → picked_up 
→ in_warehouse → sorting → in_transit → customs_clearing 
→ destination_sorting → delivering → delivered → signed
```

**特殊状态**: exception(异常)、cancelled(已取消)

**订单层级**:
- normal: 普通订单
- master: 母单（一单多包）
- child: 子单/包裹

**核心文件**:
- `models/order.go` - 订单模型
- `models/order_package.go` - 包裹模型
- `services/order_state_machine.go` - 状态机
- `controllers/order_controller.go` - 订单控制器

### 3. 站点与仓储模块
**功能**: 站点管理、入库/出库扫描、库存查询、库存预警、盘点、统计报表

**核心文件**:
- `models/station.go` - 站点模型
- `models/warehouse.go` - 仓库流转记录
- `services/warehouse_service.go` - 仓储服务
- `controllers/warehouse_controller.go` - 仓储控制器

### 4. 分拣模块
**功能**: 分拣规则管理、路由匹配、分拣任务、扫描作业、统计分析

**核心文件**:
- `models/sorting.go` - 分拣模型
- `services/sorting_service.go` - 分拣服务
- `services/sorting_scan_service.go` - 扫描服务
- `controllers/sorting_controller.go` - 分拣控制器

### 5. 运输模块
**运输方式**（5种）:
- 空运 (TransportAir = 1)
- 海运 (TransportSea = 2)
- 陆运 (TransportLand = 3)
- 铁路 (TransportRail = 4)
- 快递 (TransportExpress = 5)

**功能**: 车辆管理、运输任务、装卸扫描、运输监控、成本核算

**核心文件**:
- `models/transport.go` - 运输模型
- `services/transport_service.go` - 运输服务
- `services/transport_scan_service.go` - 装卸扫描
- `controllers/transport_controller.go` - 运输控制器

### 6. 追踪模块
**功能**: 追踪记录、历史查询、时间轴展示、时效预警

**核心文件**:
- `models/tracking.go` - 追踪记录模型
- `services/tracking_service.go` - 追踪服务
- `controllers/tracking_controller.go` - 追踪控制器

### 7. 异常模块
**异常类型**: 破损、丢失、延误、拒收、地址错误、海关扣留

**异常状态**: pending → assigned → processing → resolved → closed

**核心文件**:
- `models/exception.go` - 异常记录模型
- `services/exception_service.go` - 异常服务
- `controllers/exception_controller.go` - 异常控制器

### 8. 调度模块
**功能**: 路径优化、批次调度、运输计划、调度建议

**核心文件**:
- `services/dispatch_service.go` - 调度服务
- `controllers/dispatch_controller.go` - 调度控制器

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

### 公开接口（无需认证）
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /health` - 健康检查

### 核心接口分类
1. **认证与用户**: `/api/auth/*`, `/api/users/*`, `/api/profile`
2. **订单管理**: `/api/orders/*`
3. **站点与仓储**: `/api/stations/*`, `/api/warehouse/*`
4. **分拣管理**: `/api/sorting/*`
5. **运输管理**: `/api/transport/*`
6. **追踪管理**: `/api/tracking/*`
7. **异常管理**: `/api/exceptions/*`
8. **调度管理**: `/api/dispatch/*`

详细接口文档见: `docs/统一API文档.md`

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

---

## 开发指南

### 环境要求
- Go 1.21+
- MySQL 8+
- Redis 6+（可选）
- Node.js 16+（前端开发）

### 快速启动
```bash
# 1. 安装依赖
make deps

# 2. 配置环境变量（.env文件）
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=logistics_system
JWT_SECRET=your_jwt_secret

# 3. 创建数据库
CREATE DATABASE logistics_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. 启动服务
make run

# 5. 运行测试
make test
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

---

## 代码规范

### Controller 层
- 负责参数绑定和响应封装
- 不包含业务逻辑
- 使用 `utils.Success()` 和 `utils.Error()` 返回响应

### Service 层
- 包含所有业务逻辑
- 处理事务控制
- 返回 error 而不是直接响应

### Model 层
- 定义数据结构
- 使用 GORM 标签
- 实现 `TableName()` 方法

### DTO 层
- 定义请求和响应结构
- 使用 `binding` 标签进行参数校验

---

## 测试指南

### 测试结构
- `middleware/*_test.go` - 中间件测试
- `services/*_test.go` - 服务层测试
- `routes/*_test.go` - API 冒烟测试

### 测试工具（testutil）
- 自动加载 `.env`
- 初始化测试数据库
- 创建测试数据
- 自动清理测试数据

### 运行测试
```bash
go test ./...              # 运行所有测试
go test -v ./...           # 详细输出
go test ./services/...     # 运行特定包
```

---

## 文档索引

### 核心文档
- `README.md` - 项目说明
- `docs/跨境物流作业系统开发工作计划.md` - 开发计划
- `docs/项目结构说明.md` - 目录结构
- `docs/统一API文档.md` - API 接口
- `docs/数据库设计总结.md` - 数据库设计

### 模块文档
- `docs/用户模块/` - 用户注册/登录/权限
- `docs/订单模块/` - 订单管理/状态机
- `docs/站点模块/` - 站点/仓储/库存
- `docs/分拣模块/` - 分拣规则/任务
- `docs/运输模块/` - 运输任务/调度
- `docs/追踪模块/` - 追踪记录/预警
- `docs/异常模块/` - 异常处理

### 测试文档
- `docs/自动化测试说明文档.md` - 测试指南
- `docs/联调与回归测试报告.md` - 测试报告

---

## 枚举类型映射

### 用户角色
```go
RoleCustomer    = 1  // 客户
RoleCourier     = 2  // 快递员
RoleSorter      = 3  // 分拣员
RoleDriver      = 4  // 司机
RoleSiteManager = 5  // 站点管理员
RoleDispatcher  = 6  // 调度员
RoleAdmin       = 7  // 管理员
```

### 订单状态
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

### 运输方式
```go
TransportAir     = 1  // 空运
TransportSea     = 2  // 海运
TransportLand    = 3  // 陆运
TransportRail    = 4  // 铁路
TransportExpress = 5  // 快递
```

---

## 使用说明

当用户询问以下内容时，自动应用此 SKILL：
- 系统功能和业务逻辑
- 技术架构和实现方案
- API 接口和调用方式
- 数据库设计和表结构
- 代码结构和文件位置
- 开发环境配置
- 测试方法和工具
- 任何与跨境物流作业系统相关的问题

**核心目标**: 提供准确、完整的系统信息，帮助用户快速理解和使用系统。
