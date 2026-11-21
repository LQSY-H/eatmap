"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Star } from "lucide-react";
import { resolveEatmapMediaUrl } from "@/lib/base-path";
import type { FeedTopEntry } from "@/lib/feed-top-strip";

type Props = {
  entries: FeedTopEntry[];
  /** 首页 hero 等：与瀑布流同一轨道动画，外框略轻以融入背景 */
  embedded?: boolean;
};

const GAP_PX = 8;
const AUTO_INTERVAL_MS = 2000;
const SCROLL_DURATION_MS = 480;
/** 用户手动拖动后轮播恢复的等待时间（缩短以便更快继续自动播） */
const RESUME_AFTER_USER_SCROLL_MS = 3200;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function getScrollStepPx(viewport: HTMLElement): number {
  const card = viewport.querySelector<HTMLElement>("[data-feed-top-card]");
  const cardW = card?.getBoundingClientRect().width ?? 0;
  return cardW > 48 ? cardW + GAP_PX : 0;
}

function normalizeLoopPosition(el: HTMLElement, cycleW: number) {
  if (cycleW < 1) return;
  while (el.scrollLeft >= cycleW) {
    el.scrollLeft -= cycleW;
  }
}

/** 无缝循环复位 + 左对齐整张卡（不出现左侧半张） */
function finalizeLoopScroll(el: HTMLElement, cycleW: number) {
  const step = getScrollStepPx(el);
  if (cycleW >= 1) normalizeLoopPosition(el, cycleW);
  if (step >= 1) {
    el.scrollLeft = Math.round(el.scrollLeft / step) * step;
  }
}

/** mandatory snap 会与逐帧 scrollLeft 打架，自动滚动期间关掉，结束后再开 */
function setCarouselSnapEnabled(viewport: HTMLElement, enabled: boolean) {
  if (enabled) {
    viewport.classList.remove("snap-none");
    viewport.classList.add("snap-x", "snap-mandatory");
  } else {
    viewport.classList.add("snap-none");
    viewport.classList.remove("snap-x", "snap-mandatory");
  }
}

function animateScrollLeft(
  el: HTMLElement,
  to: number,
  durationMs: number,
  rafRef: MutableRefObject<number | null>,
  programmaticRef: MutableRefObject<boolean>,
  animatingRef: MutableRefObject<boolean>,
  onComplete?: () => void,
) {
  const from = el.scrollLeft;

  function finish() {
    onComplete?.();
    programmaticRef.current = false;
    animatingRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCarouselSnapEnabled(el, true));
    });
  }

  if (rafRef.current != null) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    programmaticRef.current = false;
    animatingRef.current = false;
    setCarouselSnapEnabled(el, true);
  }

  if (Math.abs(to - from) < 0.5) {
    el.scrollLeft = to;
    finish();
    return;
  }

  setCarouselSnapEnabled(el, false);
  programmaticRef.current = true;
  animatingRef.current = true;
  const t0 = performance.now();

  function frame(now: number) {
    const u = Math.min(1, (now - t0) / durationMs);
    el.scrollLeft = from + (to - from) * easeOutCubic(u);
    if (u < 1) {
      rafRef.current = requestAnimationFrame(frame);
    } else {
      rafRef.current = null;
      finish();
    }
  }

  rafRef.current = requestAnimationFrame(frame);
}

function FeedTopCardLink({
  entry: { shop, caption, imageUrl },
  tabIndex,
}: {
  entry: FeedTopEntry;
  tabIndex?: number;
}) {
  const raw = (imageUrl?.trim() || shop.coverImage) ?? "";
  const src = raw ? resolveEatmapMediaUrl(raw) : "";
  return (
    <Link
      data-feed-top-card
      tabIndex={tabIndex}
      href={`/shop/${shop.id}`}
      className="w-[calc((100cqw-24px)/3.5)] shrink-0 snap-start overflow-hidden rounded-xl bg-white shadow-sm [scroll-snap-stop:always] transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
    >
      <div className="box-border p-1.5 max-md:p-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-amber-100/80">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        width={480}
                        height={360}
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        sizes="(max-width:768px) 30vw, 180px"
                        unoptimized={raw.startsWith("/api/") || /^https?:\/\//i.test(raw)}
                      />
                    ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-orange-300" />
          )}
        </div>
      </div>
      <p className="line-clamp-2 min-h-[2.75rem] px-2 pb-2 pt-0 text-center text-xs font-medium leading-snug text-amber-950 max-md:min-h-[2.5rem] max-md:text-[11px]">
        {caption}
      </p>
    </Link>
  );
}

export function FeedTopCarousel({ entries, embedded = false }: Props) {
  const n = entries.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const scrollAnimRaf = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);
  const programmaticScroll = useRef(false);
  const autoplayAnimating = useRef(false);
  const cycleWidthRef = useRef(0);
  const scrollIdleTimer = useRef<number | null>(null);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  const remeasureCycle = useCallback(() => {
    if (n <= 1) {
      cycleWidthRef.current = 0;
      return;
    }
    const g = firstGroupRef.current;
    if (!g) return;
    cycleWidthRef.current = g.offsetWidth + GAP_PX;
  }, [n]);

  useLayoutEffect(() => {
    remeasureCycle();
  }, [entries, n, remeasureCycle]);

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
      const w = cycleWidthRef.current;
      finalizeLoopScroll(el, w);
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
      const step = getScrollStepPx(el);
      if (step < 49) return;

      const cycleW = cycleWidthRef.current;
      if (cycleW < 1) {
        remeasureCycle();
        return;
      }

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll < 1) return;

      const next = Math.round(el.scrollLeft / step) * step + step;
      animateScrollLeft(el, next, SCROLL_DURATION_MS, scrollAnimRaf, programmaticScroll, autoplayAnimating, () => {
        finalizeLoopScroll(el, cycleW);
      });
    };

    const id = window.setInterval(tick, AUTO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [n, autoplayPaused, remeasureCycle]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || n <= 1) return;
    const ro = new ResizeObserver(() => remeasureCycle());
    ro.observe(el);
    const g = firstGroupRef.current;
    if (g) ro.observe(g);
    return () => ro.disconnect();
  }, [n, remeasureCycle]);

  if (n === 0) return null;

  const loopMode = n > 1;

  return (
    <section
      className={
        embedded
          ? "w-full max-w-lg rounded-2xl border border-white/55 bg-white/40 px-2 py-3 shadow-lg shadow-amber-950/10 backdrop-blur-md ring-1 ring-amber-900/10 max-md:rounded-xl max-md:px-2 max-md:py-2.5"
          : "rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/90 to-amber-50/80 px-2 py-3 shadow-sm max-md:rounded-xl max-md:px-2 max-md:py-2.5"
      }
    >
      <div className="mb-2 flex items-center gap-1.5 px-0.5 max-md:mb-1.5">
        <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500 max-md:h-3.5 max-md:w-3.5" aria-hidden />
        <h2 className="text-sm font-semibold text-amber-950 max-md:text-xs">今日推荐</h2>
      </div>

      <div
        ref={viewportRef}
        className="@container -mx-0.5 snap-x snap-mandatory overflow-x-auto overflow-y-hidden pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex" style={{ gap: GAP_PX }}>
          {loopMode ? (
            <>
              <div ref={firstGroupRef} className="flex shrink-0" style={{ gap: GAP_PX }}>
                {entries.map((e) => (
                  <FeedTopCardLink key={`${e.key}-a`} entry={e} />
                ))}
              </div>
              <div className="flex shrink-0" style={{ gap: GAP_PX }} aria-hidden>
                {entries.map((e) => (
                  <FeedTopCardLink key={`${e.key}-b`} entry={e} tabIndex={-1} />
                ))}
              </div>
            </>
          ) : (
            <div ref={firstGroupRef} className="flex shrink-0" style={{ gap: GAP_PX }}>
              {entries.map((e) => (
                <FeedTopCardLink key={e.key} entry={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
