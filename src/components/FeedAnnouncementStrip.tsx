"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { FeedAnnouncementItem } from "@/lib/site-settings";

/** 竖向轮播：间隔 = 今日推荐 2000ms + 500ms */
const GAP_PX = 8;
const AUTO_INTERVAL_MS = 2500;
const SCROLL_DURATION_MS = 480;
const RESUME_AFTER_USER_SCROLL_MS = 3200;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function getScrollStepPxVertical(viewport: HTMLElement): number {
  const row = viewport.querySelector<HTMLElement>("[data-feed-announce-row]");
  const h = row?.offsetHeight ?? 0;
  return h > 8 ? h + GAP_PX : 0;
}

function normalizeLoopPositionVertical(el: HTMLElement, cycleH: number) {
  if (cycleH < 1) return;
  while (el.scrollTop >= cycleH) {
    el.scrollTop -= cycleH;
  }
}

function finalizeLoopScrollVertical(el: HTMLElement, cycleH: number) {
  const step = getScrollStepPxVertical(el);
  if (cycleH >= 1) normalizeLoopPositionVertical(el, cycleH);
  if (step >= 1) {
    el.scrollTop = Math.round(el.scrollTop / step) * step;
  }
}

function setCarouselSnapEnabledVertical(viewport: HTMLElement, enabled: boolean) {
  if (enabled) {
    viewport.classList.remove("snap-none");
    viewport.classList.add("snap-y", "snap-mandatory");
  } else {
    viewport.classList.add("snap-none");
    viewport.classList.remove("snap-y", "snap-mandatory");
  }
}

function animateScrollTop(
  el: HTMLElement,
  to: number,
  durationMs: number,
  rafRef: MutableRefObject<number | null>,
  programmaticRef: MutableRefObject<boolean>,
  animatingRef: MutableRefObject<boolean>,
  onComplete?: () => void,
) {
  const from = el.scrollTop;

  function finish() {
    onComplete?.();
    programmaticRef.current = false;
    animatingRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCarouselSnapEnabledVertical(el, true));
    });
  }

  if (rafRef.current != null) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    programmaticRef.current = false;
    animatingRef.current = false;
    setCarouselSnapEnabledVertical(el, true);
  }

  if (Math.abs(to - from) < 0.5) {
    el.scrollTop = to;
    finish();
    return;
  }

  setCarouselSnapEnabledVertical(el, false);
  programmaticRef.current = true;
  animatingRef.current = true;
  const t0 = performance.now();

  function frame(now: number) {
    const u = Math.min(1, (now - t0) / durationMs);
    el.scrollTop = from + (to - from) * easeOutCubic(u);
    if (u < 1) {
      rafRef.current = requestAnimationFrame(frame);
    } else {
      rafRef.current = null;
      finish();
    }
  }

  rafRef.current = requestAnimationFrame(frame);
}

/** 喇叭轮廓（更像手持扩音器） */
function MegaphoneGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 10.5v3a1 1 0 0 0 1 1h2.5l6.2 2.8c.9.4 1.9-.3 1.9-1.3V7c0-1-.99-1.7-1.9-1.3L7.5 8.5H5a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5c1.2 1 2 2.5 2 4.2 0 1.7-.8 3.2-2 4.2"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M18 6c2 1.6 3.2 4 3.2 6.7 0 2.7-1.3 5.1-3.2 6.7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        opacity={0.45}
      />
      <path
        d="M6.5 14v4.3a.7.7 0 0 0 1.2.5l1.4-1.7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 与「今日推荐」标题一致：`FeedTopCarousel` 内 h2（与正文同一行） */
const titleClass =
  "shrink-0 truncate text-sm font-semibold leading-snug text-amber-950 max-md:text-xs max-md:leading-none";

/** 接近推荐卡片说明文案层级 */
const bodyClass =
  "min-w-0 flex-1 truncate text-xs font-medium leading-snug text-amber-950 max-md:text-[11px] max-md:leading-none";

/** 视口高度下限（px）；首次渲染用略大的默认值，避免测量前被内容撑满无法滚动 */
const MIN_VIEWPORT_SLIDE_PX = 28;
/** 与移动端条最小高度大致一致，减少首帧高度跳动 */
const INITIAL_VIEWPORT_SLIDE_PX = 40;

export function FeedAnnouncementStrip({
  items,
  shopIdsValid,
}: {
  items: FeedAnnouncementItem[];
  shopIdsValid: Set<string>;
}) {
  const sig = useMemo(() => items.map((i) => `${i.id}:${i.title}:${i.text}:${i.shopId}`).join("|"), [items]);
  const [order, setOrder] = useState<FeedAnnouncementItem[]>(() => items);

  useEffect(() => {
    setOrder(shuffle([...items]));
  }, [sig, items]);

  const n = order.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const scrollAnimRaf = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);
  const programmaticScroll = useRef(false);
  const autoplayAnimating = useRef(false);
  const cycleHeightRef = useRef(0);
  const scrollIdleTimer = useRef<number | null>(null);
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [viewportSlidePx, setViewportSlidePx] = useState(INITIAL_VIEWPORT_SLIDE_PX);

  const measureSlideViewportHeight = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const row = vp.querySelector<HTMLElement>("[data-feed-announce-row]");
    if (!row) return;
    /** offsetHeight：整数且与 iOS/WebKit 滚动盒一致，避免 getBoundingClientRect 亚像素与可视区域错位 */
    const h = row.offsetHeight;
    if (h >= 8) {
      setViewportSlidePx(Math.max(MIN_VIEWPORT_SLIDE_PX, h));
    }
  }, []);

  const remeasureCycle = useCallback(() => {
    if (n <= 1) {
      cycleHeightRef.current = 0;
      return;
    }
    const g = firstGroupRef.current;
    if (!g) return;
    cycleHeightRef.current = g.offsetHeight + GAP_PX;
  }, [n]);

  useLayoutEffect(() => {
    remeasureCycle();
    measureSlideViewportHeight();
    const id = requestAnimationFrame(() => measureSlideViewportHeight());
    return () => cancelAnimationFrame(id);
  }, [order, n, remeasureCycle, measureSlideViewportHeight, sig]);

  useEffect(() => {
    return () => {
      const rafId = scrollAnimRaf.current;
      if (rafId != null) cancelAnimationFrame(rafId);
      if (resumeTimer.current != null) window.clearTimeout(resumeTimer.current);
      if (scrollIdleTimer.current != null) window.clearTimeout(scrollIdleTimer.current);
    };
  }, []);

  const pauseAutoplayForUser = useCallback(() => {
    setAutoplayPaused(true);
    if (resumeTimer.current != null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setAutoplayPaused(false), RESUME_AFTER_USER_SCROLL_MS);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || n <= 1) return;

    const pause = () => pauseAutoplayForUser();
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("pointerdown", pause);
    return () => {
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("pointerdown", pause);
    };
  }, [n, pauseAutoplayForUser]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || n <= 1) return;

    const runFinalize = () => {
      if (programmaticScroll.current) return;
      const h = cycleHeightRef.current;
      finalizeLoopScrollVertical(el, h);
    };

    const onScroll = () => {
      if (programmaticScroll.current) return;
      if (scrollIdleTimer.current != null) window.clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = window.setTimeout(runFinalize, 140);
    };

    el.addEventListener("scrollend", runFinalize);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scrollend", runFinalize);
      el.removeEventListener("scroll", onScroll);
      if (scrollIdleTimer.current != null) window.clearTimeout(scrollIdleTimer.current);
    };
  }, [n]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || n <= 1 || autoplayPaused) return;

    const tick = () => {
      if (autoplayAnimating.current) return;
      const step = getScrollStepPxVertical(el);
      if (step < 4) return;

      const cycleH = cycleHeightRef.current;
      if (cycleH < 1) {
        remeasureCycle();
        return;
      }

      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (maxScroll < 1) return;

      const next = Math.round(el.scrollTop / step) * step + step;
      animateScrollTop(el, next, SCROLL_DURATION_MS, scrollAnimRaf, programmaticScroll, autoplayAnimating, () => {
        finalizeLoopScrollVertical(el, cycleH);
      });
    };

    const id = window.setInterval(tick, AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [n, autoplayPaused, remeasureCycle]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      measureSlideViewportHeight();
      if (n > 1) remeasureCycle();
    });
    ro.observe(el);
    const g = firstGroupRef.current;
    if (g) ro.observe(g);
    el.querySelectorAll("[data-feed-announce-row]").forEach((node) => ro.observe(node));
    return () => ro.disconnect();
  }, [n, order, remeasureCycle, measureSlideViewportHeight]);

  if (n === 0) return null;

  const loopMode = n > 1;

  function renderRow(item: FeedAnnouncementItem, keySuffix: string, tabIndex?: number) {
    const href =
      item.shopId && shopIdsValid.has(item.shopId) ? `/shop/${item.shopId}` : null;
    const title = item.title.trim() || "提示";
    const text = item.text.trim();
    const inner = text ? (
      <div className="grid min-h-0 h-full w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 max-md:gap-x-1.5">
        <span className={`${titleClass} shrink-0`}>{title}</span>
        <span className={`${bodyClass} min-w-0 truncate`}>{text}</span>
      </div>
    ) : (
      <div className="flex min-h-0 h-full w-full min-w-0 flex-row items-center gap-2 max-md:gap-1.5">
        <span className={`${titleClass} shrink-0`}>{title}</span>
      </div>
    );
    /** 移动端：固定行高 + 去掉竖向 padding，避免 WebKit 下行盒上下留白不均；桌面端仍用 py-1 */
    const shell =
      "flex w-full min-h-0 flex-row items-center rounded-md px-1 py-1 max-md:min-h-[40px] max-md:py-0 max-md:leading-none ring-amber-600/0 transition hover:bg-amber-50/90 hover:ring-2 hover:ring-amber-400/20 active:bg-amber-100/70";

    if (href) {
      return (
        <Link
          key={`${item.id}-${keySuffix}`}
          data-feed-announce-row
          tabIndex={tabIndex}
          href={href}
          className={`${shell} shrink-0 snap-start snap-always [scroll-snap-stop:always]`}
        >
          {inner}
        </Link>
      );
    }
    return (
      <div
        key={`${item.id}-${keySuffix}`}
        data-feed-announce-row
        className={`${shell} shrink-0 snap-start snap-always cursor-default [scroll-snap-stop:always]`}
      >
        {inner}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/90 to-amber-50/80 px-2 py-1.5 shadow-sm max-md:rounded-xl max-md:px-2 max-md:py-1">
      <div className="flex items-center gap-1.5 max-md:gap-1 max-md:items-center">
        <div className="flex w-7 shrink-0 items-center justify-center text-amber-600 max-md:h-10 max-md:w-6">
          <MegaphoneGlyph className="h-4 w-4 max-md:h-3.5 max-md:w-3.5" />
        </div>

        <div
          ref={viewportRef}
          className="@container min-h-0 min-w-0 flex-1 shrink snap-y snap-mandatory overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            height: viewportSlidePx,
            minHeight: MIN_VIEWPORT_SLIDE_PX,
          }}
        >
          <div className="flex flex-col" style={{ gap: GAP_PX }}>
            {loopMode ? (
              <>
                <div ref={firstGroupRef} className="flex shrink-0 flex-col" style={{ gap: GAP_PX }}>
                  {order.map((item) => renderRow(item, "a"))}
                </div>
                <div className="flex shrink-0 flex-col" style={{ gap: GAP_PX }} aria-hidden>
                  {order.map((item) => renderRow(item, "b", -1))}
                </div>
              </>
            ) : (
              <div ref={firstGroupRef} className="flex shrink-0 flex-col" style={{ gap: GAP_PX }}>
                {order.map((item) => renderRow(item, "only"))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
