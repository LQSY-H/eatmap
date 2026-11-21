import { MERCHANT_HIDDEN_SHOP_TAGS } from "@/lib/shop-tags";
import type { Dish, Shop } from "@/lib/types";

/** 从磁盘读出单条菜品：补齐 tags；旧数据无 tags 时从店铺标签继承（不含运营向标签）。 */
export function normalizeDishRecord(d: Dish, legacyShopTags: string[]): Dish {
  const raw = d as Dish & { tags?: unknown };
  if (Array.isArray(raw.tags)) {
    const cleaned = raw.tags
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim());
    return { ...d, tags: [...new Set(cleaned)] };
  }
  const fromShop = legacyShopTags.filter((t) => !MERCHANT_HIDDEN_SHOP_TAGS.has(t));
  return { ...d, tags: [...fromShop] };
}

/** 对外展示：合并各菜品标签（不含运营向标签），已排序。 */
export function aggregatedPublicDishTags(shop: Shop): string[] {
  const s = new Set<string>();
  for (const d of shop.dishes ?? []) {
    for (const t of d.tags ?? []) {
      if (!MERCHANT_HIDDEN_SHOP_TAGS.has(t)) s.add(t);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function shopHasDishWithCategory(shop: Shop, category: string | null): boolean {
  if (!category) return true;
  return (shop.dishes ?? []).some((d) => (d.tags ?? []).includes(category));
}

/** 瀑布流 / 随机页分类候选：来自所有菜品标签，排除运营向与「今日推荐」。 */
export function collectCategoryOptionsFromShops(shops: Shop[]): string[] {
  const s = new Set<string>();
  for (const shop of shops) {
    for (const d of shop.dishes ?? []) {
      for (const t of d.tags ?? []) {
        if (t === "今日推荐" || MERCHANT_HIDDEN_SHOP_TAGS.has(t)) continue;
        s.add(t);
      }
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function sanitizeDishesIncoming(raw: unknown): Dish[] {
  if (!Array.isArray(raw)) return [];
  const out: Dish[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const d = row as Dish;
    const name = typeof d.name === "string" ? d.name.trim() : "";
    if (!name) continue;
    const n = d.price != null ? Number(d.price) : NaN;
    const price = Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
    const image = typeof d.image === "string" && d.image.trim() ? d.image.trim() : undefined;
    const tags = Array.isArray(d.tags)
      ? [
          ...new Set(
            d.tags
              .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
              .map((t) => t.trim()),
          ),
        ]
      : [];
    out.push({ name, price, image, tags });
  }
  return out;
}
