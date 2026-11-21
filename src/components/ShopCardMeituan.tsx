import Image from "next/image";
import Link from "next/link";
import { resolveEatmapMediaUrl } from "@/lib/base-path";
import { MapPin, Star } from "lucide-react";
import { aggregatedPublicDishTags } from "@/lib/shop-dish-tags";
import { shopBuildingFloorLabel } from "@/lib/shop-location";
import type { Floor, Shop } from "@/lib/types";
import type { ShopPriceDisplay, ShopRating } from "@/lib/ratings";

function unopt(src: string) {
  return src.includes("/api/");
}

export function ShopCardMeituan({
  shop,
  floors,
  rating,
  priceDisplay,
}: {
  shop: Shop;
  floors: Floor[];
  rating?: ShopRating;
  priceDisplay?: ShopPriceDisplay | null;
}) {
  const score = rating && rating.count > 0 ? `${rating.avg}` : null;
  const cardTags = aggregatedPublicDishTags(shop);

  const priceLine = priceDisplay
    ? priceDisplay.kind === "combined"
      ? `均价 ¥${priceDisplay.rounded}/人`
      : `参考均价 ¥${priceDisplay.rounded}/人`
    : null;

  return (
    <article className="overflow-hidden rounded-xl border border-amber-900/10 bg-white shadow-sm max-md:rounded-lg">
      <Link href={`/shop/${shop.id}`} className="block px-2.5 py-2 max-md:px-2 max-md:py-1.5">
        <div className="flex gap-2 max-md:gap-1.5">
          <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-amber-50 max-md:h-14 max-md:w-14">
            {shop.coverImage ? (
              <Image
                src={resolveEatmapMediaUrl(shop.coverImage)}
                alt=""
                width={168}
                height={168}
                className="absolute inset-0 h-full w-full object-cover"
                sizes="72px"
                unoptimized={unopt(shop.coverImage)}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-amber-200 to-orange-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-amber-950 max-md:text-sm">
                {shop.name}
              </h3>
              <span className="shrink-0 text-xs font-medium tabular-nums text-amber-800 max-md:text-[11px]">
                {priceLine ?? <span className="text-amber-800/50">暂无参考价</span>}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] max-md:mt-0.5 max-md:text-[10px]">
              <span className="inline-flex min-w-0 flex-1 items-center gap-0.5 truncate text-amber-800/75">
                <MapPin className="h-3 w-3 shrink-0 opacity-70 max-md:h-2.5 max-md:w-2.5" aria-hidden />
                <span className="truncate">{shopBuildingFloorLabel(shop, floors)}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap tabular-nums text-amber-900">
                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500 max-md:h-2.5 max-md:w-2.5" aria-hidden />
                {score ? (
                  <span>
                    <span className="font-semibold">{score}</span>
                    <span className="text-amber-800/65">分（{rating?.count}条）</span>
                  </span>
                ) : (
                  <span className="text-amber-800/60">暂无评分</span>
                )}
              </span>
            </div>
            <div className="mt-1.5 flex min-h-[1.125rem] flex-wrap items-center gap-1 max-md:mt-1">
              {cardTags.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] leading-snug text-amber-900/85 ring-1 ring-amber-900/10 max-md:text-[9px]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
      <div className="border-t border-amber-900/8 px-1.5 pb-1 pt-0.5 max-md:px-1 max-md:pb-0.5 max-md:pt-px">
        <div className="-mx-0.5 flex gap-2 overflow-x-auto px-1 pb-0.5 max-md:gap-1.5">
          {shop.dishes.map((d) => (
            <div
              key={`${shop.id}-${d.name}`}
              className="min-w-[calc((100%-0.75rem)/3.45)] max-w-[38%] shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-amber-900/10"
            >
              <Link href={`/shop/${shop.id}`} className="block">
                <div className="relative aspect-[5/4] w-full overflow-hidden bg-amber-100">
                  {d.image ? (
                    <Image
                      src={resolveEatmapMediaUrl(d.image)}
                      alt=""
                      width={240}
                      height={192}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      sizes="(max-width: 768px) 28vw, 120px"
                      unoptimized={unopt(d.image)}
                    />
                  ) : (
                    <div className="flex aspect-[5/4] w-full items-center justify-center text-[9px] text-amber-700/45">
                      无图
                    </div>
                  )}
                </div>
                <div className="px-1.5 py-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-amber-950 max-md:text-[11px]">
                    {d.name}
                  </p>
                  {d.price != null ? (
                    <p className="mt-0.5 text-[10px] font-semibold tabular-nums leading-none text-amber-800 max-md:text-[9px]">
                      ¥{d.price}
                    </p>
                  ) : null}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
