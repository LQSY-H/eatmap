import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserShopMarks,
  mergeUserShopMarksFromDevice,
  patchUserShopMark,
} from "@/lib/user-shop-marks";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const marks = await getUserShopMarks(session.userId);
  return NextResponse.json(marks);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const o = body as { shopId?: unknown; kind?: unknown; add?: unknown };
  const shopId = typeof o.shopId === "string" ? o.shopId.trim() : "";
  const kind = o.kind === "favorite" || o.kind === "want" ? o.kind : null;
  const add = o.add === true;
  if (!shopId || !kind) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const result = await patchUserShopMark(session.userId, kind, shopId, add);
  if (result === "shop_not_found") {
    return NextResponse.json({ error: "shop_not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

/** 将本机旧版 localStorage 清单合并进云端（幂等安全：可多调，会去重） */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const o = body as { favoriteShopIds?: unknown; wantShopIds?: unknown };
  const next = await mergeUserShopMarksFromDevice(session.userId, o.favoriteShopIds, o.wantShopIds);
  return NextResponse.json(next);
}
