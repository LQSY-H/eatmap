import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth-jwt";
import type { UserRole } from "@/lib/types";

export type Session = {
  userId: string;
  role: UserRole;
  /** 发起身份预览的真实账号 id（一般为超管） */
  impersonatorId?: string;
};

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get("eatmap_session")?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return {
    userId: payload.sub,
    role: payload.role,
    ...(payload.impersonatorSub ? { impersonatorId: payload.impersonatorSub } : {}),
  };
}
