import { NextResponse } from "next/server";
import { loadUserRecords, saveUserRecords } from "@/lib/auth-users";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/** 超级管理员重置他人密码 */
export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { password?: string };
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  users[idx] = { ...users[idx], passwordHash: hashPassword(body.password) };
  await saveUserRecords(users);
  return NextResponse.json({ ok: true });
}

/** 本人修改密码 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (session.userId !== id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { oldPassword?: string; newPassword?: string };
  if (!body.oldPassword || !body.newPassword || body.newPassword.length < 6) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!verifyPassword(body.oldPassword, users[idx].passwordHash)) {
    return NextResponse.json({ error: "bad_old" }, { status: 400 });
  }
  users[idx] = { ...users[idx], passwordHash: hashPassword(body.newPassword) };
  await saveUserRecords(users);
  return NextResponse.json({ ok: true });
}
