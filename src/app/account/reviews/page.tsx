"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { AccountBackLink } from "@/components/AccountBackLink";
import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { Review, Shop } from "@/lib/types";

export default function AccountReviewsPage() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<Review[]>([]);
  const [shopNames, setShopNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const [revRes, shopsRes] = await Promise.all([
      fetch(eatmapUrl("/api/reviews?mine=1"), { credentials: "include" }),
      fetch(eatmapUrl("/api/shops")),
    ]);
    if (!revRes.ok) {
      setErr("加载失败");
      return;
    }
    setList((await revRes.json()) as Review[]);
    if (shopsRes.ok) {
      const shops = (await shopsRes.json()) as Shop[];
      const m: Record<string, string> = {};
      for (const s of shops) m[s.id] = s.name;
      setShopNames(m);
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    void load();
  }, [loading, user, load]);

  async function removeReview(id: string) {
    if (!window.confirm("确定删除这条评价？删除后不可恢复。")) return;
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      setErr("删除失败（只能删除本人发布的评价）");
      return;
    }
    setList((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading || !user) {
    return (
      <div className="px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-sm text-amber-800/80">
          加载中…
        </div>
      </div>
    );
  }

  const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4 px-4 pb-6 md:px-0">
      <div className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-amber-900/10 bg-white px-3 py-2 shadow-sm max-md:gap-1.5 max-md:px-2.5">
        <AccountBackLink className="min-h-0 shrink-0 py-1 text-sm max-md:text-[13px]" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 max-md:h-8 max-md:w-8">
          <MessageSquareText className="h-[18px] w-[18px] max-md:h-4 max-md:w-4" aria-hidden />
        </span>
        <h1 className="min-w-0 text-lg font-bold leading-none text-amber-950 max-md:text-base">评价</h1>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-amber-900/10 bg-white p-6 text-sm text-amber-800/75">
          暂无评价。去店铺页即可撰写评价。
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((r) => (
            <li
              key={r.id}
              className="flex flex-col rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/shop/${r.shopId}`}
                  className="min-w-0 flex-1 truncate text-base font-semibold text-amber-900 hover:underline max-md:text-[15px]"
                >
                  {shopNames[r.shopId] ?? r.shopId}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span className="whitespace-nowrap text-sm font-medium tabular-nums text-amber-800 max-md:text-xs">
                    ★ {r.rating}/5
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.visible ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-800"
                    }`}
                  >
                    {r.visible ? "展示中" : "已隐藏"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{r.content}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <time className="text-xs text-amber-800/60" dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleString("zh-CN")}
                </time>
                <button
                  type="button"
                  onClick={() => void removeReview(r.id)}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200/80 hover:bg-red-50 max-md:py-1"
                  aria-label="删除评价"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
