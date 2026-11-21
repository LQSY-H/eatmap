/** 商家参考人均：须为正数，允许小数，入库保留两位小数 */
export function normalizeMerchantAvgPrice(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(String(raw).trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** 评价里填写的人均：正数、小数，两位小数 */
export function normalizeReviewPerPersonSpend(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "string" ? Number(String(raw).trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100) / 100;
}
