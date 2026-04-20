# 统一 API 文档

## 说明
本文档用于提供当前后端接口的统一总览，方便前后端联调、回归测试和答辩演示准备。

### 基本约定
- 基础地址：`http://localhost:8080`
- 认证方式：`Authorization: Bearer <token>`
- 统一响应格式：
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 公开接口
仅 `/api/auth/register`、`/api/auth/login` 与 `/health` 不要求鉴权，其余接口均要求 JWT。

---

## 1. 认证与用户

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/profile | 获取当前用户信息 |
| GET | /api/permissions | 获取当前用户权限 |
| PUT | /api/user/password | 修改当前用户密码 |

### 用户与角色
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 获取用户列表 |
| PUT | /api/users/:id | 更新用户信息 |
| GET | /api/roles | 获取角色列表 |
| GET | /api/roles/:id | 获取角色详情 |
| GET | /api/roles/:id/permissions | 获取角色权限 |
| GET | /api/roles/compare | 对比角色权限 |
| PUT | /api/admin/users/:id/role | 分配用户角色 |
| GET | /api/admin/users/:id/role | 获取用户角色 |
| PUT | /api/admin/users/:id/status | 更新用户状态 |
| DELETE | /api/admin/users/:id | 删除用户 |

---

## 2. 订单
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/orders | 创建订单 |
| GET | /api/orders | 获取订单列表 |
| GET | /api/orders/statistics | 获取订单统计 |
| GET | /api/orders/:id | 获取订单详情 |
| GET | /api/orders/:id/transitions | 获取允许的状态流转 |
| GET | /api/orders/:id/status-logs | 获取订单状态日志 |
| PUT | /api/orders/:id | 更新订单 |
| PUT | /api/orders/:id/status | 更新订单状态 |
| PUT | /api/orders/:id/cancel | 取消订单 |
| DELETE | /api/orders/:id | 删除订单 |

---

## 3. 站点与库存

### 站点管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stations | 获取站点列表 |
| GET | /api/stations/:id | 获取站点详情 |
| POST | /api/stations | 创建站点 |
| PUT | /api/stations/:id | 更新站点 |
| DELETE | /api/stations/:id | 删除站点 |

### 站点流转与库存
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stations/flows/records | 获取站点流转记录 |
| GET | /api/stations/inventory | 获取站点库存 |
| GET | /api/stations/inventory/warnings | 获取库存预警 |
| GET | /api/stations/inventory/warnings/:level | 按级别获取库存预警 |
| POST | /api/stations/inventory/check | 创建库存盘点 |
| GET | /api/stations/inventory/check | 获取盘点记录列表 |
| GET | /api/stations/inventory/check/:id | 获取盘点详情 |
| PUT | /api/stations/inventory/check/:id/complete | 完成盘点 |
| GET | /api/stations/inventory/stats | 获取库存统计报表 |
| GET | /api/stations/inventory/distribution | 获取库存分布统计 |

---

## 4. 仓储
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/warehouse/inbound | 入库扫描 |
| GET | /api/warehouse/inbound/records | 入库记录查询 |
| POST | /api/warehouse/outbound | 出库扫描 |
| GET | /api/warehouse/outbound/records | 出库记录查询 |

---

## 5. 分拣

### 分拣规则
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/sorting/rules | 获取分拣规则列表 |
| GET | /api/sorting/rules/stats | 获取分拣规则统计 |
| GET | /api/sorting/rules/:id | 获取分拣规则详情 |
| POST | /api/sorting/rules | 创建分拣规则 |
| PUT | /api/sorting/rules/:id | 更新分拣规则 |
| PUT | /api/sorting/rules/:id/status | 更新规则状态 |
| DELETE | /api/sorting/rules/:id | 删除分拣规则 |
| POST | /api/sorting/route/match | 路由匹配 |
| POST | /api/sorting/route/batch | 批量路由匹配 |

### 分拣任务与记录
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/sorting/tasks | 获取分拣任务列表 |
| GET | /api/sorting/tasks/:id | 获取分拣任务详情 |
| POST | /api/sorting/tasks | 创建分拣任务 |
| PUT | /api/sorting/tasks/:id | 更新分拣任务 |
| PUT | /api/sorting/tasks/:id/status | 更新分拣任务状态 |
| POST | /api/sorting/scan | 分拣扫描 |
| GET | /api/sorting/records | 获取分拣记录列表 |
| GET | /api/sorting/stats | 获取分拣统计 |

---

## 6. 运输

### 车辆与任务
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/transport/vehicles | 获取车辆列表 |
| GET | /api/transport/vehicles/:id | 获取车辆详情 |
| POST | /api/transport/vehicles | 创建车辆 |
| PUT | /api/transport/vehicles/:id | 更新车辆 |
| PUT | /api/transport/vehicles/:id/status | 更新车辆状态 |
| DELETE | /api/transport/vehicles/:id | 删除车辆 |
| GET | /api/transport/tasks | 获取运输任务列表 |
| GET | /api/transport/tasks/:id | 获取运输任务详情 |
| POST | /api/transport/tasks | 创建运输任务 |
| PUT | /api/transport/tasks/:id | 更新运输任务 |
| PUT | /api/transport/tasks/:id/status | 更新运输任务状态 |
| POST | /api/transport/tasks/assign | 批量分配车辆 |

### 装卸、监控、成本
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/transport/tasks/:id/load-scan | 装车扫描 |
| POST | /api/transport/tasks/:id/unload-scan | 卸车扫描 |
| GET | /api/transport/records | 获取装卸记录列表 |
| GET | /api/transport/records/:id | 获取装卸记录详情 |
| GET | /api/transport/monitor/overview | 获取运输监控概览 |
| GET | /api/transport/monitor/tasks | 获取运输监控任务列表 |
| GET | /api/transport/monitor/warnings | 获取运输预警列表 |
| GET | /api/transport/costs/overview | 获取运输成本概览 |
| GET | /api/transport/costs/tasks | 获取运输成本任务列表 |
| GET | /api/transport/costs/tasks/:id | 获取运输成本任务详情 |
| GET | /api/transport/stats | 获取运输统计 |

---

## 7. 追踪
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/tracking/records | 创建追踪记录 |
| GET | /api/tracking/records | 获取追踪记录列表 |
| GET | /api/tracking/records/:id | 获取追踪记录详情 |
| GET | /api/tracking/orders/:order_id/history | 获取订单追踪历史 |
| GET | /api/tracking/orders/:order_id/timeline | 获取订单追踪时间轴 |
| GET | /api/tracking/warnings | 获取追踪预警列表 |

---

## 8. 异常
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/exceptions | 创建异常 |
| GET | /api/exceptions | 获取异常列表 |
| GET | /api/exceptions/:id | 获取异常详情 |
| PUT | /api/exceptions/:id/assign | 分配处理人 |
| PUT | /api/exceptions/:id/process | 处理异常 |
| PUT | /api/exceptions/:id/close | 关闭异常 |
| GET | /api/exceptions/stats | 获取异常统计 |

---

## 9. 调度
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/dispatch/route/optimize | 路径优化 |
| GET | /api/dispatch/batches | 获取批次调度列表 |
| POST | /api/dispatch/batches | 创建批次调度 |
| PUT | /api/dispatch/batches/:id/status | 更新批次状态 |
| POST | /api/dispatch/suggestion | 获取调度建议 |
| GET | /api/dispatch/plans | 获取运输计划列表 |
| POST | /api/dispatch/plans | 创建运输计划 |
| GET | /api/dispatch/plans/:id | 获取运输计划详情 |
| PUT | /api/dispatch/plans/:id | 更新运输计划 |
| PUT | /api/dispatch/plans/:id/status | 更新运输计划状态 |
| POST | /api/dispatch/plans/:id/orders | 订单加入运输计划 |

---

## 10. 建议联调顺序
1. 认证与用户
2. 站点与订单
3. 仓储入库/出库
4. 分拣规则、任务、扫描
5. 运输任务、装卸、监控、成本
6. 追踪记录与预警
7. 异常处理与恢复
8. 调度优化、批次与运输计划

---

## 11. 相关文档
- [项目结构说明](./项目结构说明.md)
- [自动化测试说明文档](./自动化测试说明文档.md)
- [联调与回归测试报告](./联调与回归测试报告.md)
- [运输调度联调文档](./运输模块/运输调度联调文档.md)
