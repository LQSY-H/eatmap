import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getUserNewShopCell, setUserNewShopCell } from "@/lib/user-map-editor-prefs";
import {
  clampCellDim,
  DEFAULT_NEW_SHOP_CELL,
} from "@/lib/map-editor-prefs-shared";

export async function GET() {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const newShopCell = await getUserNewShopCell(session.userId);
    return NextResponse.json({ newShopCell });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const o = body as { newShopCell?: { w?: unknown; h?: unknown } };
  const raw = o.newShopCell;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const w = clampCellDim(Number(raw.w), DEFAULT_NEW_SHOP_CELL.w);
  const h = clampCellDim(Number(raw.h), DEFAULT_NEW_SHOP_CELL.h);
  try {
    const newShopCell = await setUserNewShopCell(session.userId, { w, h });
    return NextResponse.json({ newShopCell });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
