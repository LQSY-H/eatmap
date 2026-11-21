import { NextResponse } from "next/server";
import { getAds, getShops } from "@/lib/data";
import { readJsonFile, writeJsonFile, newId } from "@/lib/io";
import { getSession } from "@/lib/session";
import { canEditShop } from "@/lib/shop-access";
import { daysInclusiveYMD, isValidYMD, todayYMDShanghai } from "@/lib/date-utils";
import { isAllowedPromoImageUrl } from "@/lib/promo-image-url";
import { FEATURED_AD_TITLE_MAX_CHARS } from "@/lib/feed-top-strip";
import type { Ad, AdStatus } from "@/lib/types";

const MAX_FEATURED_SPAN_DAYS = 90;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ads = await getAds();
  if (session.role === "super_admin" || session.role === "admin") {
    return NextResponse.json(ads);
  }
  if (session.role === "merchant") {
    const shops = await getShops();
    const mine = new Set(
      shops.filter((s) => s.ownerUserId === session.userId).map((s) => s.id),
    );
    return NextResponse.json(ads.filter((a) => mine.has(a.shopId)));
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "merchant") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    shopId?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    slot?: string;
    promoImage?: string | null;
  };
  const title = body.title?.trim() ?? "";
  if (!body.shopId?.trim() || !title) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (title.length > FEATURED_AD_TITLE_MAX_CHARS) {
    return NextResponse.json({ error: "title_too_long" }, { status: 400 });
  }
  if (body.slot !== "home_featured") {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  const start = body.startDate?.trim();
  const end = body.endDate?.trim();
  if (!start || !end || !isValidYMD(start) || !isValidYMD(end)) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }
  const today = todayYMDShanghai();
  if (start < today) {
    return NextResponse.json({ error: "start_in_past" }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }
  const span = daysInclusiveYMD(start, end);
  if (span > MAX_FEATURED_SPAN_DAYS) {
    return NextResponse.json({ error: "range_too_long" }, { status: 400 });
  }

  const shops = await getShops();
  const shop = shops.find((s) => s.id === body.shopId);
  if (!shop) {
    return NextResponse.json({ error: "shop_not_found" }, { status: 404 });
  }
  if (!canEditShop(session, shop)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let promoImage: string | undefined;
  if (body.promoImage != null && String(body.promoImage).trim() !== "") {
    const p = String(body.promoImage).trim();
    if (!isAllowedPromoImageUrl(p)) {
      return NextResponse.json({ error: "invalid_promo_image" }, { status: 400 });
    }
    promoImage = p;
  }

  const row: Ad = {
    id: newId("ad"),
    merchantId: shop.merchantId ?? `m-${shop.id}`,
    shopId: shop.id,
    title,
    status: "pending",
    slot: "home_featured",
    startDate: start,
    endDate: end,
    submittedAt: new Date().toISOString(),
    ...(promoImage ? { promoImage } : {}),
  };

  const ads = await readJsonFile<Ad[]>("ads.json");
  ads.push(row);
  await writeJsonFile("ads.json", ads);
  return NextResponse.json(row);
}

/** 商户撤回本人店铺下、仍处于待审核的首页推荐申请 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "merchant") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const ads = await readJsonFile<Ad[]>("ads.json");
  const idx = ads.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const ad = ads[idx];
  if (ad.slot !== "home_featured") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (ad.status !== "pending") {
    return NextResponse.json({ error: "not_withdrawable" }, { status: 400 });
  }
  const shops = await getShops();
  const shop = shops.find((s) => s.id === ad.shopId);
  if (!shop || !canEditShop(session, shop)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  ads.splice(idx, 1);
  await writeJsonFile("ads.json", ads);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { id?: string; status?: AdStatus };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const ads = await readJsonFile<Ad[]>("ads.json");
  const idx = ads.findIndex((a) => a.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  ads[idx] = { ...ads[idx], status: body.status };
  await writeJsonFile("ads.json", ads);
  return NextResponse.json(ads[idx]);
}
