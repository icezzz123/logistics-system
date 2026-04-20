# 站点管理 API 文档

## 概述

站点管理模块提供物流站点的完整 CRUD 操作，支持创建、查询、更新和删除站点信息。

## API 端点

### 基础信息

- **Base URL**: `http://localhost:8080/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 1. 创建站点

创建新的物流站点（仅管理员）。

### 请求

```
POST /admin/stations
```

### 请求头

```
Authorization: Bearer {token}
Content-Type: application/json
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 验证规则 |
|--------|------|------|------|----------|
| station_code | string | 是 | 站点编码 | 唯一，不可重复 |
| name | string | 是 | 站点名称 | - |
| type | int | 是 | 站点类型 | 1=始发站, 2=中转站, 3=目的站, 4=海关站点 |
| country | string | 是 | 国家 | - |
| province | string | 否 | 省份 | - |
| city | string | 是 | 城市 | - |
| address | string | 是 | 详细地址 | - |
| latitude | float64 | 否 | 纬度 | - |
| longitude | float64 | 否 | 经度 | - |
| manager_id | uint | 否 | 管理员ID | 必须是角色为5的用户 |
| capacity | int | 是 | 容量 | 最小值1 |
| contact_name | string | 否 | 联系人姓名 | - |
| contact_phone | string | 否 | 联系电话 | - |
| working_hours | string | 否 | 工作时间 | - |
| remark | string | 否 | 备注 | - |

### 请求示例

```json
{
  "station_code": "STA001",
  "name": "深圳始发站",
  "type": 1,
  "country": "中国",
  "province": "广东省",
  "city": "深圳市",
  "address": "南山区科技园",
  "latitude": 22.5431,
  "longitude": 114.0579,
  "capacity": 5000,
  "contact_name": "张三",
  "contact_phone": "13800138000",
  "working_hours": "08:00-20:00",
  "remark": "主要始发站点"
}
```

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "station_code": "STA001",
    "name": "深圳始发站",
    "type": 1,
    "type_name": "始发站",
    "country": "中国",
    "province": "广东省",
    "city": "深圳市",
    "address": "南山区科技园",
    "latitude": 22.5431,
    "longitude": 114.0579,
    "manager_id": 0,
    "manager_name": "",
    "capacity": 5000,
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "working_hours": "08:00-20:00",
    "status": 1,
    "status_name": "启用",
    "remark": "主要始发站点",
    "ctime": 1709125657,
    "mtime": 1709125657
  }
}
```

### 错误响应

**站点编码已存在 (500)**
```json
{
  "code": 500,
  "message": "站点编码已存在"
}
```

**管理员不存在或角色不正确 (500)**
```json
{
  "code": 500,
  "message": "指定的管理员不存在或角色不正确"
}
```

---

## 2. 获取站点列表

获取站点列表，支持分页、筛选和搜索。

### 请求

```
GET /stations
```

### 请求头

```
Authorization: Bearer {token}
```

### 查询参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| page | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量 | 10 |
| type | int | 否 | 站点类型筛选 | - |
| country | string | 否 | 国家筛选 | - |
| city | string | 否 | 城市筛选 | - |
| status | int | 否 | 状态筛选 (0=禁用, 1=启用) | - |
| keyword | string | 否 | 搜索关键词（站点编码、名称、地址） | - |

### 请求示例

```
GET /api/stations?page=1&page_size=10&type=1&country=中国&keyword=深圳
```

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "station_code": "STA001",
        "name": "深圳始发站",
        "type": 1,
        "type_name": "始发站",
        "country": "中国",
        "province": "广东省",
        "city": "深圳市",
        "address": "南山区科技园",
        "latitude": 22.5431,
        "longitude": 114.0579,
        "manager_id": 0,
        "manager_name": "",
        "capacity": 5000,
        "contact_name": "张三",
        "contact_phone": "13800138000",
        "working_hours": "08:00-20:00",
        "status": 1,
        "status_name": "启用",
        "remark": "主要始发站点",
        "ctime": 1709125657,
        "mtime": 1709125657
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 10,
    "pages": 1
  }
}
```

---

## 3. 获取站点详情

根据站点ID获取站点详细信息。

### 请求

```
GET /stations/{id}
```

### 请求头

```
Authorization: Bearer {token}
```

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | uint | 是 | 站点ID |

### 请求示例

```
GET /api/stations/1
```

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "station_code": "STA001",
    "name": "深圳始发站",
    "type": 1,
    "type_name": "始发站",
    "country": "中国",
    "province": "广东省",
    "city": "深圳市",
    "address": "南山区科技园",
    "latitude": 22.5431,
    "longitude": 114.0579,
    "manager_id": 0,
    "manager_name": "",
    "capacity": 5000,
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "working_hours": "08:00-20:00",
    "status": 1,
    "status_name": "启用",
    "remark": "主要始发站点",
    "ctime": 1709125657,
    "mtime": 1709125657
  }
}
```

### 错误响应

**站点不存在 (404)**
```json
{
  "code": 404,
  "message": "站点不存在"
}
```

---

## 4. 更新站点

更新站点信息（仅管理员）。

### 请求

```
PUT /admin/stations/{id}
```

### 请求头

```
Authorization: Bearer {token}
Content-Type: application/json
```

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | uint | 是 | 站点ID |

### 请求参数

所有字段均为可选，只更新提供的字段。

| 参数名 | 类型 | 说明 |
|--------|------|------|
| name | string | 站点名称 |
| type | int | 站点类型 (1-4) |
| country | string | 国家 |
| province | string | 省份 |
| city | string | 城市 |
| address | string | 详细地址 |
| latitude | float64 | 纬度 |
| longitude | float64 | 经度 |
| manager_id | uint | 管理员ID |
| capacity | int | 容量 |
| contact_name | string | 联系人姓名 |
| contact_phone | string | 联系电话 |
| working_hours | string | 工作时间 |
| status | int | 状态 (0=禁用, 1=启用) |
| remark | string | 备注 |

### 请求示例

```json
{
  "name": "深圳始发站（更新）",
  "capacity": 6000,
  "contact_name": "李四",
  "contact_phone": "13900139000",
  "working_hours": "07:00-21:00",
  "remark": "已扩容"
}
```

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "站点更新成功"
  }
}
```

### 错误响应

**站点不存在 (404)**
```json
{
  "code": 404,
  "message": "站点不存在"
}
```

---

## 5. 删除站点

删除站点（仅管理员，且站点无关联订单）。

### 请求

```
DELETE /admin/stations/{id}
```

### 请求头

```
Authorization: Bearer {token}
```

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | uint | 是 | 站点ID |

### 请求示例

```
DELETE /api/admin/stations/1
```

### 成功响应 (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "站点删除成功"
  }
}
```

### 错误响应

**站点不存在 (404)**
```json
{
  "code": 404,
  "message": "站点不存在"
}
```

**站点有关联订单 (500)**
```json
{
  "code": 500,
  "message": "该站点有关联订单,无法删除"
}
```

---

## 站点类型说明

| 类型值 | 类型名称 | 说明 |
|--------|---------|------|
| 1 | 始发站 | 货物的起始站点 |
| 2 | 中转站 | 货物中转的站点 |
| 3 | 目的站 | 货物的最终目的地站点 |
| 4 | 海关站点 | 处理海关清关的站点 |

## 状态说明

| 状态值 | 状态名称 | 说明 |
|--------|---------|------|
| 0 | 禁用 | 站点暂停使用 |
| 1 | 启用 | 站点正常运营 |

## 权限说明

| 操作 | 所需权限 | 说明 |
|------|---------|------|
| 创建站点 | 管理员 (role=7) | 仅管理员可创建 |
| 查询站点列表 | 已认证用户 | 所有登录用户可查询 |
| 查询站点详情 | 已认证用户 | 所有登录用户可查询 |
| 更新站点 | 管理员 (role=7) | 仅管理员可更新 |
| 删除站点 | 管理员 (role=7) | 仅管理员可删除 |

## 业务规则

1. **站点编码唯一性**: 站点编码在系统中必须唯一
2. **管理员验证**: 如果指定管理员，必须是角色为5（站点管理员）的用户
3. **删除限制**: 只能删除没有关联订单的站点
4. **容量限制**: 站点容量必须大于0
5. **类型限制**: 站点类型必须在1-4范围内

## 使用示例

### 完整流程示例

```bash
# 1. 登录获取token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 2. 创建站点
curl -X POST http://localhost:8080/api/admin/stations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "station_code": "STA001",
    "name": "深圳始发站",
    "type": 1,
    "country": "中国",
    "city": "深圳市",
    "address": "南山区科技园",
    "capacity": 5000
  }'

# 3. 查询站点列表
curl -X GET "http://localhost:8080/api/stations?page=1&page_size=10" \
  -H "Authorization: Bearer {token}"

# 4. 查询站点详情
curl -X GET http://localhost:8080/api/stations/1 \
  -H "Authorization: Bearer {token}"

# 5. 更新站点
curl -X PUT http://localhost:8080/api/admin/stations/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"capacity": 6000}'

# 6. 删除站点
curl -X DELETE http://localhost:8080/api/admin/stations/1 \
  -H "Authorization: Bearer {token}"
```

## 错误码汇总

| 错误码 | 错误信息 | 说明 |
|--------|---------|------|
| 400 | 参数错误 | 请求参数格式不正确 |
| 401 | 未授权访问 | 未提供token或token无效 |
| 403 | 权限不足 | 非管理员尝试执行管理员操作 |
| 404 | 站点不存在 | 指定的站点ID不存在 |
| 500 | 站点编码已存在 | 站点编码重复 |
| 500 | 指定的管理员不存在或角色不正确 | 管理员ID无效 |
| 500 | 该站点有关联订单，无法删除 | 站点被订单引用 |
| 500 | 创建站点失败 | 数据库操作失败 |
| 500 | 更新站点失败 | 数据库操作失败 |
| 500 | 删除站点失败 | 数据库操作失败 |

## 相关文档

- [用户认证文档](../用户模块/用户登录/用户登录功能说明.md)
- [权限系统文档](../用户模块/权限管理/权限系统设计文档.md)
- [数据库设计文档](../数据库设计总结.md)
