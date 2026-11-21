import { NextResponse } from "next/server";
import {
  appendUser,
  findUserByNickname,
  findUserByPhone,
  loadUserRecords,
  toPublicUser,
} from "@/lib/auth-users";
import { newId } from "@/lib/io";
import { hashPassword } from "@/lib/password";
import type { UserRecord } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    phone?: string;
    nickname?: string;
    password?: string;
    confirm?: string;
  };
  const phone = body.phone?.replace(/\s+/g, "").trim();
  const nickname = body.nickname?.trim();
  const password = body.password;
  const confirm = body.confirm;
  if (!phone || !nickname || !password || confirm === undefined || confirm === "") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password_short" }, { status: 400 });
  }
  if (!/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const users = await loadUserRecords();
  if (findUserByPhone(phone, users)) {
    return NextResponse.json({ error: "phone_taken" }, { status: 409 });
  }
  if (findUserByNickname(nickname, users)) {
    return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
  }
  const record: UserRecord = {
    id: newId("m"),
    nickname,
    role: "merchant",
    email: null,
    phone,
    username: null,
    passwordHash: hashPassword(password),
  };
  await appendUser(record);
  return NextResponse.json({ user: toPublicUser(record) });
}
