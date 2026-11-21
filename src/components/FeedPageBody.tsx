import { FeedClient } from "@/components/FeedClient";
import { getAds, getBuildings, getFloors, getPublicShops, getReviews } from "@/lib/data";
import {
  buildFeedTopStrip,
  buildFeedTopStripFromAllDishes,
  shuffleFeedTop,
} from "@/lib/feed-top-strip";
import { ratingsFromReviews, shopPriceDisplays } from "@/lib/ratings";
import { getSiteSettings } from "@/lib/site-settings";

export async function FeedPageBody() {
  const [shops, buildings, floors, reviews, ads, siteSettings] = await Promise.all([
    getPublicShops(),
    getBuildings(),
    getFloors(),
    getReviews(),
    getAds(),
    getSiteSettings(),
  ]);
  const ratings = ratingsFromReviews(reviews);
  const priceDisplays = shopPriceDisplays(shops, reviews);
  const feedTopEntries = shuffleFeedTop(
    siteSettings.merchantFeedPromoEnabled
      ? buildFeedTopStrip(shops, ads)
      : buildFeedTopStripFromAllDishes(shops),
  );

  const announcementStrip = siteSettings.feedAnnouncementStrip;
  const feedAnnouncementStripEnabled = siteSettings.feedAnnouncementStripEnabled;

  return (
    <FeedClient
      shops={shops}
      buildings={buildings}
      floors={floors}
      ratings={ratings}
      priceDisplays={priceDisplays}
      feedTopEntries={feedTopEntries}
      announcementStrip={announcementStrip}
      feedAnnouncementStripEnabled={feedAnnouncementStripEnabled}
    />
  );
}
