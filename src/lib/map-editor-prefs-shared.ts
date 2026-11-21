/** 客户端 / 服务端共用的地图编辑器偏好常量与校验（勿在此文件 import Node 专用模块） */

export const NEW_SHOP_CELL_STORAGE_KEY = "eatmap:map-editor:new-shop-cell";

export const DEFAULT_NEW_SHOP_CELL = { w: 140, h: 100 };

export function clampCellDim(n: number, fallback: number): number {
  const v = Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(2000, Math.max(24, v));
}

export function readNewShopCellFromLocalStorage(): { w: number; h: number } {
  if (typeof window === "undefined") return DEFAULT_NEW_SHOP_CELL;
  try {
    const raw = localStorage.getItem(NEW_SHOP_CELL_STORAGE_KEY);
    if (!raw) return DEFAULT_NEW_SHOP_CELL;
    const j = JSON.parse(raw) as { w?: unknown; h?: unknown };
    return {
      w: clampCellDim(Number(j.w), DEFAULT_NEW_SHOP_CELL.w),
      h: clampCellDim(Number(j.h), DEFAULT_NEW_SHOP_CELL.h),
    };
  } catch {
    return DEFAULT_NEW_SHOP_CELL;
  }
}

export function writeNewShopCellToLocalStorage(cell: { w: number; h: number }): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NEW_SHOP_CELL_STORAGE_KEY, JSON.stringify(cell));
  } catch {
    /* ignore */
  }
}
