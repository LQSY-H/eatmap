import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadUserRecords, toPublicUser } from "@/lib/auth-users";
import { signSessionToken } from "@/lib/auth-jwt";
import { getSession } from "@/lib/session";

/** 结束预览，恢复为真实账号（写入 JWT 的真实主体） */
export async function POST() {
  const session = await getSession();
  if (!session?.impersonatorId) {
    return NextResponse.json({ error: "not_impersonating" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const real = users.find((u) => u.id === session.impersonatorId);
  if (!real) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const token = await signSessionToken({
    sub: real.id,
    role: real.role,
  });
  const jar = await cookies();
  jar.set("eatmap_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    user: toPublicUser(real),
    impersonator: null,
  });
}
