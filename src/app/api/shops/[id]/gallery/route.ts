import { NextResponse } from "next/server";
import { loadUserRecords } from "@/lib/auth-users";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import { canEditShop } from "@/lib/shop-access";
import { normalizeShop } from "@/lib/shop-gallery";
import type { Shop, ShopGalleryStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** 追加一张图：先发后审即 approved；先审后发为 pending。超管/管理员上传始终直接通过。 */
export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const shops = await readJsonFile<Shop[]>("shops.json");
  const idx = shops.findIndex((s) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const rowRaw = shops[idx];
  if (!canEditShop(session, rowRaw)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const row = normalizeShop(rowRaw);

  const body = (await req.json()) as { kind?: string; url?: string };
  const kind = body.kind === "scene" ? "scene" : body.kind === "menu" ? "menu" : null;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!kind || !url) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const site = await getSiteSettings();
  const isStaff = session.role === "super_admin" || session.role === "admin";
  const status: ShopGalleryStatus =
    isStaff || site.galleryModerationMode === "post" ? "approved" : "pending";

  const userRows = await loadUserRecords();
  const submitter = userRows.find((x) => x.id === session.userId);
  const submittedByNickname = submitter?.nickname ?? "用户";

  const next = { ...row };
  const key = kind === "menu" ? "menuImages" : "sceneImages";
  const list = [...next[key]];
  list.push({
    url,
    status,
    submittedByUserId: session.userId,
    submittedByNickname,
  });
  next[key] = list;

  shops[idx] = next;
  await writeJsonFile("shops.json", shops);
  return NextResponse.json({
    shop: next,
    submittedGalleryStatus: status,
    galleryModerationMode: site.galleryModerationMode,
    submittedUrl: url,
  });
}

/** 管理员修改单张图的审核状态 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as {
    kind?: string;
    url?: string;
    status?: ShopGalleryStatus;
  };
  const kind = body.kind === "scene" ? "scene" : body.kind === "menu" ? "menu" : null;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const status = body.status;
  if (
    !kind ||
    !url ||
    (status !== "pending" && status !== "approved" && status !== "rejected")
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const shops = await readJsonFile<Shop[]>("shops.json");
  const idx = shops.findIndex((s) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = normalizeShop(shops[idx]);
  const key = kind === "menu" ? "menuImages" : "sceneImages";
  const list = [...row[key]];
  const hit = list.find((i) => i.url === url);
  if (!hit) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  hit.status = status;
  shops[idx] = { ...row, [key]: list };
  await writeJsonFile("shops.json", shops);
  return NextResponse.json(shops[idx]);
}

/** 管理员删除单张菜单/实景图记录 */
export async function DELETE(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as { kind?: string; url?: string };
  const kind = body.kind === "scene" ? "scene" : body.kind === "menu" ? "menu" : null;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!kind || !url) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const shops = await readJsonFile<Shop[]>("shops.json");
  const idx = shops.findIndex((s) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = normalizeShop(shops[idx]);
  const imgKey = kind === "menu" ? "menuImages" : "sceneImages";
  const list = row[imgKey].filter((i) => i.url !== url);
  if (list.length === row[imgKey].length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  shops[idx] = { ...row, [imgKey]: list };
  await writeJsonFile("shops.json", shops);
  return NextResponse.json(shops[idx]);
}
