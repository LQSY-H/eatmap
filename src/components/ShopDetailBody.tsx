"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, MapPin, Phone, Star, UtensilsCrossed } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ReviewForm } from "@/components/ReviewForm";
import { ShopActions } from "@/components/ShopActions";
import { useAuth } from "@/components/AuthProvider";
import { aggregatedPublicDishTags } from "@/lib/shop-dish-tags";
import { MERCHANT_HIDDEN_SHOP_TAGS } from "@/lib/shop-tags";
import { shopBuildingFloorLabel } from "@/lib/shop-location";
import type { ContentModerationMode } from "@/lib/site-settings";
import type { Floor, Review, Shop } from "@/lib/types";
import type { ShopPriceDisplay } from "@/lib/ratings";

function pendingGalleryKey(shopId: string) {
  return `eatmap-pending-gallery:${shopId}`;
}

function loadPendingGalleryUrls(shopId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = sessionStorage.getItem(pendingGalleryKey(shopId));
    if (!s) return [];
    const arr = JSON.parse(s) as unknown;
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

function savePendingGalleryUrls(shopId: string, urls: string[]) {
  if (typeof window === "undefined") return;
  if (urls.length === 0) sessionStorage.removeItem(pendingGalleryKey(shopId));
  else sessionStorage.setItem(pendingGalleryKey(shopId), JSON.stringify(urls));
}

function pendingReviewKey(shopId: string) {
  return `eatmap-pending-review:${shopId}`;
}

function loadPendingReviewIds(shopId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const s = sessionStorage.getItem(pendingReviewKey(shopId));
    if (!s) return [];
    const arr = JSON.parse(s) as unknown;
    return Array.isArray(arr) ? arr.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

function savePendingReviewIds(shopId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  if (ids.length === 0) sessionStorage.removeItem(pendingReviewKey(shopId));
  else sessionStorage.setItem(pendingReviewKey(shopId), JSON.stringify(ids));
}

function imgUnopt(src: string) {
  return src.includes("/api/");
}

function ReviewStarRow({ rating }: { rating: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${filled} 星`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 shrink-0 max-md:h-3 max-md:w-3 ${
            i < filled ? "fill-amber-400 text-amber-500" : "text-amber-200/90"
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function ShopDetailBody({
  shop,
  floors,
  reviews,
  ratingAvg,
  priceDisplay,
  galleryModerationMode,
  reviewModerationMode,
}: {
  shop: Shop;
  floors: Floor[];
  reviews: Review[];
  ratingAvg: number | null;
  priceDisplay: ShopPriceDisplay | null;
  galleryModerationMode: ContentModerationMode;
  reviewModerationMode: ContentModerationMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [sceneBusy, setSceneBusy] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [galleryHint, setGalleryHint] = useState<string | null>(null);
  const [moderationToast, setModerationToast] = useState<string | null>(null);

  const merchantOwnsShop = user?.role === "merchant" && shop.ownerUserId === user.id;
  const canUploadGallery =
    user &&
    (user.role === "super_admin" ||
      user.role === "admin" ||
      merchantOwnsShop);

  const menuUrls = useMemo(() => (shop.menuImages ?? []).map((i) => i.url), [shop.menuImages]);
  const sceneUrls = useMemo(() => (shop.sceneImages ?? []).map((i) => i.url), [shop.sceneImages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = loadPendingGalleryUrls(shop.id);
    if (!pending.length) return;
    const visible = new Set([...menuUrls, ...sceneUrls]);
    const still: string[] = [];
    let approved = false;
    for (const url of pending) {
      if (visible.has(url)) {
        approved = true;
      } else {
        still.push(url);
      }
    }
    if (approved) {
      setModerationToast("您贡献的照片已通过审核，现已在本页展示。");
      savePendingGalleryUrls(shop.id, still);
    }
  }, [shop.id, menuUrls, sceneUrls]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    let cancelled = false;
    const pendingIds = loadPendingReviewIds(shop.id);
    if (!pendingIds.length) return;
    void (async () => {
      try {
        const res = await fetch(eatmapUrl("/api/reviews?mine=1"), { credentials: "include" });
        if (!res.ok || cancelled) return;
        const mine = (await res.json()) as Review[];
        const still: string[] = [];
        let hit = false;
        for (const id of pendingIds) {
          const r = mine.find((x) => x.id === id);
          if (r?.visible) {
            hit = true;
          } else {
            still.push(id);
          }
        }
        if (hit && !cancelled) {
          setModerationToast("您的评价已通过审核并公开展示。");
          savePendingReviewIds(shop.id, still);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, shop.id, reviews]);

  useEffect(() => {
    if (!moderationToast) return;
    const t = window.setTimeout(() => setModerationToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [moderationToast]);

  async function postGalleryFiles(kind: "menu" | "scene", files: FileList | null) {
    if (!files?.length || !user) return;
    const purpose = kind === "menu" ? "shop-menu" : "shop-scene";
    const setBusy = kind === "menu" ? setMenuBusy : setSceneBusy;
    setBusy(true);
    setGalleryHint(null);
    setModerationToast(null);
    try {
      let ok = 0;
      const pendingUrls: string[] = [...loadPendingGalleryUrls(shop.id)];
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("purpose", purpose);
        fd.append("shopId", shop.id);
        const res = await fetch(eatmapUrl("/api/upload"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { url: string };
        const pr = await fetch(eatmapUrl(`/api/shops/${shop.id}/gallery`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ kind, url: data.url }),
        });
        if (!pr.ok) continue;
        ok++;
        const pack = (await pr.json()) as {
          shop?: Shop;
          submittedGalleryStatus?: string;
          submittedUrl?: string;
          galleryModerationMode?: ContentModerationMode;
        };
        const submittedUrl = pack.submittedUrl ?? data.url;
        if (pack.submittedGalleryStatus === "pending") {
          if (!pendingUrls.includes(submittedUrl)) pendingUrls.push(submittedUrl);
        }
      }
      if (ok > 0) {
        savePendingGalleryUrls(shop.id, pendingUrls);
        setGalleryHint(
          galleryModerationMode === "pre"
            ? "已提交，管理员审核通过后将在本页展示。"
            : "已提交并对外展示，管理员可能后续抽查。",
        );
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const cuisineTags = aggregatedPublicDishTags(shop);
  const systemShopLabels = (shop.tags ?? []).filter((t) => MERCHANT_HIDDEN_SHOP_TAGS.has(t));

  const showContactBlock =
    shop.showContact && (shop.contactPhone?.trim() || shop.contactNote?.trim());

  const loginNext = pathname?.startsWith("/") ? pathname : `/shop/${shop.id}`;
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  const upperTextGap = showContactBlock ? "gap-1 max-md:gap-0.5" : "gap-2 max-md:gap-1.5";
  const upperRowPad = showContactBlock
    ? "flex items-start gap-3 p-3 max-md:gap-2.5 max-md:p-2.5 sm:gap-4 sm:p-4 md:p-5"
    : "flex items-start gap-3 p-3 pb-2 max-md:gap-2.5 max-md:p-2.5 max-md:pb-1.5 sm:gap-4 sm:p-4 sm:pb-3 md:p-5 md:pb-4";

  return (
    <>
      <ImageLightbox src={lightbox} open={!!lightbox} onClose={() => setLightbox(null)} />

      <div className="mx-auto w-full min-w-0 max-w-5xl box-border space-y-6 px-4 py-8 max-md:space-y-4 max-md:px-[max(0.625rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] max-md:pb-4 max-md:pt-5">
        <div className="flex flex-col gap-2 max-md:gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push("/")
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-900/15 bg-white px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50 max-md:px-2.5 max-md:py-1 max-md:text-xs"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 max-md:h-3.5 max-md:w-3.5" aria-hidden />
              返回
            </button>
          </div>

          <div className="min-w-0 overflow-hidden rounded-3xl border border-amber-900/10 bg-white shadow-sm max-md:rounded-2xl">
            <div className={upperRowPad}>
              {shop.coverImage ? (
                <button
                  type="button"
                  className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-amber-100 ring-1 ring-amber-900/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400/50 max-md:h-20 max-md:w-20 max-md:rounded-lg sm:h-28 sm:w-28 md:h-32 md:w-32"
                  onClick={() => {
                    const raw = shop.coverImage;
                    if (raw) setLightbox(raw);
                  }}
                  title="查看大图"
                >
                  <Image
                    src={resolveEatmapMediaUrl(shop.coverImage)}
                    alt={shop.name}
                    width={256}
                    height={256}
                    priority
                    className="absolute inset-0 h-full w-full object-cover"
                    sizes="(max-width:640px) 80px, (max-width:768px) 112px, 128px"
                    unoptimized={imgUnopt(shop.coverImage)}
                  />
                </button>
              ) : (
                <div
                  className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-200 via-orange-100 to-rose-100 ring-1 ring-amber-900/10 max-md:h-20 max-md:w-20 max-md:rounded-lg sm:h-28 sm:w-28 md:h-32 md:w-32"
                  aria-hidden
                />
              )}
              <div className={`flex min-w-0 flex-1 flex-col justify-start ${upperTextGap}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <h1 className="min-w-0 flex-1 text-lg font-bold leading-snug text-amber-950 max-md:text-base sm:text-xl md:text-2xl">
                    {shop.name}
                  </h1>
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-amber-800 max-md:text-xs">
                    {priceDisplay ? (
                      priceDisplay.kind === "combined" ? (
                        <>均价 ¥{priceDisplay.rounded}</>
                      ) : (
                        <>参考均价 ¥{priceDisplay.rounded}</>
                      )
                    ) : (
                      <span className="font-medium text-amber-800/55">暂无参考价</span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-amber-900/85 max-md:text-[11px] sm:text-sm">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-700/90 max-md:h-3 max-md:w-3" aria-hidden />
                    <span className="truncate">{shopBuildingFloorLabel(shop, floors)}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap tabular-nums text-amber-900/90">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-600 max-md:h-3 max-md:w-3" aria-hidden />
                    {ratingAvg != null ? `${ratingAvg} 分（${reviews.length} 条）` : "暂无评分"}
                  </span>
                </div>
                {shop.locationNote ? (
                  <p className="break-words rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-900/10 max-md:px-1.5 max-md:py-1 max-md:text-[10px] sm:text-xs">
                    <span className="font-medium">位置：</span>
                    {shop.locationNote}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={
                showContactBlock
                  ? "space-y-3 border-t border-amber-900/10 p-5 max-md:space-y-2 max-md:p-3 max-md:[&_a]:px-2.5 max-md:[&_a]:py-1.5 max-md:[&_a]:text-xs max-md:[&_button]:px-2.5 max-md:[&_button]:py-1.5 max-md:[&_button]:text-xs"
                  : "space-y-3 border-t border-amber-900/10 px-5 pb-5 pt-3 max-md:space-y-2 max-md:px-3 max-md:pb-3 max-md:pt-2.5 max-md:[&_a]:px-2.5 max-md:[&_a]:py-1.5 max-md:[&_a]:text-xs max-md:[&_button]:px-2.5 max-md:[&_button]:py-1.5 max-md:[&_button]:text-xs"
              }
            >
              <ShopActions shopId={shop.id} />
              {shop.description ? (
                <p className="break-words text-amber-950/85 max-md:text-sm">{shop.description}</p>
              ) : null}
              {shop.showContact && (shop.contactPhone?.trim() || shop.contactNote?.trim()) ? (
                <div className="min-w-0 rounded-xl bg-white px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-900/12 max-md:rounded-lg max-md:px-2.5 max-md:py-1.5 max-md:text-[11px]">
                  <p className="flex items-center gap-1.5 font-medium text-amber-900">
                    <Phone className="h-4 w-4 shrink-0 text-amber-700 max-md:h-3.5 max-md:w-3.5" aria-hidden />
                    联系方式
                  </p>
                  {shop.contactPhone?.trim() ? (
                    <p className="mt-1.5 break-all font-mono text-amber-900/90 max-md:mt-1">{shop.contactPhone.trim()}</p>
                  ) : null}
                  {shop.contactNote?.trim() ? (
                    <p className="mt-1 break-words text-amber-900/85">{shop.contactNote.trim()}</p>
                  ) : null}
                </div>
              ) : null}
              {cuisineTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-md:gap-1">
                  {cuisineTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-orange-50 px-2.5 py-0.5 text-sm text-orange-950 ring-1 ring-orange-200/80 max-md:px-2 max-md:py-0.5 max-md:text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {systemShopLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-md:gap-1">
                  {systemShopLabels.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-950 ring-1 ring-amber-800/20 max-md:px-2 max-md:py-0.5 max-md:text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <section className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 px-1 max-md:mb-1.5">
            <UtensilsCrossed className="h-5 w-5 text-amber-700 max-md:h-4 max-md:w-4" aria-hidden />
            <h2 className="text-lg font-semibold text-amber-950 max-md:text-[15px]">菜品</h2>
          </div>
          {shop.dishes.length === 0 ? (
            <p className="px-1 text-sm text-amber-800/65 max-md:text-xs">暂无菜品信息，店主可在后台添加。</p>
          ) : (
            <div className="-mx-4 flex gap-2 overflow-x-auto overflow-y-hidden scroll-pl-6 pb-2 pl-6 pr-4 pt-1 [scrollbar-width:thin] max-md:-mx-[max(0.625rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] max-md:gap-1.5 max-md:scroll-pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pl-[max(1rem,env(safe-area-inset-left,0px))] max-md:pr-[max(0.625rem,env(safe-area-inset-right,0px))] snap-x snap-mandatory [touch-action:pan-x]">
              {shop.dishes.map((d, i) => {
                const dishTags = (d.tags ?? []).filter((t) => !MERCHANT_HIDDEN_SHOP_TAGS.has(t));
                const cardClass =
                  "w-[118px] shrink-0 snap-start overflow-hidden rounded-xl border border-amber-900/10 bg-white text-left shadow-sm max-md:w-[min(30vw,118px)] max-md:rounded-lg sm:w-[142px] md:w-[156px] lg:w-[168px] block";
                const inner = (
                  <>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-amber-50">
                      {d.image ? (
                        <Image
                          src={resolveEatmapMediaUrl(d.image)}
                          alt={d.name}
                          width={336}
                          height={252}
                          className="absolute inset-0 h-full w-full object-cover"
                          sizes="(max-width:640px) 118px, (max-width:768px) 142px, 168px"
                          unoptimized={imgUnopt(d.image)}
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-amber-50 text-[10px] text-amber-800/45">
                          无图
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 px-2 py-1 max-md:px-1.5">
                      <div className="flex min-h-0 items-center justify-between gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-amber-950 max-md:text-xs">
                          {d.name}
                        </span>
                        {d.price != null ? (
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-800 max-md:text-[10px]">
                            ¥{d.price}
                          </span>
                        ) : null}
                      </div>
                      {dishTags.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5">
                          {dishTags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="rounded bg-orange-50/90 px-1 py-px text-[9px] font-medium leading-none text-orange-950 ring-1 ring-orange-200/70 max-md:text-[8px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                );
                if (merchantOwnsShop) {
                  return (
                    <Link
                      key={`${d.name}-${i}`}
                      href="/account/shop-dishes"
                      className={`${cardClass} transition active:scale-[0.98]`}
                      title="前往菜品上架编辑本店菜品"
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={`${d.name}-${i}`}
                    type="button"
                    className={`${cardClass} cursor-pointer`}
                    onClick={() => d.image && setLightbox(d.image)}
                    title={d.name}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="relative min-w-0 rounded-xl border border-amber-900/10 bg-white/90 px-3 py-2.5 shadow-sm max-md:px-2.5">
            <div className="absolute right-2.5 top-2.5 z-[1] max-md:right-2 max-md:top-2">
              {!user ? (
                <Link
                  href={loginHref}
                  className="text-xs font-semibold text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-950 max-md:text-[11px]"
                >
                  登录可上传
                </Link>
              ) : canUploadGallery ? (
                <label className="cursor-pointer text-xs font-semibold text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-950 max-md:text-[11px]">
                  {menuBusy ? "上传中…" : "我要贡献"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={menuBusy}
                    onChange={(e) => postGalleryFiles("menu", e.target.files)}
                  />
                </label>
              ) : (
                <span
                  className="text-xs font-semibold text-amber-800/45 max-md:text-[11px]"
                  title="仅店主或管理员可上传照片"
                >
                  我要贡献
                </span>
              )}
            </div>
            <div className="flex min-h-[1.5rem] flex-wrap items-center gap-x-2 gap-y-1 pr-[5.25rem] max-md:min-h-[1.375rem] max-md:pr-[4.5rem]">
              <h2 className="text-base font-semibold text-amber-950 max-md:text-sm">菜单</h2>
            </div>
            {menuUrls.length === 0 ? (
              <p className="mt-1 text-xs leading-snug text-amber-800/65 max-md:text-[11px]">暂无菜单照片</p>
            ) : (
              <div className="mt-2 -mx-2 flex gap-2 overflow-x-auto overflow-y-hidden px-2 pb-1 pt-0.5 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
                {menuUrls.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className="relative h-[100px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-amber-900/10 bg-amber-50/70 sm:h-[118px] sm:w-[156px]"
                    onClick={() => setLightbox(src)}
                  >
                    <Image
                      src={resolveEatmapMediaUrl(src)}
                      alt={`菜单 ${i + 1}`}
                      fill
                      className="object-contain object-center"
                      sizes="160px"
                      unoptimized={imgUnopt(src)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-w-0 rounded-xl border border-amber-900/10 bg-white/90 px-3 py-2.5 shadow-sm max-md:px-2.5">
            <div className="absolute right-2.5 top-2.5 z-[1] max-md:right-2 max-md:top-2">
              {!user ? (
                <Link
                  href={loginHref}
                  className="text-xs font-semibold text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-950 max-md:text-[11px]"
                >
                  登录可上传
                </Link>
              ) : canUploadGallery ? (
                <label className="cursor-pointer text-xs font-semibold text-amber-800 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-950 max-md:text-[11px]">
                  {sceneBusy ? "上传中…" : "我要贡献"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={sceneBusy}
                    onChange={(e) => postGalleryFiles("scene", e.target.files)}
                  />
                </label>
              ) : (
                <span
                  className="text-xs font-semibold text-amber-800/45 max-md:text-[11px]"
                  title="仅店主或管理员可上传照片"
                >
                  我要贡献
                </span>
              )}
            </div>
            <div className="flex min-h-[1.5rem] flex-wrap items-center gap-x-2 gap-y-1 pr-[5.25rem] max-md:min-h-[1.375rem] max-md:pr-[4.5rem]">
              <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-amber-950 max-md:text-sm">
                <Camera className="h-4 w-4 text-amber-700/80 max-md:h-3.5 max-md:w-3.5" aria-hidden />
                实景
              </h2>
            </div>
            {sceneUrls.length === 0 ? (
              <p className="mt-1 text-xs leading-snug text-amber-800/65 max-md:text-[11px]">暂无实景照片</p>
            ) : (
              <div className="mt-2 -mx-2 flex gap-2 overflow-x-auto overflow-y-hidden px-2 pb-1 pt-0.5 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
                {sceneUrls.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    className="relative h-[100px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-amber-900/10 bg-amber-50/70 sm:h-[118px] sm:w-[156px]"
                    onClick={() => setLightbox(src)}
                  >
                    <Image
                      src={resolveEatmapMediaUrl(src)}
                      alt={`实景 ${i + 1}`}
                      fill
                      className="object-contain object-center"
                      sizes="160px"
                      unoptimized={imgUnopt(src)}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {galleryHint || moderationToast ? (
          <div className="space-y-1 text-center max-md:px-1">
            {galleryHint ? (
              <p className="text-xs text-amber-800/75">{galleryHint}</p>
            ) : null}
            {moderationToast ? (
              <p className="text-xs font-medium text-emerald-800">{moderationToast}</p>
            ) : null}
          </div>
        ) : null}

        <section className="space-y-4 pb-14 md:pb-16">
          <h2 className="text-lg font-semibold text-amber-950 max-md:text-base">评价</h2>
          <ReviewForm shopId={shop.id} reviewModerationMode={reviewModerationMode} />
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-amber-800/70 max-md:text-xs">还没有公开评价，来做第一个吧。</p>
            ) : (
              reviews.map((r) => (
                <article
                  key={r.id}
                  className="flex flex-col rounded-2xl border border-amber-900/10 bg-white px-4 py-3 shadow-sm max-md:px-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <ReviewStarRow rating={r.rating} />
                    {r.perPersonSpend != null && Number(r.perPersonSpend) > 0 ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-800 max-md:text-xs">
                        人均 ¥{Number(r.perPersonSpend)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2.5 break-words text-base leading-relaxed text-amber-950/90 max-md:mt-2 max-md:text-sm">
                    {r.content || "（无文字）"}
                  </p>
                  {r.images?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.images.map((src) => (
                        <button
                          key={src}
                          type="button"
                          className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-amber-900/15 max-md:h-14 max-md:w-14"
                          onClick={() => setLightbox(src)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolveEatmapMediaUrl(src)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2.5 flex items-end justify-between gap-3 max-md:mt-2">
                    <time className="text-xs text-amber-800/60" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleString("zh-CN")}
                    </time>
                    <span className="shrink-0 text-[11px] text-amber-800/65 max-md:text-[10px]">{r.userName}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
