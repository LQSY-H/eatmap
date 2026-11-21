/**
 * PM2 生产常驻进程配置。
 *
 * 首次部署：
 *   cp .env.example .env.production   # 至少填写 EATMAP_SECRET 与 NEXT_PUBLIC_SITE_URL
 *   npm ci && npm run build
 *   npx pm2 start ecosystem.config.cjs
 *   npx pm2 save && npx pm2 startup   # 按提示执行开机自启命令
 *
 * 说明：
 * - 密钥与站点 URL 放在 `.env.production`（不要提交到 Git）；存在时 PM2 会一并注入进程环境。
 * - 端口固定为 4000；如需更换，同时改本文件 args/env 与 Nginx 反代端口。
 * - 数据目录默认 `./data`；可用 EATMAP_DATA_DIR 指定绝对路径。
 * - 用户数据备份默认写入 `./data-backup/latest`；可用 EATMAP_BACKUP_DIR 覆盖，需保证运行用户可写。
 * - Nginx 参考 deploy/nginx.conf.example。
 */
const fs = require("fs");
const path = require("path");

const envProduction = path.join(__dirname, ".env.production");

/** 优先使用当前执行 PM2 的 Node；再回退到常见系统路径，避免升级 Node 后解释器失效 */
function pickNodeInterpreter() {
  const candidates = [process.execPath, "/usr/local/bin/node", "/usr/bin/node"];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return "node";
}

const nodeInterpreter = pickNodeInterpreter();

module.exports = {
  apps: [
    {
      name: "eatmap",
      cwd: __dirname,
      interpreter: nodeInterpreter,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: "4000",
      },
      ...(fs.existsSync(envProduction) ? { env_file: ".env.production" } : {}),
    },
  ],
};
