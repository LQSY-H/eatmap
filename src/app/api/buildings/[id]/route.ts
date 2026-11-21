import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { Ad, Building, Floor, MapShape, Review, Shop } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as Partial<Pick<Building, "name" | "sortOrder">>;
  const buildings = await readJsonFile<Building[]>("buildings.json");
  const idx = buildings.findIndex((b) => b.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const cur = buildings[idx];

  let nextName = cur.name;
  if (body.name != null) {
    const trimmed = String(body.name).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
    const dup = buildings.some((b) => b.id !== id && b.name === trimmed);
    if (dup) {
      return NextResponse.json({ error: "duplicate_name" }, { status: 400 });
    }
    nextName = trimmed;
  }

  let nextSort = cur.sortOrder ?? (idx + 1) * 10;
  if (body.sortOrder != null) {
    nextSort = Number(body.sortOrder);
    if (!Number.isFinite(nextSort)) {
      return NextResponse.json({ error: "invalid_sort" }, { status: 400 });
    }
  }

  const next: Building = {
    ...cur,
    name: nextName,
    sortOrder: nextSort,
  };
  buildings[idx] = next;
  await writeJsonFile("buildings.json", buildings);

  if (nextName !== cur.name) {
    const shops = await readJsonFile<Shop[]>("shops.json");
    let shopTouch = false;
    for (const s of shops) {
      if (s.buildingId === id) {
        s.buildingName = nextName;
        shopTouch = true;
      }
    }
    if (shopTouch) {
      await writeJsonFile("shops.json", shops);
    }
  }

  return NextResponse.json(next);
}

/** 删除食堂：级联删除其下楼层、地图形状、该食堂内全部店铺及相关评价与广告 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const buildings = await readJsonFile<Building[]>("buildings.json");
  if (!buildings.some((b) => b.id === id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const floors = await readJsonFile<Floor[]>("floors.json");
  const floorIds = new Set(floors.filter((f) => f.buildingId === id).map((f) => f.id));
  const nextFloors = floors.filter((f) => f.buildingId !== id);

  const shapes = await readJsonFile<MapShape[]>("mapShapes.json");
  const nextShapes = shapes.filter((s) => !floorIds.has(s.floorId));

  const shops = await readJsonFile<Shop[]>("shops.json");
  const removedShopIds = new Set(shops.filter((s) => s.buildingId === id).map((s) => s.id));
  const nextShops = shops.filter((s) => s.buildingId !== id);

  const reviews = await readJsonFile<Review[]>("reviews.json");
  const nextReviews = reviews.filter((r) => !removedShopIds.has(r.shopId));

  const ads = await readJsonFile<Ad[]>("ads.json");
  const nextAds = ads.filter((a) => !removedShopIds.has(a.shopId));

  const nextBuildings = buildings.filter((b) => b.id !== id);

  await writeJsonFile("floors.json", nextFloors);
  await writeJsonFile("mapShapes.json", nextShapes);
  await writeJsonFile("shops.json", nextShops);
  await writeJsonFile("reviews.json", nextReviews);
  await writeJsonFile("ads.json", nextAds);
  await writeJsonFile("buildings.json", nextBuildings);

  return NextResponse.json({
    ok: true,
    removedFloorCount: floorIds.size,
    removedShopCount: removedShopIds.size,
  });
}
