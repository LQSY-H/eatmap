import { NextResponse } from "next/server";
import { getPublicShops } from "@/lib/data";
import { getSession } from "@/lib/session";
import { isUserDataBackupEnabled } from "@/lib/user-data-backup-config";
import {
  getSiteSettings,
  normalizeContentModerationMode,
  normalizeFeedAnnouncementStrip,
  writeSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";

export async function GET() {
  const s = await getSiteSettings();
  return NextResponse.json({
    merchantFeedPromoEnabled: s.merchantFeedPromoEnabled,
    feedAnnouncementStripEnabled: s.feedAnnouncementStripEnabled,
    galleryModerationMode: s.galleryModerationMode,
    reviewModerationMode: s.reviewModerationMode,
    ...(s.feedAnnouncementStrip ? { feedAnnouncementStrip: s.feedAnnouncementStrip } : {}),
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const hasFlag = "merchantFeedPromoEnabled" in b;
  const hasStrip = "feedAnnouncementStrip" in b;
  const hasStripToggle = "feedAnnouncementStripEnabled" in b;
  const hasGalleryMode = "galleryModerationMode" in b;
  const hasReviewMode = "reviewModerationMode" in b;
  if (
    !hasFlag &&
    !hasStrip &&
    !hasStripToggle &&
    !hasGalleryMode &&
    !hasReviewMode
  ) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const patch: Partial<SiteSettings> = {};

  if (hasStripToggle) {
    const raw = b.feedAnnouncementStripEnabled;
    if (typeof raw !== "boolean") {
      return NextResponse.json({ error: "invalid_strip_toggle" }, { status: 400 });
    }
    patch.feedAnnouncementStripEnabled = raw;
  }

  if (hasGalleryMode) {
    patch.galleryModerationMode = normalizeContentModerationMode(b.galleryModerationMode);
  }
  if (hasReviewMode) {
    patch.reviewModerationMode = normalizeContentModerationMode(b.reviewModerationMode);
  }

  if (hasFlag) {
    const raw = b.merchantFeedPromoEnabled;
    if (typeof raw !== "boolean") {
      return NextResponse.json({ error: "invalid_flag" }, { status: 400 });
    }
    patch.merchantFeedPromoEnabled = raw;
  }

  if (hasStrip) {
    const normalized = normalizeFeedAnnouncementStrip(b.feedAnnouncementStrip);
    const shops = await getPublicShops();
    const validIds = new Set(shops.map((s) => s.id));
    for (const item of normalized.items) {
      if (!item.shopId || !validIds.has(item.shopId)) {
        return NextResponse.json(
          {
            error: "invalid_announcement_shop",
            message: `公告条目「${item.title}」关联的店铺无效或未选择，请重新选择店铺 ID：${item.shopId || "（空）"}`,
          },
          { status: 400 },
        );
      }
    }
    patch.feedAnnouncementStrip = normalized;
  }

  const next = await writeSiteSettings(patch);

  if (isUserDataBackupEnabled()) {
    void import("@/lib/user-data-backup").then((mod) =>
      mod.runUserDataBackup().then((r) => {
        if (!r.ok) console.error("[eatmap-backup] after site-settings PATCH:", r.error);
      }),
    );
  }

  return NextResponse.json({
    merchantFeedPromoEnabled: next.merchantFeedPromoEnabled,
    feedAnnouncementStripEnabled: next.feedAnnouncementStripEnabled,
    galleryModerationMode: next.galleryModerationMode,
    reviewModerationMode: next.reviewModerationMode,
    ...(next.feedAnnouncementStrip ? { feedAnnouncementStrip: next.feedAnnouncementStrip } : {}),
  });
}
