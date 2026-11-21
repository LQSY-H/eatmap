# 部署指南（从零到上线）

> 本文面向**人类运维**与**自动化部署代理**。只想本地跑起来请看 [README 快速开始](../README.md#4-快速开始本地开发)。
> 部署目标：一台可运行 Node.js 的 Linux 服务器 + Nginx + HTTPS。

---

## 0. 部署形态选择

| 形态 | 适用 | 说明 |
| --- | --- | --- |
| 域名根路径（推荐） | 新项目 | `https://eat.example.com/`，无需 `EATMAP_BASE_PATH` |
| 子路径 | 已有主站 | `https://www.example.com/eatmap`，需设置 `EATMAP_BASE_PATH` 并重新构建 |
| 局域网/内网 | 校内试用 | 可先 HTTP，需 `EATMAP_ALLOW_INSECURE_SITE_URL=1` 且仅限内网 |

**不要**部署到 Vercel/Netlify 等无状态平台（需要本地磁盘写 JSON 与图片）。
**不要**开启 PM2 cluster 或多副本（JSON 写入非并发安全）。

---

## 1. 服务器准备

- Linux（Ubuntu 22.04 / Debian 12 / CentOS Stream 等均可），1 核 2G 起步。
- Node.js **≥ 20.9**（推荐 22 LTS）。安装方式任选：nvm、NodeSource、发行版仓库。
- Nginx（可选但强烈建议）。
- 域名（可选；内网 IP 也可先用）。

```bash
node -v      # 应 >= v20.9.0
npm -v
```

创建部署用户与目录：

```bash
sudo useradd -r -m -s /bin/bash eatmap || true
sudo mkdir -p /srv/eatmap
sudo chown -R eatmap:eatmap /srv/eatmap
```

> 下文以 `/srv/eatmap` 为例；若用宝塔/面板，路径换成站点目录即可。

---

## 2. 拉取代码与安装

```bash
sudo -u eatmap -s /bin/bash
cd /srv/eatmap
git clone <your-repo-url> .
# 或把本地打包上传后解压到该目录

npm install
```

> 如仓库提供 `package-lock.json` 可用 `npm ci`；本仓库默认不含 lock 文件，`package.json` 已锁定主依赖版本。

---

## 3. 配置环境变量

```bash
cd /srv/eatmap
cp .env.example .env.production
openssl rand -base64 32        # 生成 EATMAP_SECRET
nano .env.production
```

**最小必填：**

```dotenv
EATMAP_SECRET=<上一步生成的 32+ 字符>
NEXT_PUBLIC_SITE_URL=https://eat.example.com
```

**子路径部署额外加：**

```dotenv
NEXT_PUBLIC_SITE_URL=https://www.example.com/eatmap
EATMAP_BASE_PATH=/eatmap
```

可选：`EATMAP_DATA_DIR`、`EATMAP_BACKUP_DIR`、`PORT`（默认 4000）。

> - `.env.production` 不要提交到 Git。
> - 生产环境启动时会校验：密钥 ≥32 字符、站点 URL 为 https（除非 localhost 或显式允许 http）。
> - **修改环境变量后必须重新 `npm run build`**（尤其 `basePath` 与 `NEXT_PUBLIC_*` 是构建期注入）。

---

## 4. 构建

```bash
cd /srv/eatmap
npm run build
```

构建成功会生成 `.next/`。如果内存紧张（1G 小机器）：

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
# 或临时加 swap
```

构建后自检：

```bash
npm run verify:static
```

---

## 5. 创建第一个超级管理员

仓库**不预置任何账号**，必须执行一次：

```bash
cd /srv/eatmap
npm run admin:create
# 交互输入登录名、昵称、密码（不回显）

# 自动化部署（避免交互）：
EATMAP_ADMIN_USERNAME=admin \
EATMAP_ADMIN_NICKNAME=管理员 \
EATMAP_ADMIN_PASSWORD='请改成强密码' \
npm run admin:create -- --reset
```

生成结果写入 `data/users.json`。忘记密码时重新执行并加 `--reset`。

---

## 6. 启动进程

### 6.1 PM2（推荐）

```bash
sudo npm i -g pm2        # 若尚未安装
cd /srv/eatmap
npx pm2 start ecosystem.config.cjs
npx pm2 save
npx pm2 startup           # 按输出执行一次开机自启命令
```

常用：

```bash
npx pm2 status
npx pm2 logs eatmap --lines 100
npx pm2 reload eatmap     # 平滑重启（改完 .next 后）
```

### 6.2 systemd（不用 PM2 时）

```bash
sudo cp deploy/eatmap.service.example /etc/systemd/system/eatmap.service
# 编辑 User / WorkingDirectory / EnvironmentFile
sudo systemctl daemon-reload
sudo systemctl enable --now eatmap
sudo systemctl status eatmap
sudo journalctl -u eatmap -f
```

### 6.3 直接运行（仅调试）

```bash
cd /srv/eatmap
NODE_ENV=production npm run start
```

---

## 7. Nginx 与 HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/eatmap.conf
sudo ln -s /etc/nginx/sites-available/eatmap.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

要点：

- `proxy_pass http://127.0.0.1:4000;` —— **末尾不要加 `/`**。
- `client_max_body_size 20m;` —— 上传单图上限 12MB。
- 子路径部署见示例文件末尾注释：`location = /eatmap` 与 `location ^~ /eatmap/` 都直接反代，**不要 301 加斜杠**。
- 透传 `X-Forwarded-Proto` / `X-Forwarded-Host`，否则 metadata / 分享卡可能生成错误 URL。

HTTPS（Let's Encrypt）：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d eat.example.com
sudo certbot renew --dry-run
```

> 生产必须 HTTPS；若由外层负载均衡/CDN 终止 TLS，请把 `X-Forwarded-Proto: https` 传给 Node。

---

## 8. 上线验证清单

```bash
# 1. 本机端口
curl -I http://127.0.0.1:4000/
# 2. 经过 Nginx
curl -I https://eat.example.com/
# 3. 静态资源（应返回 200 + text/css）
npm run verify:static      # 会打印实际 curl 命令
# 4. 登录与后台
#    浏览器打开 /login 用超管登录 → 顶部「后台」→ 保存一次「食堂与楼层」
# 5. 上传
#    商户/管理员上传一张封面图，确认 data/uploads/ 下生成 .webp
# 6. 备份
#    生产启动后应出现 data-backup/latest/（或后台「立即备份」成功）
```

---

## 9. 数据目录与权限

| 路径 | 说明 | 权限 |
| --- | --- | --- |
| `/srv/eatmap/data/` | JSON 数据 + uploads | 运行用户 **可读写** |
| `/srv/eatmap/data-backup/` | 备份快照 | 运行用户 **可读写** |
| `/srv/eatmap/.next/` | 构建产物 | 只读即可 |

```bash
sudo chown -R eatmap:eatmap /srv/eatmap/data /srv/eatmap/data-backup 2>/dev/null || true
sudo chmod -R u+rwX,go+rX /srv/eatmap/data
```

如需把数据放在代码目录外：

```dotenv
EATMAP_DATA_DIR=/var/lib/eatmap/data
EATMAP_BACKUP_DIR=/var/backups/eatmap
```

---

## 10. 备份与恢复

- 自动：启动时 + 每日 04:00（Asia/Shanghai）把整个数据目录覆盖到 `{EATMAP_BACKUP_DIR}/latest/`。
- 手动：后台「总览 → 立即备份」或 `POST /api/admin/user-data-backup`。
- 异地备份建议：

```bash
# 每天 05:00 同步到另一台机器/对象存储
0 5 * * * rsync -a /srv/eatmap/data-backup/latest/ /backup/eatmap/$(date +\%F)/
```

恢复：

```bash
sudo systemctl stop eatmap   # 或 npx pm2 stop eatmap
cp -a /backup/eatmap/2026-01-01/. /srv/eatmap/data/
sudo chown -R eatmap:eatmap /srv/eatmap/data
sudo systemctl start eatmap
```

> 恢复前先停进程，避免写入冲突。备份含用户与评价数据，注意访问权限与隐私合规。

---

## 11. 升级

```bash
cd /srv/eatmap
sudo -u eatmap git pull
sudo -u eatmap npm install
sudo -u eatmap npm run build
npx pm2 reload eatmap        # 或 sudo systemctl restart eatmap
```

`data/` 与 `data-backup/` 不在 Git 管理范围内，升级不会覆盖。建议升级前手动备份一次 `data/`。

---

## 12. 子路径部署完整步骤

1. `.env.production`：

   ```dotenv
   EATMAP_SECRET=...
   NEXT_PUBLIC_SITE_URL=https://www.example.com/eatmap
   EATMAP_BASE_PATH=/eatmap
   ```

2. 重新构建：`npm run build`。
3. Nginx 使用示例文件末尾的子路径配置（`proxy_pass` 末尾不加 `/`）。
4. 重启进程。
5. 验证：
   - `https://www.example.com/eatmap` 与 `.../eatmap/` 都能打开；
   - 浏览器 Network 中 CSS/JS 路径形如 `/eatmap/_next/static/...` 且 200；
   - 「添加到主屏幕」打开的地址带 `/eatmap`。

常见错误：

| 错法 | 后果 |
| --- | --- |
| `proxy_pass http://127.0.0.1:4000/;` | 前缀被剥掉，页面 404 |
| `location = /eatmap { return 301 /eatmap/; }` | 与 Next 去尾斜杠互相跳转 |
| 构建时没设 `EATMAP_BASE_PATH` | HTML 正常但 CSS/JS 404，只有字无样式 |
| 改了 env 没重新 build | 同上 |

---

## 13. 安全加固建议

- 强制 HTTPS；关闭 HTTP。
- 设置强 `EATMAP_SECRET`，定期轮换（轮换会使已登录用户失效）。
- 注册接口按需增加验证码 / 频率限制 / 邀请码（当前模板无内置防刷）。
- Nginx 层加 `limit_req` 限流，尤其是 `/api/auth/*`、`/api/upload`、`/api/reviews`。
- 限制 `data/`、`data-backup/` 的服务器文件权限；不要把 `data/` 暴露为静态目录。
- 按法规补充备案、隐私政策、用户须知、内容审核流程。
- 定期检查上传目录体积；必要时清理无人引用的旧图片。

---

## 14. 排障速查

| 现象 | 处理 |
| --- | --- |
| 进程启动即退出 | `pm2 logs` / `journalctl`：多为 `EATMAP_SECRET` 或 `NEXT_PUBLIC_SITE_URL` 校验失败 |
| 502 Bad Gateway | Node 未运行或端口不一致（`curl 127.0.0.1:4000`） |
| 有字无样式 | basePath 不一致 / 未重新 build / Nginx 拦截 `_next`；`npm run verify:static` |
| 上传 413 | Nginx `client_max_body_size` 太小 |
| 上传 500 | `sharp` 安装失败（重装依赖）或 `data/uploads` 不可写 |
| 保存无反应 | `data/` 不可写；看服务端日志 |
| 首页空白 | 还没有任何已上架店铺（正常），先用管理员/商户建店并审核 |
| 登录后又变游客 | `EATMAP_SECRET` 变更或 Cookie 被清除 |
| 备份失败 | `EATMAP_BACKUP_DIR` 不可写，或 `EATMAP_BACKUP_DISABLED=1` |

日志位置：PM2 `~/.pm2/logs/eatmap-*.log`；systemd `journalctl -u eatmap`。
