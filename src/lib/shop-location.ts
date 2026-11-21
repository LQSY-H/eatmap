import type { Floor, Shop } from "@/lib/types";

/** 对外展示位置：「食堂名·楼层名」；无楼层或未匹配时仅食堂名 */
export function shopBuildingFloorLabel(shop: Shop, floors: Floor[]): string {
  const fid = shop.floorId?.trim();
  if (!fid) return shop.buildingName;
  const floor = floors.find((f) => f.id === fid && f.buildingId === shop.buildingId);
  const floorName = floor?.name?.trim();
  if (!floorName) return shop.buildingName;
  return `${shop.buildingName}·${floorName}`;
}
