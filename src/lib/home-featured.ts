import type { Ad } from "@/lib/types";

export function isFeaturedAdActiveOnDate(ad: Ad, ymd: string): boolean {
  if (ad.slot !== "home_featured" || ad.status !== "approved") return false;
  if (!ad.startDate || !ad.endDate) return false;
  return ad.startDate <= ymd && ymd <= ad.endDate;
}
