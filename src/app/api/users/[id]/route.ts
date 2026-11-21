import { NextResponse } from "next/server";
import {
  loadUserRecords,
  saveUserRecords,
  toPublicUser,
} from "@/lib/auth-users";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";
import type { Shop, UserRole } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { role?: UserRole };
  const role = body.role;
  if (!role || role === "super_admin") {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  const allowed: UserRole[] = ["admin", "user", "merchant"];
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (users[idx].role === "super_admin") {
    return NextResponse.json({ error: "immutable" }, { status: 400 });
  }
  users[idx] = { ...users[idx], role };
  await saveUserRecords(users);
  return NextResponse.json({ user: toPublicUser(users[idx]) });
}

/** 超级管理员删除账号（不可删自己与其它超管）；店铺绑定会解除 ownerUserId */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }
  const users = await loadUserRecords();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (users[idx].role === "super_admin") {
    return NextResponse.json({ error: "immutable" }, { status: 400 });
  }
  users.splice(idx, 1);
  await saveUserRecords(users);

  const shops = await readJsonFile<Shop[]>("shops.json");
  let shopsChanged = false;
  for (const s of shops) {
    if (s.ownerUserId === id) {
      s.ownerUserId = null;
      shopsChanged = true;
    }
  }
  if (shopsChanged) {
    await writeJsonFile("shops.json", shops);
  }

  return NextResponse.json({ ok: true });
}
