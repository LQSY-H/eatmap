import { newId, readJsonFile, writeJsonFile } from "@/lib/io";

/** 瀑布流「餐厅定位」与「今日推荐」之间的窄条公告条目 */
export type FeedAnnouncementItem = {
  id: string;
  title: string;
  text: string;
  /** 点击跳转店铺详情；须在后台选择有效店铺 */
  shopId: string;
};

export type FeedAnnouncementStripSettings = {
  /** 左侧竖条标题，如「公告」「提示」 */
  stripTitle: string;
  items: FeedAnnouncementItem[];
};

/** 先审后发：用户提交后不对外展示，管理员通过后再展示；先发后审：提交后即展示 */
export type ContentModerationMode = "pre" | "post";

export type SiteSettings = {
  /** 开启后：商家可见「首页推荐」免费报名入口；瀑布流「今日推荐」横条使用已通过的推广与标签店。关闭时：隐藏商家入口，横条随机展示全部菜品。 */
  merchantFeedPromoEnabled: boolean;
  /** 为 false 时瀑布流不展示公告窄条（条目配置仍保留） */
  feedAnnouncementStripEnabled: boolean;
  /** 详情页菜单图 / 实景图：先审后发或先发后审（管理员与超管上传始终直接通过） */
  galleryModerationMode: ContentModerationMode;
  /** 详情页用户评价 */
  reviewModerationMode: ContentModerationMode;
  /** 瀑布流餐厅定位与今日推荐之间的文字公告窄条（多条竖向轮播） */
  feedAnnouncementStrip?: FeedAnnouncementStripSettings;
};

const FILENAME = "site-settings.json";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  merchantFeedPromoEnabled: true,
  feedAnnouncementStripEnabled: true,
  galleryModerationMode: "post",
  reviewModerationMode: "post",
};

const MAX_ANNOUNCEMENTS = 24;
const STRIP_TITLE_MAX = 12;
const ANN_TITLE_MAX = 48;
const ANN_TEXT_MAX = 180;

function clampStr(s: unknown, max: number): string {
  const t = typeof s === "string" ? s.trim() : "";
  return t.length > max ? t.slice(0, max) : t;
}

export function normalizeContentModerationMode(v: unknown): ContentModerationMode {
  return v === "pre" ? "pre" : "post";
}

/** 校验并裁剪后台下发的公告配置 */
export function normalizeFeedAnnouncementStrip(raw: unknown): FeedAnnouncementStripSettings {
  const stripTitle =
    clampStr(
      raw && typeof raw === "object" && "stripTitle" in raw
        ? (raw as { stripTitle?: unknown }).stripTitle
        : undefined,
      STRIP_TITLE_MAX,
    ) || "公告";

  const itemsRaw =
    raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

  const items: FeedAnnouncementItem[] = [];
  for (const row of itemsRaw) {
    if (items.length >= MAX_ANNOUNCEMENTS) break;
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    let id = clampStr(r.id, 72);
    if (!id) id = newId("ann");
    const title = clampStr(r.title, ANN_TITLE_MAX);
    const text = clampStr(r.text, ANN_TEXT_MAX);
    const shopId = clampStr(r.shopId, 64);
    if (!title && !text) continue;
    items.push({
      id,
      title: title || "提示",
      text,
      shopId,
    });
  }

  return { stripTitle, items };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const raw = await readJsonFile<Partial<SiteSettings>>(FILENAME);
    const merchantFeedPromoEnabled =
      typeof raw.merchantFeedPromoEnabled === "boolean"
        ? raw.merchantFeedPromoEnabled
        : DEFAULT_SITE_SETTINGS.merchantFeedPromoEnabled;

    const feedAnnouncementStripEnabled =
      typeof raw.feedAnnouncementStripEnabled === "boolean"
        ? raw.feedAnnouncementStripEnabled
        : DEFAULT_SITE_SETTINGS.feedAnnouncementStripEnabled;

    const galleryModerationMode = normalizeContentModerationMode(raw.galleryModerationMode);

    const reviewModerationMode = normalizeContentModerationMode(raw.reviewModerationMode);

    let feedAnnouncementStrip: FeedAnnouncementStripSettings | undefined;
    if ("feedAnnouncementStrip" in raw && raw.feedAnnouncementStrip !== undefined) {
      feedAnnouncementStrip = normalizeFeedAnnouncementStrip(raw.feedAnnouncementStrip);
    }

    return {
      merchantFeedPromoEnabled,
      feedAnnouncementStripEnabled,
      galleryModerationMode,
      reviewModerationMode,
      ...(feedAnnouncementStrip ? { feedAnnouncementStrip } : {}),
    };
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function writeSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const cur = await getSiteSettings();
  const next: SiteSettings = {
    ...cur,
    ...patch,
    ...(patch.galleryModerationMode !== undefined
      ? { galleryModerationMode: normalizeContentModerationMode(patch.galleryModerationMode) }
      : {}),
    ...(patch.reviewModerationMode !== undefined
      ? { reviewModerationMode: normalizeContentModerationMode(patch.reviewModerationMode) }
      : {}),
    ...(patch.feedAnnouncementStrip !== undefined
      ? { feedAnnouncementStrip: normalizeFeedAnnouncementStrip(patch.feedAnnouncementStrip) }
      : {}),
  };
  await writeJsonFile(FILENAME, next);
  return next;
}
