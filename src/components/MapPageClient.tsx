"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { Building, Floor, MapShape, Shop } from "@/lib/types";
import type { ShopPriceDisplay, ShopRating } from "@/lib/ratings";

const IndoorMapViewer = dynamic(() => import("@/components/IndoorMapViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-amber-800/70">
      地图加载中…
    </div>
  ),
});

type Props = {
  buildings: Building[];
  floors: Floor[];
  shapes: MapShape[];
  shops: Shop[];
  highlightShopId: string | null;
  ratings: Record<string, ShopRating>;
  priceDisplays: Record<string, ShopPriceDisplay | null>;
};

export function MapPageClient({
  buildings,
  floors,
  shapes,
  shops,
  highlightShopId,
  ratings,
  priceDisplays,
}: Props) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <IndoorMapViewer
        buildings={buildings}
        floors={floors}
        shapes={shapes}
        shops={shops}
        highlightShopId={highlightShopId}
        ratings={ratings}
        priceDisplays={priceDisplays}
      />
    </div>
  );
}
