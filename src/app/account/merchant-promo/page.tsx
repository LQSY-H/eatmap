import { redirect } from "next/navigation";
import { MerchantPromoPageClient } from "@/components/MerchantPromoPageClient";
import { getShops } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AccountMerchantPromoPage() {
  const settings = await getSiteSettings();
  if (!settings.merchantFeedPromoEnabled) {
    redirect("/account");
  }
  const shops = await getShops();
  return <MerchantPromoPageClient shops={shops} />;
}
