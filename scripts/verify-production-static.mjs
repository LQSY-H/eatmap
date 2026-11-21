#!/usr/bin/env node
/**
 * 部署后自检：确认存在 CSS 产物，并给出应在服务器本机返回 200 的 curl（排除 curl 对 ~ 的 glob 误判）。
 * 用法：在仓库根目录执行 npm run verify:static
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const buildIdPath = path.join(nextDir, "BUILD_ID");
if (!fs.existsSync(buildIdPath)) {
  fail("[eatmap] 未找到 .next/BUILD_ID，请先在本目录执行 npm run build");
}
const buildId = fs.readFileSync(buildIdPath, "utf8").trim();

let basePath = "";
try {
  const req = JSON.parse(fs.readFileSync(path.join(nextDir, "required-server-files.json"), "utf8"));
  basePath = req?.config?.basePath ?? "";
  if (typeof basePath !== "string") basePath = "";
} catch {
  /* ignore */
}

const chunksDir = path.join(nextDir, "static", "chunks");
if (!fs.existsSync(chunksDir)) {
  fail("[eatmap] 未找到 .next/static/chunks，构建可能不完整");
}

const cssFiles = fs.readdirSync(chunksDir).filter((f) => f.endsWith(".css"));
if (cssFiles.length === 0) {
  fail("[eatmap] chunks 内没有 .css，Tailwind/全局样式可能未打进产物");
}

const css = cssFiles[0];
const prefix = basePath ? `${basePath.replace(/\/$/, "")}` : "";
const urlPath = `${prefix}/_next/static/chunks/${css}`;
const tildeJs = fs.readdirSync(chunksDir).find((f) => f.includes("~") && f.endsWith(".js"));

console.log("[eatmap] BUILD_ID:", buildId);
console.log("[eatmap] basePath:", JSON.stringify(basePath || "(根路径)"));
console.log("[eatmap] 示例 CSS 文件:", css);
console.log(
  "[eatmap] 部署时请一次同步整块 .next（至少 BUILD_ID、static/、server/），勿只换 HTML；页面与 chunks 若来自两次构建，会出现「URL 已是 /eatmap/_next/… 但仍 404」。",
);
console.log("");
console.log("在运行 next start / PM2 的机器上执行（注意 curl 要加 --globoff，文件名里常有 ~）：");
console.log(`  curl -sSI --globoff "http://127.0.0.1:4000${urlPath}" | head -5`);
if (tildeJs) {
  const tildePath = `${prefix}/_next/static/chunks/${tildeJs}`;
  console.log("再测一条带 ~ 的 JS（排除 CDN/WAF 对 ~ 的误判）：");
  console.log(`  curl -sSI --globoff "http://127.0.0.1:4000${tildePath}" | head -5`);
}
console.log("");
console.log("期望看到 HTTP/1.1 200 且 Content-Type 含 text/css。");
console.log("若本机 127.0.0.1 已是 404：磁盘上缺文件、PM2 cwd 不是仓库根目录、或端口不是 4000。");
console.log("若本机 200 但域名 404：Nginx 未把该 URI 交给 Node，或 CDN/WAF 拦截（含路径里的 ~），或对静态扩展名另有 location。");
console.log("若本机 200 域名也 200 仍无样式：强刷/清 CDN 缓存，避免旧 HTML 引用已删除的 chunk 名。");
