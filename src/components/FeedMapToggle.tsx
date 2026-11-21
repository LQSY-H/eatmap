"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MapPinned } from "lucide-react";

export function FeedMapToggle() {
  const pathname = usePathname();
  const onFeed = pathname === "/" || pathname === "/feed" || pathname.startsWith("/feed/");
  const onMap = pathname === "/map";

  return (
    <div className="relative mx-auto flex min-h-[2.55rem] w-[min(100%,380px)] items-center rounded-full bg-amber-900/10 p-1.5 max-md:min-h-[2.35rem] max-md:w-full">
      <span
        className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-full bg-white shadow-sm ring-1 ring-amber-900/15 will-change-transform motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.33,1,0.68,1)] ${
          onMap ? "translate-x-full" : "translate-x-0"
        }`}
        aria-hidden
      />
      <Link
        href="/"
        prefetch
        className={`relative z-10 flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold leading-snug transition-colors duration-200 ease-out md:gap-2 md:py-2.5 md:text-sm ${
          onFeed ? "text-amber-950" : "text-amber-800/65"
        }`}
      >
        <LayoutGrid className="h-4 w-4 shrink-0 md:h-5 md:w-5" aria-hidden />
        <span className="text-center">美食瀑布流</span>
      </Link>
      <Link
        href="/map"
        prefetch
        className={`relative z-10 flex flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold leading-snug transition-colors duration-200 ease-out md:gap-2 md:py-2.5 md:text-sm ${
          onMap ? "text-amber-950" : "text-amber-800/65"
        }`}
      >
        <MapPinned className="h-4 w-4 shrink-0 md:h-5 md:w-5" aria-hidden />
        <span className="text-center">店铺地图</span>
      </Link>
    </div>
  );
}
