import type { Session } from "@/lib/session";
import type { Shop } from "@/lib/types";

export function canEditShop(session: Session | null, shop: Shop): boolean {
  if (!session) return false;
  if (session.role === "super_admin" || session.role === "admin") return true;
  if (session.role === "merchant" && shop.ownerUserId === session.userId) return true;
  return false;
}

export function canManageShopMedia(session: Session | null, shop: Shop): boolean {
  return canEditShop(session, shop);
}
