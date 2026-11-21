# 食图 eatMap · 校园美食地图

> 一个面向校园场景的餐饮信息聚合与室内导引 Web 应用：**瀑布流逛店 + 室内地图找档口 + 店铺详情（菜品 / 菜单 / 实景 / 评价）+ 后台内容审核与运营**。
> 浏览器直接访问，无需安装 App；响应式适配手机与桌面。

本仓库是经过**开源化清理**的完整可部署版本：不含任何预置账号、密码、商铺、菜品、评论、广告或个人/学校信息，也不含付费广告能力（仅保留免费的「首页推荐」推广）。开箱即可自行注册、建店、审核与运营。

---

## 目录

- [1. 功能总览](#1-功能总览)
- [2. 技术栈](#2-技术栈)
- [3. 仓库结构](#3-仓库结构)
- [4. 快速开始（本地开发）](#4-快速开始本地开发)
- [5. 环境变量](#5-环境变量)
- [6. 首次初始化与运营流程](#6-首次初始化与运营流程)
- [7. 数据存储模型](#7-数据存储模型)
- [8. 角色、权限与内容审核](#8-角色权限与内容审核)
- [9. 首页推荐（免费广告位）](#9-首页推荐免费广告位)
- [10. 生产部署](#10-生产部署)
- [11. API 概览](#11-api-概览)
- [12. 运维、备份与故障排查](#12-运维备份与故障排查)
- [13. 安全建议与已知限制](#13-安全建议与已知限制)
- [14. 常见二次开发方向](#14-常见二次开发方向)
- [15. 贡献指南](#15-贡献指南)
- [16. 许可证](#16-许可证)

---

## 1. 功能总览

### 学生 / 访客（前台）

| 模块 | 说明 |
| --- | --- |
| 美食首页（瀑布流） | 店铺卡片瀑布流；按食堂/建筑、品类标签、关键词筛选；随机排序 + 分页懒加载（每次 10 家） |
| 今日推荐 / 公告 | 瀑布流顶部「今日推荐」横条轮播（免费推广位）；可选的文字公告窄条 |
| 室内地图 | 按建筑、楼层浏览；拖拽、缩放；点击铺位矩形进入店铺详情；楼梯/入口等可点击标识 |
| 店铺详情 | 位置、参考人均/合并均价、评分、菜品与价格、菜单大图与实景照片、用户评价与配图、联系方式（店主可关闭） |
| 用户贡献 | 登录后可提交评分、评价、人均消费与图片（是否先审后发由站长配置） |
| 账户 | 学生邮箱注册登录；个人资料（昵称）、我的评价、收藏店铺、「想吃」标记、账户安全 |
| 随机点菜 | 按标签随机推荐菜品，解决「不知道吃什么」 |
| 欢迎页 | 项目介绍与运营展示位，含底部版权信息（可自行替换） |

### 商户（注册即为 merchant 角色）

- 注册（手机号 + 昵称 + 密码）并登录。
- 创建/维护店铺：名称、所属食堂楼层、参考人均、封面、简介、店内位置说明、联系方式、菜品与配图、菜单图/实景图。
- 新店默认「待审核」，管理员审核通过后才对外展示；可自行关闭「对外展示」。
- 查看本店评价，可对不当评价发起「申请隐藏」，由管理员审批。
- 报名免费的「首页推荐」展位（填写文案、投放日期区间、可选顶部展示图），提交后等待管理员审核。

### 管理员 / 超级管理员（/admin）

- **总览**：站点统计、待办与快捷入口。
- **地图搭建**：Konva 画布式铺位编辑器，给店铺绑定楼层矩形，支持尺寸设定与拖拽。
- **食堂与楼层**：建筑、楼层的新增/重命名/排序/尺寸。
- **店铺管理**：编辑店铺、上下架、绑定商户、维护标签与图片。
- **新店审核**：通过/驳回商户新建店铺。
- **评价管理**：按店铺/星级/可见性筛选，显示/隐藏/删除评价，处理商户隐藏申请。
- **菜单实景**：审核用户上传的菜单图、实景图。
- **合规审查**：首页推荐开关、公告条开关与内容、图片/评价的「先审后发 / 先发后审」策略。
- **广告列表**：审核/管理首页推荐条目（免费）。
- **店铺展示**：控制哪些店铺在欢迎页等位置展示。
- **用户管理**：搜索账号、封禁/解封、调整角色（admin）、重置密码（超级管理员）。
- **数据备份**：查看备份状态、一键立即备份（可配置）。

> 角色权限：`super_admin`（超管）> `admin`（管理员）> `merchant`（商户）> `user`（普通用户）。商户只能操作自己绑定的店铺；管理员可管理内容但不能提升/降级超管。

---

## 2. 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | **Next.js 16（App Router）** + React 19 | 服务端组件负责读数据与 SEO；客户端组件负责交互 |
| 语言 | TypeScript 5 | 全量 TS，路径别名 `@/* → src/*` |
| 样式 | Tailwind CSS 4 + PostCSS | 琥珀色（amber）主题 |
| 地图 | Konva + react-konva | Canvas 绘制室内铺位，支持拖拽/缩放/编辑 |
| 图标 | lucide-react | |
| 认证 | `jose` 签发 HS256 JWT，HttpOnly Cookie 会话 | 密码 `scrypt` 加盐哈希 |
| 数据 | 结构化 JSON 文件 + `sharp` 图片处理 | 无需数据库；适合中小规模校园部署，可平滑替换 |
| 定时任务 | `node-cron` | 每日数据备份 |
| 进程 | PM2 / systemd | 生产常驻 |

**运行环境：Node.js ≥ 20.9（推荐 22 LTS）。** 不支持 Edge Runtime 部署；必须是 Node 常驻进程（Vercel Serverless 因文件写入不可用，不适配本项目）。

---

## 3. 仓库结构

```text
eatmap/
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ page.tsx             # 首页（瀑布流）
│  │  ├─ welcome/             # 欢迎页（项目介绍 + 运营位）
│  │  ├─ map/                 # 室内地图
│  │  ├─ shop/[id]/           # 店铺详情
│  │  ├─ feed/random/         # 随机点菜
│  │  ├─ login|register/      # 登录、学生注册、商户注册
│  │  ├─ account/             # 用户/商户账户中心
│  │  ├─ admin/               # 后台管理
│  │  ├─ legal/user-notice/   # 用户须知
│  │  ├─ api/                 # 所有后端接口（Route Handlers）
│  │  ├─ layout.tsx           # 全局布局与 SEO/metadata
│  │  └─ manifest.ts          # PWA Manifest（添加到主屏幕）
│  ├─ components/             # UI 组件（含 AdminDashboard、MapEditor、地图查看器等）
│  ├─ lib/                    # 数据访问、鉴权、业务规则、日期工具
│  ├─ instrumentation.ts      # 进程启动校验（生产密钥、备份调度）
│  └─ middleware.ts           # 后台路由保护、请求日志、子路径兼容
├─ data/                      # 运行时数据（JSON + uploads，已清空为干净种子）
├─ public/                    # 图标与静态资源
├─ deploy/                    # Nginx、systemd 示例
├─ scripts/                   # 创建超管、图标生成、部署自检
├─ docs/                      # 数据模型 / API / 部署补充说明
├─ ecosystem.config.cjs       # PM2 配置
├─ next.config.ts             # basePath、Turbopack、图片域名等
├─ .env.example               # 环境变量模板
├─ AGENTS.md                  # 给 AI 编码代理的项目说明（部署/维护必读）
└─ README.md
```

---

## 4. 快速开始（本地开发）

### 4.1 环境要求

- Node.js **≥ 20.9**（`node -v` 检查）
- npm ≥ 10（或使用 pnpm / yarn，自行等价替换命令）
- 无需安装数据库

### 4.2 安装与启动

```bash
git clone <your-repo-url> eatmap
cd eatmap
npm install                 # 首次安装（会自动下载 sharp 预编译二进制）
cp .env.example .env.local  # Windows: copy .env.example .env.local
```

编辑 `.env.local`，至少填写：

```dotenv
EATMAP_SECRET=<32位以上随机字符串>       # 生成：openssl rand -base64 32
NEXT_PUBLIC_SITE_URL=http://localhost:4000
```

创建第一个超级管理员（仓库不预置任何账号）：

```bash
npm run admin:create
# 按提示输入登录名、昵称、密码（密码不回显，至少 8 位）
```

启动开发服务器：

```bash
npm run dev
# 打开 http://localhost:4000
```

> 手机通过局域网访问可执行 `npm run dev:lan`（监听 0.0.0.0），并以 `http://<电脑局域网IP>:4000` 打开；Next 已配置常见内网 `allowedDevOrigins`。

### 4.3 本地生产构建自检

```bash
npm run lint
npm run build
npm run start        # 以生产模式启动，端口 4000
npm run verify:static  # 构建后检查 CSS/JS 产物是否完整
```

---

## 5. 环境变量

所有变量见 [`.env.example`](.env.example)。核心变量：

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `EATMAP_SECRET` | ✅ 生产必填 | 开发用的占位串 | JWT 签名密钥，**≥32 字符**。生产环境缺失或过短会拒绝启动 |
| `NEXT_PUBLIC_SITE_URL` | ✅ 生产必填 | — | 对外访问根 URL，如 `https://example.com`；子路径部署写 `https://example.com/eatmap` |
| `EATMAP_BASE_PATH` | 可选 | 从 `NEXT_PUBLIC_SITE_URL` 推断 | 应用挂载子路径（`/eatmap`），根路径部署留空。**构建与运行时必须一致** |
| `PORT` | 可选 | `4000` | 监听端口（`next start -p 4000` 已写死为 4000，如需改动同时改 `package.json`/PM2/Nginx） |
| `EATMAP_DATA_DIR` | 可选 | `./data` | JSON 数据与上传文件目录的绝对路径，容器化部署常用 |
| `EATMAP_BACKUP_DIR` | 可选 | `./data-backup` | 用户数据备份根目录；每日 04:00（Asia/Shanghai）与启动时覆盖写入 `latest/` |
| `EATMAP_USER_DATA_BACKUP` | 可选 | 生产 `1`、开发 `0` | 设为 `1` 在开发环境也启用备份 |
| `EATMAP_BACKUP_DISABLED` | 可选 | — | 设为 `1` 彻底关闭备份 |
| `EATMAP_DEBUG_HTTP` | 可选 | 开发打印、生产不打印 | 设为 `1` 打印每条请求日志 |
| `EATMAP_ALLOW_INSECURE_SITE_URL` | 可选 | `0` | 仅内网测试时允许 `http://` 站点 URL |
| `EATMAP_START_BANNER` | 可选 | `1` | 设为 `0` 关闭生产启动横幅 |

> ⚠️ `.env.local` / `.env.production` 已被 `.gitignore` 忽略，**永远不要提交真实密钥**。

---

## 6. 首次初始化与运营流程

1. **创建超管**：`npm run admin:create`（可重复执行并加 `--reset` 重置密码）。
2. **登录后台**：访问 `/login`，用刚创建的账号登录 → 顶部「后台」。
3. **搭建食堂与楼层**：后台 →「食堂与楼层」新增建筑（如「第一食堂」）与楼层，设置画布尺寸。
4. **绘制地图铺位**：后台 →「地图搭建」，选择楼层，添加铺位矩形并绑定店铺。
5. **开放注册**：学生自行在 `/register` 注册；商户在 `/register/merchant` 注册。
6. **商户建店**：商户登录后在「账户 → 创建店铺」填写店铺信息、菜品、图片；新店进入「待审核」。
7. **审核上架**：管理员在「新店审核」通过后，店铺才会出现在瀑布流/地图/搜索中。
8. **运营内容**：配置「合规审查」中的审核策略；在「广告列表」中管理公告条与首页推荐；在「店铺展示」控制欢迎页推荐。
9. **提升管理员**：超级管理员可在「用户管理」中把可信用户提升为 `admin`。

> 建议流程：先由管理员建好食堂/楼层 → 再让商户注册建店 → 管理员审核 → 运营推广。空数据状态下首页没有店铺属于正常现象。

---

## 7. 数据存储模型

所有业务数据保存在 `data/`（可用 `EATMAP_DATA_DIR` 覆盖）：

| 文件 | 内容 |
| --- | --- |
| `users.json` | 用户/商户/管理员账号（含 `passwordHash`，**不要外泄**） |
| `shops.json` | 店铺、菜品、菜单/实景图、审核与展示状态 |
| `reviews.json` | 评价、评分、人均、配图、可见性、隐藏申请 |
| `ads.json` | 首页推荐/广告条目（免费，含审核状态与投放日期） |
| `buildings.json` | 建筑（食堂/综合楼）及排序 |
| `floors.json` | 楼层（宽高为地图画布坐标系） |
| `mapShapes.json` | 地图铺位矩形（绑定 `shopId` 或楼梯/入口标识） |
| `tags.json` | 菜品/店铺标签库 |
| `site-settings.json` | 站点级配置（推荐开关、公告条、审核模式） |
| `upload-meta.json` | 上传文件归属日志（用户、店铺、用途） |
| `uploads/` | 压缩后的 WebP 图片（通过 `/api/files/uploads/<name>` 访问） |
| `data-backup/latest/` | 自动备份快照（默认在仓库根目录，不在 `data/` 内） |

数据文件均为纯 JSON 数组/对象，字段定义见 [`src/lib/types.ts`](src/lib/types.ts)，更完整的字段说明见 [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md)。

**并发说明**：写操作是「读取-修改-写回」。单进程、低并发校园场景足够；若预期高并发或需要多实例，请将 `src/lib/io.ts` 替换为数据库实现（如 SQLite/Postgres/Prisma），接口层几乎无需改动。

**上线后的数据管理建议**：`data/*.json` 同时承担「种子」与「运行数据」两个角色。正式运营后，建议把 `data/` 从 Git 跟踪中移除（或设置 `EATMAP_DATA_DIR` 指向代码目录之外的独立数据盘），只保留一份初始种子备份，避免把真实用户数据误提交到公开仓库。

---

## 8. 角色、权限与内容审核

| 能力 | user | merchant | admin | super_admin |
| --- | --- | --- | --- | --- |
| 浏览/搜索/地图/详情 | ✅ | ✅ | ✅ | ✅ |
| 收藏、想吃、评价、上传评价图 | ✅ | ✅ | ✅ | ✅ |
| 创建/编辑自己的店铺与菜品 | — | ✅ | — | — |
| 报名首页推荐 | — | ✅ | — | — |
| 后台只读总览 | — | ✅（商户后台） | ✅ | ✅ |
| 编辑任意店铺 / 审核新店 / 评价与图片审核 / 地图 | — | — | ✅ | ✅ |
| 用户管理、角色调整、重置密码、标签库 | — | — | 部分 | ✅ |

**内容审核模式**（后台「合规审查」可切换）：

- 菜单图 / 实景图：`post` 先发后审（默认，提交即展示）或 `pre` 先审后发。
- 用户评价：`post` 先发后审 或 `pre` 先审后发。
- 管理员与超管上传的图片始终直接通过。
- 商户对评价的「申请隐藏」需管理员批准后生效。

审核模式保存在 `data/site-settings.json`，初始化种子默认为 `pre`（更稳妥，适合正式上线；本地体验可改为 `post`）。

---

## 9. 首页推荐（免费广告位）

本版本**已移除全部付费/计费能力**：

- 不再有「按天单价」「合计金额」「保存定价」等界面与接口。
- 商户只能提交**免费**的首页推荐申请；管理员审核通过后按设置日期出现在瀑布流顶部横条。
- 推荐位支持自定义文案（≤14 字）与可选顶部展示图；不传图时使用店铺封面。
- 管理员可在「合规审查」中关闭整个首页推荐模块（关闭后瀑布流横条改为随机展示全部菜品，商户入口隐藏）。

相关数据：`data/ads.json`；相关接口：`/api/ads`、`/api/site-settings`。

---

## 10. 生产部署

> 详细逐步说明（含从零到域名的完整命令）见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。下面是最小可行路径。

### 10.1 构建与 PM2 启动

```bash
# 服务器上（Node ≥ 20.9）
git clone <your-repo-url> /srv/eatmap
cd /srv/eatmap
npm install                 # 或 npm ci（如有 lock 文件）
cp .env.example .env.production
# 编辑 .env.production：EATMAP_SECRET、NEXT_PUBLIC_SITE_URL

npm run build
npm run admin:create        # 交互式创建超管（也可用环境变量方式）
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup             # 按输出提示执行一次开机自启命令
```

- 应用目录中的 `data/` 与 `data-backup/` 需对运行用户**可写**。
- 升级版本：`git pull && npm install && npm run build && npx pm2 reload eatmap`，`data/` 不受影响。

### 10.2 Nginx 反向代理

参考 [`deploy/nginx.conf.example`](deploy/nginx.conf.example)：

- **根路径部署**（推荐新手）：`location / { proxy_pass http://127.0.0.1:4000; ... }`。
- **子路径部署**（如 `https://example.com/eatmap`）：`.env.production` 中同时设置
  `NEXT_PUBLIC_SITE_URL=https://example.com/eatmap` 与 `EATMAP_BASE_PATH=/eatmap`，
  然后重新 `npm run build`（basePath 是构建期注入），Nginx 对 `/eatmap` 与 `/eatmap/` **直接反代**，不要 301 加斜杠，`proxy_pass` 末尾不要加 `/`。
- 上传图片单张上限 12MB，建议 `client_max_body_size 20m;`。
- 生产必须启用 HTTPS；若由外层负载均衡终止 TLS，请透传 `X-Forwarded-Proto` / `X-Forwarded-Host`。

### 10.3 使用 systemd（可选）

见 [`deploy/eatmap.service.example`](deploy/eatmap.service.example)；适合不使用 PM2 的服务器。

### 10.4 备份

- 默认 `./data-backup/latest/`（可用 `EATMAP_BACKUP_DIR` 指定绝对路径）。
- 启动时 + 每日 04:00（Asia/Shanghai）整目录覆盖备份；后台支持手动立即备份。
- 建议再用 `rsync`/对象存储把该目录同步到异地；备份目录不要放在 `data/` 内部，避免递归。

### 10.5 多实例 / 容器

- 由于 JSON 文件写入非多实例安全，**不要用 PM2 cluster 或多副本同时写同一数据目录**；单实例 fork 模式即可。
- 容器化时将 `data/` 挂载为卷，设置 `EATMAP_DATA_DIR`。
- Vercel/Netlify 等无状态 Serverless 平台不适配。

---

## 11. API 概览

所有接口位于 `src/app/api/**/route.ts`，使用 Cookie 会话鉴权；错误返回 `{ error: "<code>" }`。完整清单与字段见 [`docs/API.md`](docs/API.md)。

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/auth/login` | POST | 登录（邮箱/手机号/登录名 + 密码） |
| `/api/auth/logout` | POST | 退出登录 |
| `/api/auth/me` | GET / PATCH | 当前用户信息 / 修改昵称 |
| `/api/auth/register-student` | POST | 学生注册（邮箱） |
| `/api/auth/register-merchant` | POST | 商户注册（手机号） |
| `/api/auth/impersonate`、`/api/auth/stop-impersonating` | POST | 超管身份预览（保留接口，默认无入口） |
| `/api/shops` | GET / POST | 店铺列表 / 创建店铺 |
| `/api/shops/mine` | GET | 我的店铺 |
| `/api/shops/[id]` | GET / PATCH / DELETE | 店铺详情 / 更新 / 删除 |
| `/api/shops/[id]/gallery` | POST / PATCH / DELETE | 菜单图、实景图上传与审核 |
| `/api/reviews` | GET / POST | 评价列表 / 提交评价 |
| `/api/reviews/[id]` | PATCH / DELETE | 审核/隐藏/删除评价 |
| `/api/buildings`、`/api/buildings/[id]`、`/api/buildings/reorder` | 见路由 | 建筑 CRUD 与排序 |
| `/api/floors`、`/api/floors/[id]` | 见路由 | 楼层 CRUD |
| `/api/map-shapes` | GET / POST | 地图铺位读取 / 保存 |
| `/api/ads` | GET / POST / PATCH / DELETE | 免费推荐申请与审核 |
| `/api/site-settings` | GET / PATCH | 站点配置 |
| `/api/tags` | GET / PUT | 标签库 |
| `/api/upload` | POST | 图片上传（自动压缩为 WebP） |
| `/api/files/[...path]` | GET | 读取上传图片（带缓存头与路径穿越防护） |
| `/api/users`、`/api/users/[id]`、`/api/users/[id]/password` | 见路由 | 用户搜索、管理、重置密码 |
| `/api/me/map-editor-prefs`、`/api/me/shop-marks` | GET / PATCH / POST | 个人地图编辑偏好、收藏/想吃标记 |
| `/api/admin/user-data-backup` | POST | 手动触发数据备份 |

---

## 12. 运维、备份与故障排查

| 现象 | 排查方向 |
| --- | --- |
| 页面有文字无样式 | basePath 与构建不一致；`/_next/...` 404。确认构建与运行使用同一 `.env.production`，Nginx 未拦截 `_next`；执行 `npm run verify:static` 检查产物 |
| 子路径部署后 404 | `proxy_pass` 末尾误加 `/`；对 `/eatmap` 做了 301 加斜杠；未重新构建带上 `EATMAP_BASE_PATH` |
| 生产启动即退出 | 未设置 `EATMAP_SECRET`（≥32 位）或 `NEXT_PUBLIC_SITE_URL`；查看 `pm2 logs` |
| 保存/上传失败 | `data/`、`data-backup/` 对运行用户不可写；Nginx `client_max_body_size` 太小 |
| 地图空白 | 尚未创建建筑/楼层/铺位；先在后台「食堂与楼层」与「地图搭建」中配置 |
| 店铺不显示 | 新店仍是「待审核」、被关闭「对外展示」，或没有通过审核 |
| 首页推荐不出现 | 条目未审核通过 / 不在投放日期内 / 「首页推荐」总开关关闭 |
| 登录后立即掉线 | 多实例或更换过 `EATMAP_SECRET`（旧 Cookie 失效）；清 Cookie 重登 |
| 备份没生成 | `EATMAP_BACKUP_DIR` 不可写，或 `EATMAP_BACKUP_DISABLED=1`；查看日志 `[eatmap-backup]` |

常用命令：

```bash
npx pm2 logs eatmap --lines 200
npx pm2 restart eatmap
curl -I http://127.0.0.1:4000/
npm run verify:static
```

---

## 13. 安全建议与已知限制

**开源模板已做的安全设计**

- 密码使用 `scrypt` 加盐哈希存储；会话为 HttpOnly Cookie JWT（7 天）。
- 生产环境启动时强制校验 `EATMAP_SECRET` 与站点 URL（禁止 http 公网、禁止开发占位密钥）。
- 上传接口限制 12MB，统一转 WebP，`/api/files` 做了路径穿越校验。
- 后台路由由 `middleware.ts` + 各接口二次校验角色。
- 管理员重置密码、封禁、角色调整均限定超管；用户不能自我提权。

**部署方需要自行加固的点**

- 生产必须 HTTPS；按需在 Nginx 前加 WAF / 限流。
- 注册目前无邮箱/短信验证码与频率限制，公开上线前建议加验证码、IP 限流或改为邀请制。
- JSON 文件存储适合中小规模；高并发写、审计、多实例请换数据库。
- 用户上传内容需配合人工审核策略与内容公约；请按当地法规补充备案、隐私政策与未成年人保护要求。
- 建议定期异地备份 `data/` 与 `data-backup/`，并限制服务器目录权限。

---

## 14. 常见二次开发方向

- **换数据库**：实现 `src/lib/io.ts` 的同名接口（`readJsonFile` / `writeJsonFile` / `newId`）即可，业务层无需改动。
- **统一身份认证**：接入学校 CAS/OAuth，把 `src/app/api/auth/login` 替换为回调换取用户。
- **图片对象存储**：将 `src/lib/process-upload.ts` 改为上传 OSS/S3，返回 CDN URL。
- **地图底图**：楼层 `backgroundImage` 支持上传平面图，配合铺位矩形即可。
- **多校区**：`buildings.json` 增加校区字段并扩展筛选组件。
- **消息通知**：接入邮件/短信/站内信，用于审核结果与评价提醒。

---

## 15. 贡献指南

1. Fork 并创建分支：`feat/xxx` / `fix/xxx`。
2. 保持 TypeScript 严格模式通过：`npm run lint && npm run build`。
3. 数据层是纯 JSON，新增字段请同时更新 `src/lib/types.ts` 与 `docs/DATA-MODEL.md`，并对旧数据做向后兼容（参考 `normalizeShop`）。
4. 不提交任何真实用户数据、密钥、域名、学校标识。
5. 提交 PR 时说明动机、变更点与验证方式（建议附截图）。

---

## 16. 许可证

本项目以 **MIT License** 开源，详见 [LICENSE](LICENSE)。

> 项目名称「食图 / eatMap」与内置品牌图标仅用于标识本项目；如需商用或用于学校正式平台，请自行确认名称、图标、内容合规与数据合规要求。

---

**如果这个项目对你有帮助，欢迎 Star ⭐ 与提交 Issue / PR。**
