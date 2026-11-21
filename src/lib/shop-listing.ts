import type { Shop } from "@/lib/types";

/** 新店对外展示：商户创建默认 pending，管理员审核通过后为 approved；缺省视为已通过（兼容旧数据） */
export type ShopListingStatus = "pending" | "approved";

export function normalizeShopListingStatus(v: unknown): ShopListingStatus {
  return v === "pending" ? "pending" : "approved";
}

export function isShopPublicDisplayEnabled(shop: Shop): boolean {
  return shop.publicDisplay !== false;
}

/** 访客可见：已通过新店审核且未在「店铺展示」中关闭对外展示 */
export function isShopPubliclyListed(shop: Shop): boolean {
  return (
    normalizeShopListingStatus(shop.listingStatus) === "approved" && isShopPublicDisplayEnabled(shop)
  );
}

export function shopListingStatusLabel(status: ShopListingStatus | undefined): string {
  return status === "pending" ? "待新店审核" : "已通过审核";
}

export function shopPublicVisibilityLabel(shop: Shop): string {
  if (normalizeShopListingStatus(shop.listingStatus) === "pending") return "待新店审核";
  if (!isShopPublicDisplayEnabled(shop)) return "已隐藏";
  return "对外展示";
}
