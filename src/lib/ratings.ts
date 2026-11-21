import type { Review, Shop } from "@/lib/types";

export type ShopRating = { avg: number; count: number };

/** 仅统计 visible 评价 */
export function ratingsFromReviews(reviews: Review[]): Record<string, ShopRating> {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    if (!r.visible) continue;
    const cur = acc.get(r.shopId) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    acc.set(r.shopId, cur);
  }
  const out: Record<string, ShopRating> = {};
  acc.forEach((v, shopId) => {
    out[shopId] = {
      avg: Math.round((v.sum / v.count) * 10) / 10,
      count: v.count,
    };
  });
  return out;
}

/**
 * 店铺人均展示：
 * - 商家填写 avgPrice&gt;0：未满 3 条带价评价时显示「参考均价」（整数四舍五入）
 * - 可见评价中 ≥3 条填写了人均：将商家参考价（若&gt;0）与这些评价人均合并算平均，显示「均价」（整数四舍五入）
 */
export type ShopPriceDisplay =
  | { kind: "combined"; rounded: number; pricedReviewCount: number }
  | { kind: "reference"; rounded: number };

export function shopPriceDisplay(shop: Shop, reviews: Review[]): ShopPriceDisplay | null {
  const visible = reviews.filter((r) => r.visible && r.shopId === shop.id);
  const priced = visible.filter(
    (r) => r.perPersonSpend != null && Number(r.perPersonSpend) > 0,
  );
  const m = Number(shop.avgPrice);
  const merchantOk = Number.isFinite(m) && m > 0;

  if (priced.length >= 3) {
    const parts: number[] = [];
    if (merchantOk) parts.push(m);
    for (const r of priced) parts.push(Number(r.perPersonSpend));
    const sum = parts.reduce((a, b) => a + b, 0);
    const rounded = Math.round(sum / parts.length);
    return { kind: "combined", rounded, pricedReviewCount: priced.length };
  }
  if (merchantOk) {
    return { kind: "reference", rounded: Math.round(m) };
  }
  return null;
}

export function shopPriceDisplays(
  shops: Shop[],
  reviews: Review[],
): Record<string, ShopPriceDisplay | null> {
  const out: Record<string, ShopPriceDisplay | null> = {};
  for (const s of shops) {
    out[s.id] = shopPriceDisplay(s, reviews);
  }
  return out;
}
