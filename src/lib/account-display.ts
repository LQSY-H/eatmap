import type { PublicUser } from "@/lib/types";

/** 账户头部第二行：优先邮箱，否则手机 */
export function accountContactLine(user: PublicUser | null | undefined): string {
  if (!user) return "";
  const e = user.email?.trim();
  const p = user.phone?.trim();
  if (e) return `邮箱 ${e}`;
  if (p) return `手机 ${p}`;
  return "暂未绑定邮箱或手机";
}
