/** 商户提交的瀑布流广告展示图 URL 校验（相对上传路径或 http(s)） */
export function isAllowedPromoImageUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 512) return false;
  if (s.startsWith("/api/files/uploads/") && !s.includes("..")) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
