import { MapPageClient } from "@/components/MapPageClient";
import { getBuildings, getFloors, getMapShapes, getPublicShops, getReviews } from "@/lib/data";
import { ratingsFromReviews, shopPriceDisplays } from "@/lib/ratings";

type Search = Promise<{ shop?: string | string[] }>;

function firstQueryParam(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  const s = Array.isArray(v) ? v[0] : v;
  const t = typeof s === "string" ? s.trim() : "";
  return t || null;
}

export default async function MapPage({ searchParams }: { searchParams: Search }) {
  const [buildings, floors, shapes, shops, reviews] = await Promise.all([
    getBuildings(),
    getFloors(),
    getMapShapes(),
    getPublicShops(),
    getReviews(),
  ]);
  const sp = await searchParams;
  const ratings = ratingsFromReviews(reviews);
  const priceDisplays = shopPriceDisplays(shops, reviews);

  return (
    <MapPageClient
      buildings={buildings}
      floors={floors}
      shapes={shapes}
      shops={shops}
      highlightShopId={firstQueryParam(sp.shop)}
      ratings={ratings}
      priceDisplays={priceDisplays}
    />
  );
}
