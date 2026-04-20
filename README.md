# 跨境物流作业系统

基于 **Go + Gin + GORM + MySQL + Redis** 的跨境物流作业系统后端项目，采用单体架构与模块化设计。当前仓库已完成用户、订单、站点/仓储、分拣、运输、追踪、异常、调度等核心后端能力，并已建立第一版自动化测试基线。

## 当前状态
- 后端核心业务模块：已完成
- 自动化测试基线：已完成，可执行 `go test ./...`
- Postman 回归集合：已更新
- 前端项目：已完成 Vue 3 骨架初始化
- 部署与验收文档：待收口

## 技术栈
- Web 框架：Gin
- ORM：GORM
- 数据库：MySQL 8+
- 缓存：Redis 6+
- 认证：JWT
- 测试：Go test + httptest + 本地 MySQL 集成测试

## 项目结构
```text
logistics-system/
├── controllers/   HTTP 控制器
├── services/      业务逻辑
├── models/        数据模型
├── dto/           请求/响应 DTO
├── routes/        路由注册
├── middleware/    认证、日志、跨域、恢复
├── database/      MySQL / Redis 初始化
├── utils/         JWT、密码、响应、时间工具
├── testutil/      测试初始化与测试数据清理工具
├── frontend/      Vue 3 + Vite 前端骨架
├── docs/          项目文档、模块文档、测试文档、回归报告
├── main.go        程序入口
├── Makefile       常用命令
└── logistics-system.postman_collection.json  回归联调集合
```

更详细目录说明见 [项目结构说明](./docs/项目结构说明.md)。

## 已实现模块
- 用户与权限：注册、登录、JWT、角色/权限、用户列表与状态管理
- 订单：创建、查询、详情、修改、取消、删除、状态机、统计
- 站点与仓储：站点管理、入库、出库、库存、盘点、预警、报表
- 分拣：规则管理、路由匹配、任务、扫描、记录、统计
- 运输：车辆、任务、装卸扫描、装卸记录、监控、预警、成本核算、统计
- 追踪：追踪记录、历史、时间轴、时效/延误预警
- 异常：创建、分配、处理、关闭、统计分析
- 调度：路径优化、批次调度、调度建议、运输计划

## 快速开始

### 1. 环境要求
- Go 1.21+
- MySQL 8+
- Redis 6+（可选，未启动不会阻塞主流程）

### 2. 安装依赖
```bash
make deps
# 或
go mod download
```

### 3. 配置环境变量
仓库当前使用 `.env`，请确认至少以下配置正确：
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`

### 4. 创建数据库
```sql
CREATE DATABASE logistics_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务
```bash
make run
# 或
go run main.go
```

默认地址：`http://localhost:8080`

### 6. 编译项目
```bash
make build
```

## 测试

### 自动化测试
```bash
go test ./...
```

### 详细输出
```bash
go test -v ./...
```

自动化测试说明见 [自动化测试说明文档](./docs/自动化测试说明文档.md)。

## 文档导航
- [开发工作计划](./docs/跨境物流作业系统开发工作计划.md)
- [项目结构说明](./docs/项目结构说明.md)
- [统一 API 文档](./docs/统一API文档.md)
- [自动化测试说明文档](./docs/自动化测试说明文档.md)
- [联调与回归测试报告](./docs/联调与回归测试报告.md)
- [运输调度联调文档](./docs/运输模块/运输调度联调文档.md)

## 联调方式
- Postman 集合： [logistics-system.postman_collection.json](./logistics-system.postman_collection.json)
- 核心服务健康检查：`GET /health`
- 认证后统一使用：`Authorization: Bearer <token>`

## 常用命令
```bash
make help     # 查看所有可用命令
make build    # 编译项目
make run      # 运行项目
make clean    # 清理编译文件
make test     # 运行测试
make deps     # 下载依赖
```

## 说明
- 当前 README 主要面向后端开发与联调。
- 前端骨架已初始化，前后端一体化启动与核心业务页面仍在后续阶段推进。
- 如继续推进，建议先查看开发计划中的 B2、C、D 阶段。 


