"use client";

import Image from "next/image";
import Link from "next/link";
import { resolveEatmapMediaUrl } from "@/lib/base-path";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, RefreshCw, Shuffle } from "lucide-react";
import { collectCategoryOptionsFromShops } from "@/lib/shop-dish-tags";
import { shopBuildingFloorLabel } from "@/lib/shop-location";
import type { Building, Floor, Shop } from "@/lib/types";

function imgUnopt(src: string) {
  return src.includes("/api/");
}

type DishPick = {
  shop: Shop;
  dish: string;
  price?: number;
  image?: string;
};

type Props = {
  shops: Shop[];
  buildings: Building[];
  floors: Floor[];
};

/** FNV-1a 32-bit — 同一字符串在 Node / 浏览器结果一致 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates，线性同余「随机」——相同 seed 产物一致，避免 SSR / hydration 不一致 */
function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed >>> 0;
  const rnd = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const chipBase =
  "rounded-full px-3 py-1.5 text-sm font-medium leading-none ring-1 transition max-md:px-2.5 max-md:py-1 max-md:text-xs min-h-[34px] max-md:min-h-[30px] inline-flex items-center justify-center";

export function RandomDishesClient({ shops, buildings, floors }: Props) {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [dice, setDice] = useState(0);

  const categories = useMemo(() => collectCategoryOptionsFromShops(shops), [shops]);

  const pool = useMemo(() => {
    const rows: DishPick[] = [];
    shops.forEach((shop) => {
      if (buildingId && shop.buildingId !== buildingId) return;
      shop.dishes.forEach((d) => {
        if (category && !(d.tags ?? []).includes(category)) return;
        rows.push({
          shop,
          dish: d.name,
          price: d.price,
          image: d.image?.trim() || undefined,
        });
      });
    });
    return rows;
  }, [shops, buildingId, category]);

  const sample = useMemo(() => {
    if (pool.length === 0) return [];
    const identity = pool
      .map((r) => `${r.shop.id}\t${r.dish}`)
      .sort()
      .join("|");
    const seed = hashString(`${identity}#${dice}`);
    const shuffled = shuffleDeterministic(pool, seed);
    return shuffled.slice(0, Math.min(9, shuffled.length));
  }, [pool, dice]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 pt-5 pb-16 max-md:w-full max-md:space-y-3 max-md:px-2 max-md:pt-3 max-md:pb-12">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/"))}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-50 max-md:px-2.5 max-md:py-1 max-md:text-[11px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          返回
        </button>
      </div>
      <div className="rounded-xl border border-amber-900/10 bg-white p-3 shadow-sm max-md:p-2.5">
        <h1 className="text-lg font-semibold text-amber-950 max-md:text-base">随机菜品</h1>
        <p className="mt-1 text-sm leading-snug text-amber-800/75 max-md:text-xs">
          先选区域与分类，再随机抽签；点击卡片进入店铺。
        </p>
      </div>

      <div className="rounded-xl border border-amber-900/10 bg-white/90 p-3 shadow-sm max-md:p-2.5">
        <p className="mb-2 text-sm font-semibold text-amber-950 max-md:text-xs">区域</p>
        <div className="flex flex-wrap gap-2 max-md:gap-1.5">
          <button
            type="button"
            onClick={() => setBuildingId(null)}
            className={`${chipBase} ${
              buildingId == null
                ? "bg-amber-600 text-white ring-amber-600"
                : "bg-white text-amber-900 ring-amber-900/15 hover:bg-amber-50"
            }`}
          >
            全校
          </button>
          {buildings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBuildingId(b.id)}
              className={`${chipBase} ${
                buildingId === b.id
                  ? "bg-amber-600 text-white ring-amber-600"
                  : "bg-white text-amber-900 ring-amber-900/15 hover:bg-amber-50"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-900/10 bg-white/90 p-3 shadow-sm max-md:p-2.5">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-950 max-md:text-xs">
          <RefreshCw className="h-4 w-4 shrink-0 text-amber-600 max-md:h-3.5 max-md:w-3.5" aria-hidden />
          美食分类
        </div>
        <div className="flex flex-wrap gap-2 max-md:gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`${chipBase} ${
              category == null
                ? "bg-orange-100 text-orange-950 ring-orange-200"
                : "bg-white text-amber-900 ring-amber-900/15 hover:bg-orange-50/80"
            }`}
          >
            全部分类
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`${chipBase} ${
                category === c
                  ? "bg-orange-100 text-orange-950 ring-orange-200"
                  : "bg-white text-amber-900 ring-amber-900/15 hover:bg-orange-50/80"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDice((d) => d + 1)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-base font-semibold text-white shadow-sm max-md:min-h-[44px] max-md:text-sm"
      >
        <Shuffle className="h-5 w-5 shrink-0 max-md:h-4 max-md:w-4" aria-hidden />
        换一批
      </button>

      {sample.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-8 text-center text-sm text-amber-900/70 max-md:text-xs">
          当前分类下没有菜品数据。
        </p>
      ) : (
        <ul className="grid w-full grid-cols-3 gap-2 md:gap-4">
          {sample.map((row, i) => (
            <li key={`${row.shop.id}-${row.dish}-${i}`} className="min-w-0">
              <Link
                href={`/shop/${row.shop.id}`}
                className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-amber-900/12 bg-white shadow-md shadow-amber-950/[0.06] ring-1 ring-amber-900/[0.06] transition hover:border-amber-400/35 hover:shadow-lg max-md:rounded-lg"
              >
                <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gradient-to-b from-amber-50 to-amber-100/90">
                  {row.image ? (
                    <Image
                      src={resolveEatmapMediaUrl(row.image)}
                      alt=""
                      width={400}
                      height={400}
                      className="absolute inset-0 h-full w-full object-cover"
                      sizes="(max-width:640px) 32vw, 200px"
                      unoptimized={imgUnopt(row.image)}
                    />
                  ) : (
                    <div className="flex h-full min-h-[4.25rem] items-center justify-center px-1 text-center text-[11px] font-medium leading-tight text-amber-700/50 max-md:min-h-[3.75rem] max-md:text-[10px]">
                      无图
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 border-t border-amber-900/8 bg-[#fffefa] px-2 py-2 md:gap-2 md:px-3 md:py-3">
                  <p
                    className="line-clamp-2 text-sm font-semibold leading-snug text-amber-950 md:text-base md:leading-snug"
                    title={row.dish}
                  >
                    {row.dish}
                  </p>
                  <p className="flex min-h-0 items-start gap-1 text-[11px] leading-snug text-amber-800/85 md:text-sm md:leading-snug">
                    <MapPin
                      className="mt-0.5 h-3 w-3 shrink-0 text-amber-600/80 md:h-3.5 md:w-3.5"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 break-words line-clamp-2">
                      {shopBuildingFloorLabel(row.shop, floors)}
                    </span>
                  </p>
                  {row.price != null ? (
                    <p className="mt-0.5 text-xs font-bold tabular-nums leading-snug text-amber-900 md:mt-1 md:text-sm md:leading-snug">
                      ¥{row.price}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-800/60 md:mt-1 md:text-sm">
                      价格到店看
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
