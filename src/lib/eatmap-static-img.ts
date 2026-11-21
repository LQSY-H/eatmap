import { eatmapUrl } from "@/lib/base-path";

/**
 * 站点图标等静态图（位于 `public/img/eatmap/`）。
 * 返回值已带 basePath；metadata 中会由 metadataBase 解析为绝对 URL。
 * 若需要强制固定 CDN/站点域名，可在外层拼接你自己的域名。
 */
export function eatmapStaticImg(filename: string): string {
  const name = filename.replace(/^\/+/, "");
  return eatmapUrl(`/img/eatmap/${name}`);
}
