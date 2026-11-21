"use client";
import { eatmapUrl } from "@/lib/base-path";

import { useEffect, useState } from "react";
import { ClipboardList, MessageSquareText, Shield, Sparkles, Store } from "lucide-react";
import { AccountNavLink } from "@/components/AccountNavLink";

const MERCHANT_NAV_META = [
  {
    key: "shop",
    title: "创建或完善店铺",
    desc: "店名、食堂楼层、封面与简介等",
    icon: Store,
  },
  {
    key: "dishes",
    title: "菜品上架",
    desc: "维护名称、价格与配图",
    icon: ClipboardList,
  },
  {
    key: "reviews",
    title: "店铺评价",
    desc: "按星级筛选，可申请隐藏不当内容",
    icon: MessageSquareText,
  },
  {
    key: "promo",
    title: "首页推荐",
    desc: "报名首页展示位与档期",
    icon: Sparkles,
  },
  {
    key: "security",
    title: "账户与安全",
    desc: "修改密码与昵称",
    icon: Shield,
  },
] as const;

export function MerchantAccountHub() {
  const [hasShop, setHasShop] = useState<boolean | null>(null);
  const [promoNavVisible, setPromoNavVisible] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(eatmapUrl("/api/shops/mine"), { credentials: "include" });
        if (!res.ok) {
          setHasShop(false);
          return;
        }
        const mine = (await res.json()) as unknown[];
        setHasShop(mine.length > 0);
      } catch {
        setHasShop(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(eatmapUrl("/api/site-settings"));
        if (!res.ok) {
          setPromoNavVisible(false);
          return;
        }
        const d = (await res.json()) as { merchantFeedPromoEnabled?: unknown };
        setPromoNavVisible(d.merchantFeedPromoEnabled === true);
      } catch {
        setPromoNavVisible(false);
      }
    })();
  }, []);

  const shopManageHref = hasShop ? "/account/shop-manage" : "/account/setup-shop";
  const dishesHref = hasShop ? "/account/shop-dishes" : "/account/setup-shop";

  const hrefByKey: Record<(typeof MERCHANT_NAV_META)[number]["key"], string> = {
    shop: shopManageHref,
    dishes: dishesHref,
    reviews: "/account/merchant-reviews",
    promo: "/account/merchant-promo",
    security: "/account/security",
  };

  const navRows =
    promoNavVisible === true
      ? [...MERCHANT_NAV_META]
      : MERCHANT_NAV_META.filter((row) => row.key !== "promo");

  return (
    <nav className="mt-6 space-y-2.5 px-4 md:mt-7 md:px-0" aria-label="账户功能">
      {hasShop === null
        ? MERCHANT_NAV_META.map(({ key }) => (
            <div
              key={key}
              className="flex animate-pulse items-center gap-3 rounded-2xl border border-amber-900/10 bg-white px-4 py-3.5 shadow-sm shadow-amber-950/[0.04] ring-1 ring-amber-950/[0.03] max-md:rounded-xl max-md:py-3"
            >
              <span className="h-11 w-11 shrink-0 rounded-xl bg-amber-100/80 max-md:h-10 max-md:w-10" />
              <div className="min-w-0 flex-1 space-y-2 py-0.5">
                <div className="h-4 w-36 rounded bg-amber-100/70 max-md:h-[14px]" />
                <div className="h-3 w-[85%] max-w-[220px] rounded bg-amber-100/50" />
              </div>
              <span className="h-5 w-5 shrink-0 rounded bg-amber-100/40 max-md:h-4 max-md:w-4" />
            </div>
          ))
        : navRows.map(({ key, title, desc, icon }) => (
            <AccountNavLink key={key} href={hrefByKey[key]} title={title} desc={desc} icon={icon} />
          ))}
    </nav>
  );
}
