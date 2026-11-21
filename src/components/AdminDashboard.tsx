"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Database,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPinned,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
  Plus,
  Sparkles,
  Store,
  Tags,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { MerchantSetupShopClient } from "@/components/MerchantSetupShopClient";
import { AdminCampusPanel } from "@/components/AdminCampusPanel";
import { AdminShopPanel } from "@/components/AdminShopPanel";
import { AdminTagsPanel } from "@/components/AdminTagsPanel";
import { MerchantPromoPanel } from "@/components/MerchantPromoPanel";
import { PasswordInput } from "@/components/PasswordInput";
import {
  adFrontDisplayHint,
  adScheduleBucket,
  adScheduleBucketLabelCn,
  adSlotLabelCn,
  featuredAdScheduleCn,
  type AdScheduleBucket,
} from "@/lib/ad-display";
import { todayYMDShanghai } from "@/lib/date-utils";
import { shopBuildingFloorLabel } from "@/lib/shop-location";
import {
  isShopPublicDisplayEnabled,
  isShopPubliclyListed,
  shopListingStatusLabel,
  shopPublicVisibilityLabel,
} from "@/lib/shop-listing";
import type { ContentModerationMode, FeedAnnouncementItem } from "@/lib/site-settings";
import type {
  Ad,
  Building,
  Floor,
  MapShape,
  PublicUser,
  Review,
  Shop,
  ShopGalleryStatus,
  UserRole,
} from "@/lib/types";

function roleLabelCn(role: PublicUser["role"]): string {
  switch (role) {
    case "super_admin":
      return "超级管理员";
    case "admin":
      return "管理员";
    case "merchant":
      return "商户";
    case "user":
      return "普通用户";
    default:
      return role;
  }
}

const MapEditor = dynamic(() => import("@/components/MapEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 text-sm text-amber-800/70">
      加载地图编辑器…
    </div>
  ),
});

type Tab =
  | "overview"
  | "map"
  | "campus"
  | "shops"
  | "shop_listing"
  | "merchant_reviews"
  | "promo"
  | "tags"
  | "reviews"
  | "media"
  | "compliance"
  | "shop_showcase"
  | "ads"
  | "users";

type Props = {
  buildings: Building[];
  floors: Floor[];
  shops: Shop[];
  shapes: MapShape[];
  reviews: Review[];
  ads: Ad[];
  users: PublicUser[];
  tagsCatalog: string[];
};

export function AdminDashboard({
  buildings,
  floors,
  shops,
  shapes,
  reviews,
  ads,
  users,
  tagsCatalog,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [impersonator, setImpersonator] = useState<PublicUser | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [reviewList, setReviewList] = useState(reviews);
  const [adList, setAdList] = useState(ads);
  const [merchantFeedPromoEnabled, setMerchantFeedPromoEnabled] = useState(false);
  const [merchantFeedPromoSwitchSaving, setMerchantFeedPromoSwitchSaving] = useState(false);
  const [merchantFeedPromoSwitchMsg, setMerchantFeedPromoSwitchMsg] = useState<string | null>(null);
  const [feedAnnItems, setFeedAnnItems] = useState<FeedAnnouncementItem[]>([]);
  const [feedAnnEnabled, setFeedAnnEnabled] = useState(true);
  const [feedAnnToggleSaving, setFeedAnnToggleSaving] = useState(false);
  const [feedAnnSaving, setFeedAnnSaving] = useState(false);
  const [feedAnnMsg, setFeedAnnMsg] = useState<string | null>(null);
  const [manualBackupBusy, setManualBackupBusy] = useState(false);
  const [manualBackupMsg, setManualBackupMsg] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<PublicUser[]>([]);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [resetPwdFor, setResetPwdFor] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [reviewShopQ, setReviewShopQ] = useState("");
  const [reviewVisibility, setReviewVisibility] = useState<
    "all" | "visible" | "hidden" | "pending_moderation"
  >("all");
  const [reviewDetailStarFilter, setReviewDetailStarFilter] = useState(0);
  const [galleryFilter, setGalleryFilter] = useState<"all" | ShopGalleryStatus>("all");
  const [adAuditFilter, setAdAuditFilter] = useState<"all" | Ad["status"]>("all");
  const [adScheduleFilter, setAdScheduleFilter] = useState<"all" | AdScheduleBucket>("all");
  const [selectedReviewShopId, setSelectedReviewShopId] = useState<string | null>(null);
  const [showHideAudit, setShowHideAudit] = useState(false);
  const [merchantReviews, setMerchantReviews] = useState<Review[]>([]);
  const [selectedGalleryKey, setSelectedGalleryKey] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | UserRole>("all");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [merchantBindShopId, setMerchantBindShopId] = useState("");
  const [galleryModerationMode, setGalleryModerationMode] = useState<ContentModerationMode>("post");
  const [reviewModerationMode, setReviewModerationMode] = useState<ContentModerationMode>("post");
  const [moderationModesSaving, setModerationModesSaving] = useState(false);
  const [moderationModesMsg, setModerationModesMsg] = useState<string | null>(null);
  const [showcaseShopQ, setShowcaseShopQ] = useState("");
  const [showcaseFilter, setShowcaseFilter] = useState<"all" | "visible" | "hidden" | "pending">("all");
  const [showcaseSavingId, setShowcaseSavingId] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const r = await fetch(eatmapUrl("/api/auth/me"), { credentials: "include" });
    const d = (await r.json()) as { user: PublicUser | null; impersonator: PublicUser | null };
    setMe(d.user ?? null);
    setImpersonator(d.impersonator ?? null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(eatmapUrl("/api/site-settings"));
        if (!res.ok || cancelled) return;
        const d = (await res.json()) as {
          merchantFeedPromoEnabled?: boolean;
          feedAnnouncementStripEnabled?: boolean;
          galleryModerationMode?: ContentModerationMode;
          reviewModerationMode?: ContentModerationMode;
          feedAnnouncementStrip?: { stripTitle: string; items: FeedAnnouncementItem[] };
        };
        if (!cancelled && typeof d.merchantFeedPromoEnabled === "boolean") {
          setMerchantFeedPromoEnabled(d.merchantFeedPromoEnabled);
        }
        if (!cancelled && (d.galleryModerationMode === "pre" || d.galleryModerationMode === "post")) {
          setGalleryModerationMode(d.galleryModerationMode);
        }
        if (!cancelled && (d.reviewModerationMode === "pre" || d.reviewModerationMode === "post")) {
          setReviewModerationMode(d.reviewModerationMode);
        }
        if (!cancelled && typeof d.feedAnnouncementStripEnabled === "boolean") {
          setFeedAnnEnabled(d.feedAnnouncementStripEnabled);
        }
        if (!cancelled && d.feedAnnouncementStrip) {
          setFeedAnnItems(Array.isArray(d.feedAnnouncementStrip.items) ? d.feedAnnouncementStrip.items : []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedTabs = useMemo((): Tab[] => {
    const role = me?.role;
    if (!role) return ["overview"];
    if (role === "user") return ["overview"];
    if (role === "merchant") {
      const base: Tab[] = ["shops", "merchant_reviews"];
      return merchantFeedPromoEnabled ? [...base, "promo"] : base;
    }
    if (role === "super_admin") {
      return [
        "overview",
        "map",
        "campus",
        "shops",
        "shop_listing",
        "tags",
        "reviews",
        "media",
        "compliance",
        "shop_showcase",
        "ads",
        "users",
      ];
    }
    return [
      "overview",
      "map",
      "campus",
      "shops",
      "shop_listing",
      "reviews",
      "media",
      "compliance",
      "shop_showcase",
      "ads",
      "users",
    ];
  }, [me?.role, merchantFeedPromoEnabled]);

  const shopsSortedForAnn = useMemo(
    () => [...shops].sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [shops],
  );

  async function stopImpersonating() {
    setPreviewBusy(true);
    try {
      const res = await fetch(eatmapUrl("/api/auth/stop-impersonating"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const d = (await res.json()) as { user: PublicUser; impersonator: null };
      setMe(d.user);
      setImpersonator(null);
      setTab("overview");
      window.dispatchEvent(new Event("eatmap-auth-refresh"));
    } finally {
      setPreviewBusy(false);
    }
  }

  useLayoutEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(allowedTabs[0] ?? "overview");
    }
  }, [allowedTabs, tab]);

  useEffect(() => {
    if (!me) return;
    const raw = searchParams.get("tab");
    if (!raw) return;
    const t = raw as Tab;
    if (allowedTabs.includes(t)) setTab(t);
  }, [me, allowedTabs, searchParams]);

  async function toggleReview(id: string, visible: boolean) {
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visible }),
    });
    if (!res.ok) return;
    setReviewList((list) =>
      list.map((r) =>
        r.id === id ? { ...r, visible, hideRequestedAt: undefined } : r,
      ),
    );
  }

  async function rejectReviewHideRequest(id: string) {
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reject_hide_request" }),
    });
    if (!res.ok) return;
    setReviewList((list) =>
      list.map((r) => (r.id === id ? { ...r, hideRequestedAt: undefined } : r)),
    );
  }

  async function deleteReview(id: string) {
    if (!window.confirm("确定删除该条评价？删除后不可恢复。")) return;
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), { method: "DELETE", credentials: "include" });
    if (!res.ok) return;
    setReviewList((list) => list.filter((r) => r.id !== id));
  }

  async function requestMerchantHideReview(id: string) {
    const res = await fetch(eatmapUrl(`/api/reviews/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "request_hide" }),
    });
    if (!res.ok) return;
    const row = (await res.json()) as Review;
    setMerchantReviews((list) => list.map((r) => (r.id === id ? row : r)));
  }

  useEffect(() => {
    if (tab !== "merchant_reviews" || me?.role !== "merchant") return;
    void (async () => {
      const res = await fetch(eatmapUrl("/api/reviews?forMerchant=1"), { credentials: "include" });
      if (!res.ok) return;
      setMerchantReviews((await res.json()) as Review[]);
    })();
  }, [tab, me?.role]);

  async function setAdStatus(id: string, status: Ad["status"]) {
    const res = await fetch(eatmapUrl("/api/ads"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setAdList((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function saveMerchantFeedPromoToggle(enabled: boolean) {
    setMerchantFeedPromoSwitchMsg(null);
    setMerchantFeedPromoSwitchSaving(true);
    try {
      const res = await fetch(eatmapUrl("/api/site-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ merchantFeedPromoEnabled: enabled }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        merchantFeedPromoEnabled?: boolean;
        feedAnnouncementStripEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setMerchantFeedPromoSwitchMsg(
          d.error === "forbidden" ? "无权限保存" : "保存失败，请重试",
        );
        return;
      }
      if (typeof d.merchantFeedPromoEnabled === "boolean") {
        setMerchantFeedPromoEnabled(d.merchantFeedPromoEnabled);
      }
      if (typeof d.feedAnnouncementStripEnabled === "boolean") {
        setFeedAnnEnabled(d.feedAnnouncementStripEnabled);
      }
      setMerchantFeedPromoSwitchMsg(
        enabled
          ? "已开启：商户后台显示「首页推荐」，瀑布流横条使用投放与标签推荐。"
          : "已关闭：商户入口与后台对应菜单已隐藏，横条随机展示全部菜品。",
      );
    } finally {
      setMerchantFeedPromoSwitchSaving(false);
    }
  }

  async function saveFeedAnnStripVisibleToggle(enabled: boolean) {
    setFeedAnnMsg(null);
    setFeedAnnToggleSaving(true);
    try {
      const res = await fetch(eatmapUrl("/api/site-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedAnnouncementStripEnabled: enabled }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        feedAnnouncementStripEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setFeedAnnMsg(d.error === "forbidden" ? "无权限保存" : "开关保存失败，请重试");
        return;
      }
      if (typeof d.feedAnnouncementStripEnabled === "boolean") {
        setFeedAnnEnabled(d.feedAnnouncementStripEnabled);
      }
      setFeedAnnMsg(
        enabled ? "已开启：瀑布流将展示公告窄条（有条目时）。" : "已关闭：瀑布流不再展示公告窄条，条目仍保留。",
      );
    } finally {
      setFeedAnnToggleSaving(false);
    }
  }

  async function saveContentModerationModes(next: {
    galleryModerationMode?: ContentModerationMode;
    reviewModerationMode?: ContentModerationMode;
  }) {
    setModerationModesMsg(null);
    setModerationModesSaving(true);
    try {
      const res = await fetch(eatmapUrl("/api/site-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(next),
      });
      const d = (await res.json().catch(() => ({}))) as {
        galleryModerationMode?: ContentModerationMode;
        reviewModerationMode?: ContentModerationMode;
        error?: string;
      };
      if (!res.ok) {
        setModerationModesMsg(d.error === "forbidden" ? "无权限保存" : "保存失败，请重试");
        try {
          const r2 = await fetch(eatmapUrl("/api/site-settings"));
          if (r2.ok) {
            const s = (await r2.json()) as {
              galleryModerationMode?: ContentModerationMode;
              reviewModerationMode?: ContentModerationMode;
            };
            if (s.galleryModerationMode === "pre" || s.galleryModerationMode === "post") {
              setGalleryModerationMode(s.galleryModerationMode);
            }
            if (s.reviewModerationMode === "pre" || s.reviewModerationMode === "post") {
              setReviewModerationMode(s.reviewModerationMode);
            }
          }
        } catch {
          /* ignore */
        }
        return;
      }
      if (d.galleryModerationMode === "pre" || d.galleryModerationMode === "post") {
        setGalleryModerationMode(d.galleryModerationMode);
      }
      if (d.reviewModerationMode === "pre" || d.reviewModerationMode === "post") {
        setReviewModerationMode(d.reviewModerationMode);
      }
      setModerationModesMsg("已保存详情页用户内容与评价审核策略。");
    } finally {
      setModerationModesSaving(false);
    }
  }

  async function runManualUserDataBackup() {
    setManualBackupMsg(null);
    setManualBackupBusy(true);
    try {
      const res = await fetch(eatmapUrl("/api/admin/user-data-backup"), {
        method: "POST",
        credentials: "include",
      });
      const d = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ms?: number;
        dest?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setManualBackupMsg(
          d.error === "forbidden"
            ? "无权限"
            : d.message
              ? `备份失败：${d.message}`
              : "备份失败，请查看服务端日志与备份目录权限。",
        );
        return;
      }
      const ms = typeof d.ms === "number" ? d.ms : null;
      const dest = typeof d.dest === "string" ? d.dest : "";
      setManualBackupMsg(
        ms != null && dest
          ? `备份完成（${ms}ms）→ ${dest}`
          : "备份已完成。",
      );
    } finally {
      setManualBackupBusy(false);
    }
  }

  async function saveFeedAnnouncementStrip() {
    setFeedAnnMsg(null);
    for (const row of feedAnnItems) {
      const hasContent = row.title.trim() || row.text.trim();
      if (hasContent && !row.shopId.trim()) {
        setFeedAnnMsg("已填写标题或正文的条目必须选择关联店铺。");
        return;
      }
    }
    setFeedAnnSaving(true);
    try {
      const items = feedAnnItems.filter((row) => row.title.trim() || row.text.trim());
      const res = await fetch(eatmapUrl("/api/site-settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feedAnnouncementStrip: {
            stripTitle: "公告",
            items,
          },
        }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        feedAnnouncementStripEnabled?: boolean;
        feedAnnouncementStrip?: { stripTitle: string; items: FeedAnnouncementItem[] };
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setFeedAnnMsg(
          d.error === "invalid_announcement_shop" && d.message
            ? d.message
            : d.error === "forbidden"
              ? "无权限保存"
              : "保存失败，请重试",
        );
        return;
      }
      if (typeof d.feedAnnouncementStripEnabled === "boolean") {
        setFeedAnnEnabled(d.feedAnnouncementStripEnabled);
      }
      if (d.feedAnnouncementStrip) {
        setFeedAnnItems(d.feedAnnouncementStrip.items ?? []);
      }
      setFeedAnnMsg(items.length === 0 ? "已清空瀑布流公告条（前台不再展示）。" : "已保存瀑布流公告条。");
    } finally {
      setFeedAnnSaving(false);
    }
  }

  async function runUserSearch() {
    setSearchMsg(null);
    const q = searchQ.trim();
    if (!q) {
      setSearchHits([]);
      return;
    }
    const res = await fetch(eatmapUrl(`/api/users?q=${encodeURIComponent(q)}`), {
      credentials: "include",
    });
    if (!res.ok) {
      setSearchMsg("无权限搜索");
      setSearchHits([]);
      return;
    }
    const data = (await res.json()) as PublicUser[];
    setSearchHits(data);
    if (data.length === 0) setSearchMsg("未找到匹配账号");
  }

  const shopNameById = useMemo(() => {
    const m = new Map<string, string>();
    shops.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [shops]);

  const userById = useMemo(() => {
    const m = new Map<string, PublicUser>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const pendingListingShops = useMemo(
    () =>
      shops
        .filter((s) => s.listingStatus === "pending")
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [shops],
  );

  const filteredShowcaseShops = useMemo(() => {
    const q = showcaseShopQ.trim().toLowerCase();
    return [...shops]
      .filter((s) => {
        if (showcaseFilter === "visible" && !isShopPubliclyListed(s)) return false;
        if (showcaseFilter === "hidden") {
          if (s.listingStatus === "pending") return false;
          if (isShopPublicDisplayEnabled(s)) return false;
        }
        if (showcaseFilter === "pending" && s.listingStatus !== "pending") return false;
        if (!q) return true;
        const hay = `${s.name} ${s.buildingName} ${s.id}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [shops, showcaseShopQ, showcaseFilter]);

  const showcaseCounts = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    let pending = 0;
    for (const s of shops) {
      if (s.listingStatus === "pending") pending += 1;
      else if (!isShopPublicDisplayEnabled(s)) hidden += 1;
      else if (isShopPubliclyListed(s)) visible += 1;
    }
    return { visible, hidden, pending, total: shops.length };
  }, [shops]);

  async function setShopPublicDisplay(shopId: string, enabled: boolean) {
    setShowcaseSavingId(shopId);
    try {
      const res = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicDisplay: enabled }),
      });
      if (!res.ok) {
        window.alert("保存失败，请重试");
        return;
      }
      router.refresh();
    } finally {
      setShowcaseSavingId(null);
    }
  }

  async function approveShopListing(shopId: string) {
    const res = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ listingStatus: "approved", publicDisplay: true }),
    });
    if (!res.ok) {
      window.alert("审核失败，请重试");
      return;
    }
    router.refresh();
  }

  /** 左侧店铺列表：仅按店铺关键词与展示状态筛选（不按星级，避免店铺被星级筛没） */
  const filteredReviewsForSidebar = useMemo(() => {
    const q = reviewShopQ.trim().toLowerCase();
    return reviewList.filter((r) => {
      if (reviewVisibility === "visible" && !r.visible) return false;
      if (reviewVisibility === "hidden") {
        if (r.visible) return false;
        if (r.reviewModeration === "pending") return false;
      }
      if (reviewVisibility === "pending_moderation") {
        if (!(r.reviewModeration === "pending" && !r.visible)) return false;
      }
      if (!q) return true;
      const name = (shopNameById.get(r.shopId) ?? "").toLowerCase();
      return r.shopId.toLowerCase().includes(q) || name.includes(q);
    });
  }, [reviewList, reviewShopQ, reviewVisibility, shopNameById]);

  type ReviewShopGroup = {
    shopId: string;
    reviews: Review[];
    latestAt: string;
    newestReview: Review;
  };

  /** 有至少一条符合侧边筛选的评价的店铺；店铺顺序按店内最新评价时间降序（新评价会把店铺顶上来） */
  const reviewShopGroups = useMemo((): ReviewShopGroup[] => {
    const m = new Map<string, Review[]>();
    for (const r of filteredReviewsForSidebar) {
      const arr = m.get(r.shopId);
      if (arr) arr.push(r);
      else m.set(r.shopId, [r]);
    }
    const groups: ReviewShopGroup[] = [];
    for (const [shopId, revs] of m) {
      const sorted = revs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const newestReview = sorted[0]!;
      groups.push({
        shopId,
        reviews: revs,
        latestAt: newestReview.createdAt,
        newestReview,
      });
    }
    groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    return groups;
  }, [filteredReviewsForSidebar]);

  /** 右侧：当前店铺下全部评价（含隐藏），再按星级筛选 */
  const reviewsForSelectedShopDetail = useMemo(() => {
    if (!selectedReviewShopId) return [];
    let list = reviewList.filter((r) => r.shopId === selectedReviewShopId);
    list = list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (reviewDetailStarFilter) list = list.filter((r) => r.rating === reviewDetailStarFilter);
    return list;
  }, [reviewList, selectedReviewShopId, reviewDetailStarFilter]);

  const pendingHideReviews = useMemo(
    () =>
      reviewList
        .filter((r) => Boolean(r.hideRequestedAt))
        .slice()
        .sort((a, b) => (b.hideRequestedAt ?? "").localeCompare(a.hideRequestedAt ?? "")),
    [reviewList],
  );

  /** 默认展示最新评价（不选店铺时） */
  const latestReviews = useMemo(() => {
    return [...reviewList].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reviewList]);

  const filteredAds = useMemo(() => {
    const today = todayYMDShanghai();
    return adList.filter((a) => {
      if (adAuditFilter !== "all" && a.status !== adAuditFilter) return false;
      if (adScheduleFilter !== "all" && adScheduleBucket(a, today) !== adScheduleFilter) {
        return false;
      }
      return true;
    });
  }, [adList, adAuditFilter, adScheduleFilter]);

  type GalleryRow = {
    shopId: string;
    shopName: string;
    kind: "menu" | "scene";
    url: string;
    status: ShopGalleryStatus;
    submittedByUserId?: string | null;
    submittedByNickname?: string | null;
  };

  const galleryRows = useMemo((): GalleryRow[] => {
    const rows: GalleryRow[] = [];
    for (const s of shops) {
      for (const item of s.menuImages ?? []) {
        rows.push({
          shopId: s.id,
          shopName: s.name,
          kind: "menu",
          url: item.url,
          status: item.status,
          submittedByUserId: item.submittedByUserId,
          submittedByNickname: item.submittedByNickname,
        });
      }
      for (const item of s.sceneImages ?? []) {
        rows.push({
          shopId: s.id,
          shopName: s.name,
          kind: "scene",
          url: item.url,
          status: item.status,
          submittedByUserId: item.submittedByUserId,
          submittedByNickname: item.submittedByNickname,
        });
      }
    }
    return rows.sort((a, b) => {
      const c = a.shopName.localeCompare(b.shopName, "zh-CN");
      if (c !== 0) return c;
      return a.kind.localeCompare(b.kind);
    });
  }, [shops]);

  const filteredGalleryRows = useMemo(() => {
    if (galleryFilter === "all") return galleryRows;
    return galleryRows.filter((r) => r.status === galleryFilter);
  }, [galleryRows, galleryFilter]);

  async function setGalleryItemStatus(
    shopId: string,
    kind: "menu" | "scene",
    url: string,
    status: ShopGalleryStatus,
  ) {
    const res = await fetch(eatmapUrl(`/api/shops/${shopId}/gallery`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind, url, status }),
    });
    if (!res.ok) return;
    router.refresh();
  }

  async function deleteGalleryRow(row: GalleryRow) {
    if (
      !window.confirm(
        `确定从「${row.shopName}」删除此张${row.kind === "menu" ? "菜单" : "实景"}图？不可恢复。`,
      )
    ) {
      return;
    }
    const res = await fetch(eatmapUrl(`/api/shops/${row.shopId}/gallery`), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind: row.kind, url: row.url }),
    });
    if (!res.ok) return;
    router.refresh();
  }

  const filteredUsersTable = useMemo(() => {
    const list = userRoleFilter === "all" ? users : users.filter((u) => u.role === userRoleFilter);
    const q = listFilter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        u.nickname.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.phone?.includes(q) ?? false) ||
        (u.username?.toLowerCase().includes(q) ?? false),
    );
  }, [users, listFilter, userRoleFilter]);

  function galleryRowKey(row: GalleryRow) {
    return `${row.shopId}-${row.kind}-${row.url}`;
  }

  useEffect(() => {
    const groups = reviewShopGroups;
    if (groups.length === 0) {
      setSelectedReviewShopId(null);
      return;
    }
    setSelectedReviewShopId((id) =>
      id && groups.some((g) => g.shopId === id) ? id : groups[0]!.shopId,
    );
  }, [reviewShopGroups]);

  useEffect(() => {
    const rows = filteredGalleryRows;
    if (rows.length === 0) {
      setSelectedGalleryKey(null);
      return;
    }
    setSelectedGalleryKey((k) =>
      k && rows.some((r) => galleryRowKey(r) === k) ? k : galleryRowKey(rows[0]),
    );
  }, [filteredGalleryRows]);

  useEffect(() => {
    const list = filteredAds;
    if (list.length === 0) {
      setSelectedAdId(null);
      return;
    }
    setSelectedAdId((id) => (id && list.some((a) => a.id === id) ? id : list[0].id));
  }, [filteredAds]);

  async function promoteAdmin(userId: string) {
    const res = await fetch(eatmapUrl(`/api/users/${userId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: "admin" }),
    });
    if (!res.ok) {
      setSearchMsg("指定失败");
      return;
    }
    setSearchMsg("已设为管理员");
    runUserSearch();
    router.refresh();
  }

  async function demoteAdmin(userId: string) {
    const res = await fetch(eatmapUrl(`/api/users/${userId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: "user" }),
    });
    if (!res.ok) {
      setSearchMsg("解除失败");
      return;
    }
    setSearchMsg("已解除管理员");
    runUserSearch();
    router.refresh();
  }

  async function deleteUserAccount(userId: string, nickname: string) {
    if (
      !window.confirm(
        `确定删除账户「${nickname}」？数据不可恢复；若该账号绑定店铺，绑定将被解除。`,
      )
    ) {
      return;
    }
    const res = await fetch(eatmapUrl(`/api/users/${userId}`), {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      const msg =
        data.error === "cannot_delete_self"
          ? "不能删除当前登录账号"
          : data.error === "immutable"
            ? "不能删除超级管理员"
            : data.error === "forbidden"
              ? "无权限"
              : "删除失败";
      window.alert(msg);
      return;
    }
    router.refresh();
  }

  async function applyMerchantShopBind(targetUserId: string, shopId: string) {
    if (me?.role !== "super_admin") return;
    for (const s of shops) {
      if (s.ownerUserId !== targetUserId) continue;
      const res = await fetch(eatmapUrl(`/api/shops/${s.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ownerUserId: null }),
      });
      if (!res.ok) {
        window.alert("解除原绑定失败");
        return;
      }
    }
    if (shopId) {
      const res = await fetch(eatmapUrl(`/api/shops/${shopId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ownerUserId: targetUserId }),
      });
      if (!res.ok) {
        window.alert("绑定失败");
        return;
      }
    }
    router.refresh();
  }

  useEffect(() => {
    if (!expandedUserId) {
      setMerchantBindShopId("");
      return;
    }
    const u = users.find((x) => x.id === expandedUserId);
    if (u?.role === "merchant") {
      const bound = shops.filter((s) => s.ownerUserId === u.id);
      setMerchantBindShopId(bound[0]?.id ?? "");
    } else {
      setMerchantBindShopId("");
    }
  }, [expandedUserId, users, shops]);

  useEffect(() => {
    if (expandedUserId && !filteredUsersTable.some((x) => x.id === expandedUserId)) {
      setExpandedUserId(null);
    }
  }, [filteredUsersTable, expandedUserId]);

  async function resetUserPassword(userId: string, password: string) {
    const res = await fetch(eatmapUrl(`/api/users/${userId}/password`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setSearchMsg("重置密码失败");
      return;
    }
    setSearchMsg("已重置密码");
    setResetPwdFor(null);
    setResetPwdValue("");
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "总览", icon: LayoutDashboard },
    { id: "map", label: "地图搭建", icon: MapPinned },
    { id: "campus", label: "食堂与楼层", icon: Building2 },
    { id: "shops", label: "店铺", icon: Store },
    { id: "shop_listing", label: "新店审核", icon: ClipboardCheck },
    { id: "merchant_reviews", label: "店铺评价", icon: MessageSquareText },
    { id: "promo", label: "首页推荐", icon: Sparkles },
    { id: "tags", label: "食物标签", icon: Tags },
    { id: "reviews", label: "评价", icon: MessageSquareText },
    { id: "media", label: "菜单实景", icon: Images },
    { id: "compliance", label: "合规审查", icon: ShieldCheck },
    { id: "shop_showcase", label: "店铺展示", icon: LayoutGrid },
    { id: "ads", label: "广告列表", icon: Megaphone },
    { id: "users", label: "账户", icon: Users },
  ];

  const visibleTabs = tabs.filter((t) => allowedTabs.includes(t.id));
  /** 移动端：仅在侧边栏「第一页」（当前角色第一个 Tab）显示退出登录 */
  const primaryTab = allowedTabs[0] ?? "overview";

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8">
      <aside className="lg:w-56 lg:shrink-0 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-3 shadow-sm">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-amber-800/60">
            eatMap 后台
          </p>
          <p className="mb-2 px-2 text-[11px] text-amber-800/55">
            {me?.nickname ?? "…"} · {me?.role ?? "—"}
          </p>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition lg:w-full ${
                  tab === id
                    ? "bg-amber-100 text-amber-950"
                    : "text-amber-900/75 hover:bg-amber-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          {me ? (
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/login");
                router.refresh();
              }}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100/80 ${tab !== primaryTab ? "max-md:hidden" : ""}`}
            >
              <LogOut className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              退出登录
            </button>
          ) : null}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 space-y-4">
        {impersonator ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-600/35 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p>
              <span className="font-semibold">身份预览</span>
              <span className="text-amber-900/85">
                ：界面按「{me?.nickname}」（{me ? roleLabelCn(me.role) : "—"}）展示 ·
                真实登录账号为「{impersonator.nickname}」
              </span>
            </p>
            <button
              type="button"
              disabled={previewBusy}
              onClick={() => void stopImpersonating()}
              className="shrink-0 rounded-xl bg-amber-950 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-50"
            >
              {previewBusy ? "切换中…" : "切回超管"}
            </button>
          </div>
        ) : null}

        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
              <h1 className="text-xl font-semibold text-amber-950">后台总览</h1>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/75">
                超级管理员与管理员建议在 PC 宽屏下操作地图搭建与审核；商户仅能维护绑定到本账号的店铺。
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-900/80">
                <li>地图搭建：编辑铺位前请切到「拖动画布」平移楼层，避免与铺位拖拽冲突。</li>
                <li>
                  超级管理员在「食物标签」维护可选标签库；「店铺」页只做店面信息与菜品维护。
                </li>
                <li>超级管理员可在「账户」页搜索用户、指定或解除管理员，并重置密码。</li>
              </ul>
            </div>

            {me?.role === "super_admin" || me?.role === "admin" ? (
              <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-white p-5 shadow-sm ring-1 ring-teal-950/[0.06]">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-amber-950">用户数据备份</h2>
                    <p className="mt-2 text-sm leading-relaxed text-amber-900/75">
                      将当前数据目录（JSON、uploads 等）完整复制到服务器上的备份根目录下的{" "}
                      <code className="rounded bg-teal-900/10 px-1 py-0.5 text-xs text-teal-950">latest/</code>
                      （覆盖上一次快照）。生产环境在进程启动、每日北京时间 04:00、以及
                      <strong className="font-medium text-amber-950">保存站点设置</strong>
                      成功后也会自动尝试备份（未设置{" "}
                      <code className="rounded bg-teal-900/10 px-1 text-[11px]">EATMAP_BACKUP_DISABLED=1</code>
                      且开发环境需{" "}
                      <code className="rounded bg-teal-900/10 px-1 text-[11px]">EATMAP_USER_DATA_BACKUP=1</code>
                      ）。
                    </p>
                    <button
                      type="button"
                      disabled={manualBackupBusy}
                      onClick={() => void runManualUserDataBackup()}
                      className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
                    >
                      {manualBackupBusy ? "备份进行中…" : "立即备份到 latest"}
                    </button>
                    {manualBackupMsg ? (
                      <p className="mt-3 text-xs leading-relaxed text-teal-900/90">{manualBackupMsg}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {me?.role === "super_admin" && !impersonator ? (
              <div className="rounded-2xl border border-violet-200/70 bg-violet-50/35 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-950">商户开店向导 · 界面预览</h2>
                <p className="mt-2 text-sm text-amber-900/75">
                  以下为商户注册后在「账户 → 创建店铺」中看到的同一套表单；此处为<strong className="font-medium text-amber-950">预览</strong>
                  ，不会在数据库创建店铺，也不会上传图片或保存文字。
                </p>
                <div className="mt-4 max-h-[min(85vh,920px)] overflow-y-auto rounded-xl border border-amber-900/12 bg-white p-2 shadow-inner">
                  <MerchantSetupShopClient previewMode />
                </div>
              </div>
            ) : null}

            {me?.role === "user" ? (
              <div className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50/50 p-6 text-sm text-amber-900/85">
                <p className="font-medium text-amber-950">普通用户预览模式</p>
                <p className="mt-2">
                  该角色没有后台菜单。真实产品中此类用户不会进入后台；此处仅供超管查看占位说明。
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "map" && allowedTabs.includes("map") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">地图搭建</h2>
            <MapEditor
              buildings={buildings}
              initialFloors={floors}
              shops={shops}
              initialShapes={shapes}
              wideSplit
            />
          </div>
        ) : null}

        {tab === "campus" && allowedTabs.includes("campus") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-amber-950">食堂与楼层</h2>
            <AdminCampusPanel buildings={buildings} floors={floors} shops={shops} />
          </div>
        ) : null}

        {tab === "shops" ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:min-h-0">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">店铺管理</h2>
            <AdminShopPanel
              me={me}
              buildings={buildings}
              floors={floors}
              shapes={shapes}
              shops={shops}
              tagsCatalog={tagsCatalog}
            />
          </div>
        ) : null}

        {tab === "shop_listing" && allowedTabs.includes("shop_listing") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-amber-950">新店审核</h2>
            <p className="mb-4 text-sm text-amber-900/75">
              商户注册并创建店铺后默认不对外展示；审核通过后可在「店铺展示」中勾选对外展示。已通过的店也可在「店铺展示」中单独关闭。
            </p>
            {pendingListingShops.length === 0 ? (
              <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 px-4 py-8 text-center text-sm text-amber-800/75">
                暂无待审核新店。
              </p>
            ) : (
              <ul className="space-y-3">
                {pendingListingShops.map((s) => {
                  const owner = s.ownerUserId ? userById.get(s.ownerUserId) : undefined;
                  return (
                    <li
                      key={s.id}
                      className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-amber-950">{s.name}</p>
                          <p className="mt-1 text-xs text-amber-800/75">
                            {shopBuildingFloorLabel(s, floors)} · 参考人均 ¥{s.avgPrice}
                          </p>
                          <p className="mt-1 text-xs text-amber-800/65">
                            商户：
                            {owner ? (
                              <>
                                {owner.nickname}
                                <span className="text-amber-800/50">
                                  {" "}
                                  · <code className="text-[10px]">{s.ownerUserId}</code>
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-800/50">未绑定</span>
                            )}
                          </p>
                          <p className="mt-1 text-[11px] text-amber-800/55">
                            店铺 ID：<code className="break-all">{s.id}</code>
                          </p>
                          <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                            {shopListingStatusLabel(s.listingStatus)}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void approveShopListing(s.id)}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            通过并展示
                          </button>
                          <button
                            type="button"
                            onClick={() => setTab("shops")}
                            className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-900/15 hover:bg-amber-50"
                          >
                            在店铺管理中查看
                          </button>
                        </div>
                      </div>
                      {s.description ? (
                        <p className="mt-3 line-clamp-3 text-sm text-amber-950/85">{s.description}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "tags" && allowedTabs.includes("tags") ? <AdminTagsPanel tagsCatalog={tagsCatalog} /> : null}

        {tab === "reviews" && allowedTabs.includes("reviews") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">评价管理</h2>
            <div className="grid gap-5 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:items-start xl:gap-6">
              {/* 中栏（合并）：隐藏审核 + 筛选 + 商家列表 */}
              <div className="space-y-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
                {/* 隐藏审核（默认折叠，点击展开） */}
                <div className="rounded-xl border border-violet-200/80 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setShowHideAudit((v) => !v)}
                    className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left hover:bg-violet-50/60 active:bg-violet-50/80"
                  >
                    <div>
                      <span className="font-semibold text-violet-950">隐藏审核</span>
                      {pendingHideReviews.length > 0 && (
                        <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-medium text-white tabular-nums">
                          {pendingHideReviews.length}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-violet-800/70">{showHideAudit ? "收起" : "展开"}</span>
                  </button>
                  {showHideAudit && (
                    <div className="border-t border-violet-200/70 px-4 py-3">
                      <p className="mb-2 text-[11px] text-violet-900/75">商户申请隐藏的评价，批准后对访客隐藏。</p>
                      {pendingHideReviews.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-violet-200/70 bg-violet-50/40 px-3 py-4 text-center text-xs text-violet-900/65">
                          暂无待审
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {pendingHideReviews.map((r) => (
                            <li key={r.id} className="rounded-lg border border-violet-200/70 bg-violet-50/30 p-3 text-xs">
                              <div className="font-medium text-amber-950">
                                {shopNameById.get(r.shopId) ?? r.shopId} · ★{r.rating}
                              </div>
                              <p className="mt-1 line-clamp-2 text-amber-800/85">{r.content || "（无文字）"}</p>
                              <p className="mt-1 text-[10px] text-amber-800/55">
                                申请 {new Date(r.hideRequestedAt!).toLocaleString("zh-CN")}
                              </p>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void toggleReview(r.id, false)}
                                  className="rounded bg-violet-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-violet-800"
                                >
                                  批准隐藏
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void rejectReviewHideRequest(r.id)}
                                  className="rounded bg-white px-2.5 py-1 text-[11px] font-medium text-amber-900 ring-1 ring-amber-900/20 hover:bg-amber-50"
                                >
                                  驳回
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* 筛选 */}
                <div className="space-y-2 rounded-xl border border-amber-900/10 bg-[#fffaf3] p-3">
                  <p className="text-xs font-medium text-amber-800/75">筛选</p>
                  <label className="block text-xs text-amber-900">
                    <span className="text-amber-800/75">店铺</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-1"
                      placeholder="店名或店铺 id"
                      value={reviewShopQ}
                      onChange={(e) => setReviewShopQ(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-amber-900">
                    <span className="text-amber-800/75 shrink-0">展示</span>
                    <select
                      className="min-w-0 flex-1 rounded-lg border border-amber-900/15 bg-white px-2 py-1"
                      value={reviewVisibility}
                      onChange={(e) =>
                        setReviewVisibility(
                          e.target.value as "all" | "visible" | "hidden" | "pending_moderation",
                        )
                      }
                    >
                      <option value="all">全部</option>
                      <option value="visible">展示中</option>
                      <option value="pending_moderation">待内容审核</option>
                      <option value="hidden">已隐藏</option>
                    </select>
                  </label>
                </div>

                {/* 商家列表 */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-amber-800/75">商家列表（点击查看该店评价）</p>
                  <ul className="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2 xl:max-h-[calc(100vh-28rem)]">
                    {reviewShopGroups.length === 0 ? (
                      <li className="px-2 py-4 text-center text-xs text-amber-800/70">暂无符合筛选的评价</li>
                    ) : (
                      reviewShopGroups.map((g) => {
                        const name = shopNameById.get(g.shopId) ?? g.shopId;
                        const p = g.newestReview;
                        return (
                          <li key={g.shopId}>
                            <button
                              type="button"
                              onClick={() => setSelectedReviewShopId(g.shopId)}
                              className={`w-full rounded-lg px-2 py-2 text-left text-xs transition ${
                                g.shopId === selectedReviewShopId
                                  ? "bg-amber-200 text-amber-950"
                                  : "hover:bg-amber-100/80 text-amber-950"
                              }`}
                            >
                              <span className="font-medium">{name}</span>
                              <span className="mt-0.5 block text-[10px] text-amber-800/65">
                                {g.reviews.length} 条 · 最新 {new Date(g.latestAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className="mt-1 block line-clamp-2 text-[10px] text-amber-800/55">
                                ★{p.rating} · {p.content || "（无文字）"}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>

              {/* 右栏：默认最新评价；选中店铺后展示该店详情 */}
              <div className="min-w-0 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
                {selectedReviewShopId ? (
                  (() => {
                    const shopLabel = shopNameById.get(selectedReviewShopId) ?? selectedReviewShopId;
                    const totalInShop = reviewList.filter((r) => r.shopId === selectedReviewShopId).length;
                    const list = reviewsForSelectedShopDetail;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-amber-900/10 bg-[#fffaf3] px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-amber-950">{shopLabel}</p>
                            <p className="text-[11px] text-amber-800/70">
                              全店 {totalInShop} 条评价（含已隐藏）
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedReviewShopId(null)}
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-900/15 hover:bg-amber-50"
                          >
                            返回最新评价
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-amber-900">星级筛选</p>
                          <div className="flex flex-wrap gap-1.5">
                            {([0, 5, 4, 3, 2, 1] as const).map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setReviewDetailStarFilter(n)}
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                                  reviewDetailStarFilter === n
                                    ? "bg-violet-800 text-white shadow-sm"
                                    : "bg-white text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
                                }`}
                              >
                                {n === 0 ? "全部" : `${n} 星`}
                              </button>
                            ))}
                          </div>
                        </div>
                        {list.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6 text-sm text-amber-800/75">
                            该星级下暂无评价。
                          </p>
                        ) : (
                          <ul className="space-y-4 pb-2">
                            {list.map((r) => (
                              <li key={r.id} className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-amber-950">
                                  <span>{r.userName}</span>
                                  <span className="text-amber-800">★ {r.rating}/5</span>
                                  {r.perPersonSpend != null && r.perPersonSpend > 0 && (
                                    <span className="text-xs font-normal text-amber-800/80">人均 ¥{r.perPersonSpend}</span>
                                  )}
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      r.visible
                                        ? "bg-emerald-100 text-emerald-900"
                                        : r.reviewModeration === "pending"
                                          ? "bg-amber-100 text-amber-900"
                                          : "bg-zinc-200 text-zinc-800"
                                    }`}
                                  >
                                    {r.visible
                                      ? "展示中"
                                      : r.reviewModeration === "pending"
                                        ? "待内容审核"
                                        : "已隐藏"}
                                  </span>
                                  {r.hideRequestedAt && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">待隐藏审核</span>}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{r.content}</p>
                                <p className="mt-2 text-xs text-amber-800/65"><code className="break-all">{r.id}</code> · {new Date(r.createdAt).toLocaleString("zh-CN")}</p>
                                {r.images?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {r.images.map((src) => (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <a key={src} href={resolveEatmapMediaUrl(src)} target="_blank" rel="noreferrer" className="block"><img src={resolveEatmapMediaUrl(src)} alt="" className="h-28 w-28 rounded-lg object-cover ring-1 ring-amber-900/15" /></a>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-900/10 pt-3">
                                  <button type="button" onClick={() => toggleReview(r.id, true)} disabled={r.visible} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-40">展示</button>
                                  <button type="button" onClick={() => toggleReview(r.id, false)} disabled={!r.visible} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40">隐藏</button>
                                  <button type="button" onClick={() => void deleteReview(r.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">删除</button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-amber-900/10 bg-[#fffaf3] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-950">最新评价</p>
                        <p className="text-[11px] text-amber-800/70">全平台最新提交的评价（按时间倒序）</p>
                      </div>
                      <span className="text-[11px] text-amber-800/60">共 {latestReviews.length} 条</span>
                    </div>
                    {latestReviews.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6 text-sm text-amber-800/75">暂无评价。</p>
                    ) : (
                      <ul className="space-y-4 pb-2">
                        {latestReviews.map((r) => (
                          <li key={r.id} className="rounded-xl border border-amber-900/10 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-amber-950">
                              <span className="font-semibold text-amber-900">{shopNameById.get(r.shopId) ?? r.shopId}</span>
                              <span>·</span>
                              <span>{r.userName}</span>
                              <span className="text-amber-800">★ {r.rating}/5</span>
                              {r.perPersonSpend != null && r.perPersonSpend > 0 && <span className="text-xs text-amber-800/80">人均 ¥{r.perPersonSpend}</span>}
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  r.visible
                                    ? "bg-emerald-100 text-emerald-900"
                                    : r.reviewModeration === "pending"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-zinc-200 text-zinc-800"
                                }`}
                              >
                                {r.visible
                                  ? "展示中"
                                  : r.reviewModeration === "pending"
                                    ? "待内容审核"
                                    : "已隐藏"}
                              </span>
                              {r.hideRequestedAt && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">待隐藏审核</span>}
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{r.content}</p>
                            <p className="mt-2 text-xs text-amber-800/65"><code className="break-all">{r.id}</code> · {new Date(r.createdAt).toLocaleString("zh-CN")}</p>
                            {r.images?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {r.images.map((src) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <a key={src} href={resolveEatmapMediaUrl(src)} target="_blank" rel="noreferrer" className="block"><img src={resolveEatmapMediaUrl(src)} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-amber-900/15" /></a>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-900/10 pt-3">
                              <button type="button" onClick={() => toggleReview(r.id, true)} disabled={r.visible} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-40">展示</button>
                              <button type="button" onClick={() => toggleReview(r.id, false)} disabled={!r.visible} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40">隐藏</button>
                              <button type="button" onClick={() => void deleteReview(r.id)} className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">删除</button>
                              <button type="button" onClick={() => setSelectedReviewShopId(r.shopId)} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700">查看该店铺</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "merchant_reviews" && allowedTabs.includes("merchant_reviews") && me ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-2 text-lg font-semibold text-amber-950 xl:sr-only">店铺评价</h2>
            <p className="mb-4 text-sm text-amber-900/75">
              绑定店铺收到的全部评价（含已隐藏）。可申请平台审核隐藏不当内容，不会立即生效。
            </p>
            {merchantReviews.length === 0 ? (
              <p className="text-sm text-amber-800/70">暂无评价。</p>
            ) : (
              <ul className="space-y-4">
                {[...merchantReviews]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 font-medium text-amber-950">
                        <span>{r.userName}</span>
                        <span className="text-amber-800">★ {r.rating}/5</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.visible
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-zinc-200 text-zinc-800"
                          }`}
                        >
                          {r.visible ? "展示中" : "已隐藏"}
                        </span>
                        {r.hideRequestedAt ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                            隐藏审核中
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-amber-800/70">
                        {shopNameById.get(r.shopId) ?? r.shopId}
                      </p>
                      <p className="mt-2 leading-relaxed text-amber-950/90">{r.content}</p>
                      <p className="mt-2 text-[11px] text-amber-800/60">
                        {new Date(r.createdAt).toLocaleString("zh-CN")} ·{" "}
                        <code className="break-all">{r.id}</code>
                      </p>
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={!r.visible || Boolean(r.hideRequestedAt)}
                          onClick={() => void requestMerchantHideReview(r.id)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {r.hideRequestedAt ? "已申请隐藏" : "申请隐藏评价"}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "promo" && allowedTabs.includes("promo") && me ? (
          <MerchantPromoPanel
            shops={shops}
            userId={me.id}
            onCreated={(ad) => setAdList((list) => [...list, ad])}
          />
        ) : null}

        {tab === "media" && allowedTabs.includes("media") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-2 text-lg font-semibold text-amber-950 xl:sr-only">菜单与实景</h2>
            <p className="mb-4 text-sm text-amber-900/75 xl:hidden">
              新上传的图片默认对外展示。将单张图设为「已拒绝」后，访客将不再看到该图（兼容列表里仍为「待审核」的旧数据）。
            </p>
            <div className="xl:grid xl:grid-cols-[minmax(280px,320px)_1fr] xl:items-start xl:gap-5">
              <div className="space-y-3 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
                <label className="flex flex-col gap-1 text-xs text-amber-900">
                  <span className="text-amber-800/75">审核状态</span>
                  <select
                    className="rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-2"
                    value={galleryFilter}
                    onChange={(e) => setGalleryFilter(e.target.value as "all" | ShopGalleryStatus)}
                  >
                    <option value="all">全部</option>
                    <option value="pending">待审核</option>
                    <option value="approved">已通过</option>
                    <option value="rejected">已拒绝</option>
                  </select>
                </label>
                <p className="text-xs font-medium text-amber-800/75">图片列表</p>
                {filteredGalleryRows.length === 0 ? (
                  <p className="text-sm text-amber-800/70">当前筛选下没有图片。</p>
                ) : (
                  <ul className="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2 xl:max-h-[calc(100vh-18rem)]">
                    {filteredGalleryRows.map((row) => {
                      const k = galleryRowKey(row);
                      return (
                        <li key={k}>
                          <button
                            type="button"
                            onClick={() => setSelectedGalleryKey(k)}
                            className={`flex w-full gap-2 rounded-lg p-2 text-left text-xs transition ${
                              k === selectedGalleryKey
                                ? "bg-amber-200 text-amber-950"
                                : "hover:bg-amber-100/80 text-amber-950"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveEatmapMediaUrl(row.url)}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-md object-cover ring-1 ring-amber-900/15"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 font-medium">{row.shopName}</span>
                              <span className="mt-0.5 block text-[10px] text-amber-800/65">
                                {row.kind === "menu" ? "菜单" : "实景"}
                                {row.submittedByNickname || row.submittedByUserId ? (
                                  <>
                                    {" "}
                                    · 提交 {row.submittedByNickname ?? "—"}
                                    {row.submittedByUserId ? (
                                      <span className="font-mono text-amber-800/50">
                                        {" "}
                                        ({row.submittedByUserId.slice(0, 8)}…)
                                      </span>
                                    ) : null}
                                  </>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="mt-6 min-w-0 xl:mt-0 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
                {(() => {
                  const row = filteredGalleryRows.find((x) => galleryRowKey(x) === selectedGalleryKey);
                  if (!row) {
                    return (
                      <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6 text-sm text-amber-800/75">
                        {filteredGalleryRows.length === 0
                          ? "当前筛选下没有图片。"
                          : "请在左侧选择一张图片。"}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-4 rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveEatmapMediaUrl(row.url)}
                        alt=""
                        className="max-h-[min(70vh,520px)] w-full rounded-xl object-contain ring-1 ring-amber-900/15"
                      />
                      <div>
                        <p className="font-medium text-amber-950">{row.shopName}</p>
                        <p className="mt-1 text-xs text-amber-800/70">
                          {row.kind === "menu" ? "菜单图" : "实景图"} ·{" "}
                          <code className="break-all text-[10px]">{row.shopId}</code>
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === "approved"
                              ? "bg-emerald-100 text-emerald-900"
                              : row.status === "pending"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-red-100 text-red-900"
                          }`}
                        >
                          {row.status === "approved"
                            ? "已通过"
                            : row.status === "pending"
                              ? "待审核"
                              : "已拒绝"}
                        </span>
                        <p className="mt-2 text-xs text-amber-800/75">
                          提交人：{row.submittedByNickname ?? "—"}
                          {row.submittedByUserId ? (
                            <>
                              {" "}
                              · ID{" "}
                              <code className="break-all text-[10px]">{row.submittedByUserId}</code>
                            </>
                          ) : (
                            <span className="text-amber-800/55">（旧数据无记录）</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-amber-900/10 pt-3">
                        <button
                          type="button"
                          onClick={() => void deleteGalleryRow(row)}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                        >
                          删除此条
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryItemStatus(row.shopId, row.kind, row.url, "approved")
                          }
                          disabled={row.status === "approved"}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryItemStatus(row.shopId, row.kind, row.url, "pending")
                          }
                          disabled={row.status === "pending"}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-900/20 hover:bg-amber-50 disabled:opacity-40"
                        >
                          待审
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryItemStatus(row.shopId, row.kind, row.url, "rejected")
                          }
                          disabled={row.status === "rejected"}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-40"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "shop_showcase" && allowedTabs.includes("shop_showcase") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-amber-950">店铺展示</h2>
            <p className="mb-4 text-sm text-amber-900/75">
              控制各店是否对访客可见。勾选「对外展示」后，店铺会出现在首页瀑布流、今日推荐、室内地图与详情页；取消勾选则全部隐藏（商户与管理员后台仍可查看编辑）。待新店审核的店铺须先在「新店审核」通过。
            </p>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-amber-800/80">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-900">
                对外 {showcaseCounts.visible}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                已隐藏 {showcaseCounts.hidden}
              </span>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-900">
                待审核 {showcaseCounts.pending}
              </span>
              <span className="text-amber-800/60">共 {showcaseCounts.total} 家</span>
            </div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={showcaseShopQ}
                onChange={(e) => setShowcaseShopQ(e.target.value)}
                placeholder="搜索店名、食堂或店铺 ID…"
                className="w-full flex-1 rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-sm text-amber-950 placeholder:text-amber-800/45 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "全部"],
                    ["visible", "对外展示"],
                    ["hidden", "已隐藏"],
                    ["pending", "待新店审核"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setShowcaseFilter(id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      showcaseFilter === id
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-900 ring-1 ring-amber-900/10 hover:bg-amber-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredShowcaseShops.length === 0 ? (
              <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 px-4 py-8 text-center text-sm text-amber-800/75">
                没有匹配的店铺。
              </p>
            ) : (
              <ul className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-1">
                {filteredShowcaseShops.map((s) => {
                  const pending = s.listingStatus === "pending";
                  const checked = isShopPubliclyListed(s);
                  const saving = showcaseSavingId === s.id;
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-900/10 bg-[#fffaf3] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-amber-950">{s.name}</p>
                        <p className="mt-0.5 text-xs text-amber-800/70">
                          {shopBuildingFloorLabel(s, floors)} · ¥{s.avgPrice}/人
                        </p>
                        <span
                          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            pending
                              ? "bg-violet-100 text-violet-900"
                              : checked
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-amber-200/80 text-amber-950"
                          }`}
                        >
                          {shopPublicVisibilityLabel(s)}
                        </span>
                      </div>
                      <label
                        className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1 ${
                          pending ? "cursor-not-allowed opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={pending || saving}
                          onChange={(e) => void setShopPublicDisplay(s.id, e.target.checked)}
                          className="h-4 w-4 rounded border-amber-400 text-teal-600 focus:ring-teal-500/40"
                        />
                        <span className="text-xs font-medium text-amber-950">对外展示</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "compliance" && allowedTabs.includes("compliance") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">合规审查</h2>
            <div className="mx-auto max-w-xl space-y-3">
              {me?.role === "super_admin" || me?.role === "admin" ? (
                <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-3 shadow-sm ring-1 ring-amber-950/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-950">首页推荐 · 总开关</p>
                      <p className="mt-1 text-[10px] leading-snug text-amber-900/70">
                        本平台只提供<strong>免费</strong>的首页推荐推广，不涉及任何付费。关闭时：隐藏商户报名入口与后台「首页推荐」菜单，瀑布流「今日推荐」横条从<strong>全部菜品</strong>
                        随机滚动；开启后恢复免费投放与「今日推荐」标签店逻辑。
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={merchantFeedPromoEnabled}
                      disabled={merchantFeedPromoSwitchSaving}
                      onClick={() => void saveMerchantFeedPromoToggle(!merchantFeedPromoEnabled)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        merchantFeedPromoEnabled ? "bg-teal-600" : "bg-amber-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          merchantFeedPromoEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-amber-900/90">
                    当前：{merchantFeedPromoEnabled ? "已开启免费首页推荐" : "未开启（菜品随机展示）"}
                  </p>
                  {merchantFeedPromoSwitchMsg ? (
                    <p className="mt-1.5 text-[11px] text-amber-900/85">{merchantFeedPromoSwitchMsg}</p>
                  ) : null}
                </div>
              ) : null}
              {me?.role === "super_admin" || me?.role === "admin" ? (
                <div className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 to-white p-3 shadow-sm ring-1 ring-sky-950/[0.04]">
                  <p className="text-xs font-semibold text-sky-950">详情页 · 用户上传与评价</p>
                  <p className="mt-1 text-[10px] leading-snug text-sky-900/70">
                    访客在店铺详情页提交的菜单图、实景图与文字评价。管理员与超管在商户后台上传的图片始终直接对外展示；图库条目在「菜单实景」中管理。
                  </p>
                  <div className="mt-3 space-y-2">
                    <label className="block text-[11px] text-sky-900">
                      <span className="text-sky-800/75">菜单图 / 实景图</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-sky-900/15 bg-white px-2 py-1.5 text-xs text-sky-950 disabled:opacity-50"
                        value={galleryModerationMode}
                        disabled={moderationModesSaving}
                        onChange={(e) => {
                          const v = e.target.value as ContentModerationMode;
                          setGalleryModerationMode(v);
                          void saveContentModerationModes({ galleryModerationMode: v });
                        }}
                      >
                        <option value="post">先发后审（提交后即展示）</option>
                        <option value="pre">先审后发（通过后再展示）</option>
                      </select>
                    </label>
                    <label className="block text-[11px] text-sky-900">
                      <span className="text-sky-800/75">用户评价</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-sky-900/15 bg-white px-2 py-1.5 text-xs text-sky-950 disabled:opacity-50"
                        value={reviewModerationMode}
                        disabled={moderationModesSaving}
                        onChange={(e) => {
                          const v = e.target.value as ContentModerationMode;
                          setReviewModerationMode(v);
                          void saveContentModerationModes({ reviewModerationMode: v });
                        }}
                      >
                        <option value="post">先发后审（提交后即展示）</option>
                        <option value="pre">先审后发（通过后再展示）</option>
                      </select>
                    </label>
                  </div>
                  {moderationModesMsg ? (
                    <p className="mt-2 text-[11px] text-sky-900/85">{moderationModesMsg}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "ads" && allowedTabs.includes("ads") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">广告列表</h2>
            <div className="xl:grid xl:grid-cols-[minmax(280px,320px)_1fr] xl:items-start xl:gap-5">
              <div className="space-y-3 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
                {me?.role === "super_admin" || me?.role === "admin" ? (
                  <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-3 shadow-sm ring-1 ring-amber-950/[0.04]">
                    <p className="text-xs font-semibold text-amber-950">瀑布流 · 公告窄条</p>
                    <p className="mt-1 text-[10px] leading-snug text-amber-900/70">
                      展示在「餐厅定位」与「今日推荐」之间：外框圆角与配色对齐「今日推荐」卡片；条目标题与其栏目标题同字号；正文同一行。多条竖向自动轮播，间隔比今日推荐长 0.5s。每条需关联店铺，点击进详情。
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-amber-900/10 bg-white/70 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-amber-950">瀑布流展示公告条</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-amber-900/65">
                          关闭后首页瀑布流不再显示该窄条；下方条目与店铺关联仍保留，可随时再开启。
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={feedAnnEnabled}
                        disabled={feedAnnToggleSaving}
                        onClick={() => void saveFeedAnnStripVisibleToggle(!feedAnnEnabled)}
                        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                          feedAnnEnabled ? "bg-teal-600" : "bg-amber-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            feedAnnEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-amber-900">条目</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFeedAnnItems((prev) => [
                              ...prev,
                              { id: `draft-${Date.now()}`, title: "", text: "", shopId: "" },
                            ])
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-900"
                        >
                          <Plus className="h-3 w-3" aria-hidden />
                          添加
                        </button>
                      </div>
                      {feedAnnItems.length === 0 ? (
                        <p className="text-[10px] text-amber-800/60">暂无条目；保存空列表则前台不展示窄条。</p>
                      ) : (
                        feedAnnItems.map((row, idx) => (
                          <div
                            key={row.id}
                            className="rounded-lg border border-amber-900/12 bg-white/90 p-2 shadow-sm"
                          >
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="block text-[10px] text-amber-900">
                                <span className="text-amber-800/75">标题</span>
                                <input
                                  type="text"
                                  maxLength={48}
                                  className="mt-0.5 w-full rounded border border-amber-900/15 px-1.5 py-1 text-xs text-amber-950"
                                  value={row.title}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setFeedAnnItems((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, title: v } : r)),
                                    );
                                  }}
                                />
                              </label>
                              <label className="block text-[10px] text-amber-900 sm:col-span-2">
                                <span className="text-amber-800/75">正文</span>
                                <input
                                  type="text"
                                  maxLength={180}
                                  className="mt-0.5 w-full rounded border border-amber-900/15 px-1.5 py-1 text-xs text-amber-950"
                                  value={row.text}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setFeedAnnItems((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, text: v } : r)),
                                    );
                                  }}
                                />
                              </label>
                              <label className="block text-[10px] text-amber-900 sm:col-span-2">
                                <span className="text-amber-800/75">关联店铺</span>
                                <select
                                  className="mt-0.5 w-full rounded border border-amber-900/15 bg-white px-1.5 py-1 text-xs text-amber-950"
                                  value={row.shopId}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setFeedAnnItems((prev) =>
                                      prev.map((r, i) => (i === idx ? { ...r, shopId: v } : r)),
                                    );
                                  }}
                                >
                                  <option value="">请选择…</option>
                                  {shopsSortedForAnn.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFeedAnnItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-red-700 hover:underline"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden />
                              删除本条
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={feedAnnSaving}
                      onClick={() => void saveFeedAnnouncementStrip()}
                      className="mt-3 w-full rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
                    >
                      {feedAnnSaving ? "保存中…" : "保存公告条"}
                    </button>
                    {feedAnnMsg ? (
                      <p className="mt-2 text-[11px] text-amber-900/85">{feedAnnMsg}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-900">审核</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "全部"],
                        ["pending", "待审核"],
                        ["approved", "已通过"],
                        ["rejected", "已驳回"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAdAuditFilter(value)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          adAuditFilter === value
                            ? "bg-amber-800 text-white shadow-sm"
                            : "bg-white text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-900">投放期限（日历）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "全部"],
                        ["active", "投放中"],
                        ["not_started", "未开始"],
                        ["ended", "已结束"],
                        ["none", "无排期"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAdScheduleFilter(value)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          adScheduleFilter === value
                            ? "bg-teal-800 text-white shadow-sm"
                            : "bg-white text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs font-medium text-amber-800/75">列表</p>
                <ul className="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-amber-900/10 bg-[#fffaf3] p-2 xl:max-h-[calc(100vh-18rem)]">
                  {filteredAds.map((a) => {
                    const bucket = adScheduleBucket(a);
                    const scheduleLine =
                      a.startDate && a.endDate ? `${a.startDate}～${a.endDate}` : "无投放日期";
                    const auditCn =
                      a.status === "approved" ? "已通过" : a.status === "pending" ? "待审核" : "已驳回";
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedAdId(a.id)}
                          className={`flex w-full gap-2 rounded-lg p-2 text-left text-xs transition ${
                            a.id === selectedAdId
                              ? "bg-amber-200 text-amber-950"
                              : "hover:bg-amber-100/80 text-amber-950"
                          }`}
                        >
                          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-amber-100/80 ring-1 ring-amber-900/15">
                            {a.promoImage?.trim() ? (
                              <Image
                                src={resolveEatmapMediaUrl(a.promoImage.trim())}
                                alt=""
                                width={128}
                                height={96}
                                className="absolute inset-0 h-full w-full object-cover"
                                sizes="64px"
                                unoptimized={
                                  a.promoImage.trim().startsWith("/api/") ||
                                  /^https?:\/\//i.test(a.promoImage.trim())
                                }
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center px-1 text-[9px] text-amber-800/55">
                                无图
                              </span>
                            )}
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 font-medium">{a.title}</span>
                            <span className="mt-0.5 block text-[10px] text-amber-800/65">
                              {adSlotLabelCn(a.slot)} · {scheduleLine}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-900/10">
                                {auditCn}
                              </span>
                              <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-teal-900 ring-1 ring-teal-800/15">
                                {adScheduleBucketLabelCn(bucket)}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-6 min-w-0 xl:mt-0 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
                {(() => {
                  const a = filteredAds.find((x) => x.id === selectedAdId);
                  if (!a) {
                    return (
                      <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6 text-sm text-amber-800/75">
                        {filteredAds.length === 0 ? "当前筛选下没有广告。" : "请在左侧选择一条广告。"}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-4 rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4">
                      <div className="relative mx-auto aspect-video max-h-[min(55vh,380px)] w-full max-w-2xl overflow-hidden rounded-xl bg-amber-100/50 ring-1 ring-amber-900/15">
                        {a.promoImage?.trim() ? (
                          <Image
                            src={resolveEatmapMediaUrl(a.promoImage.trim())}
                            alt=""
                            width={1280}
                            height={720}
                            className="absolute inset-0 h-full w-full object-contain"
                            sizes="(max-width:768px)100vw,672px"
                            unoptimized={
                              a.promoImage.trim().startsWith("/api/") ||
                              /^https?:\/\//i.test(a.promoImage.trim())
                            }
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-amber-800/55">
                            无展示图（部分展位可不配图）
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-amber-950">{a.title}</p>
                        <p className="mt-1 text-xs text-amber-800/70">
                          商户 <code className="text-[10px]">{a.merchantId}</code> · 店铺{" "}
                          {shopNameById.get(a.shopId) ?? a.shopId} · {adSlotLabelCn(a.slot)}
                        </p>
                        {featuredAdScheduleCn(a) ? (
                          <p className="mt-1 text-xs font-medium text-amber-900/85">
                            {featuredAdScheduleCn(a)}
                          </p>
                        ) : a.startDate && a.endDate ? (
                          <p className="mt-1 text-xs text-amber-800/75">
                            投放 {a.startDate}～{a.endDate}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-amber-800/75">无投放日期</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              a.status === "approved"
                                ? "bg-emerald-100 text-emerald-900"
                                : a.status === "pending"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-red-100 text-red-900"
                            }`}
                          >
                            {a.status === "approved"
                              ? "已通过"
                              : a.status === "pending"
                                ? "待审核"
                                : "已驳回"}
                          </span>
                          <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-800/20">
                            {adScheduleBucketLabelCn(adScheduleBucket(a))}
                          </span>
                        </div>
                        <p className="mt-2 rounded-lg border border-amber-900/10 bg-white/80 px-3 py-2 text-[11px] leading-snug text-amber-900/85">
                          {adFrontDisplayHint(a)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-amber-900/10 pt-3">
                        <button
                          type="button"
                          onClick={() => setAdStatus(a.id, "approved")}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          批准
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdStatus(a.id, "pending")}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-900/20 hover:bg-amber-50"
                        >
                          标为待审
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdStatus(a.id, "rejected")}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                        >
                          驳回
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "users" && allowedTabs.includes("users") ? (
          <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-amber-950 xl:sr-only">账户管理</h2>
            <div className="xl:grid xl:grid-cols-[minmax(260px,300px)_1fr] xl:items-start xl:gap-5">
              <div className="space-y-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-1">
                {me?.role === "super_admin" ? (
                  <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-3">
                    <p className="text-xs font-semibold text-amber-950">搜索并绑定管理员</p>
                    <p className="mt-1 text-[11px] leading-snug text-amber-800/70">
                      按邮箱、昵称等关键词搜索账号；符合条件的可设为管理员。下方「当前管理员」可一键解除。
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className="min-w-[160px] flex-1 rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm"
                        placeholder="邮箱或昵称关键词"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => void runUserSearch()}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700"
                      >
                        搜索
                      </button>
                    </div>
                    {searchMsg ? <p className="mt-2 text-xs text-amber-800">{searchMsg}</p> : null}
                    {searchHits.length > 0 ? (
                      <ul className="mt-2 max-h-[140px] space-y-1.5 overflow-y-auto rounded-lg border border-amber-900/10 bg-white/80 p-2">
                        {searchHits.map((u) => (
                          <li
                            key={u.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-amber-950">{u.nickname}</span>
                              <span className="text-amber-800/65"> · {roleLabelCn(u.role)}</span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1 font-mono text-[10px] text-amber-800/75">
                                <code className="break-all">{u.id}</code>
                                <button
                                  type="button"
                                  className="text-amber-700 underline"
                                  onClick={() => void navigator.clipboard?.writeText(u.id)}
                                >
                                  复制
                                </button>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-1">
                              {u.role !== "super_admin" && u.role !== "admin" ? (
                                <button
                                  type="button"
                                  onClick={() => promoteAdmin(u.id)}
                                  className="rounded-md bg-amber-950 px-2 py-1 text-[11px] font-medium text-amber-50 hover:bg-amber-900"
                                >
                                  设为管理员
                                </button>
                              ) : null}
                              {u.role === "admin" ? (
                                <button
                                  type="button"
                                  onClick={() => demoteAdmin(u.id)}
                                  className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
                                >
                                  解除
                                </button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-3 border-t border-amber-900/15 pt-2 text-xs font-semibold text-amber-950">
                      当前管理员
                    </p>
                    <ul className="mt-1 space-y-1">
                      {users.filter((x) => x.role === "admin").length === 0 ? (
                        <li className="text-[11px] text-amber-800/60">暂无管理员（除超管外）。</li>
                      ) : (
                        users
                          .filter((x) => x.role === "admin")
                          .map((adm) => (
                            <li
                              key={adm.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/10 bg-white/80 px-2 py-1.5 text-xs"
                            >
                              <span className="min-w-0 truncate font-medium text-amber-950">
                                {adm.nickname}
                              </span>
                              <button
                                type="button"
                                onClick={() => demoteAdmin(adm.id)}
                                className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
                              >
                                解除管理员
                              </button>
                            </li>
                          ))
                      )}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-3">
                  <p className="text-xs font-semibold text-amber-900">搜索与筛选</p>
                  <label className="mt-2 block text-xs text-amber-900">
                    <span className="text-amber-800/75">关键词（ID、昵称、邮箱、手机）</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-2 py-2 text-sm"
                      placeholder="可选"
                      value={listFilter}
                      onChange={(e) => setListFilter(e.target.value)}
                    />
                  </label>
                  <p className="mt-3 text-xs font-medium text-amber-800/75">角色类型</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "全部"],
                        ["user", "学生"],
                        ["merchant", "商户"],
                        ["admin", "管理员"],
                        ["super_admin", "超管"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setUserRoleFilter(id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1 transition ${
                          userRoleFilter === id
                            ? "bg-amber-200 text-amber-950 ring-amber-400/60"
                            : "bg-white text-amber-900/85 ring-amber-900/12 hover:bg-amber-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 min-w-0 xl:mt-0 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
                {filteredUsersTable.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 p-6 text-sm text-amber-800/75">
                    当前筛选下没有账户。
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {filteredUsersTable.map((u) => {
                      const boundShops = shops.filter((s) => s.ownerUserId === u.id);
                      const open = expandedUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          className="rounded-lg border border-amber-900/10 bg-[#fffaf3] p-2 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-tight text-amber-950">
                            <span className="max-w-[38%] truncate font-semibold">{u.nickname}</span>
                            <span className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-amber-800 ring-1 ring-amber-900/12">
                              {roleLabelCn(u.role)}
                            </span>
                            <code
                              className="min-w-0 max-w-[40%] truncate font-mono text-[10px] text-amber-800/70"
                              title={u.id}
                            >
                              {u.id}
                            </code>
                            <button
                              type="button"
                              className="ml-auto shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-amber-900/18 hover:bg-amber-50"
                              onClick={() => setExpandedUserId((id) => (id === u.id ? null : u.id))}
                            >
                              {open ? "收起" : "详情"}
                            </button>
                          </div>
                          {!open ? (
                            <p className="mt-1 line-clamp-1 text-[10px] text-amber-800/55">
                              {u.email ? `邮箱 ${u.email}` : null}
                              {u.email && u.phone ? " · " : null}
                              {u.phone ? `手机 ${u.phone}` : null}
                              {!u.email && !u.phone ? "未填写邮箱与手机" : null}
                            </p>
                          ) : null}

                          {open ? (
                            <div className="mt-2 space-y-2 border-t border-amber-900/10 pt-2 text-xs text-amber-950">
                              <dl className="space-y-1.5">
                                <div>
                                  <dt className="text-[10px] font-medium text-amber-800/75">用户 ID</dt>
                                  <dd className="flex flex-wrap items-center gap-1">
                                    <code className="break-all text-[11px]">{u.id}</code>
                                    <button
                                      type="button"
                                      className="rounded bg-white px-1.5 py-0.5 text-[10px] text-amber-800 ring-1 ring-amber-900/12"
                                      onClick={() => void navigator.clipboard?.writeText(u.id)}
                                    >
                                      复制
                                    </button>
                                  </dd>
                                </div>
                                {u.username ? (
                                  <div>
                                    <dt className="text-[10px] font-medium text-amber-800/75">登录名</dt>
                                    <dd>{u.username}</dd>
                                  </div>
                                ) : null}
                                <div>
                                  <dt className="text-[10px] font-medium text-amber-800/75">邮箱</dt>
                                  <dd className="break-all">{u.email ?? "—"}</dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] font-medium text-amber-800/75">手机</dt>
                                  <dd>{u.phone ?? "—"}</dd>
                                </div>
                              </dl>

                              <div>
                                <p className="text-[10px] font-semibold text-amber-900">绑定店铺</p>
                                {boundShops.length === 0 ? (
                                  <p className="mt-0.5 text-[10px] text-amber-800/65">当前未绑定。</p>
                                ) : (
                                  <ul className="mt-1 space-y-1">
                                    {boundShops.map((s) => (
                                      <li key={s.id} className="text-[10px]">
                                        <span className="font-medium">{s.name}</span>
                                        <code className="ml-1 text-amber-800/65">{s.id}</code>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {me?.role === "super_admin" && u.role === "merchant" ? (
                                <div className="rounded-md border border-amber-900/12 bg-white/90 p-2">
                                  <p className="text-[10px] font-semibold text-amber-950">更改店铺绑定</p>
                                  <select
                                    className="mt-1 w-full rounded-md border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-[11px]"
                                    value={merchantBindShopId}
                                    onChange={(e) => setMerchantBindShopId(e.target.value)}
                                  >
                                    <option value="">不绑定店铺（解除全部）</option>
                                    {shops.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                        {s.ownerUserId && s.ownerUserId !== u.id
                                          ? `（已绑 ${s.ownerUserId.slice(0, 6)}…）`
                                          : ""}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="mt-2 rounded-md bg-amber-800 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-900"
                                    onClick={() => void applyMerchantShopBind(u.id, merchantBindShopId)}
                                  >
                                    保存绑定
                                  </button>
                                </div>
                              ) : null}

                              {me?.role === "super_admin" ? (
                                <div className="flex flex-wrap gap-1.5 border-t border-amber-900/10 pt-2">
                                  {u.role !== "super_admin" ? (
                                    resetPwdFor === u.id ? (
                                      <>
                                        <PasswordInput
                                          variant="compact"
                                          wrapperClassName="relative mt-0 inline-block w-28 align-middle"
                                          placeholder="新密码"
                                          value={resetPwdValue}
                                          onChange={(e) => setResetPwdValue(e.target.value)}
                                          aria-label="新密码"
                                        />
                                        <button
                                          type="button"
                                          className="rounded bg-amber-600 px-2 py-1 text-[10px] text-white"
                                          onClick={() => resetUserPassword(u.id, resetPwdValue)}
                                        >
                                          保存
                                        </button>
                                        <button
                                          type="button"
                                          className="text-[10px] text-amber-800 underline"
                                          onClick={() => {
                                            setResetPwdFor(null);
                                            setResetPwdValue("");
                                          }}
                                        >
                                          取消
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="rounded-md bg-white px-2 py-1 text-[10px] ring-1 ring-amber-900/15 hover:bg-amber-50"
                                        onClick={() => {
                                          setResetPwdFor(u.id);
                                          setResetPwdValue("");
                                        }}
                                      >
                                        重置密码
                                      </button>
                                    )
                                  ) : null}
                                  {u.role !== "super_admin" && u.id !== me?.id ? (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[10px] text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                                      onClick={() => void deleteUserAccount(u.id, u.nickname)}
                                    >
                                      <Trash2 className="h-3 w-3" aria-hidden />
                                      删除
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="rounded-md px-2 py-1 text-[10px] text-amber-800 underline"
                                    onClick={() => setTab("shops")}
                                  >
                                    打开店铺页
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
