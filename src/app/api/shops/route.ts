import { NextResponse } from "next/server";
import { getBuildings, getFloors, getPublicShops, getShops } from "@/lib/data";
import { newId, readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";
import { normalizeMerchantAvgPrice } from "@/lib/merchant-avg-price";
import { sanitizeDishesIncoming } from "@/lib/shop-dish-tags";
import { normalizeGalleryRaw } from "@/lib/shop-gallery";
import type { Dish, Floor, Shop } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  const staff = session?.role === "super_admin" || session?.role === "admin";
  const shops = staff ? await getShops() : await getPublicShops();
  return NextResponse.json(shops);
}

function normalizeFloorIdForBuilding(
  floors: Floor[],
  buildingId: string,
  floorId: string | null | undefined,
): { ok: true; value: string | null | undefined } | { ok: false } {
  if (floorId == null) return { ok: true, value: undefined };
  if (floorId === "") return { ok: true, value: null };
  const fl = floors.find((f) => f.id === floorId);
  if (!fl || fl.buildingId !== buildingId) return { ok: false };
  return { ok: true, value: floorId };
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<Shop>;
  if (!body.name?.trim() || !body.buildingId) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const buildings = await getBuildings();
  const b = buildings.find((x) => x.id === body.buildingId);
  if (!b) {
    return NextResponse.json({ error: "bad_building" }, { status: 400 });
  }

  const floors = await getFloors();
  let floorId: string | null | undefined = undefined;
  if (body.floorId !== undefined) {
    const r = normalizeFloorIdForBuilding(floors, body.buildingId, body.floorId);
    if (!r.ok) return NextResponse.json({ error: "bad_floor" }, { status: 400 });
    floorId = r.value;
  }

  const shops = await readJsonFile<Shop[]>("shops.json");

  const avgNorm = normalizeMerchantAvgPrice(body.avgPrice);
  if (avgNorm == null) {
    return NextResponse.json({ error: "invalid_avg_price" }, { status: 400 });
  }

  if (session.role === "merchant") {
    const owned = shops.filter((s) => s.ownerUserId === session.userId);
    if (owned.length > 0) {
      return NextResponse.json({ error: "already_has_shop" }, { status: 403 });
    }
    const shop: Shop = {
      id: newId("shop"),
      name: body.name.trim(),
      buildingId: body.buildingId,
      buildingName: b.name,
      ...(floorId !== undefined ? { floorId } : {}),
      avgPrice: avgNorm,
      tags: Array.isArray(body.tags) ? body.tags : [],
      coverImage: body.coverImage,
      dishes: Array.isArray(body.dishes) ? sanitizeDishesIncoming(body.dishes) : ([] as Dish[]),
      menuImages: normalizeGalleryRaw(body.menuImages),
      sceneImages: normalizeGalleryRaw(body.sceneImages),
      description: body.description,
      locationNote: body.locationNote,
      ownerUserId: session.userId,
      listingStatus: "pending",
      showContact: false,
      contactPhone: null,
      contactNote: null,
    };
    shops.push(shop);
    await writeJsonFile("shops.json", shops);
    return NextResponse.json(shop);
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const shop: Shop = {
    id: newId("shop"),
    name: body.name.trim(),
    buildingId: body.buildingId,
    buildingName: b.name,
    ...(floorId !== undefined ? { floorId } : {}),
    avgPrice: avgNorm,
    tags: Array.isArray(body.tags) ? body.tags : [],
    coverImage: body.coverImage,
    dishes: Array.isArray(body.dishes) ? sanitizeDishesIncoming(body.dishes) : ([] as Dish[]),
    menuImages: normalizeGalleryRaw(body.menuImages),
    sceneImages: normalizeGalleryRaw(body.sceneImages),
    description: body.description,
    locationNote: body.locationNote,
    ownerUserId: body.ownerUserId ?? null,
    merchantId: body.merchantId,
    listingStatus: "approved",
    showContact: false,
    contactPhone: null,
    contactNote: null,
  };
  shops.push(shop);
  await writeJsonFile("shops.json", shops);
  return NextResponse.json(shop);
}

