import { getShop } from "@/lib/data";
import { loadUserRecords, saveUserRecords } from "@/lib/auth-users";

const MAX_IDS_PER_LIST = 400;

function uniqIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of ids) {
    if (typeof x !== "string") continue;
    const id = x.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_IDS_PER_LIST) break;
  }
  return out;
}

async function filterExistingShopIds(ids: string[]): Promise<string[]> {
  const ok: string[] = [];
  for (const id of ids) {
    const shop = await getShop(id);
    if (shop) ok.push(id);
  }
  return ok;
}

export async function getUserShopMarks(userId: string): Promise<{
  favoriteShopIds: string[];
  wantShopIds: string[];
}> {
  const users = await loadUserRecords();
  const u = users.find((x) => x.id === userId);
  if (!u) {
    return { favoriteShopIds: [], wantShopIds: [] };
  }
  return {
    favoriteShopIds: uniqIds(u.favoriteShopIds ?? []),
    wantShopIds: uniqIds(u.wantShopIds ?? []),
  };
}

export async function patchUserShopMark(
  userId: string,
  kind: "favorite" | "want",
  shopId: string,
  add: boolean,
): Promise<{ favoriteShopIds: string[]; wantShopIds: string[] } | "shop_not_found"> {
  const sid = shopId.trim();
  if (!sid) return { favoriteShopIds: [], wantShopIds: [] };

  if (add) {
    const shop = await getShop(sid);
    if (!shop) return "shop_not_found";
  }

  const users = await loadUserRecords();
  const idx = users.findIndex((x) => x.id === userId);
  if (idx < 0) return { favoriteShopIds: [], wantShopIds: [] };

  const u = users[idx]!;
  const fav = new Set(uniqIds(u.favoriteShopIds ?? []));
  const want = new Set(uniqIds(u.wantShopIds ?? []));

  if (kind === "favorite") {
    if (add) fav.add(sid);
    else fav.delete(sid);
  } else if (add) {
    want.add(sid);
  } else {
    want.delete(sid);
  }

  const nextFav = [...fav].slice(0, MAX_IDS_PER_LIST);
  const nextWant = [...want].slice(0, MAX_IDS_PER_LIST);
  users[idx] = { ...u, favoriteShopIds: nextFav, wantShopIds: nextWant };
  await saveUserRecords(users);
  return { favoriteShopIds: nextFav, wantShopIds: nextWant };
}

/** 将客户端传来的 id 与云端已有列表合并（用于旧版 localStorage 迁入） */
export async function mergeUserShopMarksFromDevice(
  userId: string,
  incomingFav: unknown,
  incomingWant: unknown,
): Promise<{ favoriteShopIds: string[]; wantShopIds: string[] }> {
  const cur = await getUserShopMarks(userId);
  const mergedFav = uniqIds([...cur.favoriteShopIds, ...uniqIds(incomingFav)]);
  const mergedWant = uniqIds([...cur.wantShopIds, ...uniqIds(incomingWant)]);
  return putUserShopMarks(userId, mergedFav, mergedWant);
}

/** 全量替换；会过滤不存在店铺的 id */
export async function putUserShopMarks(
  userId: string,
  favoriteShopIds: unknown,
  wantShopIds: unknown,
): Promise<{ favoriteShopIds: string[]; wantShopIds: string[] }> {
  let fav = uniqIds(favoriteShopIds);
  let want = uniqIds(wantShopIds);
  fav = await filterExistingShopIds(fav);
  want = await filterExistingShopIds(want);
  fav = fav.slice(0, MAX_IDS_PER_LIST);
  want = want.slice(0, MAX_IDS_PER_LIST);

  const users = await loadUserRecords();
  const idx = users.findIndex((x) => x.id === userId);
  if (idx < 0) return { favoriteShopIds: [], wantShopIds: [] };

  users[idx] = { ...users[idx]!, favoriteShopIds: fav, wantShopIds: want };
  await saveUserRecords(users);
  return { favoriteShopIds: fav, wantShopIds: want };
}
