import { NextResponse } from "next/server";
import { getReviews, getShop, getShops } from "@/lib/data";
import { isShopPubliclyListed } from "@/lib/shop-listing";
import { newId, readJsonFile, writeJsonFile } from "@/lib/io";
import { normalizeReviewPerPersonSpend } from "@/lib/merchant-avg-price";
import { getSession } from "@/lib/session";
import { getSiteSettings } from "@/lib/site-settings";
import type { Review } from "@/lib/types";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shopId");
  const admin = searchParams.get("admin") === "1";
  const mine = searchParams.get("mine") === "1";
  const forMerchant = searchParams.get("forMerchant") === "1";

  let reviews = await getReviews();

  if (mine) {
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    reviews = reviews.filter((r) => r.userId === session.userId);
    return NextResponse.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  if (forMerchant) {
    if (!session || session.role !== "merchant") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const shops = await getShops();
    const ids = new Set(shops.filter((s) => s.ownerUserId === session.userId).map((s) => s.id));
    reviews = reviews.filter((r) => ids.has(r.shopId));
    return NextResponse.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  if (shopId) {
    reviews = reviews.filter((r) => r.shopId === shopId);
    const shop = await getShop(shopId);
    const merchantOwned = session?.role === "merchant" && shop?.ownerUserId === session.userId;
    if (admin) {
      if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } else if (merchantOwned) {
      /* 店主查看本店全部评价（含隐藏） */
    } else {
      reviews = reviews.filter((r) => r.visible);
    }
    return NextResponse.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  if (admin) {
    if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  reviews = reviews.filter((r) => r.visible);
  return NextResponse.json(reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    shopId?: string;
    userName?: string;
    rating?: number;
    content?: string;
    userId?: string;
    images?: string[];
    perPersonSpend?: number | string;
  };
  if (!body.shopId || !body.userName || body.rating == null || !body.content) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const targetShop = await getShop(body.shopId);
  if (!targetShop) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await getSession();
  const isStaff = session?.role === "super_admin" || session?.role === "admin";
  const merchantOwned =
    session?.role === "merchant" && targetShop.ownerUserId === session.userId;
  if (!isStaff && !merchantOwned && !isShopPubliclyListed(targetShop)) {
    return NextResponse.json({ error: "shop_not_listed" }, { status: 403 });
  }
  let userId = body.userId ?? "guest";
  if (body.userId && body.userId !== "guest") {
    if (!session || session.userId !== body.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    userId = session.userId;
  }
  const perPersonSpend = normalizeReviewPerPersonSpend(body.perPersonSpend);

  const reviews = await readJsonFile<Review[]>("reviews.json");
  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === "string" && u.startsWith("/api/files/"))
    : undefined;

  const site = await getSiteSettings();
  const preReview = site.reviewModerationMode === "pre" && !isStaff;

  const review: Review = {
    id: newId("rev"),
    shopId: body.shopId,
    userId,
    userName: body.userName,
    rating: Math.min(5, Math.max(1, Math.round(Number(body.rating)))),
    content: body.content,
    visible: !preReview,
    reviewModeration: preReview ? "pending" : "approved",
    createdAt: new Date().toISOString(),
    perPersonSpend,
    images: images?.length ? images : undefined,
  };
  reviews.push(review);
  await writeJsonFile("reviews.json", reviews);
  return NextResponse.json({
    review,
    reviewModerationMode: site.reviewModerationMode,
    requiresReviewApproval: preReview,
  });
}
