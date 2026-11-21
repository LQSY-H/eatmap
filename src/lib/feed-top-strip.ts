import type { Ad, Shop } from "@/lib/types";
import { todayYMDShanghai } from "@/lib/date-utils";
import { isFeaturedAdActiveOnDate } from "@/lib/home-featured";

export type FeedTopEntry = {
  key: string;
  shop: Shop;
  /** 商户广告语或店铺名（标签推荐且无广告时） */
  caption: string;
  /** 广告自定义顶图；缺省用店铺封面 */
  imageUrl?: string;
};

/** 商户填写广告语上限（字） */
export const FEATURED_AD_TITLE_MAX_CHARS = 14;

/** 首页推荐横条：店名·广告语整体不超过该长度时展示合并文案 */
export const FEATURED_FEED_CAPTION_COMBINED_MAX_CHARS = 14;

const CAPTION_SEP = "·";

/** 已通过广告在瀑布流横条上的文案：总长≤14 时用「店名·广告语」，否则仅广告语（已为 14 字内） */
export function formatFeaturedFeedCaption(shopName: string, adTitle: string): string {
  const title = adTitle.trim().slice(0, FEATURED_AD_TITLE_MAX_CHARS);
  const name = shopName.trim();
  const combined = `${name}${CAPTION_SEP}${title}`;
  if (combined.length <= FEATURED_FEED_CAPTION_COMBINED_MAX_CHARS) return combined;
  return title;
}

/** 瀑布流顶部横条：全部已通过的广告（横幅/置顶/期内今日推荐）+ 未被广告覆盖的「今日推荐」标签店 */
export function buildFeedTopStrip(
  shops: Shop[],
  ads: Ad[],
  ymd = todayYMDShanghai(),
): FeedTopEntry[] {
  const shopById = new Map(shops.map((s) => [s.id, s]));
  const fromAds: FeedTopEntry[] = [];

  for (const a of ads) {
    if (a.status !== "approved") continue;
    if (a.slot === "home_featured") {
      if (!isFeaturedAdActiveOnDate(a, ymd)) continue;
    }
    const shop = shopById.get(a.shopId);
    if (!shop) continue;
    const pi = a.promoImage?.trim();
    fromAds.push({
      key: `ad:${a.id}`,
      shop,
      caption: formatFeaturedFeedCaption(shop.name, a.title),
      ...(pi ? { imageUrl: pi } : {}),
    });
  }

  const shopsWithAd = new Set(fromAds.map((e) => e.shop.id));
  const fromTags: FeedTopEntry[] = [];
  for (const s of shops) {
    if (!s.tags.includes("今日推荐")) continue;
    if (shopsWithAd.has(s.id)) continue;
    fromTags.push({ key: `tag:${s.id}`, shop: s, caption: s.name });
  }

  return [...fromAds, ...fromTags];
}

/** 未开放首页推荐时：横条条目来自全部店铺的菜品（随机滚动）；无菜品的店退化为店铺封面条目 */
export function buildFeedTopStripFromAllDishes(shops: Shop[]): FeedTopEntry[] {
  const out: FeedTopEntry[] = [];
  for (const s of shops) {
    const dishes = s.dishes ?? [];
    if (dishes.length === 0) {
      const ci = s.coverImage?.trim();
      out.push({
        key: `shop:${s.id}`,
        shop: s,
        caption: s.name,
        ...(ci ? { imageUrl: ci } : {}),
      });
      continue;
    }
    dishes.forEach((d, idx) => {
      const dishName = d.name.trim();
      if (!dishName) return;
      const di = d.image?.trim();
      const ci = s.coverImage?.trim();
      const imageUrl = di || ci;
      out.push({
        key: `dish:${s.id}:${idx}`,
        shop: s,
        caption: formatFeaturedFeedCaption(s.name, dishName),
        ...(imageUrl ? { imageUrl } : {}),
      });
    });
  }
  return out;
}

export function shuffleFeedTop<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
