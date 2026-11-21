import { NextResponse } from "next/server";
import {
  appendUser,
  findUserByEmail,
  findUserByNickname,
  loadUserRecords,
  toPublicUser,
} from "@/lib/auth-users";
import { newId } from "@/lib/io";
import { hashPassword } from "@/lib/password";
import type { UserRecord } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    email?: string;
    nickname?: string;
    password?: string;
    confirm?: string;
  };
  const email = body.email?.trim().toLowerCase();
  const nickname = body.nickname?.trim();
  const password = body.password;
  if (!email || !nickname || !password || password !== body.confirm) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password_short" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const users = await loadUserRecords();
  if (findUserByEmail(email, users)) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  if (findUserByNickname(nickname, users)) {
    return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
  }
  const record: UserRecord = {
    id: newId("u"),
    nickname,
    role: "user",
    email,
    phone: null,
    username: null,
    passwordHash: hashPassword(password),
  };
  await appendUser(record);
  return NextResponse.json({ user: toPublicUser(record) });
}
