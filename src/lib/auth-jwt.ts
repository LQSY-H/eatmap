import { SignJWT, jwtVerify } from "jose";
import { getEatmapSecretBytes } from "@/lib/eatmap-env";
import type { UserRole } from "@/lib/types";

/** JWT 自定义字段 imp：真实登录的超管 id（存在时表示当前身份为「预览」） */
export type SessionPayload = {
  sub: string;
  role: UserRole;
  impersonatorSub?: string;
};

export async function signSessionToken(payload: SessionPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  return new SignJWT({
    role: payload.role,
    ...(payload.impersonatorSub ? { imp: payload.impersonatorSub } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getEatmapSecretBytes());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEatmapSecretBytes());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = payload.role as UserRole | undefined;
    if (!sub || !role) return null;
    const rawImp = payload.imp;
    const impersonatorSub = typeof rawImp === "string" ? rawImp : undefined;
    return { sub, role, impersonatorSub };
  } catch {
    return null;
  }
}
