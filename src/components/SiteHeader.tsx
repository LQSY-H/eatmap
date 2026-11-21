"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinned, Shield, UserCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ChefHatIcon } from "@/components/icons/ChefHatIcon";
import { EatmapBrandIcon } from "@/components/icons/EatmapBrandIcon";
import { eatmapStaticImg } from "@/lib/eatmap-static-img";

const desktopLinks = [
  { href: "/", label: "美食", icon: ChefHatIcon },
  { href: "/map", label: "地图", icon: MapPinned },
];

function isFeedNavPath(pathname: string) {
  return pathname === "/" || pathname === "/feed" || pathname.startsWith("/feed/");
}

const mobileNavBtnBase =
  "inline-flex touch-manipulation items-center gap-1.5 rounded-full px-2.5 py-2 text-[13px] font-semibold leading-none transition-colors";

const mobileNavActive = `${mobileNavBtnBase} bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-900/15`;

const mobileNavIdle = `${mobileNavBtnBase} text-amber-800/90 hover:bg-amber-50 active:bg-amber-100/70`;

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const staff =
    user &&
    (user.role === "super_admin" || user.role === "admin" || user.role === "merchant");

  return (
    <header className="sticky top-0 z-50 border-b border-amber-900/10 bg-[#fffaf3]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      {/*
        少数抓取逻辑会扫正文靠前的大图；hidden 不占版面。分享卡片仍以 layout 里 og:image / itemprop 为准。
      */}
      {/* eslint-disable-next-line @next/next/no-img-element -- 隐藏抓取图，不需要 next/image 优化 */}
      <img
        src={eatmapStaticImg("icon512.png")}
        alt=""
        width={512}
        height={512}
        decoding="async"
        fetchPriority="low"
        className="hidden"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3">
        <Link href="/welcome" className="flex min-w-0 shrink-0 items-center gap-2 font-semibold text-amber-950">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm md:h-11 md:w-11 md:rounded-xl">
            <EatmapBrandIcon className="h-[1.625rem] w-[1.625rem] md:h-9 md:w-9" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[10px] text-amber-800/80 md:text-sm">eatMap</span>
            <span className="block truncate text-sm tracking-tight md:text-base">食图</span>
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 md:hidden">
          <Link
            href="/"
            className={isFeedNavPath(pathname) ? mobileNavActive : mobileNavIdle}
            aria-current={isFeedNavPath(pathname) ? "page" : undefined}
          >
            <ChefHatIcon className="h-4 w-4 shrink-0 opacity-90" />
            美食
          </Link>
          <Link
            href="/map"
            className={pathname === "/map" || pathname.startsWith("/map/") ? mobileNavActive : mobileNavIdle}
            aria-current={pathname === "/map" || pathname.startsWith("/map/") ? "page" : undefined}
          >
            <MapPinned className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            地图
          </Link>
          {loading ? (
            <span className="px-1 text-[13px] font-semibold text-amber-700/45">…</span>
          ) : user ? (
            staff ? (
              <Link
                href="/admin"
                className={pathname.startsWith("/admin") ? mobileNavActive : mobileNavIdle}
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              >
                <Shield className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                后台管理
              </Link>
            ) : (
              <Link
                href="/account"
                className={pathname.startsWith("/account") ? mobileNavActive : mobileNavIdle}
                aria-current={pathname.startsWith("/account") ? "page" : undefined}
              >
                <UserCircle className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                账户管理
              </Link>
            )
          ) : (
            <Link
              href="/login"
              className="inline-flex shrink-0 touch-manipulation items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold leading-none text-white shadow-sm ring-1 ring-amber-700/25 transition-colors bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
            >
              <UserPlus className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
              登录 / 注册
            </Link>
          )}
        </nav>

        <nav className="hidden shrink-0 flex-wrap items-center justify-end gap-1 md:flex">
          {desktopLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? isFeedNavPath(pathname)
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-900/15"
                    : "text-amber-900/70 hover:bg-amber-50 hover:text-amber-950 active:bg-amber-100/70"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {label}
              </Link>
            );
          })}
          {loading ? null : user ? (
            staff ? (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-900/15"
                    : "text-amber-900/70 hover:bg-amber-50 hover:text-amber-950 active:bg-amber-100/70"
                }`}
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              >
                <Shield className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                后台
              </Link>
            ) : (
              <Link
                href="/account"
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/account")
                    ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-900/15"
                    : "text-amber-900/70 hover:bg-amber-50 hover:text-amber-950 active:bg-amber-100/70"
                }`}
                aria-current={pathname.startsWith("/account") ? "page" : undefined}
              >
                <UserCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                账户
              </Link>
            )
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-medium text-amber-900/80 hover:bg-amber-50"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
