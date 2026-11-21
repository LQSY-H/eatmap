import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signSessionToken } from "@/lib/auth-jwt";
import { findUserByLogin, loadUserRecords, toPublicUser } from "@/lib/auth-users";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = (await req.json()) as { login?: string; password?: string };
  if (!body.login?.trim() || !body.password) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const user = findUserByLogin(body.login, users);
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const token = await signSessionToken({ sub: user.id, role: user.role });
  const jar = await cookies();
  jar.set("eatmap_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ user: toPublicUser(user) });
}
