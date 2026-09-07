# 腾讯云 CloudBase 部署手册

目标架构：CloudBase 静态网站托管前端，Web 云函数 `activation-api` 提供 `/api/*`，文档型数据库保存激活码。前端和 API 使用同一域名，不需要跨域配置。

## 0. 已完成的代码准备

- `dist/`：可部署的静态网站构建产物
- `cloudbase/functions/activation-api/`：激活、访问校验与卖家后台 API
- `cloudbaserc.json`：CloudBase CLI 配置
- `scripts/cloudbase-preflight.js`：部署前检查
- `scripts/cloudbase-smoke-test.js`：部署后全链路检查

## 1. 创建测试环境

在腾讯云 CloudBase 控制台创建一个按量计费环境，先作为 `dev` 测试环境。开通静态网站托管、云函数和文档型数据库。记下环境 ID。

## 2. 创建数据库集合和索引

按照 [DATABASE.md](./DATABASE.md) 创建 `activation_codes`、`activation_attempts`，并将客户端权限设为不可直接读写。

## 3. 创建密钥

生成四个彼此不同的高强度随机值：

```bash
openssl rand -hex 32
```

分别用作 `CLOUDBASE_APIKEY`、`ACTIVATION_SECRET`、`ADMIN_SECRET`、`RATE_LIMIT_SALT`。其中 `CLOUDBASE_APIKEY` 应在 CloudBase 环境的 API Key 页面创建，以控制台实际生成值为准；其余三个可用上述命令生成。

不要把任何密钥写进 Git、截图或聊天记录。

## 4. 配置 Web 云函数

部署函数 `activation-api`，运行时 Node.js 20，监听端口 9000，入口命令 `npm start`。配置环境变量：

- `TCB_ENV`：CloudBase 环境 ID
- `CLOUDBASE_APIKEY`：环境 API Key
- `ACTIVATION_SECRET`：访问凭证签名密钥
- `ADMIN_SECRET`：卖家后台密钥
- `RATE_LIMIT_SALT`：限流哈希盐
- `ACCESS_DAYS=30`

## 5. 配置 HTTP 访问与路由

仓库已声明 `activation-api` 为 HTTP 函数。部署后在控制台的 HTTP 网关中人工创建无身份认证路由：`/api` 指向该函数；其余 `/` 指向静态托管。CloudBase 采用最长路径优先，因此 API 路由会优先于根路径。网关认证保持关闭，接口本身负责激活码、后台密钥和限流校验。不要把 API Key 放入前端代码。

## 6. 部署前端

先运行：

```bash
TCB_ENV_ID='你的环境ID' npm run cloudbase:preflight
```

再用 CloudBase CLI 将 `dist/` 部署到静态托管根目录。第一次由人工部署并验证；GitHub Actions 自动发布在密钥配置完成后再启用。

## 7. 验收

公开健康检查：

```bash
BASE_URL='测试环境网址' npm run cloudbase:smoke
```

完整生命周期检查（会生成一枚测试码并在最后停用）：

```bash
BASE_URL='测试环境网址' ADMIN_SECRET='后台密钥' npm run cloudbase:smoke
```

随后人工验证：首页输入测试码、完成 12 题、看到结果页；后台能查询该批次且测试码状态为停用。

## 8. 正式环境

测试通过后再创建独立生产环境，重复数据库、密钥和路由配置。绑定已备案的自定义域名并启用 HTTPS。`dev` 分支只发布测试环境；`main` 的版本 Tag 才发布生产环境。

## 9. GitHub 自动部署（首次人工验收后）

仓库包含手动触发的 `.github/workflows/cloudbase-deploy.yml`。在 GitHub 创建 `development` 和 `production` 两个 Environment，并分别配置 Secrets：`TCB_SECRET_ID`、`TCB_SECRET_KEY`、`TCB_ENV_ID`；再配置变量 `BASE_URL`。运行 workflow 时必须在 GitHub 界面选择目标环境，避免测试环境与生产环境混用。

## 回滚

前端回滚到上一个静态托管版本；函数回滚到上一个函数版本。数据库不做自动删除或覆盖。若签名密钥泄露，立即更换 `ACTIVATION_SECRET`（现有登录凭证会失效）；若后台密钥泄露，只更换 `ADMIN_SECRET`。
