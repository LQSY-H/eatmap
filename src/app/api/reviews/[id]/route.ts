import { NextResponse } from "next/server";
import { getShop } from "@/lib/data";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";
import type { Review } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function isStaff(role: string | undefined) {
  return role === "super_admin" || role === "admin";
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const reviews = await readJsonFile<Review[]>("reviews.json");
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const row = reviews[idx];

  if (body.action === "request_hide") {
    if (session.role !== "merchant") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const shop = await getShop(row.shopId);
    if (!shop || shop.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!row.visible) {
      return NextResponse.json({ error: "already_hidden" }, { status: 400 });
    }
    reviews[idx] = { ...row, hideRequestedAt: new Date().toISOString() };
    await writeJsonFile("reviews.json", reviews);
    return NextResponse.json(reviews[idx]);
  }

  if (body.action === "reject_hide_request") {
    if (!isStaff(session.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    reviews[idx] = { ...row, hideRequestedAt: undefined };
    await writeJsonFile("reviews.json", reviews);
    return NextResponse.json(reviews[idx]);
  }

  if (typeof body.visible === "boolean") {
    if (!isStaff(session.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const next: Review = {
      ...row,
      visible: body.visible,
      hideRequestedAt: undefined,
      ...(body.visible ? { reviewModeration: "approved" as const } : {}),
    };
    reviews[idx] = next;
    await writeJsonFile("reviews.json", reviews);
    return NextResponse.json(reviews[idx]);
  }

  return NextResponse.json({ error: "invalid_body" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const reviews = await readJsonFile<Review[]>("reviews.json");
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const row = reviews[idx];

  const staff = isStaff(session.role);
  const own = row.userId === session.userId && row.userId !== "guest";

  if (!staff && !own) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  reviews.splice(idx, 1);
  await writeJsonFile("reviews.json", reviews);
  return NextResponse.json({ ok: true });
}
