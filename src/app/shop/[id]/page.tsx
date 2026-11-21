import { notFound } from "next/navigation";
import { ShopDetailBody } from "@/components/ShopDetailBody";
import { getFloors, getPublicShop, getReviewsForShop } from "@/lib/data";
import { shopPriceDisplay } from "@/lib/ratings";
import { getSiteSettings } from "@/lib/site-settings";

type Params = { params: Promise<{ id: string }> };

export default async function ShopDetailPage({ params }: Params) {
  const { id } = await params;
  const [shop, siteSettings] = await Promise.all([getPublicShop(id), getSiteSettings()]);
  if (!shop) notFound();

  const [reviews, floors] = await Promise.all([getReviewsForShop(id), getFloors()]);
  const ratingAvg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  const priceDisplay = shopPriceDisplay(shop, reviews);

  return (
    <ShopDetailBody
      shop={shop}
      floors={floors}
      reviews={reviews}
      ratingAvg={ratingAvg}
      priceDisplay={priceDisplay}
      galleryModerationMode={siteSettings.galleryModerationMode}
      reviewModerationMode={siteSettings.reviewModerationMode}
    />
  );
}
