import { NextResponse } from "next/server";
import { getShop } from "@/lib/data";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";
import { normalizeMerchantAvgPrice } from "@/lib/merchant-avg-price";
import { canEditShop } from "@/lib/shop-access";
import { sanitizeDishesIncoming } from "@/lib/shop-dish-tags";
import { normalizeGalleryRaw, normalizeShop, publicShopView } from "@/lib/shop-gallery";
import { isShopPubliclyListed, normalizeShopListingStatus } from "@/lib/shop-listing";
import type { Ad, Building, Dish, Floor, MapShape, Review, Shop } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function floorOkForBuilding(floors: Floor[], buildingId: string, floorId: string): boolean {
  const fl = floors.find((f) => f.id === floorId);
  return Boolean(fl && fl.buildingId === buildingId);
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await getSession();
  const staff = session?.role === "super_admin" || session?.role === "admin";
  const owner = session?.role === "merchant" && shop.ownerUserId === session.userId;
  if (!staff && !owner && !isShopPubliclyListed(shop)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(staff || owner ? shop : publicShopView(shop));
}

export async function PATCH(req: Request, { params }: Params) {
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
  const shop = shops[idx];
  if (!canEditShop(session, shop)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Partial<Shop> & {
    dishes?: Dish[];
    ownerUserId?: string | null;
  };

  const next = normalizeShop(shop);

  if (body.name != null) next.name = String(body.name);
  if (body.avgPrice != null) {
    const v = normalizeMerchantAvgPrice(body.avgPrice);
    if (v == null) {
      return NextResponse.json({ error: "invalid_avg_price" }, { status: 400 });
    }
    next.avgPrice = v;
  }
  if (body.description !== undefined) next.description = body.description ? String(body.description) : undefined;
  if (body.locationNote !== undefined)
    next.locationNote = body.locationNote ? String(body.locationNote) : undefined;
  if (body.showContact !== undefined) next.showContact = Boolean(body.showContact);
  if (body.contactPhone !== undefined) next.contactPhone = body.contactPhone;
  if (body.contactNote !== undefined) next.contactNote = body.contactNote;
  if (body.coverImage !== undefined) next.coverImage = body.coverImage;
  const staff = session.role === "super_admin" || session.role === "admin";
  if (body.menuImages != null) {
    if (!staff) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    next.menuImages = normalizeGalleryRaw(body.menuImages);
  }
  if (body.sceneImages != null) {
    if (!staff) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    next.sceneImages = normalizeGalleryRaw(body.sceneImages);
  }
  if (body.tags != null && staff) {
    next.tags = body.tags;
  }
  if (body.dishes != null) {
    next.dishes = sanitizeDishesIncoming(body.dishes);
  }

  if (body.buildingId != null) {
    const staffMaySetBuilding = session.role === "super_admin" || session.role === "admin";
    const merchantOwnsShop =
      session.role === "merchant" && shop.ownerUserId === session.userId;
    if (staffMaySetBuilding || merchantOwnsShop) {
      next.buildingId = String(body.buildingId);
      const buildings = await readJsonFile<Building[]>("buildings.json");
      const b = buildings.find((x) => x.id === next.buildingId);
      if (b) next.buildingName = b.name;
      const floors = await readJsonFile<Floor[]>("floors.json");
      if (
        next.floorId &&
        !floors.some((f) => f.id === next.floorId && f.buildingId === next.buildingId)
      ) {
        next.floorId = null;
      }
    }
  }

  if (body.floorId !== undefined) {
    const canSetFloor =
      staff || (session.role === "merchant" && shop.ownerUserId === session.userId);
    if (!canSetFloor) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const floors = await readJsonFile<Floor[]>("floors.json");
    if (body.floorId === null || body.floorId === "") {
      next.floorId = null;
    } else {
      const fid = String(body.floorId);
      if (!floorOkForBuilding(floors, next.buildingId, fid)) {
        return NextResponse.json({ error: "bad_floor" }, { status: 400 });
      }
      next.floorId = fid;
    }
  }

  if (session.role === "super_admin" && body.ownerUserId !== undefined) {
    next.ownerUserId = body.ownerUserId;
  }

  if (staff && body.listingStatus !== undefined) {
    next.listingStatus = normalizeShopListingStatus(body.listingStatus);
  }

  if (staff && body.publicDisplay !== undefined) {
    next.publicDisplay = body.publicDisplay === false ? false : true;
  }

  shops[idx] = next;
  await writeJsonFile("shops.json", shops);
  return NextResponse.json(next);
}

/** 仅管理员：删除店铺并移除关联评价、广告、地图上绑定该店的铺位 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const shops = await readJsonFile<Shop[]>("shops.json");
  if (!shops.some((s) => s.id === id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await writeJsonFile(
    "shops.json",
    shops.filter((s) => s.id !== id),
  );

  const reviews = await readJsonFile<Review[]>("reviews.json");
  await writeJsonFile(
    "reviews.json",
    reviews.filter((r) => r.shopId !== id),
  );

  const ads = await readJsonFile<Ad[]>("ads.json");
  await writeJsonFile(
    "ads.json",
    ads.filter((a) => a.shopId !== id),
  );

  const shapes = await readJsonFile<MapShape[]>("mapShapes.json");
  await writeJsonFile(
    "mapShapes.json",
    shapes.filter((s) => s.shopId !== id),
  );

  return NextResponse.json({ ok: true });
}
