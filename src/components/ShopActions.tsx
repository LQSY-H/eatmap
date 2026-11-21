"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Heart, MapPinned } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { eatmapUrl } from "@/lib/base-path";

const LEGACY_FAV = "eatmap:favorites";
const LEGACY_WANT = "eatmap:want";

function readLegacyIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.trim()) : [];
  } catch {
    return [];
  }
}

function emitMarksChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("eatmap-shop-marks-changed"));
  }
}

export function ShopActions({ shopId }: { shopId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [fav, setFav] = useState(false);
  const [want, setWant] = useState(false);

  const syncFromServer = useCallback(async () => {
    if (!user) {
      setFav(false);
      setWant(false);
      return;
    }
    try {
      const mergeKey = `eatmap:local-marks-merged:${user.id}`;
      if (!sessionStorage.getItem(mergeKey)) {
        const lf = readLegacyIds(LEGACY_FAV);
        const lw = readLegacyIds(LEGACY_WANT);
        if (lf.length > 0 || lw.length > 0) {
          const mergeRes = await fetch(eatmapUrl("/api/me/shop-marks"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ favoriteShopIds: lf, wantShopIds: lw }),
          });
          if (mergeRes.ok) {
            localStorage.removeItem(LEGACY_FAV);
            localStorage.removeItem(LEGACY_WANT);
            sessionStorage.setItem(mergeKey, "1");
          }
        } else {
          sessionStorage.setItem(mergeKey, "1");
        }
      }

      const res = await fetch(eatmapUrl("/api/me/shop-marks"), { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { favoriteShopIds?: string[]; wantShopIds?: string[] };
      const fs = new Set(data.favoriteShopIds ?? []);
      const ws = new Set(data.wantShopIds ?? []);
      setFav(fs.has(shopId));
      setWant(ws.has(shopId));
    } catch {
      /* ignore */
    }
  }, [user, shopId]);

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || `/shop/${shopId}`)}`;

  function requireLogin(fn: () => void) {
    if (!user) {
      router.push(loginHref);
      return;
    }
    fn();
  }

  async function patchMark(kind: "favorite" | "want", nextAdd: boolean) {
    if (!user) return;
    const prevFav = fav;
    const prevWant = want;
    setFav(kind === "favorite" ? nextAdd : fav);
    setWant(kind === "want" ? nextAdd : want);
    try {
      const res = await fetch(eatmapUrl("/api/me/shop-marks"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ shopId, kind, add: nextAdd }),
      });
      if (!res.ok) {
        setFav(prevFav);
        setWant(prevWant);
        return;
      }
      const data = (await res.json()) as { favoriteShopIds?: string[]; wantShopIds?: string[] };
      const fs = new Set(data.favoriteShopIds ?? []);
      const ws = new Set(data.wantShopIds ?? []);
      setFav(fs.has(shopId));
      setWant(ws.has(shopId));
      emitMarksChanged();
    } catch {
      setFav(prevFav);
      setWant(prevWant);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => requireLogin(() => void patchMark("favorite", !fav))}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${
          fav
            ? "bg-amber-100 text-amber-950 ring-amber-300"
            : "bg-white text-amber-900 ring-amber-900/15 hover:bg-amber-50"
        }`}
      >
        <Bookmark className={`h-4 w-4 ${fav ? "fill-amber-500 text-amber-600" : ""}`} aria-hidden />
        {fav ? "已收藏" : "收藏"}
      </button>
      <button
        type="button"
        onClick={() => requireLogin(() => void patchMark("want", !want))}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${
          want
            ? "bg-orange-100 text-orange-950 ring-orange-300"
            : "bg-white text-amber-900 ring-amber-900/15 hover:bg-orange-50/80"
        }`}
      >
        <Heart className={`h-4 w-4 ${want ? "fill-orange-500 text-orange-600" : ""}`} aria-hidden />
        {want ? "已标记想吃" : "想吃"}
      </button>
      <Link
        href={`/map?shop=${encodeURIComponent(shopId)}`}
        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
      >
        <MapPinned className="h-4 w-4 text-amber-700" aria-hidden />
        在地图中查看
      </Link>
    </div>
  );
}
