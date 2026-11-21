import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadUserRecords, toPublicUser } from "@/lib/auth-users";
import { signSessionToken } from "@/lib/auth-jwt";
import { getSession } from "@/lib/session";

/** 仅超级管理员在未预览时可切换到其他账号，便于查看后台样式 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin" || session.impersonatorId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { userId?: string };
  const targetId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!targetId || targetId === session.userId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const target = users.find((u) => u.id === targetId);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (target.role === "super_admin") {
    return NextResponse.json({ error: "cannot_impersonate_super" }, { status: 400 });
  }

  const token = await signSessionToken({
    sub: target.id,
    role: target.role,
    impersonatorSub: session.userId,
  });
  const jar = await cookies();
  jar.set("eatmap_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const impersonator = users.find((u) => u.id === session.userId);
  return NextResponse.json({
    user: toPublicUser(target),
    impersonator: impersonator ? toPublicUser(impersonator) : null,
  });
}
