import { loadUserRecords, saveUserRecords } from "@/lib/auth-users";
import {
  clampCellDim,
  DEFAULT_NEW_SHOP_CELL,
} from "@/lib/map-editor-prefs-shared";

export async function getUserNewShopCell(userId: string): Promise<{ w: number; h: number }> {
  const users = await loadUserRecords();
  const u = users.find((x) => x.id === userId);
  const cell = u?.mapEditorPrefs?.newShopCell;
  if (
    cell &&
    typeof cell.w === "number" &&
    typeof cell.h === "number" &&
    Number.isFinite(cell.w) &&
    Number.isFinite(cell.h)
  ) {
    return {
      w: clampCellDim(cell.w, DEFAULT_NEW_SHOP_CELL.w),
      h: clampCellDim(cell.h, DEFAULT_NEW_SHOP_CELL.h),
    };
  }
  return { ...DEFAULT_NEW_SHOP_CELL };
}

export async function setUserNewShopCell(
  userId: string,
  cell: { w: number; h: number },
): Promise<{ w: number; h: number }> {
  const w = clampCellDim(cell.w, DEFAULT_NEW_SHOP_CELL.w);
  const h = clampCellDim(cell.h, DEFAULT_NEW_SHOP_CELL.h);
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("user_not_found");
  const prev = users[idx]!;
  users[idx] = {
    ...prev,
    mapEditorPrefs: {
      ...prev.mapEditorPrefs,
      newShopCell: { w, h },
    },
  };
  await saveUserRecords(users);
  return { w, h };
}
