"use client";

import { useMemo } from "react";
import type { Building, Floor, Shop } from "@/lib/types";
import type { FeedTopEntry } from "@/lib/feed-top-strip";
import type { ShopPriceDisplay, ShopRating } from "@/lib/ratings";
import type { FeedAnnouncementStripSettings } from "@/lib/site-settings";
import { FeedAnnouncementStrip } from "./FeedAnnouncementStrip";
import { FeedTopCarousel } from "./FeedTopCarousel";
import { FeedToolbar } from "./FeedToolbar";
import { ShopBrowseGrid, useShopBrowse } from "./ShopBrowseList";

type Props = {
  shops: Shop[];
  buildings: Building[];
  floors: Floor[];
  ratings: Record<string, ShopRating>;
  priceDisplays: Record<string, ShopPriceDisplay | null>;
  feedTopEntries: FeedTopEntry[];
  announcementStrip?: FeedAnnouncementStripSettings;
  feedAnnouncementStripEnabled: boolean;
};

export function FeedClient({
  shops,
  buildings,
  floors,
  ratings,
  priceDisplays,
  feedTopEntries,
  announcementStrip,
  feedAnnouncementStripEnabled,
}: Props) {
  const browse = useShopBrowse(shops);
  const shopIdsValid = useMemo(() => new Set(shops.map((s) => s.id)), [shops]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 max-md:space-y-3 max-md:px-2.5 max-md:py-3">
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

      {feedAnnouncementStripEnabled && announcementStrip && announcementStrip.items.length > 0 ? (
        <FeedAnnouncementStrip items={announcementStrip.items} shopIdsValid={shopIdsValid} />
      ) : null}

      {feedTopEntries.length > 0 ? <FeedTopCarousel entries={feedTopEntries} /> : null}

      <ShopBrowseGrid
        floors={floors}
        ratings={ratings}
        priceDisplays={priceDisplays}
        browse={browse}
      />
    </div>
  );
}
