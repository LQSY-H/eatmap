import { readJsonFile } from "./io";
import { normalizeShop, publicShopView } from "./shop-gallery";
import { isShopPubliclyListed } from "./shop-listing";
import type {
  Ad,
  Building,
  Floor,
  MapShape,
  PublicUser,
  Review,
  Shop,
  UserRecord,
} from "./types";
import { toPublicUser } from "./auth-users";

export async function getBuildings(): Promise<Building[]> {
  const rows = await readJsonFile<Building[]>("buildings.json");
  return [...rows].sort((a, b) => {
    const ao = a.sortOrder ?? 1_000_000;
    const bo = b.sortOrder ?? 1_000_000;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

export async function getShops(): Promise<Shop[]> {
  const rows = await readJsonFile<Shop[]>("shops.json");
  return rows.map(normalizeShop);
}

/** 访客可见：菜单/实景含全部非「已拒绝」的图片 */
export async function getPublicShops(): Promise<Shop[]> {
  const shops = await getShops();
  return shops.filter(isShopPubliclyListed).map(publicShopView);
}

export async function getShop(id: string): Promise<Shop | undefined> {
  const shops = await getShops();
  return shops.find((s) => s.id === id);
}

export async function getPublicShop(id: string): Promise<Shop | undefined> {
  const s = await getShop(id);
  if (!s || !isShopPubliclyListed(s)) return undefined;
  return publicShopView(s);
}

export async function getFloors(): Promise<Floor[]> {
  return readJsonFile<Floor[]>("floors.json");
}

export async function getFloor(id: string): Promise<Floor | undefined> {
  const floors = await getFloors();
  return floors.find((f) => f.id === id);
}

export async function getMapShapes(): Promise<MapShape[]> {
  return readJsonFile<MapShape[]>("mapShapes.json");
}

export async function getShapesForFloor(floorId: string): Promise<MapShape[]> {
  const all = await getMapShapes();
  return all.filter((s) => s.floorId === floorId);
}

export async function getReviews(): Promise<Review[]> {
  return readJsonFile<Review[]>("reviews.json");
}

export async function getReviewsForShop(
  shopId: string,
  opts?: { includeHidden?: boolean },
): Promise<Review[]> {
  const reviews = await getReviews();
  return reviews.filter(
    (r) =>
      r.shopId === shopId &&
      (opts?.includeHidden || r.visible),
  );
}

export async function getAds(): Promise<Ad[]> {
  return readJsonFile<Ad[]>("ads.json");
}

export async function getUsers(): Promise<PublicUser[]> {
  const rows = await readJsonFile<UserRecord[]>("users.json");
  return rows.map(toPublicUser);
}

export async function getTags(): Promise<string[]> {
  return readJsonFile<string[]>("tags.json");
}
