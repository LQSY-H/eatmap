import { NextResponse } from "next/server";
import {
  findUserByNickname,
  loadUserRecords,
  saveUserRecords,
  toPublicUser,
} from "@/lib/auth-users";
import { getSession } from "@/lib/session";

const NICKNAME_MAX = 32;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, impersonator: null });
  }
  const users = await loadUserRecords();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    return NextResponse.json({ user: null, impersonator: null });
  }
  let impersonator = null;
  if (session.impersonatorId) {
    const row = users.find((u) => u.id === session.impersonatorId);
    if (row) impersonator = toPublicUser(row);
  }
  return NextResponse.json({ user: toPublicUser(user), impersonator });
}

/** 当前登录用户更新昵称（不可与其它账号重复） */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { nickname?: string };
  const nickname =
    typeof body.nickname === "string" ? body.nickname.trim().replace(/\s+/g, " ") : "";
  if (!nickname) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (nickname.length > NICKNAME_MAX) {
    return NextResponse.json({ error: "nickname_too_long" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const current = users[idx]!.nickname.trim();
  if (nickname === current) {
    return NextResponse.json({ user: toPublicUser(users[idx]!) });
  }
  if (findUserByNickname(nickname, users, session.userId)) {
    return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
  }
  users[idx] = { ...users[idx]!, nickname };
  await saveUserRecords(users);
  return NextResponse.json({ user: toPublicUser(users[idx]!) });
}
