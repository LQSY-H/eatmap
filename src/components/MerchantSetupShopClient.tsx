"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { AccountBackLink } from "@/components/AccountBackLink";
import { DishTagsPicker } from "@/components/DishTagsPicker";
import { useAuth } from "@/components/AuthProvider";
import { normalizeMerchantAvgPrice } from "@/lib/merchant-avg-price";
import { MERCHANT_HIDDEN_SHOP_TAGS } from "@/lib/shop-tags";
import type { Building, Dish, Floor, Shop, ShopGalleryItem, ShopGalleryStatus } from "@/lib/types";

function galleryStatusLabel(s: ShopGalleryStatus) {
  if (s === "pending") return "待审核";
  if (s === "rejected") return "已拒绝";
  return "已通过";
}

type Props = {
  /** 超管后台嵌入：仅展示界面，不写库、不上传 */
  previewMode?: boolean;
};

export function MerchantSetupShopClient({ previewMode = false }: Props) {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [tagsCatalog, setTagsCatalog] = useState<string[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [avgPrice, setAvgPrice] = useState("20");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [menuImages, setMenuImages] = useState<ShopGalleryItem[]>([]);
  const [sceneImages, setSceneImages] = useState<ShopGalleryItem[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const lastPatchJson = useRef("");
  const [dishUploadBusy, setDishUploadBusy] = useState<number | null>(null);
  const [imageBusy, setImageBusy] = useState<string | null>(null);
  const [listingPending, setListingPending] = useState(false);

  const tagsForPicker = useMemo(
    () => tagsCatalog.filter((t) => !MERCHANT_HIDDEN_SHOP_TAGS.has(t)),
    [tagsCatalog],
  );

  const floorOptions = useMemo(() => {
    if (!buildingId) return floors;
    return floors.filter((f) => f.buildingId === buildingId);
  }, [floors, buildingId]);

  useEffect(() => {
    setFloorId((fid) => {
      if (!fid) return "";
      return floorOptions.some((f) => f.id === fid) ? fid : "";
    });
  }, [buildingId, floorOptions]);

  async function hydrateShopFromServer(id: string) {
    try {
      const r = await fetch(eatmapUrl(`/api/shops/${id}`), { credentials: "include" });
      if (!r.ok) return;
      const s = (await r.json()) as Shop;
      setCoverUrl(s.coverImage);
      setMenuImages(s.menuImages ?? []);
      setSceneImages(s.sceneImages ?? []);
      setShowContact(Boolean(s.showContact));
      setContactPhone(s.contactPhone ?? "");
      setContactNote(s.contactNote ?? "");
      setDishes(s.dishes?.length ? [...s.dishes] : []);
      setListingPending(s.listingStatus === "pending");
      lastPatchJson.current = "";
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (previewMode) {
      void (async () => {
        try {
          const [br, fr, tr] = await Promise.all([
            fetch(eatmapUrl("/api/buildings")),
            fetch(eatmapUrl("/api/floors")),
            fetch(eatmapUrl("/api/tags")),
          ]);
          if (br.ok) setBuildings(await br.json());
          if (fr.ok) setFloors(await fr.json());
          if (tr.ok) setTagsCatalog(await tr.json());
        } catch {
          setErr("加载失败，请刷新重试");
        }
      })();
      return;
    }
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "merchant") {
      router.replace("/account");
      return;
    }
    void (async () => {
      try {
        const mr = await fetch(eatmapUrl("/api/shops/mine"), { credentials: "include" });
        if (!mr.ok) return;
        const mine = (await mr.json()) as Shop[];
        if (mine.length > 0) {
          router.replace("/admin");
          return;
        }
        const [br, fr, tr] = await Promise.all([
          fetch(eatmapUrl("/api/buildings")),
          fetch(eatmapUrl("/api/floors")),
          fetch(eatmapUrl("/api/tags")),
        ]);
        if (br.ok) setBuildings(await br.json());
        if (fr.ok) setFloors(await fr.json());
        if (tr.ok) setTagsCatalog(await tr.json());
      } catch {
        setErr("加载失败，请刷新重试");
      }
    })();
  }, [previewMode, authLoading, user, router]);

  useEffect(() => {
    if (previewMode) return;
    if (shopId) return;
    if (!name.trim() || !buildingId || !floorId) return;
    const t = setTimeout(() => {
      void (async () => {
        if (creatingRef.current) return;
        const av = normalizeMerchantAvgPrice(avgPrice);
        if (av == null) {
          setErr("参考人均须为大于 0 的数字（可填小数）");
          return;
        }
        creatingRef.current = true;
        setErr(null);
        try {
          const res = await fetch(eatmapUrl("/api/shops"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: name.trim(),
              buildingId,
              floorId,
              avgPrice: av,
              tags: [],
              dishes: [],
              menuImages: [],
              sceneImages: [],
              description: description.trim() || undefined,
              locationNote: locationNote.trim() || undefined,
            }),
          });
          if (res.status === 403) {
            const d = (await res.json().catch(() => ({}))) as { error?: string };
            if (d.error === "already_has_shop") router.replace("/admin");
            else setErr("无法创建店铺");
            creatingRef.current = false;
            return;
          }
          if (!res.ok) {
            setErr("创建店铺失败，请检查食堂与楼层是否选择正确");
            creatingRef.current = false;
            return;
          }
          const s = (await res.json()) as Shop;
          setShopId(s.id);
          setCoverUrl(s.coverImage);
          setMenuImages(s.menuImages ?? []);
          setSceneImages(s.sceneImages ?? []);
          lastPatchJson.current = "";
          setListingPending(s.listingStatus === "pending");
          setMsg(
            s.listingStatus === "pending"
              ? "店铺已创建，正在等待管理员审核，通过后方可在地图与首页展示；下方内容可随时补充并自动保存。"
              : "店铺已创建，下方内容可随时补充，修改会自动保存",
          );
          await refresh();
          window.dispatchEvent(new Event("eatmap-auth-refresh"));
          void hydrateShopFromServer(s.id);
        } catch {
          setErr("网络错误");
        } finally {
          creatingRef.current = false;
        }
      })();
    }, 800);
    return () => clearTimeout(t);
  }, [previewMode, shopId, name, buildingId, floorId, avgPrice, description, locationNote, router, refresh]);

  function stablePatchBody(): Record<string, unknown> {
    const cleanedDishes: Dish[] = dishes
      .map((d) => {
        const n = d.price != null ? Number(d.price) : NaN;
        const price = Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
        const tagList = [...new Set((d.tags ?? []).filter(Boolean))].sort();
        return { name: d.name.trim(), price, image: d.image?.trim() || undefined, tags: tagList };
      })
      .filter((d) => d.name.length > 0);

    const body: Record<string, unknown> = {
      name: name.trim(),
      floorId,
      description: description.trim(),
      locationNote: locationNote.trim(),
      showContact,
      contactPhone: contactPhone.trim() || null,
      contactNote: contactNote.trim() || null,
      dishes: cleanedDishes,
    };
    const av = normalizeMerchantAvgPrice(avgPrice);
    if (av !== null) body.avgPrice = av;
    return body;
  }

  useEffect(() => {
    if (previewMode || !shopId) return;
    const t = setTimeout(() => {
      void (async () => {
        const body = stablePatchBody();
        const json = JSON.stringify(body);
        if (json === lastPatchJson.current) return;

        setErr(null);
        try {
          const res = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: json,
          });
          if (!res.ok) {
            setErr("保存失败");
            return;
          }
          lastPatchJson.current = json;
          setMsg("已自动保存");
        } catch {
          setErr("网络错误");
        }
      })();
    }, 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 草稿字段全集
  }, [
    previewMode,
    shopId,
    name,
    avgPrice,
    floorId,
    description,
    locationNote,
    dishes,
    showContact,
    contactPhone,
    contactNote,
  ]);

  const canEdit = previewMode || Boolean(shopId);
  const showExtras = previewMode || Boolean(shopId);

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

  async function uploadCover(file: File | null) {
    if (previewMode) {
      setMsg("预览模式：不会实际上传");
      return;
    }
    if (!shopId || !file) return;
    setImageBusy("cover");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "shop-cover");
      fd.append("shopId", shopId);
      const res = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      const pr = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coverImage: url }),
      });
      if (!pr.ok) return;
      setCoverUrl(url);
      setMsg("封面已上传并保存");
      lastPatchJson.current = "";
    } finally {
      setImageBusy(null);
    }
  }

  async function uploadGallery(kind: "menu" | "scene", file: File | null) {
    if (previewMode) {
      setMsg("预览模式：不会实际上传");
      return;
    }
    if (!shopId || !file) return;
    setImageBusy(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", kind === "menu" ? "shop-menu" : "shop-scene");
      fd.append("shopId", shopId);
      const up = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
      if (!up.ok) return;
      const { url } = (await up.json()) as { url: string };
      const gr = await fetch(eatmapUrl(`/api/shops/${shopId}/gallery`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, url }),
      });
      if (!gr.ok) return;
      const pack = (await gr.json()) as {
        shop?: Shop;
        submittedGalleryStatus?: string;
      };
      const next = pack.shop ?? (pack as unknown as Shop);
      setMenuImages(next.menuImages ?? []);
      setSceneImages(next.sceneImages ?? []);
      const st = pack.submittedGalleryStatus;
      setMsg(
        st === "pending"
          ? kind === "menu"
            ? "菜单图已提交，审核通过后对外展示"
            : "实景图已提交，审核通过后对外展示"
          : kind === "menu"
            ? "菜单图已提交并对外展示"
            : "实景图已提交并对外展示",
      );
      lastPatchJson.current = "";
    } finally {
      setImageBusy(null);
    }
  }

  async function uploadDishImage(index: number, file: File | null) {
    if (previewMode) {
      setMsg("预览模式：不会实际上传");
      return;
    }
    if (!shopId || !file) return;
    setDishUploadBusy(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "shop-dish");
      fd.append("shopId", shopId);
      const res = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      patchDish(index, { image: url });
      setMsg("菜品配图已上传，将随列表自动保存");
    } finally {
      setDishUploadBusy(null);
    }
  }

  if (previewMode) {
    if (authLoading || !user) {
      return (
        <div className="rounded-xl border border-amber-900/10 bg-white p-4 text-sm text-amber-800/80">加载中…</div>
      );
    }
  } else if (authLoading || !user || user.role !== "merchant") {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-sm text-amber-800/80">加载中…</div>
    );
  }

  return (
    <div className="space-y-4">
      {previewMode ? null : <AccountBackLink />}
      <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        {previewMode ? (
          <div className="mb-3 rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <strong>预览模式</strong>：表单可点开、可填写，但不会创建店铺、不会保存或上传任何数据。
          </div>
        ) : null}
        <h1 className="text-lg font-bold text-amber-950">创建你的店铺</h1>
        <p className="mt-1 text-xs text-amber-800/75">
          {previewMode
            ? "以下为商户在「账户 → 创建店铺」中看到的界面（与真实流程一致，此处不写服务器）。"
            : "先填写店名、食堂与楼层即可创建店铺；创建后需管理员在后台「新店审核」通过，店铺才会在地图与首页展示。封面、菜单、实景与菜品图另有内容审核规则。其余文字信息修改后会自动保存。"}
        </p>
        {listingPending ? (
          <p className="mt-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            新店审核中：暂未对外展示，请等待管理员在后台通过；您可继续完善店铺信息。
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-xs text-emerald-800">{msg}</p> : null}
        {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm max-md:text-xs sm:col-span-2">
            <span className="text-amber-900/75">店铺名称</span>
            <input
              className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="必填"
            />
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">食堂</span>
            <select
              className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">请选择</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">楼层</span>
            <select
              className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2"
              value={floorId}
              onChange={(e) => setFloorId(e.target.value)}
              disabled={!buildingId}
            >
              <option value="">{buildingId ? "请选择楼层" : "先选食堂"}</option>
              {floorOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">参考人均</span>
            <input
              type="number"
              min={0.01}
              step="any"
              className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 space-y-3 border-t border-amber-900/10 pt-4">
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">店铺描述</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              placeholder={canEdit ? "" : "创建店铺后可填写"}
            />
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">位置说明</span>
            <textarea
              className="mt-1 min-h-[56px] w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              disabled={!canEdit}
              placeholder={canEdit ? "例如：食堂二楼东侧几号档口" : "创建店铺后可填写"}
            />
          </label>
        </div>

        {showExtras ? (
          <div className="mt-4 space-y-3 border-t border-amber-900/10 pt-4">
            <div className="space-y-2 rounded-xl border border-amber-900/10 bg-[#fffaf3]/80 p-3">
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
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5 font-mono text-[13px]"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="勾选展示后对访客可见"
                />
              </label>
              <label className="block text-xs">
                <span className="text-amber-800/75">其他联系方式（选填）</span>
                <input
                  className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1.5"
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  placeholder="微信号等"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-950">店铺图片</p>
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-amber-900/15">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  {imageBusy === "cover" ? "上传中…" : "封面"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={previewMode || imageBusy !== null || !shopId}
                    onChange={(e) => void uploadCover(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-amber-900/15">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  {imageBusy === "menu" ? "上传中…" : "菜单图"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={previewMode || imageBusy !== null || !shopId}
                    onChange={(e) => void uploadGallery("menu", e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-amber-900/15">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  {imageBusy === "scene" ? "上传中…" : "实景图"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={previewMode || imageBusy !== null || !shopId}
                    onChange={(e) => void uploadGallery("scene", e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {coverUrl ? (
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="w-28 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveEatmapMediaUrl(coverUrl)}
                      alt=""
                      className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-amber-900/15"
                    />
                    <p className="mt-0.5 text-center text-[9px] text-amber-800/70">封面</p>
                  </div>
                </div>
              ) : null}
              {(menuImages.length > 0 || sceneImages.length > 0) ? (
                <div className="flex flex-wrap gap-3 pt-1">
                  {menuImages.map((item) => (
                    <div key={`m-${item.url}`} className="w-20 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveEatmapMediaUrl(item.url)}
                        alt=""
                        className="aspect-square w-full rounded-lg object-cover ring-1 ring-amber-900/15"
                      />
                      <p className="mt-0.5 text-center text-[9px] text-amber-800/70">
                        菜单 · {galleryStatusLabel(item.status)}
                      </p>
                    </div>
                  ))}
                  {sceneImages.map((item) => (
                    <div key={`s-${item.url}`} className="w-24 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveEatmapMediaUrl(item.url)}
                        alt=""
                        className="aspect-video w-full rounded-lg object-cover ring-1 ring-amber-900/15"
                      />
                      <p className="mt-0.5 text-center text-[9px] text-amber-800/70">
                        实景 · {galleryStatusLabel(item.status)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-2 border-t border-amber-900/10 pt-4">
          <p className="text-xs font-semibold text-amber-950">菜品（可选）</p>
          <p className="text-[10px] text-amber-800/55">
            {previewMode
              ? "预览模式下可填写名称与价格；配图按钮不可用。"
              : "名称必填；价格、配图与每道菜分类标签可选。配图上传后会写入列表并自动保存。"}
          </p>
          {dishes.map((d, i) => (
            <div
              key={i}
              className="flex gap-2 rounded-xl border border-amber-900/12 bg-[#fffaf3] p-2 shadow-sm"
            >
              <label className="group relative h-[78px] w-[104px] shrink-0 cursor-pointer overflow-hidden rounded-lg bg-amber-50 ring-1 ring-amber-900/15">
                {d.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveEatmapMediaUrl(d.image)} alt="" className="h-full w-full object-cover" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent py-3 pt-5 text-center text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                      点击更换
                    </span>
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-0.5 px-1.5 text-center">
                    <ImagePlus className="h-5 w-5 text-amber-600/65" aria-hidden />
                    <span className="text-[9px] leading-tight text-amber-800/75">配图</span>
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
                  disabled={previewMode || !shopId || dishUploadBusy !== null}
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
                      disabled={!canEdit}
                      onChange={(e) =>
                        setDishes((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </label>
                  <label className="w-[4.5rem] text-[11px]">
                    <span className="text-amber-800/70">价格</span>
                    <input
                      type="number"
                      className="mt-0.5 w-full rounded border border-amber-900/15 bg-white px-1.5 py-1 text-xs"
                      value={d.price ?? ""}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setDishes((prev) =>
                          prev.map((x, j) =>
                            j === i
                              ? { ...x, price: e.target.value === "" ? undefined : Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!canEdit}
                    className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900"
                    onClick={() => setDishes((prev) => prev.filter((_, j) => j !== i))}
                  >
                    删除
                  </button>
                </div>
                {d.image ? (
                  <button
                    type="button"
                    className="self-start text-[10px] text-amber-800/85 underline decoration-amber-600/35"
                    disabled={!canEdit}
                    onClick={() => patchDish(i, { image: undefined })}
                  >
                    移除配图
                  </button>
                ) : null}
                <DishTagsPicker
                  catalog={tagsForPicker}
                  value={d.tags ?? []}
                  disabled={!canEdit}
                  onToggle={(t) => toggleDishTag(i, t)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={!canEdit}
            className="rounded-lg border border-dashed border-amber-400 px-3 py-1.5 text-xs text-amber-800"
            onClick={() => setDishes((prev) => [...prev, { name: "", tags: [] }])}
          >
            + 添加菜品
          </button>
        </div>

        {previewMode ? null : (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-amber-900/10 pt-4">
            <Link
              href="/account/shop-manage"
              className="rounded-xl bg-amber-600 px-4 py-3 text-base font-semibold text-white hover:bg-amber-700 max-md:text-[15px]"
            >
              进入店铺管理
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
