# 项目交接与继续开发指南

> 最后更新：2026-09-07
>
> 项目：一纸性情鉴｜甄嬛传小主性格测试
>
> GitHub：<https://github.com/Qihua2026/Small-test-game>

这份文档记录已经确定的产品方案、技术原则、当前云端状态、Git 工作流和换电脑继续开发的方法。部署细节分别参见 [`cloudbase/DEPLOYMENT.md`](./cloudbase/DEPLOYMENT.md)、[`cloudbase/DATABASE.md`](./cloudbase/DATABASE.md) 和 [`cloudbase/SECURITY.md`](./cloudbase/SECURITY.md)。

## 1. 产品定位与已确定范围

- 产品形态：面向小红书用户的低价 C 端性格测试小游戏，计划售价 2 元。
- 交付方式：用户购买后收到测试链接和一枚激活码。
- 测试内容：10 位角色、8 个人格维度、12 道现代生活情境题。
- 算法：题目选项按维度加权，归一化后与角色人格向量匹配。
- 结果：本命人格、隐藏人格、黑化/高压人格，并提供分享卡。
- 页面流程：首页 → 答题页 → 分析动画 → 结果页。
- 视觉方向：现代 Editorial × 东方宫廷，避免传统、廉价的古风表现。
- 详细需求：[`甄嬛传小主性格测试_PRD.md`](./甄嬛传小主性格测试_PRD.md)。

首页已经确定删除以下内容：

- “仅供娱乐”相关文案；
- “先看看怎么玩”按钮；
- “拾贰道题 / 约贰分钟 / 无需登录”三项说明；
- 页脚“仅供娱乐，不构成专业心理评估”。

## 2. 付费激活规则

- 激活码只保存 SHA-256 哈希，明文只在生成成功时展示一次，应立即下载或妥善保存。
- 一枚激活码绑定一台浏览器设备。
- 激活后 30 天有效；同一设备可以继续访问，其他设备不能直接使用。
- 后台支持：按批次生成、关联订单号、下载 CSV、查询状态、停用激活码、重置设备。
- 订单号是可选字段。测试时可留空或使用 `TEST-001`；正式销售时应使用唯一的小红书订单号。
- 一个正式订单号应只对应一枚激活码，后续自动交付必须使用数据库唯一约束和幂等逻辑保证。
- 管理后台地址不能公开传播；`ADMIN_SECRET` 等同后台管理员密码。

## 3. 当前 CloudBase 测试环境

当前环境是 **dev 测试环境**，不是正式生产环境。

| 项目 | 当前值 |
|---|---|
| CloudBase 环境 ID | `small-test-free-d3fb6hemd80568ee` |
| 地域 | 上海 |
| 环境套餐 | 免费体验版 |
| 静态托管应用 | `small-test-game` |
| Web 云函数 | `activation-api` |
| Node.js 运行时 | `Nodejs20.19` |
| 公共测试地址 | <https://small-test-free-d3fb6hemd80568ee-1309189676.ap-shanghai.app.tcloudbase.com/> |
| 管理后台 | <https://small-test-free-d3fb6hemd80568ee-1309189676.ap-shanghai.app.tcloudbase.com/admin.html> |
| API 健康检查 | <https://small-test-free-d3fb6hemd80568ee-1309189676.ap-shanghai.app.tcloudbase.com/api/health> |

HTTP 网关已配置：

- `/` → 静态网站托管应用 `small-test-game`；开启路径透传；关闭网关身份认证。
- `/api` → HTTP 云函数 `activation-api`；开启路径透传；关闭网关身份认证。
- API 的实际鉴权由激活码、访问 Token、`ADMIN_SECRET` 和限流逻辑完成。

数据库已经创建：

- `activation_codes`：仅管理员/云函数可读写；`createdAt` 降序索引。
- `activation_attempts`：仅管理员/云函数可读写；`sourceHash` 升序 + `createdAt` 降序组合索引。

CloudBase API Key `activation-api-dev` 已通过控制台选择并注入为 `CLOUDBASE_APIKEY`。其余函数环境变量为：`TCB_ENV`、`ACTIVATION_SECRET`、`ADMIN_SECRET`、`RATE_LIMIT_SALT`、`ACCESS_DAYS=30`。

## 4. 已完成验证

截至 2026-09-07，以下检查已经通过：

- 静态前端构建成功；
- CloudBase 静态托管和 HTTP 网关访问成功；
- `/api/health` 返回 HTTP 200，且没有缺失环境变量；
- 自动测试共 12 项通过；
- 云端完整冒烟测试通过：生成测试码 → 激活 → 校验访问 Token → 停用测试码；
- 管理后台可以使用 `ADMIN_SECRET` 登录并生成激活码。

在另一台电脑修改并部署前，建议重新执行：

```bash
npm install
npm run check
npm test
npm run build
TCB_ENV_ID='small-test-free-d3fb6hemd80568ee' npm run cloudbase:preflight
```

有本地密钥时，可执行完整云端冒烟测试：

```bash
set -a
source .env.cloudbase.local
set +a
BASE_URL='https://small-test-free-d3fb6hemd80568ee-1309189676.ap-shanghai.app.tcloudbase.com' npm run cloudbase:smoke
```

该测试会创建并最终停用一枚测试激活码。

## 5. 密钥与安全原则

本机项目根目录的 `.env.cloudbase.local` 保存本地测试所需密钥。该文件已被 `.gitignore` 排除，**不会也不应上传到 GitHub**。

禁止在文档、Issue、聊天、截图、前端源码或 Git 提交中写入：

- `CLOUDBASE_APIKEY`
- `ACTIVATION_SECRET`
- `ADMIN_SECRET`
- `RATE_LIMIT_SALT`
- 腾讯云 SecretId / SecretKey

换电脑时有两种安全做法：

1. 推荐：在新电脑重新创建 `.env.cloudbase.local`，从腾讯云控制台和密码管理器填写对应值；
2. 临时：通过可信的端到端加密渠道单独传输该文件，使用后确认文件权限和 `.gitignore` 状态。

不要通过 Git、微信普通消息、邮件明文或截图传输密钥。若密钥曾出现在公开位置，应立即在 CloudBase 控制台轮换，并同步更新本机文件。

## 6. Git 分支与发布流程

已经确定采用双环境分支模型：

- `dev`：测试环境基线；
- `main`：生产环境基线；
- 日常功能：从最新 `dev` 创建 `feature/*`；
- 缺陷修复：从最新 `dev` 创建 `fix/*`；
- 生产紧急修复：从最新 `main` 创建 `hotfix/*`，发布后同步回 `dev`。

标准流程：

```text
dev → feature/* 或 fix/* → Pull Request → dev
dev 验收通过 → Release Pull Request → main → 版本 Tag → 生产部署
```

不要直接向 `dev` 或 `main` 推送。合并前运行 `npm run check`、`npm test` 和 `npm run build`。

当前 Git 状态（记录时）：

- `origin`：`git@github-qihua:Qihua2026/Small-test-game.git`
- `dev` 与 `origin/dev`：提交 `1e88da5`，包含付费激活流程。
- `main` 与 `origin/main`：提交 `d7ab60f`。
- 当前本地分支：`feature/home-copy-cleanup`。
- 当前 CloudBase 部署和首页文案清理包含尚未提交的本地文件；在它们提交并推送前，另一台电脑仅克隆仓库无法获得这些改动。

因此，本机下一次 Git 交付应当是：检查变更 → 测试 → 在 `feature/home-copy-cleanup` 提交 → 推送该分支 → 创建 PR 合并到 `dev`。未经明确授权，不应自动提交、推送或合并。

## 7. 另一台电脑的接手步骤

### 7.1 配置多账号 SSH

当前远程地址使用 SSH Host 别名 `github-qihua`。新电脑也要在 `~/.ssh/config` 配置相同别名，例如：

```sshconfig
Host github-qihua
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_qihua
  IdentitiesOnly yes
```

将对应公钥添加到 GitHub 账号 `Qihua2026` 后验证：

```bash
ssh -T git@github-qihua
```

### 7.2 克隆并安装

等本机未提交工作完成 Git 交付后，在新电脑执行：

```bash
git clone git@github-qihua:Qihua2026/Small-test-game.git
cd Small-test-game
git fetch origin
git switch dev
npm install
npm run check
npm test
npm run dev
```

本地预览地址为 <http://localhost:4173/>，管理后台为 <http://localhost:4173/admin.html>。

开发新功能时：

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/功能名称
```

### 7.3 恢复 CloudBase 开发配置

- 在项目根目录手动创建 `.env.cloudbase.local`，不要提交。
- 安装并登录腾讯云 CloudBase CLI；确认登录账号能访问环境 `small-test-free-d3fb6hemd80568ee`。
- 部署前先执行测试和 `cloudbase:preflight`。
- 完整部署步骤按 [`cloudbase/DEPLOYMENT.md`](./cloudbase/DEPLOYMENT.md) 操作。

## 8. 小红书自动交付目标

后续目标已经确定为：

1. 用户在小红书完成支付后，根据订单号自动生成一枚激活码；
2. 内部目标是在收到有效订单事件后 5 秒内生成；
3. 客服系统自动向用户发送“激活码 + 测试链接”。

建议处理链路：

```text
支付成功事件
→ 校验订单状态与商品 SKU
→ 以订单号做幂等处理
→ 生成或读取该订单已有激活码
→ 调用小红书交付/消息接口
→ 记录发送结果
→ 失败自动重试与告警
```

开发时必须遵守：

- 只处理已支付的目标商品；
- 同一订单的重复通知不得重复生成激活码；
- 生成成功、发送失败时只能重试发送；
- 保存订单状态、生成时间、发送状态、尝试次数和失败原因；
- 退款或取消订单后冻结未使用的激活码；
- 超过 5 秒未交付触发告警，并支持后台人工补发。

当前不确定项：小红书公开订单 API 偏向实物订单，其公开“即时订单列表”文档建议约 15 分钟轮询，不能据此承诺 5 秒交付。真正全自动需要店铺获得实时支付回调以及数字商品/电子卡券交付或买家消息接口权限；否则应接入小红书授权服务商，或先使用后台“一键生成并复制发送”的半自动方案。不要使用模拟浏览器点击或非官方机器人发送消息，以免产生稳定性和账号风控问题。

后续需要新增：

- `orders` 订单与交付记录；
- 订单回调入口和验签；
- 订单号唯一约束及幂等事务；
- 小红书或授权服务商发送适配器；
- 失败重试、超时告警、人工补发；
- 退款后的激活码冻结；
- 管理后台的待发送、已发送、失败状态。

## 9. 正式上线前尚未完成

- 将当前未提交变更通过 PR 合并到 `dev`；
- 在 `dev` 测试环境完成人工全流程验收；
- 确认小红书官方或授权服务商的订单回调、验签和自动交付能力；
- 创建独立 CloudBase 生产环境，不与免费测试环境共用数据库和密钥；
- 购买适合正式流量的套餐，绑定已备案自定义域名并启用 HTTPS；
- 将 Google Fonts 等境外字体资源改为本地托管或可靠的系统字体方案；
- 配置函数 5xx、激活失败率、交付超时和配额告警；
- 配置备份、恢复和退款/换机客服流程；
- 通过 `dev` → `main` Release PR 发布，并在 `main` 创建版本 Tag。

## 10. 关键文件

- [`README.md`](./README.md)：项目入口、运行与结构说明。
- [`甄嬛传小主性格测试_PRD.md`](./甄嬛传小主性格测试_PRD.md)：完整 PRD。
- [`src/data.js`](./src/data.js)：题库、角色向量、结果文案。
- [`src/quiz-engine.js`](./src/quiz-engine.js)：匹配算法。
- [`src/app.js`](./src/app.js)：前端流程。
- [`admin.html`](./admin.html) 与 [`src/admin.js`](./src/admin.js)：卖家后台。
- [`cloudbase/functions/activation-api/`](./cloudbase/functions/activation-api/)：CloudBase 激活 API。
- [`cloudbaserc.json`](./cloudbaserc.json)：CloudBase 项目配置。
- [`scripts/cloudbase-smoke-test.js`](./scripts/cloudbase-smoke-test.js)：云端全链路测试。
