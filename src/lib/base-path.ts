import { normalizeEatmapBasePath } from "@/lib/base-path-config";

export { normalizeEatmapBasePath };

/** 由 next.config 注入，与 `basePath` 一致；未配置子路径时为 `""`。 */
export function getEatmapBasePath(): string {
  return process.env.NEXT_PUBLIC_EATMAP_BASE_PATH ?? "";
}

/** 为 fetch / window 拼接应用根下的绝对路径（如 `/api/...`）。 */
export function eatmapUrl(path: string): string {
  const bp = getEatmapBasePath();
  const p = path.startsWith("/") ? path : `/${path}`;
  return bp ? `${bp}${p}` : p;
}

/**
 * 数据里存的站内路径（如 `/api/files/...`）在浏览器中需带 basePath。
 * 已是 `http(s)://` 的地址原样返回。
 */
export function resolveEatmapMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return eatmapUrl(u.startsWith("/") ? u : `/${u}`);
}
