"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { AccountBackLink } from "@/components/AccountBackLink";
import { useAuth } from "@/components/AuthProvider";
import type { Shop } from "@/lib/types";

export default function AccountFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<{ shop: Shop; fav: boolean; want: boolean }[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      return;
    }
    setLoadErr(null);
    try {
      const [marksRes, shopsRes] = await Promise.all([
        fetch(eatmapUrl("/api/me/shop-marks"), { credentials: "include" }),
        fetch(eatmapUrl("/api/shops")),
      ]);
      if (!marksRes.ok) {
        setLoadErr("无法加载收藏列表");
        setRows([]);
        return;
      }
      const marks = (await marksRes.json()) as {
        favoriteShopIds?: string[];
        wantShopIds?: string[];
      };
      const fav = new Set(marks.favoriteShopIds ?? []);
      const want = new Set(marks.wantShopIds ?? []);
      const ids = [...new Set([...fav, ...want])];
      if (!shopsRes.ok || ids.length === 0) {
        setRows([]);
        return;
      }
      const all = (await shopsRes.json()) as Shop[];
      const list = all.filter((s) => ids.includes(s.id));
      setRows(
        list.map((shop) => ({
          shop,
          fav: fav.has(shop.id),
          want: want.has(shop.id),
        })),
      );
    } catch {
      setLoadErr("网络错误");
      setRows([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener("eatmap-shop-marks-changed", onChange);
    return () => window.removeEventListener("eatmap-shop-marks-changed", onChange);
  }, [load]);

  if (authLoading) {
    return (
      <div className="space-y-4 px-4 pb-6 md:px-0">
        <p className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-sm text-amber-800/80">
          加载中…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 px-4 pb-6 md:px-0">
        <div className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-amber-900/10 bg-white px-3 py-2 shadow-sm max-md:gap-1.5 max-md:px-2.5">
          <AccountBackLink className="min-h-0 shrink-0 py-1 text-sm max-md:text-[13px]" />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 max-md:h-8 max-md:w-8">
            <Heart className="h-[18px] w-[18px] max-md:h-4 max-md:w-4" aria-hidden />
          </span>
          <h1 className="min-w-0 text-lg font-bold leading-none text-amber-950 max-md:text-base">想吃</h1>
        </div>
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-amber-950">登录后查看收藏与想吃</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href={`/login?next=${encodeURIComponent("/account/favorites")}`}
              className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
            >
              注册
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-6 md:px-0">
      <div className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-amber-900/10 bg-white px-3 py-2 shadow-sm max-md:gap-1.5 max-md:px-2.5">
        <AccountBackLink className="min-h-0 shrink-0 py-1 text-sm max-md:text-[13px]" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 max-md:h-8 max-md:w-8">
          <Heart className="h-[18px] w-[18px] max-md:h-4 max-md:w-4" aria-hidden />
        </span>
        <h1 className="min-w-0 text-lg font-bold leading-none text-amber-950 max-md:text-base">想吃</h1>
      </div>

      <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        {loadErr ? (
          <p className="text-center text-sm text-red-600">{loadErr}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-amber-800/65 max-md:text-xs">
            暂无记录，在店铺页点击收藏或想吃即可在这里查看。
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ shop, fav, want }) => (
              <li key={shop.id}>
                <Link
                  href={`/shop/${shop.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-900/10 bg-[#fffaf3] px-4 py-3.5 leading-snug max-md:px-3.5 max-md:py-3"
                >
                  <span className="min-w-0 flex-1 text-base font-semibold text-amber-950 max-md:text-[15px]">
                    {shop.name}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-amber-800/90 max-md:text-[13px]">
                    {[fav ? "收藏" : "", want ? "想吃" : ""].filter(Boolean).join(" · ") || "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
