# 一纸性情鉴｜甄嬛传小主性格测试

一款以 12 道现代生活选择题测量“后宫生存人格”的轻量 Web 小游戏。测试使用 8 维人格向量与 10 位角色进行匹配，生成本命人格、隐藏人格和高压人格结果。

## 本地运行

需要 Node.js 18 或更高版本。

```bash
npm run dev
```

浏览器访问 `http://localhost:4173/`。

## 验证与构建

```bash
npm run check
npm test
npm run build
```

静态构建产物输出到 `dist/`。

## 付费激活（开发环境）

批量生成一次性激活码：

```bash
npm run codes:generate -- 10 xiaohongshu-order-batch
```

明文激活码只会在生成时输出一次，服务端数据文件仅保存哈希。开发服务会在 `.data/activation-codes.json` 中记录激活状态；生产环境必须设置 `ACTIVATION_SECRET` 并使用可持久化的私有存储。

当前规则：一枚码绑定一台浏览器设备，激活后 30 天有效。同一设备可以重新激活，其他设备使用会提示联系卖家。

卖家后台位于 `http://localhost:4173/admin.html`。本地默认管理密钥为 `development-admin`，也可通过 `ADMIN_SECRET` 环境变量覆盖。后台支持关联小红书订单号、下载本批 CSV、查询状态、停用激活码和为换机用户重置设备。

## Cloudflare 部署准备

生产方案使用 Cloudflare Pages Functions + D1：

- `functions/api/activate.js`：校验激活码并绑定首台设备
- `functions/api/access/status.js`：检查 30 天访问凭证与停用状态
- `functions/api/admin/codes.js`：卖家生成、查询、停用及重置接口
- `schema.sql`：D1 数据表
- `wrangler.toml`：Pages 与 D1 配置；部署前需替换数据库 ID

生产环境必须配置 `ACTIVATION_SECRET`、`ADMIN_SECRET`，建议另设 `RATE_LIMIT_SALT`。这些密钥不得提交到 Git；D1 建库、密钥配置和正式发布应在 Cloudflare 账号中完成。

## 项目结构

- `src/data.js`：完整题库、角色向量和结果文案
- `src/quiz-engine.js`：归一化与三重人格匹配算法
- `src/app.js`：页面状态和交互流程
- `src/styles.css`：Editorial × 东方宫廷视觉系统
- `tests/`：算法自动化测试
- `admin.html`：卖家激活码后台
- `functions/`：Cloudflare Pages Functions 生产接口
- `server/`：本地开发用激活服务
- `甄嬛传小主性格测试_PRD.md`：完整产品需求文档

## 说明

本项目为非官方娱乐性人格测试，不构成专业心理评估。项目不使用官方剧照、演员肖像、影视音频或原台词素材。
