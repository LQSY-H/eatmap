"use client";

import Link from "next/link";
import { RefreshCw, Search, Shuffle } from "lucide-react";
import type { Building } from "@/lib/types";

type Props = {
  buildings: Building[];
  buildingId: string | null;
  onBuildingChange: (id: string | null) => void;
  categories: string[];
  category: string | null;
  onCategoryChange: (c: string | null) => void;
  search: string;
  onSearchChange: (q: string) => void;
};

export function FeedToolbar({
  buildings,
  buildingId,
  onBuildingChange,
  categories,
  category,
  onCategoryChange,
  search,
  onSearchChange,
}: Props) {
  const chipBase =
    "rounded-full px-3 py-1.5 text-sm font-medium leading-none ring-1 transition max-md:px-2.5 max-md:py-1 max-md:text-xs min-h-[34px] max-md:min-h-[30px] inline-flex items-center justify-center";

  return (
    <div className="space-y-3 rounded-2xl border border-amber-900/10 bg-white/80 p-3 shadow-sm backdrop-blur-sm max-md:space-y-2 max-md:rounded-xl max-md:p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-amber-950 max-md:text-sm">
            餐厅定位
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-amber-800/70 max-md:text-[11px]">
            选择区域与分类，或通过搜索找店
          </p>
        </div>
        <Link
          href="/feed/random"
          className="inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm max-md:min-h-[46px] max-md:px-3.5 max-md:py-2 max-md:text-xs"
        >
          <Shuffle className="h-4 w-4 shrink-0 max-md:h-3.5 max-md:w-3.5" aria-hidden />
          随机菜品
        </Link>
      </div>

      <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-900/12 bg-[#fffaf3] px-3 py-2 max-md:min-h-[40px] max-md:py-1.5">
        <Search className="h-4 w-4 shrink-0 text-amber-600 max-md:h-3.5 max-md:w-3.5" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索店名、分类…"
          className="min-w-0 flex-1 bg-transparent text-base text-amber-950 outline-none placeholder:text-amber-800/45 max-md:text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2 max-md:gap-1.5">
        <button
          type="button"
          onClick={() => onBuildingChange(null)}
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
            onClick={() => onBuildingChange(b.id)}
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

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-950 max-md:text-xs">
          <RefreshCw className="h-4 w-4 shrink-0 text-amber-600 max-md:h-3.5 max-md:w-3.5" aria-hidden />
          美食分类
        </div>
        <div className="flex flex-wrap gap-2 max-md:gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={`${chipBase} ${
              category == null
                ? "bg-orange-100 text-orange-950 ring-orange-200"
                : "bg-white text-amber-900 ring-amber-900/15 hover:bg-orange-50/80"
            }`}
          >
            全部
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCategoryChange(c)}
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
    </div>
  );
}
