# AGENTS.md — 给 AI 编码代理的项目说明书

> 本文件面向 **AI 编码代理 / 自动化部署代理**（Claude Code、Codex、Cursor、DeepSeek Harness 等）。
> 人类读者请先看 [README.md](README.md)。本文件目标是：让代理在不了解背景的情况下，也能安全地修改、构建、部署、排障本项目。

---

## 0. 一句话概括

「食图 eatMap」是一个 **Next.js 16（App Router）+ React 19 + TypeScript + Tailwind 4** 的校园餐饮信息平台；**没有数据库**，业务数据全部是 `data/*.json`，上传图片经 `sharp` 压缩为 WebP 存入 `data/uploads/`；认证为 `jose` 签发 JWT + HttpOnly Cookie；地图用 Konva 画布编辑与展示。

---

## 1. 绝对不要做的事（红线）

1. **不要提交任何真实密钥、`.env.local` / `.env.production`、用户数据、上传图片、域名或个人信息。**
2. **不要删除 `data/*.json` 的初始结构**：缺失文件会让服务端读取抛错（应保持合法 JSON，空数组写 `[]`）。
3. **不要默认多实例部署**：JSON 写入是「读-改-写」，PM2 只能 `fork` 单实例；不要改成 cluster / 多副本共享同一 `data/`。
4. **不要假设部署在域名根路径**：项目支持 `EATMAP_BASE_PATH`，所有客户端请求 URL 必须通过 `eatmapUrl()` / `resolveEatmapMediaUrl()` 拼接，不能写死 `/api/...`。
5. **不要在 Edge Runtime 使用本项目的服务端代码**：`fs`、`sharp`、`node-cron` 依赖 Node 运行时；不要加 `export const runtime = "edge"`。
6. **不要用 Vercel 等无状态 Serverless 部署**：写入 JSON/图片会丢失。
7. **改动数据字段时必须向后兼容**：旧记录缺字段应通过 `normalize*` 函数补默认值（参考 `src/lib/shop-gallery.ts`、`src/lib/site-settings.ts`）。
8. **不要恢复付费广告**：当前产品定义是「只有免费首页推荐」；如确需恢复，属于产品决策，需人类确认。

---

## 2. 环境与命令

```bash
node -v                 # 需要 >= 20.9（推荐 22 LTS）
npm install             # 安装依赖
npm run dev             # 开发服务器 http://localhost:4000
npm run dev:lan         # 监听 0.0.0.0，手机局域网调试
npm run build           # 生产构建（会写入 .next/）
npm run start           # 以生产模式运行（端口 4000）
npm run lint            # ESLint（Next 16 配置）
npm run typecheck       # tsc --noEmit
npm run admin:create    # 创建/重置首个超级管理员（写入 data/users.json）
npm run verify:static   # 构建产物 CSS/JS 自检
```

**关键路径**

| 路径 | 作用 |
| --- | --- |
| `src/app/api/**/route.ts` | 所有后端接口（Route Handlers） |
| `src/lib/io.ts` | 数据目录解析与 JSON 读写（**唯一数据落盘点**） |
| `src/lib/types.ts` | 全部数据结构定义（改字段先改这里） |
| `src/lib/auth-*.ts`、`password.ts`、`session.ts` | 认证与密码 |
| `src/lib/site-settings.ts` | 站点配置与审核模式 |
| `src/lib/base-path.ts` | `eatmapUrl()` / `resolveEatmapMediaUrl()`，子路径部署必需 |
| `src/middleware.ts` | `/admin` 登录保护、请求日志、`_next` 子路径兼容 |
| `src/instrumentation.ts` | 进程启动：生产环境变量校验、备份调度启动 |
| `data/` | 运行时数据（JSON + uploads） |
| `scripts/create-super-admin.mjs` | 首个超管 CLI（复用 `scrypt$salt$hash` 格式） |
| `deploy/` | Nginx / systemd 示例 |

---

## 3. 首次部署标准流程（代理照做即可）

```bash
# 1) 安装
cp .env.example .env.production
# 2) 编辑 .env.production，写入：
#    EATMAP_SECRET=<openssl rand -base64 32 的输出>
#    NEXT_PUBLIC_SITE_URL=https://your-domain.com     # 子路径则 https://your-domain.com/eatmap
#    EATMAP_BASE_PATH=/eatmap                          # 仅子路径部署填写
# 3) 构建
npm install
npm run build
# 4) 创建超管（可交互；自动化时用环境变量）
EATMAP_ADMIN_USERNAME=admin EATMAP_ADMIN_NICKNAME=管理员 \
EATMAP_ADMIN_PASSWORD='***' npm run admin:create -- --reset
# 5) 启动
npx pm2 start ecosystem.config.cjs && npx pm2 save
# 6) Nginx：参考 deploy/nginx.conf.example 反代 127.0.0.1:4000
```

验证清单：

- [ ] `curl -I http://127.0.0.1:4000/` 返回 200。
- [ ] 首页可打开，CSS 生效（`npm run verify:static` 检查产物；浏览器看 `/.../_next/static/...` 均 200）。
- [ ] `/login` 用创建的超管可登录，顶部出现「后台」。
- [ ] 后台「食堂与楼层」能保存（证明 `data/` 可写）。
- [ ] 上传一张图片成功（证明 `sharp` 可用、`data/uploads/` 可写）。
- [ ] `data-backup/latest/` 在启动后生成，或后台「立即备份」成功。

---

## 4. 数据模型速查

所有 JSON 文件位于 `data/`（`EATMAP_DATA_DIR` 可覆盖）。字段权威定义：`src/lib/types.ts`。

| 文件 | 结构 | 关键字段 |
| --- | --- | --- |
| `users.json` | `UserRecord[]` | `id, nickname, role, email/phone/username, passwordHash, favoriteShopIds?, wantShopIds?, merchantProfile?` |
| `shops.json` | `Shop[]` | `id, name, buildingId, buildingName, floorId?, avgPrice, tags, coverImage?, dishes[], menuImages[], sceneImages[], listingStatus?, publicDisplay?, ownerUserId?, showContact?` |
| `reviews.json` | `Review[]` | `id, shopId, userId, userName, rating, content, visible, reviewModeration?, perPersonSpend?, images?` |
| `ads.json` | `Ad[]` | `id, merchantId, shopId, title, status, slot:"home_featured", startDate/endDate`（**无价格字段**） |
| `buildings.json` | `Building[]` | `id, name, sortOrder?` |
| `floors.json` | `Floor[]` | `id, buildingId, name, order, width, height, backgroundImage?` |
| `mapShapes.json` | `MapShape[]` | `id, floorId, shopId, kind:"shop"|"stairs"|"entrance", x,y,width,height,label?` |
| `tags.json` | `string[]` | 菜品/店铺标签库 |
| `site-settings.json` | `SiteSettings` | `merchantFeedPromoEnabled, feedAnnouncementStripEnabled, galleryModerationMode:"pre"|"post", reviewModerationMode, feedAnnouncementStrip` |
| `upload-meta.json` | `UploadLog[]` | `path, userId, shopId?, kind, createdAt` |
| `uploads/*.webp` | 二进制 | 由 `sharp` 压缩，通过 `/api/files/uploads/<name>` 访问 |

**读写约定**

- 只用 `readJsonFile<T>(name)` / `writeJsonFile(name, data)`（`src/lib/io.ts`），不要直接 `fs` 操作 `data/`。
- 新增 ID 用 `newId(prefix)`。
- 读取后对可选字段做 normalize（旧数据兼容）。

---

## 5. 认证与权限

- 登录：`POST /api/auth/login` → 校验密码（`verifyPassword`）→ `signSessionToken` → 写 Cookie `eatmap_session`（HttpOnly、SameSite=Lax、7 天）。
- 校验：`getSession()` 读 Cookie 并验签，返回 `{ userId, role, impersonatorId? }`。
- 角色：`user < merchant < admin < super_admin`。
- 入口保护：`src/middleware.ts` 匹配 `/admin`，无有效会话跳 `/login?next=...`。
- **每个敏感 API 必须自己再调用 `getSession()` 校验角色**，不要只依赖 middleware（middleware 只保护页面）。
- 超级管理员的创建方式只有 `scripts/create-super-admin.mjs`（或后台提升 admin；超管不可被后台降级/删除，接口层已限制）。

---

## 6. 图片上传链路

```
客户端 FormData(file, purpose, shopId?)
  → POST /api/upload
    → 校验会话、purpose、店铺归属（canEditShop）
    → 限制 12MB
    → sharp.rotate().resize(≤1600).webp(q=82) → data/uploads/<id>.webp
    → 记录 data/upload-meta.json
    → 返回 { url: "/api/files/uploads/<id>.webp" }
  → 浏览器通过 /api/files/uploads/<id>.webp 展示（带 basePath 时用 resolveEatmapMediaUrl）
```

`purpose` 取值：`shop-cover | shop-menu | shop-scene | shop-dish | ad-promo | review`。除 `review` 外都要求当前账号可编辑该店铺；`review` 允许登录用户给任意店铺上传评价图。

**审核状态**：`ShopGalleryItem.status` 为 `pending | approved | rejected`；先审后发模式下新图 `pending`，只有 `approved` 对访客可见（`publicShopView`）。

---

## 7. 子路径部署（basePath）要点

- `next.config.ts` 读取 `EATMAP_BASE_PATH`（或从 `NEXT_PUBLIC_SITE_URL` 路径推断）设置 `basePath`，并注入 `NEXT_PUBLIC_EATMAP_BASE_PATH`。
- 服务端组件里的 `Link` 会自动带 basePath；**客户端 `fetch` 必须用 `eatmapUrl("/api/...")`**。
- 数据里存的站内图片路径（`/api/files/...`）在渲染时用 `resolveEatmapMediaUrl()` 转成带 basePath 的地址；`http(s)://` 外链原样返回。
- `manifest.ts` 的 `start_url` / `scope` 会带 basePath，保证「添加到主屏幕」正确落在子路径。
- **构建期注入**：修改 `.env.production` 后必须重新 `npm run build`，`next start` 不会重新读取 basePath 到产物。
- Nginx 规则见 `deploy/nginx.conf.example` 末尾注释：`location ^~ /eatmap/ { proxy_pass http://127.0.0.1:4000; }`（末尾不加 `/`），不要 301 加斜杠。

---

## 8. 代码约定

- 路径别名：`@/*` → `src/*`（`tsconfig.json`）。**不要用相对路径跨目录引用。**
- 客户端组件必须显式 `"use client"`；`server-only` 模块（如 `user-data-backup.ts`）不得被客户端导入。
- 注释、UI 文案使用中文；代码标识符用英文。
- 日期：营业/投放日期用上海时区的 `YYYY-MM-DD`，工具函数在 `src/lib/date-utils.ts`（`todayYMDShanghai` 等），不要用 `new Date()` 直接比较字符串。
- 金额：人均展示规则在 `src/lib/ratings.ts`（≥3 条带价评价后与商家参考价合并）。
- 组件体积：`AdminDashboard.tsx` 是大型后台单文件，改动时用精确的局部替换，避免整文件重写。
- 新增页面：`src/app/<route>/page.tsx`；新增接口：`src/app/api/<name>/route.ts`；新增业务逻辑放 `src/lib/`，不要塞进组件。

---

## 9. 构建与类型检查常见问题

| 问题 | 原因 / 解决 |
| --- | --- |
| `EATMAP_SECRET must be set ...` | 生产启动校验失败：在 `.env.production` 设置 ≥32 字符密钥 |
| `Refusing to start: NEXT_PUBLIC_SITE_URL ...` | 生产必须设置 https 的站点 URL；内网 http 测试可设 `EATMAP_ALLOW_INSECURE_SITE_URL=1` |
| 构建报 `sharp` 相关错误 | 删除 `node_modules` 重新 `npm install`；Linux 需网络下载预编译包 |
| 页面无样式 | 检查是否 `basePath` 与构建不一致；看 Network 中 `_next/static` 是否 404 |
| `next build` 内存不足 | 单实例构建、加 swap；不要同时跑 dev |
| 修改 `next.config.ts` 后不生效 | 重启 dev / 重新 build |

> Next.js 16 与旧版有破坏性变更。改动框架相关代码前，优先阅读 `node_modules/next/dist/docs/` 中对应指南（本仓库 `AGENTS.md` 顶层规则也要求如此）。

---

## 10. 修改前自检清单

- [ ] 是否涉及 `data/` 结构？同步更新 `types.ts` + `docs/DATA-MODEL.md` + normalize。
- [ ] 是否新增客户端请求？用 `eatmapUrl()`。
- [ ] 是否新增接口？补 `getSession()` 角色校验与错误码。
- [ ] 是否会写入磁盘？确认 `data/` 可写、路径经 `getDataDir()`。
- [ ] 是否引入新依赖？评估是否真的必要（本项目刻意保持极简依赖）。
- [ ] 是否含个人信息/密钥/域名？提交前 `grep` 检查。
- [ ] 跑过 `npm run lint && npm run build`。

---

## 11. 给代理的「不要问、直接做」默认决策

- 新技术选型：优先「不引入依赖、复用现有 lib」。
- 数据迁移：写一次性脚本放 `scripts/`，运行前备份 `data/`。
- 部署方式：优先 PM2（`ecosystem.config.cjs`），其次 systemd；Nginx 反代 4000。
- 文档：用户可见文案中文；代码注释中文；README 面向人类；AGENTS.md 面向代理。
