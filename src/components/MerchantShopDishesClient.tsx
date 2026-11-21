"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AccountBackLink } from "@/components/AccountBackLink";
import { DishTagsPicker } from "@/components/DishTagsPicker";
import { MERCHANT_HIDDEN_SHOP_TAGS } from "@/lib/shop-tags";
import type { Dish, Shop } from "@/lib/types";

function cleanDishes(raw: Dish[]): Dish[] {
  return raw
    .map((d) => {
      const n = d.price != null ? Number(d.price) : NaN;
      const price = Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
      const tagList = [...new Set((d.tags ?? []).filter(Boolean))].sort();
      return { name: d.name.trim(), price, image: d.image?.trim() || undefined, tags: tagList };
    })
    .filter((d) => d.name.length > 0);
}

export function MerchantShopDishesClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [dishUploadBusy, setDishUploadBusy] = useState<number | null>(null);
  const [tagsCatalog, setTagsCatalog] = useState<string[]>([]);
  const hydrated = useRef(false);
  const lastSent = useRef("");

  const tagsForPicker = useMemo(
    () => tagsCatalog.filter((t) => !MERCHANT_HIDDEN_SHOP_TAGS.has(t)),
    [tagsCatalog],
  );

  const patchDish = useCallback((i: number, patch: Partial<Dish>) => {
    setDishes((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/account/shop-dishes");
      return;
    }
    if (user.role !== "merchant") {
      router.replace("/account");
      return;
    }
    void (async () => {
      try {
        const [mr, tr] = await Promise.all([
          fetch(eatmapUrl("/api/shops/mine"), { credentials: "include" }),
          fetch(eatmapUrl("/api/tags")),
        ]);
        if (tr.ok) setTagsCatalog(await tr.json());
        if (!mr.ok) {
          setLoadErr("加载失败");
          return;
        }
        const mine = (await mr.json()) as Shop[];
        if (mine.length === 0) {
          setShopId(null);
          hydrated.current = true;
          return;
        }
        const id = mine[0]!.id;
        setShopId(id);
        const sr = await fetch(eatmapUrl(`/api/shops/${id}`), { credentials: "include" });
        if (!sr.ok) {
          setLoadErr("加载店铺失败");
          return;
        }
        const s = (await sr.json()) as Shop;
        setDishes(s.dishes?.length ? [...s.dishes] : []);
        lastSent.current = JSON.stringify(cleanDishes(s.dishes?.length ? [...s.dishes] : []));
        hydrated.current = true;
      } catch {
        setLoadErr("网络错误");
      }
    })();
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!hydrated.current || !shopId) return;
    const json = JSON.stringify(cleanDishes(dishes));
    if (json === lastSent.current) return;
    const t = setTimeout(() => {
      void (async () => {
        setErr(null);
        try {
          const res = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ dishes: cleanDishes(dishes) }),
          });
          if (!res.ok) {
            setErr("保存失败");
            return;
          }
          lastSent.current = json;
          setMsg("已自动保存");
        } catch {
          setErr("网络错误");
        }
      })();
    }, 700);
    return () => clearTimeout(t);
  }, [dishes, shopId]);

  async function uploadDishImage(index: number, file: File | null) {
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

  if (authLoading || !user) {
    return (
      <div className="px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-base text-amber-800/80">加载中…</div>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="space-y-4 px-4 pb-6 md:px-0">
        <AccountBackLink />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">{loadErr}</p>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="space-y-4 px-4 pb-6 md:px-0">
        <AccountBackLink />
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-amber-950">请先创建店铺</p>
          <p className="mt-2 text-base leading-relaxed text-amber-800/85">
            创建店铺后即可在此维护菜品名称、价格与配图。
          </p>
          <Link
            href="/account/setup-shop"
            className="mt-4 inline-flex rounded-xl bg-amber-600 px-5 py-3 text-base font-semibold text-white hover:bg-amber-700"
          >
            去创建店铺
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-8 md:px-0">
      <AccountBackLink />
      {(msg || err) ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {msg ? <span className="text-emerald-800">{msg}</span> : null}
          {err ? <span className="text-red-600">{err}</span> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {dishes.map((d, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-amber-900/12 bg-[#fffaf3] p-3 shadow-sm max-md:gap-2"
          >
              <label className="group relative h-[88px] w-[112px] shrink-0 cursor-pointer overflow-hidden rounded-lg bg-amber-50 ring-1 ring-amber-900/15 max-md:h-20 max-md:w-[96px]">
                {d.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveEatmapMediaUrl(d.image)} alt="" className="h-full w-full object-cover" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent py-3 pt-5 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                      点击更换
                    </span>
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                    <ImagePlus className="h-6 w-6 text-amber-600/65" aria-hidden />
                    <span className="text-xs leading-tight text-amber-800/75">配图</span>
                  </span>
                )}
                {dishUploadBusy === i ? (
                  <span className="absolute inset-0 z-[1] flex items-center justify-center bg-white/80 text-sm font-medium text-amber-900">
                    上传中…
                  </span>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={dishUploadBusy !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    void uploadDishImage(i, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[140px] flex-1 text-sm max-md:text-[15px]">
                    <span className="text-amber-800/75">名称</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-2 text-base max-md:text-[15px]"
                      value={d.name}
                      onChange={(e) =>
                        setDishes((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                      }
                    />
                  </label>
                  <label className="w-[5.5rem] text-sm max-md:text-[15px]">
                    <span className="text-amber-800/75">价格</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-2 text-base max-md:text-[15px]"
                      value={d.price ?? ""}
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
                    className="mb-0.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 max-md:text-[15px]"
                    onClick={() => setDishes((prev) => prev.filter((_, j) => j !== i))}
                  >
                    删除
                  </button>
                </div>
                {d.image ? (
                  <button
                    type="button"
                    className="self-start text-sm text-amber-800/85 underline decoration-amber-600/35 max-md:text-[15px]"
                    onClick={() => patchDish(i, { image: undefined })}
                  >
                    移除配图
                  </button>
                ) : null}
                <DishTagsPicker
                  catalog={tagsForPicker}
                  value={d.tags ?? []}
                  onToggle={(t) =>
                    patchDish(i, {
                      tags: (d.tags ?? []).includes(t)
                        ? (d.tags ?? []).filter((x) => x !== t)
                        : [...(d.tags ?? []), t],
                    })
                  }
                />
              </div>
          </div>
        ))}
        <button
          type="button"
          className="w-full rounded-xl border border-dashed border-amber-400 py-3 text-base font-medium text-amber-800 max-md:text-[15px]"
          onClick={() => setDishes((prev) => [...prev, { name: "", tags: [] }])}
        >
          + 添加菜品
        </button>
      </div>
    </div>
  );
}
