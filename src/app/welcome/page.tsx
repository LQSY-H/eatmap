import Link from "next/link";
import Image from "next/image";
import { resolveEatmapMediaUrl } from "@/lib/base-path";
import { ArrowRight, LayoutGrid, MapPinned, Sparkles } from "lucide-react";
import { FeedTopCarousel } from "@/components/FeedTopCarousel";
import { SiteLegalFooter } from "@/components/SiteLegalFooter";
import { getAds, getPublicShops, getReviews } from "@/lib/data";
import {
  buildFeedTopStrip,
  buildFeedTopStripFromAllDishes,
  shuffleFeedTop,
} from "@/lib/feed-top-strip";
import { shopPriceDisplay } from "@/lib/ratings";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "食图 eatMap · 欢迎",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const [shops, ads, reviews, siteSettings] = await Promise.all([
    getPublicShops(),
    getAds(),
    getReviews(),
    getSiteSettings(),
  ]);
  const feedTopEntries = shuffleFeedTop(
    siteSettings.merchantFeedPromoEnabled
      ? buildFeedTopStrip(shops, ads)
      : buildFeedTopStripFromAllDishes(shops),
  );
  const fallbackPick =
    feedTopEntries[0]?.shop ?? shops.find((s) => s.tags.includes("今日推荐")) ?? shops[0];

  return (
    <div className="flex-1">
      <section className="relative overflow-hidden border-b border-amber-900/10 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 lg:flex-row lg:items-center lg:py-20">
          <div className="flex-1 space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-900/15 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              校园美食一张图 · eatMap / 食图
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-amber-950 sm:text-5xl">
              <span className="block">发现食堂与综合楼的</span>
              <span className="mt-1 block bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-5xl text-transparent sm:mt-1.5 sm:text-6xl">
                下一顿
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-amber-900/75">
              瀑布流逛店、室内地图找档口；登录后可管理评价与账户，随时回到你喜欢的味道。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 hover:bg-amber-700"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                进入瀑布流
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
              >
                <MapPinned className="h-4 w-4 text-amber-700" aria-hidden />
                打开室内地图
              </Link>
            </div>
          </div>

          <div className="flex-1">
            {feedTopEntries.length > 0 ? (
              <FeedTopCarousel entries={feedTopEntries} embedded />
            ) : (
              <div className="relative mx-auto aspect-[4/3] max-w-lg overflow-hidden rounded-3xl border border-white/60 bg-white/40 shadow-xl backdrop-blur">
                {fallbackPick?.coverImage ? (
                  <Image
                    src={resolveEatmapMediaUrl(fallbackPick.coverImage)}
                    alt={fallbackPick.name}
                    width={960}
                    height={720}
                    priority
                    className="absolute inset-0 h-full w-full object-cover"
                    sizes="(max-width:1024px) 100vw, 480px"
                    unoptimized={fallbackPick.coverImage.includes("/api/")}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-200 via-orange-100 to-rose-100" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                  <div>
                    <p className="text-xs text-white/80">今日推荐预览</p>
                    <p className="text-lg font-semibold">{fallbackPick?.name ?? "食图"}</p>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
                    {fallbackPick
                      ? (() => {
                          const pd = shopPriceDisplay(fallbackPick, reviews);
                          if (!pd) return "—";
                          return (
                            (pd.kind === "combined" ? `均价 ¥${pd.rounded}` : `参考均价 ¥${pd.rounded}`) +
                            "/人"
                          );
                        })()
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
        {[
          {
            title: "瀑布流逛店",
            desc: "按区域与标签筛选，人均与菜品摘要一目了然，还有随机推荐帮你灵感点餐。",
            href: "/",
          },
          {
            title: "室内地图找店",
            desc: "分层浏览、拖拽与缩放，点击铺位查看详情，线下找档口更轻松。",
            href: "/map",
          },
        ].map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-3xl border border-amber-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-amber-950 group-hover:underline">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/75">{card.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
              前往
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      <SiteLegalFooter />
    </div>
  );
}
