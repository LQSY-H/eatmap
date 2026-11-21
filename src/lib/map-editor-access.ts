import type { UserRole } from "@/lib/types";

/** 与后台「地图搭建」一致：仅超级管理员与管理员可改楼层 / 铺位形状 */
export function canEditMapEditor(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}
