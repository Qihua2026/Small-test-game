# CloudBase 数据库配置

创建两个文档型数据库集合，名称必须完全一致：

## `activation_codes`

激活码主表。文档 `_id` 是标准化激活码的 SHA-256，不保存明文。

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 激活码哈希，天然唯一 |
| `id` | string | 内部 UUID |
| `suffix` | string | 明文末四位，供后台辨认 |
| `orderId` | string/null | 小红书订单号 |
| `batchId` | string | 发码批次 |
| `status` | string | `unused` / `active` / `revoked` |
| `createdAt` | date | 创建时间 |
| `expiresAt` | date/null | 激活前失效时间，可为空 |
| `activatedAt` | date/null | 首次激活时间 |
| `clientHash` | string/null | 绑定设备标识的哈希 |
| `lastAccessAt` | date/null | 最近激活时间 |

建议索引：`createdAt` 降序。`_id` 已自带唯一索引。

## `activation_attempts`

激活接口的限流记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| `sourceHash` | string | 来源 IP 加盐后的哈希 |
| `createdAt` | date | 尝试时间 |

必须创建组合索引：`sourceHash` 升序、`createdAt` 降序。建议定期清理 7 天前数据。

## 权限原则

两个集合都设置为“仅管理员/云函数可读写”，不要开放 Web 客户端直接访问。网页只通过同域 `/api/*` 调用 Web 云函数；`CLOUDBASE_APIKEY` 只能保存在云函数环境变量中。
