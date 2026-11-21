"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Building, Floor, Shop } from "@/lib/types";
import { collectCategoryOptionsFromShops, shopHasDishWithCategory } from "@/lib/shop-dish-tags";
import type { ShopPriceDisplay, ShopRating } from "@/lib/ratings";
import { FeedToolbar } from "./FeedToolbar";
import { ShopCardMeituan } from "./ShopCardMeituan";

const SHOP_PAGE_SIZE = 10;

function shuffleIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function useShopBrowse(shops: Shop[]) {
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categories = useMemo(() => collectCategoryOptionsFromShops(shops), [shops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter((shop) => {
      if (buildingId && shop.buildingId !== buildingId) return false;
      if (!shopHasDishWithCategory(shop, category)) return false;
      if (q) {
        const inName = shop.name.toLowerCase().includes(q);
        const inDishTags = shop.dishes.some((d) =>
          (d.tags ?? []).some((t) => t.toLowerCase().includes(q)),
        );
        const inLegacyShopTags = shop.tags.some((t) => t.toLowerCase().includes(q));
        const inDishName = shop.dishes.some((d) => d.name.toLowerCase().includes(q));
        if (!inName && !inDishTags && !inLegacyShopTags && !inDishName) return false;
      }
      return true;
    });
  }, [shops, buildingId, category, search]);

  const filterKey = useMemo(() => {
    const ids = filtered.map((s) => s.id);
    return `${ids.length}\t${[...ids].sort().join("\t")}`;
  }, [filtered]);

  const [shuffledIds, setShuffledIds] = useState<string[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(SHOP_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShuffledIds(shuffleIds(filtered.map((s) => s.id)));
    setVisibleCount(SHOP_PAGE_SIZE);
  }, [filterKey, filtered]);

  const idsMatchShuffle = useMemo(() => {
    if (!shuffledIds || shuffledIds.length !== filtered.length) return false;
    const want = new Set(filtered.map((s) => s.id));
    if (want.size !== filtered.length) return false;
    for (const id of shuffledIds) {
      if (!want.has(id)) return false;
    }
    return true;
  }, [filtered, shuffledIds]);

  const displayShops = useMemo(() => {
    if (!idsMatchShuffle || !shuffledIds) {
      return filtered.slice(0, visibleCount);
    }
    const m = new Map(filtered.map((s) => [s.id, s]));
    return shuffledIds
      .slice(0, visibleCount)
      .map((id) => m.get(id))
      .filter((s): s is Shop => s != null);
  }, [filtered, shuffledIds, idsMatchShuffle, visibleCount]);

  const total = filtered.length;
  const hasMore = visibleCount < total;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + SHOP_PAGE_SIZE, total));
  }, [total]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, filterKey]);

  return {
    buildingId,
    setBuildingId,
    category,
    setCategory,
    search,
    setSearch,
    categories,
    filtered,
    displayShops,
    total,
    hasMore,
    loadMore,
    loadMoreRef,
  };
}

type GridProps = {
  floors: Floor[];
  ratings: Record<string, ShopRating>;
  priceDisplays: Record<string, ShopPriceDisplay | null>;
  sectionTitle?: string;
  browse: ReturnType<typeof useShopBrowse>;
};

export function ShopBrowseGrid({
  floors,
  ratings,
  priceDisplays,
  sectionTitle = "店铺",
  browse,
}: GridProps) {
  const { filtered, displayShops, total, hasMore, loadMore, loadMoreRef } = browse;

  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-amber-950 max-md:text-sm">{sectionTitle}</h2>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-3 py-6 text-center text-xs text-amber-900/70 max-md:py-5 max-md:text-[11px]">
          当前筛选下暂无店铺，试试更换条件或搜索关键词。
        </p>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 md:gap-3">
            {displayShops.map((shop) => (
              <ShopCardMeituan
                key={shop.id}
                shop={shop}
                floors={floors}
                rating={ratings[shop.id]}
                priceDisplay={priceDisplays[shop.id]}
              />
            ))}
          </div>
          {hasMore ? (
            <div ref={loadMoreRef} className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={loadMore}
                className="rounded-full border border-amber-900/15 bg-white px-5 py-2 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-50"
              >
                加载更多（{displayShops.length}/{total}）
              </button>
              <p className="text-[10px] text-amber-800/55">向下滚动将自动加载</p>
            </div>
          ) : total > SHOP_PAGE_SIZE ? (
            <p className="mt-3 text-center text-[10px] text-amber-800/55">已展示全部 {total} 家店铺</p>
          ) : null}
        </>
      )}
    </section>
  );
}

type ListProps = {
  shops: Shop[];
  buildings: Building[];
  floors: Floor[];
  ratings: Record<string, ShopRating>;
  priceDisplays: Record<string, ShopPriceDisplay | null>;
  sectionTitle?: string;
  className?: string;
};

export function ShopBrowseList({
  shops,
  buildings,
  floors,
  ratings,
  priceDisplays,
  sectionTitle = "店铺",
  className = "",
}: ListProps) {
  const browse = useShopBrowse(shops);

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <FeedToolbar
        buildings={buildings}
        buildingId={browse.buildingId}
        onBuildingChange={browse.setBuildingId}
        categories={browse.categories}
        category={browse.category}
        onCategoryChange={browse.setCategory}
        search={browse.search}
        onSearchChange={browse.setSearch}
      />
      <ShopBrowseGrid
        floors={floors}
        ratings={ratings}
        priceDisplays={priceDisplays}
        sectionTitle={sectionTitle}
        browse={browse}
      />
    </div>
  );
}
