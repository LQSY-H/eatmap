/** 规范化子路径 base（无前导多余斜杠、无末尾斜杠）；空字符串表示部署在站点根路径。 */
export function normalizeEatmapBasePath(raw: string | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t || t === "/") return "";
  const withSlash = t.startsWith("/") ? t : `/${t}`;
  return withSlash.replace(/\/+$/, "") || "";
}
