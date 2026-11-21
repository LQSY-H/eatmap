import path from "path";
import { createRequire } from "module";
import type { NextConfig } from "next";
import { normalizeEatmapBasePath } from "./src/lib/base-path-config";

const require = createRequire(import.meta.url);
/** 含 package.json 的应用根，避免 Turbopack 误把 `src/app` 当成项目根 */
const turbopackRoot = path.dirname(require.resolve("./package.json"));

/**
 * 若只写了 NEXT_PUBLIC_SITE_URL=https://域名/eatmap 却漏设 EATMAP_BASE_PATH，构建产物会把 CSS/JS 写在 /_next/，
 * 外网只代理 /eatmap 时会「只有字图、无样式」。从站点 URL 的路径自动推断 basePath。
 */
function inferEatmapBasePathFromSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "";
  try {
    const pathPart = new URL(raw).pathname.replace(/\/+$/, "") || "";
    if (!pathPart || pathPart === "/") return "";
    return normalizeEatmapBasePath(pathPart);
  } catch {
    return "";
  }
}

const eatmapBasePathExplicit = normalizeEatmapBasePath(process.env.EATMAP_BASE_PATH);
const eatmapBasePathInferred = inferEatmapBasePathFromSiteUrl();
const eatmapBasePath = eatmapBasePathExplicit || eatmapBasePathInferred;

if (
  eatmapBasePathExplicit &&
  eatmapBasePathInferred &&
  eatmapBasePathExplicit !== eatmapBasePathInferred
) {
  console.warn(
    `[eatmap] EATMAP_BASE_PATH="${eatmapBasePathExplicit}" 与 NEXT_PUBLIC_SITE_URL 中的路径 "${eatmapBasePathInferred}" 不一致，已采用 EATMAP_BASE_PATH。`,
  );
}

/** Nginx：勿将 `/eatmap` 再 301 到 `/eatmap/`（会与 Next 默认去掉首页尾斜杠冲突成死循环）。 */
const nextConfig: NextConfig = {
  ...(eatmapBasePath ? { basePath: eatmapBasePath } : {}),
  env: {
    NEXT_PUBLIC_EATMAP_BASE_PATH: eatmapBasePath,
  },
  /** 关闭开发模式左下角 Next 路由指示器（「N」） */
  devIndicators: false,
  /** 使用原生 sharp 二进制，避免被打进 bundle 引发重复加载与更高的 dev 内存占用 */
  serverExternalPackages: ["sharp", "node-cron"],
  /**
   * 开发模式下用手机通过局域网 IP 访问时，浏览器请求 /_next 会带 Origin: http://192.168.x.x
   * 若不在白名单，Next 会 403，导致地图/账户等客户端脚本无法加载。
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: [
    "*.local",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
  ],
  /** 显式指定 Turbopack 根，避免上层目录存在其他 package.json 时误判 */
  turbopack: {
    root: turbopackRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
};

export default nextConfig;
