import { normalizeDishRecord } from "@/lib/shop-dish-tags";
import { normalizeShopListingStatus } from "@/lib/shop-listing";
import type { Shop, ShopGalleryItem, ShopGalleryStatus } from "@/lib/types";

export type ShopGallerySlot = "menu" | "scene";

export function normalizeGalleryRaw(raw: unknown): ShopGalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopGalleryItem[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ url: item.trim(), status: "approved" });
      continue;
    }
    if (item && typeof item === "object" && "url" in item && typeof (item as { url: unknown }).url === "string") {
      const url = (item as { url: string }).url.trim();
      if (!url) continue;
      const st = (item as { status?: unknown }).status;
      const status: ShopGalleryStatus =
        st === "pending" || st === "rejected" || st === "approved" ? st : "approved";
      const raw = item as {
        submittedByUserId?: unknown;
        submittedByNickname?: unknown;
      };
      const submittedByUserId =
        typeof raw.submittedByUserId === "string" ? raw.submittedByUserId : undefined;
      const submittedByNickname =
        typeof raw.submittedByNickname === "string" ? raw.submittedByNickname : undefined;
      out.push({
        url,
        status,
        ...(submittedByUserId != null ? { submittedByUserId } : {}),
        ...(submittedByNickname != null ? { submittedByNickname } : {}),
      });
    }
  }
  return out;
}

export function normalizeShop(shop: Shop): Shop {
  const legacyTags = shop.tags ?? [];
  const dishes = (shop.dishes ?? []).map((d) => normalizeDishRecord(d, legacyTags));
  return {
    ...shop,
    dishes,
    menuImages: normalizeGalleryRaw(shop.menuImages),
    sceneImages: normalizeGalleryRaw(shop.sceneImages),
    listingStatus: normalizeShopListingStatus(shop.listingStatus),
    publicDisplay: shop.publicDisplay === false ? false : true,
  };
}

/** 店铺详情、瀑布流等对访客可见的数据：菜单/实景默认展示，仅「已拒绝」对外隐藏；未勾选展示联系方式时不外露电话等 */
export function publicShopView(shop: Shop): Shop {
  const n = normalizeShop(shop);
  const base: Shop = {
    ...n,
    menuImages: n.menuImages.filter((i) => i.status === "approved"),
    sceneImages: n.sceneImages.filter((i) => i.status === "approved"),
  };
  if (!base.showContact) {
    return {
      ...base,
      contactPhone: undefined,
      contactNote: undefined,
      showContact: false,
    };
  }
  return base;
}

export function approvedGalleryUrls(items: ShopGalleryItem[]): string[] {
  return items.filter((i) => i.status === "approved").map((i) => i.url);
}
