"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AccountBackLink } from "@/components/AccountBackLink";
import type { Review, Shop } from "@/lib/types";

export function MerchantAccountReviewsClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [list, setList] = useState<Review[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  const shopNameById = useMemo(() => new Map(shops.map((s) => [s.id, s.name])), [shops]);

  const load = useCallback(async () => {
    setErr(null);
    const [mr, rr] = await Promise.all([
      fetch(eatmapUrl("/api/shops/mine"), { credentials: "include" }),
      fetch(eatmapUrl("/api/reviews?forMerchant=1"), { credentials: "include" }),
    ]);
    if (!mr.ok || !rr.ok) {
      setErr("加载失败");
      return;
    }
    setShops((await mr.json()) as Shop[]);
    setList((await rr.json()) as Review[]);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== "merchant") {
      router.replace("/account");
      return;
    }
    void load();
  }, [loading, user, router, load]);

  async function requestHide(id: string) {
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "request_hide" }),
    });
    if (!res.ok) {
      setErr("申请失败（仅可对展示中的评价申请）");
      return;
    }
    const row = (await res.json()) as Review;
    setList((prev) => prev.map((r) => (r.id === id ? row : r)));
    setErr(null);
  }

  const filtered = useMemo(() => {
    const base = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (starFilter === 0) return base;
    return base.filter((r) => r.rating === starFilter);
  }, [list, starFilter]);

  if (loading || !user) {
    return (
      <div className="px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-base text-amber-800/80">
          加载中…
        </div>
      </div>
    );
  }

  const stars: Array<0 | 1 | 2 | 3 | 4 | 5> = [0, 5, 4, 3, 2, 1];

  return (
    <div className="space-y-3 px-4 pb-8 md:px-0">
      <AccountBackLink />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-amber-900/10 py-2 pb-4">
        <h1 className="text-base font-semibold text-amber-950 shrink-0">店铺评价</h1>
        <span className="hidden sm:inline self-center text-xs text-amber-800/60 shrink-0">星级</span>
        <div className="flex min-h-[3rem] min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stars.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStarFilter(s)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                starFilter === s
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-[#fffaf3] text-amber-900 ring-1 ring-amber-900/12 hover:bg-amber-50"
              }`}
            >
              {s === 0 ? "全部" : `${s} 星`}
            </button>
          ))}
        </div>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-800">{err}</p>
      ) : null}

      {shops.length === 0 ? (
        <div className="rounded-xl border border-amber-900/10 bg-white p-4 text-sm text-amber-800/85">
          <p className="font-medium text-amber-950">暂无绑定店铺</p>
          <p className="mt-1 text-xs text-amber-800/75">创建店铺后即可查看顾客评价。</p>
          <Link href="/account/setup-shop" className="mt-3 inline-block text-sm font-semibold text-amber-800 underline">
            去创建店铺
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-amber-900/10 bg-white px-4 py-3 text-sm text-amber-800/75">
          {list.length === 0 ? "暂无评价。" : "当前星级下暂无评价。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-amber-900/10 bg-white p-3.5 shadow-sm max-md:p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-amber-950">
                <span>{r.userName}</span>
                <span className="text-amber-800">★ {r.rating}/5</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    r.visible ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-800"
                  }`}
                >
                  {r.visible ? "展示中" : "已隐藏"}
                </span>
                {r.hideRequestedAt ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-900">
                    隐藏审核中
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-amber-800/75">{shopNameById.get(r.shopId) ?? r.shopId}</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{r.content}</p>
              <p className="mt-2 text-[11px] text-amber-800/60">
                {new Date(r.createdAt).toLocaleString("zh-CN")}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Link
                  href={`/shop/${r.shopId}`}
                  className="inline-flex items-center rounded-lg bg-[#fffaf3] px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-900/15 hover:bg-amber-50"
                >
                  查看店铺页
                </Link>
                <button
                  type="button"
                  disabled={!r.visible || Boolean(r.hideRequestedAt)}
                  onClick={() => void requestHide(r.id)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {r.hideRequestedAt ? "已申请隐藏" : "申请隐藏评价"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
