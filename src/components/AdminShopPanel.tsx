"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { DishTagsPicker } from "@/components/DishTagsPicker";
import type { Building, Dish, Floor, MapShape, PublicUser, Shop, ShopGalleryStatus } from "@/lib/types";
import { isShopShape } from "@/lib/map-shape";
import { normalizeMerchantAvgPrice } from "@/lib/merchant-avg-price";
import { MERCHANT_HIDDEN_SHOP_TAGS } from "@/lib/shop-tags";

function galleryStatusLabel(s: ShopGalleryStatus) {
  if (s === "pending") return "待审核";
  if (s === "rejected") return "已拒绝";
  return "已通过";
}

type Props = {
  me: PublicUser | null;
  buildings: Building[];
  floors: Floor[];
  shapes: MapShape[];
  shops: Shop[];
  tagsCatalog: string[];
};

export function AdminShopPanel({
  me,
  buildings,
  floors,
  shapes,
  shops,
  tagsCatalog,
}: Props) {
  const router = useRouter();
  const role = me?.role;
  const canCreateShop = role === "super_admin";
  const canEditMeta = role === "super_admin" || role === "admin";

  const tagsCatalogForPicker = useMemo(() => {
    if (role === "merchant") return tagsCatalog.filter((t) => !MERCHANT_HIDDEN_SHOP_TAGS.has(t));
    return tagsCatalog;
  }, [role, tagsCatalog]);

  /** 仅店铺级运营标签（如今日推荐），由管理员维护；菜品分类在各行勾选 */
  const systemShopTagOptions = useMemo(() => {
    const fromCat = tagsCatalog.filter((t) => MERCHANT_HIDDEN_SHOP_TAGS.has(t));
    const s = new Set(fromCat);
    for (const t of MERCHANT_HIDDEN_SHOP_TAGS) s.add(t);
    return [...s].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [tagsCatalog]);

  const editableShops = useMemo(() => {
    if (!me) return [];
    if (role === "merchant") return shops.filter((s) => s.ownerUserId === me.id);
    if (role === "super_admin" || role === "admin") return shops;
    return [];
  }, [me, role, shops]);

  /** 地图铺位上出现的楼层（按店铺聚合），用于楼层筛选与分组展示 */
  const shopToFloorIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const sh of shapes) {
      if (!isShopShape(sh) || !sh.shopId) continue;
      if (!m.has(sh.shopId)) m.set(sh.shopId, new Set());
      m.get(sh.shopId)!.add(sh.floorId);
    }
    return m;
  }, [shapes]);

  const floorById = useMemo(() => new Map(floors.map((f) => [f.id, f])), [floors]);

  const sortedFloorsAll = useMemo(() => {
    const bi = (bid: string) => buildings.findIndex((b) => b.id === bid);
    return [...floors].sort((a, b) => {
      const db = bi(a.buildingId) - bi(b.buildingId);
      if (db !== 0) return db;
      return a.order - b.order;
    });
  }, [floors, buildings]);

  const [filterBuildingId, setFilterBuildingId] = useState("");
  const [filterFloorId, setFilterFloorId] = useState("");

  const floorOptions = useMemo(() => {
    if (!filterBuildingId) return sortedFloorsAll;
    return sortedFloorsAll.filter((f) => f.buildingId === filterBuildingId);
  }, [sortedFloorsAll, filterBuildingId]);

  useEffect(() => {
    setFilterFloorId((fid) => {
      if (!fid) return "";
      return floorOptions.some((f) => f.id === fid) ? fid : "";
    });
  }, [filterBuildingId, floorOptions]);

  const filteredEditableShops = useMemo(() => {
    if (role === "merchant") return editableShops;
    let list = editableShops;
    if (filterBuildingId) list = list.filter((s) => s.buildingId === filterBuildingId);
    if (filterFloorId) list = list.filter((s) => shopToFloorIds.get(s.id)?.has(filterFloorId));
    return list;
  }, [role, editableShops, filterBuildingId, filterFloorId, shopToFloorIds]);

  const shopGroups = useMemo(() => {
    const m = new Map<string, { buildingName: string; floorLabel: string; shops: Shop[] }>();
    for (const s of filteredEditableShops) {
      const ids = [...(shopToFloorIds.get(s.id) ?? [])].sort(
        (a, b) => (floorById.get(a)?.order ?? 0) - (floorById.get(b)?.order ?? 0),
      );
      const floorLabel =
        ids.length === 0 ? "未上图层" : ids.map((id) => floorById.get(id)?.name ?? id).join("、");
      const key = `${s.buildingId}\t${floorLabel}`;
      let g = m.get(key);
      if (!g) {
        g = { buildingName: s.buildingName, floorLabel, shops: [] };
        m.set(key, g);
      }
      g.shops.push(s);
    }
    const entries = [...m.entries()].sort(([, a], [, b]) => {
      const sa = a.shops[0];
      const sb = b.shops[0];
      if (!sa || !sb) return 0;
      const oa = buildings.findIndex((x) => x.id === sa.buildingId);
      const ob = buildings.findIndex((x) => x.id === sb.buildingId);
      if (oa !== ob) return oa - ob;
      return a.floorLabel.localeCompare(b.floorLabel, "zh-CN");
    });
    for (const [, g] of entries) {
      g.shops.sort((x, y) => x.name.localeCompare(y.name, "zh-CN"));
    }
    return entries;
  }, [filteredEditableShops, shopToFloorIds, floorById, buildings]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBuildingId, setNewBuildingId] = useState(buildings[0]?.id ?? "");
  const [newFloorId, setNewFloorId] = useState("");
  const [newAvg, setNewAvg] = useState("20");

  const [selectedId, setSelectedId] = useState("");
  const selected = shops.find((s) => s.id === selectedId);

  const [name, setName] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [shopFloorId, setShopFloorId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 菜品配图上传中的行索引 */
  const [dishUploadBusy, setDishUploadBusy] = useState<number | null>(null);

  const newFloorOptions = useMemo(() => {
    if (!newBuildingId) return sortedFloorsAll;
    return sortedFloorsAll.filter((f) => f.buildingId === newBuildingId);
  }, [sortedFloorsAll, newBuildingId]);

  const editFloorOptions = useMemo(() => {
    if (!buildingId) return [];
    return sortedFloorsAll.filter((f) => f.buildingId === buildingId);
  }, [sortedFloorsAll, buildingId]);

  useEffect(() => {
    setNewFloorId((fid) => {
      if (!fid) return "";
      return newFloorOptions.some((f) => f.id === fid) ? fid : "";
    });
  }, [newBuildingId, newFloorOptions]);

  useEffect(() => {
    setShopFloorId((fid) => {
      if (!fid) return "";
      return editFloorOptions.some((f) => f.id === fid) ? fid : "";
    });
  }, [buildingId, editFloorOptions]);

  useEffect(() => {
    if (!filteredEditableShops.length) {
      setSelectedId("");
      return;
    }
    setSelectedId((id) =>
      id && filteredEditableShops.some((s) => s.id === id) ? id : filteredEditableShops[0].id,
    );
  }, [filteredEditableShops]);

  useEffect(() => {
    const sel = shops.find((s) => s.id === selectedId);
    if (!sel) return;
    setName(sel.name);
    setAvgPrice(sel.avgPrice > 0 ? String(sel.avgPrice) : "");
    setBuildingId(sel.buildingId);
    setShopFloorId(sel.floorId ?? "");
    setTags((sel.tags ?? []).filter((t) => MERCHANT_HIDDEN_SHOP_TAGS.has(t)));
    setOwnerUserId(sel.ownerUserId ?? "");
    setDescription(sel.description ?? "");
    setLocationNote(sel.locationNote ?? "");
    setShowContact(Boolean(sel.showContact));
    setContactPhone(sel.contactPhone ?? "");
    setContactNote(sel.contactNote ?? "");
    setDishes(sel.dishes?.length ? [...sel.dishes] : []);
  }, [selectedId, shops]);

  async function createShop() {
    setSaveMsg(null);
    if (!newName.trim() || !newBuildingId || !newFloorId) {
      setSaveMsg("请填写店名并选择食堂与楼层");
      return;
    }
    const avgNorm = normalizeMerchantAvgPrice(newAvg);
    if (avgNorm == null) {
      setSaveMsg("参考人均须为大于 0 的数字（可填小数）");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(eatmapUrl("/api/shops"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          buildingId: newBuildingId,
          floorId: newFloorId,
          avgPrice: avgNorm,
          tags: [],
          dishes: [],
          menuImages: [],
          sceneImages: [],
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveMsg(errBody.error === "invalid_avg_price" ? "参考人均无效" : "新建失败");
        return;
      }
      setNewName("");
      setCreating(false);
      setSaveMsg("已新建店铺");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const flushAutoSave = useCallback(async () => {
    if (!selectedId) return;
    const sel = shops.find((s) => s.id === selectedId);
    if (!sel) return;

    const cleanedDishes: Dish[] = dishes
      .map((d) => {
        const n = d.price != null ? Number(d.price) : NaN;
        const price = Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
        const tagList = [...new Set((d.tags ?? []).filter(Boolean))].sort();
        return {
          name: d.name.trim(),
          price,
          image: d.image?.trim() || undefined,
          tags: tagList,
        };
      })
      .filter((d) => d.name.length > 0);

    const cleanedServer: Dish[] = (sel.dishes ?? [])
      .map((d) => {
        const n = d.price != null ? Number(d.price) : NaN;
        const price = Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
        const tagList = [...new Set((d.tags ?? []).filter(Boolean))].sort();
        return {
          name: d.name.trim(),
          price,
          image: d.image?.trim() || undefined,
          tags: tagList,
        };
      })
      .filter((d) => d.name.length > 0);

    const tagsSorted = [...tags].sort().join("\n");
    const tagsServer = [...(sel.tags ?? []).filter((t) => MERCHANT_HIDDEN_SHOP_TAGS.has(t))].sort().join("\n");
    const ownerTrim = ownerUserId.trim() || null;
    const inputAvgNorm = normalizeMerchantAvgPrice(avgPrice);
    const avgUnchanged =
      inputAvgNorm !== null ? inputAvgNorm === sel.avgPrice : sel.avgPrice <= 0;
    const merchantMayEditBuilding = role === "merchant";
    const sameCore =
      name.trim() === sel.name.trim() &&
      avgUnchanged &&
      description.trim() === (sel.description ?? "").trim() &&
      locationNote.trim() === (sel.locationNote ?? "").trim() &&
      Boolean(showContact) === Boolean(sel.showContact) &&
      (contactPhone.trim() || null) === (sel.contactPhone ?? null) &&
      (contactNote.trim() || null) === (sel.contactNote ?? null) &&
      (role === "merchant" ? true : tagsSorted === tagsServer) &&
      JSON.stringify(cleanedDishes) === JSON.stringify(cleanedServer) &&
      (shopFloorId || null) === (sel.floorId ?? null) &&
      (!canEditMeta && !merchantMayEditBuilding ? true : buildingId === sel.buildingId) &&
      (role !== "super_admin" || ownerTrim === (sel.ownerUserId ?? null));

    if (sameCore) return;

    try {
      const payload: Partial<Shop> & { ownerUserId?: string | null; floorId?: string | null } = {
        name,
        description: description.trim(),
        locationNote: locationNote.trim(),
        showContact,
        contactPhone: contactPhone.trim() || null,
        contactNote: contactNote.trim() || null,
        dishes: cleanedDishes,
        floorId: shopFloorId || null,
      };
      if (role !== "merchant") {
        payload.tags = tags;
      }
      if (inputAvgNorm !== null) {
        payload.avgPrice = inputAvgNorm;
      } else if (sel.avgPrice > 0) {
        payload.avgPrice = sel.avgPrice;
      }
      if (canEditMeta || merchantMayEditBuilding) {
        payload.buildingId = buildingId;
      }
      if (role === "super_admin") {
        payload.ownerUserId = ownerTrim;
      }
      const res = await fetch(eatmapUrl(`/api/shops/${selectedId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSaveMsg("自动保存失败或无权限");
        return;
      }
      setSaveMsg("已自动保存");
      router.refresh();
    } catch {
      setSaveMsg("自动保存失败");
    }
  }, [
    selectedId,
    shops,
    name,
    avgPrice,
    buildingId,
    shopFloorId,
    tags,
    description,
    locationNote,
    showContact,
    contactPhone,
    contactNote,
    dishes,
    ownerUserId,
    role,
    canEditMeta,
    router,
  ]);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void flushAutoSave();
    }, 700);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [selectedId, flushAutoSave]);

  async function deleteShop() {
    if (!selected || !canEditMeta) return;
    const ok = window.confirm(
      `确定删除店铺「${selected.name}」？相关评价、广告投放与地图上绑定该店的铺位将一并删除，且不可恢复。`,
    );
    if (!ok) return;
    setSaveMsg(null);
    setBusy(true);
    try {
      const res = await fetch(eatmapUrl(`/api/shops/${selected.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveMsg(d.error === "forbidden" ? "无权限删除店铺" : "删除失败");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function upload(kind: "shop-cover" | "shop-menu" | "shop-scene", file: File | null) {
    if (!selected || !file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", kind);
    fd.append("shopId", selected.id);
    const res = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
    if (!res.ok) return;
    const { url } = (await res.json()) as { url: string };
    if (kind === "shop-cover") {
      await fetch(eatmapUrl(`/api/shops/${selected.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coverImage: url }),
      });
      router.refresh();
      return;
    }
    const slot = kind === "shop-menu" ? "menu" : "scene";
    const pr = await fetch(eatmapUrl(`/api/shops/${selected.id}/gallery`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kind: slot,
        url,
      }),
    });
    if (!pr.ok) return;
    router.refresh();
  }

  function toggleSystemShopTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function toggleDishTag(i: number, t: string) {
    setDishes((prev) =>
      prev.map((d, j) => {
        if (j !== i) return d;
        const cur = d.tags ?? [];
        const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
        return { ...d, tags: next };
      }),
    );
  }

  function patchDish(i: number, patch: Partial<Dish>) {
    setDishes((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function removeDish(i: number) {
    setDishes((prev) => prev.filter((_, j) => j !== i));
  }

  async function uploadDishImage(index: number, file: File | null) {
    if (!selected || !file) return;
    setDishUploadBusy(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "shop-dish");
      fd.append("shopId", selected.id);
      const res = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      patchDish(index, { image: url });
    } finally {
      setDishUploadBusy(null);
    }
  }

  if (!me) {
    return (
      <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4 text-sm text-amber-900/80">
        加载账号信息…
      </div>
    );
  }

  if (role === "merchant" && editableShops.length === 0) {
    return (
      <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4 text-sm text-amber-900/80">
        当前账号未绑定店铺（ownerUserId）。请联系超级管理员在后台绑定后，即可维护店铺信息与菜品等。
      </div>
    );
  }

  const shopListingPending =
    role === "merchant" && editableShops.some((s) => s.listingStatus === "pending");

  return (
    <div className="space-y-6 xl:min-h-0">
      {shopListingPending ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          您的店铺正在「新店审核」中，暂未在地图、瀑布流与店铺详情对外展示。管理员通过后即可被访客看到，您可继续完善店名、菜品与图片等信息。
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[240px,1fr] xl:grid-cols-[minmax(300px,28vw)_minmax(0,1fr)] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-1">
          {canCreateShop ? (
            <div className="rounded-xl border border-amber-900/10 bg-white p-4">
              <button
                type="button"
                onClick={() => setCreating((v) => !v)}
                className="text-sm font-semibold text-amber-950"
              >
                {creating ? "收起新建店铺" : "新建店铺"}
              </button>
              {creating ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs sm:col-span-2">
                    <span className="text-amber-800/75">店名</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-amber-900/15 px-2 py-1.5"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </label>
                  <label className="text-xs">
                    <span className="text-amber-800/75">食堂</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-amber-900/15 px-2 py-1.5"
                      value={newBuildingId}
                      onChange={(e) => setNewBuildingId(e.target.value)}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-amber-800/75">楼层</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-amber-900/15 px-2 py-1.5"
                      value={newFloorId}
                      onChange={(e) => setNewFloorId(e.target.value)}
                      disabled={!newBuildingId}
                    >
                      <option value="">{newBuildingId ? "选择楼层" : "先选食堂"}</option>
                      {newFloorOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-amber-800/75">参考人均</span>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      className="mt-1 w-full rounded-lg border border-amber-900/15 px-2 py-1.5"
                      value={newAvg}
                      onChange={(e) => setNewAvg(e.target.value)}
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={createShop}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      创建
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {role === "merchant" ? (
            editableShops.length === 1 ? (
              <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] px-3 py-3">
                <p className="text-[11px] font-medium text-amber-800/70">店铺名称</p>
                <p className="mt-1 text-sm font-semibold text-amber-950">{editableShops[0]!.name}</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-amber-800/70">选择店铺</p>
                {editableShops.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-800/65">暂无店铺。</p>
                ) : (
                  <ul className="mt-2 max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2 xl:max-h-[calc(100vh-16rem)]">
                    {editableShops.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                            s.id === selectedId ? "bg-amber-200 text-amber-950" : "hover:bg-amber-100/80"
                          }`}
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-amber-800/55">{s.id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          ) : (
            <>
              <p className="text-xs font-medium text-amber-800/70">选择店铺</p>
              <div className="mt-2 space-y-2 rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2">
                <label className="block text-[11px] text-amber-900">
                  <span className="text-amber-800/70">地点</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 text-xs"
                    value={filterBuildingId}
                    onChange={(e) => setFilterBuildingId(e.target.value)}
                  >
                    <option value="">全部地点</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] text-amber-900">
                  <span className="text-amber-800/70">楼层（按地图铺位）</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 text-xs"
                    value={filterFloorId}
                    onChange={(e) => setFilterFloorId(e.target.value)}
                  >
                    <option value="">全部楼层</option>
                    {floorOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {buildings.find((b) => b.id === f.buildingId)?.name ?? f.buildingId} · {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {filteredEditableShops.length === 0 ? (
                <p className="mt-2 text-xs text-amber-800/65">当前筛选下没有店铺，请调整地点/楼层或新建。</p>
              ) : (
                <ul className="mt-2 max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2 xl:max-h-[calc(100vh-16rem)]">
                  {shopGroups.map(([key, { buildingName, floorLabel, shops: groupShops }]) => (
                    <li key={key}>
                      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800/65">
                        {buildingName}
                        <span className="mx-1 font-normal text-amber-800/40">·</span>
                        {floorLabel}
                      </p>
                      <ul className="space-y-0.5">
                        {groupShops.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(s.id)}
                              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs ${
                                s.id === selectedId ? "bg-amber-200 text-amber-950" : "hover:bg-amber-100/80"
                              }`}
                            >
                              <span className="font-medium">{s.name}</span>
                              <span className="mt-0.5 block font-mono text-[10px] text-amber-800/55">{s.id}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {selected ? (
          <div className="min-w-0 space-y-3 rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs">
                <span className="text-amber-800/75">店名</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="text-xs">
                <span className="text-amber-800/75">参考人均</span>
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5"
                  value={avgPrice}
                  onChange={(e) => setAvgPrice(e.target.value)}
                />
              </label>
              {canEditMeta || role === "merchant" ? (
                <>
                  <label className="text-xs">
                    <span className="text-amber-800/75">食堂</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5"
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="text-amber-800/75">楼层</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5"
                      value={shopFloorId}
                      onChange={(e) => setShopFloorId(e.target.value)}
                      disabled={!buildingId}
                    >
                      <option value="">{buildingId ? "选择楼层" : "先选食堂"}</option>
                      {editFloorOptions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              {role === "super_admin" ? (
                <label className="text-xs sm:col-span-2">
                  <span className="text-amber-800/75">绑定商户 userId（可空）</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 font-mono text-[11px]"
                    value={ownerUserId}
                    onChange={(e) => setOwnerUserId(e.target.value)}
                    placeholder="粘贴「账户」页中的用户 ID"
                  />
                  <span className="mt-1 block text-[10px] leading-snug text-amber-800/60">
                    打开后台「账户」标签，在列表的「用户 ID」列复制商户账号的 id，粘贴到此处即可绑定。
                  </span>
                </label>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-amber-900/10 pt-3">
              <h3 className="text-xs font-semibold text-amber-950">店铺详情（店主与管理员可编辑）</h3>
              <label className="block text-xs">
                <span className="text-amber-800/75">店铺描述</span>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="介绍招牌菜、营业时间说明等"
                />
              </label>
              <label className="block text-xs">
                <span className="text-amber-800/75">位置说明</span>
                <textarea
                  className="mt-1 min-h-[56px] w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 text-sm"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="例如：食堂二楼东侧几号档口"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  className="rounded border-amber-900/30"
                  checked={showContact}
                  onChange={(e) => setShowContact(e.target.checked)}
                />
                <span>在店铺详情页向访客展示联系方式</span>
              </label>
              <label className="block text-xs">
                <span className="text-amber-800/75">联系电话（选填）</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 font-mono text-[11px]"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="仅勾选展示后并对访客可见"
                />
              </label>
              <label className="block text-xs">
                <span className="text-amber-800/75">其他联系方式（选填，如微信）</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 text-sm"
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  placeholder="微信号、微信群备注等"
                />
              </label>
            </div>

            <div className="space-y-2 border-t border-amber-900/10 pt-3">
              <h3 className="text-xs font-semibold text-amber-950">菜品列表</h3>
              <p className="text-[10px] text-amber-800/55">
                名称必填；价格与分类标签可选。左侧小图与前台同款比例，点击即可上传或更换配图；修改后会自动保存。
              </p>
              <div className="space-y-2">
                {dishes.map((d, i) => (
                  <div
                    key={`${selected.id}-dish-${i}`}
                    className="flex gap-2 rounded-xl border border-amber-900/12 bg-[#fffaf3] p-2 shadow-sm"
                  >
                    <label className="group relative h-[78px] w-[104px] shrink-0 cursor-pointer overflow-hidden rounded-lg bg-amber-50 ring-1 ring-amber-900/15">
                      {d.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolveEatmapMediaUrl(d.image)} alt="" className="h-full w-full object-cover" />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent py-3 pt-5 text-center text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                            点击更换配图
                          </span>
                        </>
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-0.5 px-1.5 text-center">
                          <ImagePlus className="h-5 w-5 text-amber-600/65" aria-hidden />
                          <span className="text-[9px] leading-tight text-amber-800/75">上传配图</span>
                        </span>
                      )}
                      {dishUploadBusy === i ? (
                        <span className="absolute inset-0 z-[1] flex items-center justify-center bg-white/80 text-[10px] font-medium text-amber-900">
                          上传中…
                        </span>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={dishUploadBusy !== null || busy}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          void uploadDishImage(i, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-[120px] flex-1 text-[11px]">
                          <span className="text-amber-800/70">名称</span>
                          <input
                            className="mt-0.5 w-full rounded border border-amber-900/15 bg-white px-1.5 py-1 text-xs"
                            value={d.name}
                            onChange={(e) => patchDish(i, { name: e.target.value })}
                          />
                        </label>
                        <label className="w-[4.5rem] text-[11px]">
                          <span className="text-amber-800/70">价格</span>
                          <input
                            type="number"
                            className="mt-0.5 w-full rounded border border-amber-900/15 bg-white px-1.5 py-1 text-xs"
                            value={d.price ?? ""}
                            onChange={(e) =>
                              patchDish(i, {
                                price: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeDish(i)}
                          className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900 hover:bg-amber-200"
                        >
                          删除菜品
                        </button>
                      </div>
                      {d.image ? (
                        <button
                          type="button"
                          className="self-start text-[10px] text-amber-800/85 underline decoration-amber-600/35 underline-offset-2 hover:text-amber-950"
                          onClick={() => patchDish(i, { image: undefined })}
                        >
                          移除配图
                        </button>
                      ) : null}
                      <DishTagsPicker
                        catalog={tagsCatalogForPicker}
                        value={d.tags ?? []}
                        onToggle={(t) => toggleDishTag(i, t)}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDishes((prev) => [...prev, { name: "", tags: [] }])}
                  className="rounded-lg border border-dashed border-amber-400/80 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                >
                  + 添加菜品
                </button>
              </div>
            </div>

            {(role === "super_admin" || role === "admin") && systemShopTagOptions.length > 0 ? (
              <div className="space-y-2 border-t border-amber-900/10 pt-3">
                <h3 className="text-xs font-semibold text-amber-950">店铺运营标签</h3>
                <p className="text-[10px] text-amber-800/55">
                  仅影响首页/瀑布流推荐位等运营逻辑；美食分类请在上方各菜品下勾选。
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {systemShopTagOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleSystemShopTag(t)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                        tags.includes(t)
                          ? "bg-amber-600 text-white ring-amber-600"
                          : "bg-white text-amber-900 ring-amber-900/15"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-amber-900/10 pt-3">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-amber-900/15">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                封面
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => upload("shop-cover", e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-amber-900/15">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                菜单图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => upload("shop-menu", e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-amber-900/15">
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                实景图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => upload("shop-scene", e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {(selected.menuImages?.length ?? 0) > 0 || (selected.sceneImages?.length ?? 0) > 0 ? (
              <div className="space-y-2 border-t border-amber-900/10 pt-3">
                <p className="text-[11px] font-medium text-amber-800/75">已上传图（状态）</p>
                <p className="text-[10px] text-amber-800/55">
                  菜单与实景图上传后默认对外展示；可在后台「菜单实景」将单张设为「已拒绝」以隐藏。
                </p>
                <div className="flex flex-wrap gap-3">
                  {(selected.menuImages ?? []).map((item) => (
                    <div key={`m-${item.url}`} className="w-20 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveEatmapMediaUrl(item.url)}
                        alt=""
                        className="aspect-square w-full rounded-lg object-cover ring-1 ring-amber-900/15"
                      />
                      <p className="mt-0.5 text-center text-[9px] text-amber-800/70">菜单 · {galleryStatusLabel(item.status)}</p>
                    </div>
                  ))}
                  {(selected.sceneImages ?? []).map((item) => (
                    <div key={`s-${item.url}`} className="w-20 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveEatmapMediaUrl(item.url)}
                        alt=""
                        className="aspect-video w-full rounded-lg object-cover ring-1 ring-amber-900/15"
                      />
                      <p className="mt-0.5 text-center text-[9px] text-amber-800/70">实景 · {galleryStatusLabel(item.status)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {canEditMeta ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteShop()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  删除店铺
                </button>
              ) : null}
              {saveMsg ? <span className="text-xs text-amber-800">{saveMsg}</span> : null}
            </div>
          </div>
        ) : filteredEditableShops.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-amber-900/20 bg-[#fffaf3]/80 px-4 text-sm text-amber-800/70">
            请调整左侧筛选或新建店铺。
          </div>
        ) : null}
      </div>
    </div>
  );
}
