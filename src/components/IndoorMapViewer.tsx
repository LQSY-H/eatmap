"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Group, Layer, Rect, Stage } from "react-konva";
import type { Building, Floor, MapShape, Shop } from "@/lib/types";
import type { ShopPriceDisplay, ShopRating } from "@/lib/ratings";
import { isShopShape } from "@/lib/map-shape";
import { KonvaCrispLabel } from "@/components/KonvaCrispLabel";
import { ShopCardMeituan } from "@/components/ShopCardMeituan";

type Props = {
  buildings: Building[];
  floors: Floor[];
  shapes: MapShape[];
  shops: Shop[];
  highlightShopId?: string | null;
  ratings: Record<string, ShopRating>;
  priceDisplays: Record<string, ShopPriceDisplay | null>;
};

/** 与 Tailwind `md`（768px）一致：手机端初始视图更小，便于一眼看到更多铺位 */
function initialMapScaleForViewport(): number {
  if (typeof window === "undefined") return 1;
  return window.matchMedia("(max-width: 767px)").matches ? 0.5 : 1;
}

function shapeColors(shape: MapShape, active: boolean) {
  if (shape.kind === "stairs") {
    return {
      fill: active ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.32)",
      stroke: "#1e40af",
      strokeW: active ? 2.5 : 1.5,
      labelFill: "#f8fafc",
    };
  }
  if (shape.kind === "entrance") {
    return {
      fill: active ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.32)",
      stroke: "#166534",
      strokeW: active ? 2.5 : 1.5,
      labelFill: "#f0fdf4",
    };
  }
  return {
    fill: active ? "rgba(251,191,36,0.55)" : "rgba(251,146,60,0.35)",
    stroke: active ? "#b45309" : "#c2410c",
    strokeW: active ? 3 : 1.5,
    labelFill: "#422006",
  };
}

export default function IndoorMapViewer({
  buildings,
  floors,
  shapes,
  shops,
  highlightShopId,
  ratings,
  priceDisplays,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [pixelRatio, setPixelRatio] = useState(1);
  /** 与 SiteHeader 底边对齐，避免 fixed 工具条盖住页眉或进安全区 */
  const [headerBottomPx, setHeaderBottomPx] = useState(0);

  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.order - b.order),
    [floors],
  );

  /** 与瀑布流一致展示全部食堂；尚无楼层的食堂也会出现在切换条，选中后提示去后台建画布 */
  const buildingsInMapOrder = useMemo(() => {
    const minFloorOrder = (bid: string) => {
      const fs = floors.filter((f) => f.buildingId === bid);
      if (fs.length === 0) return 1_000_000;
      return Math.min(...fs.map((f) => f.order));
    };
    return [...buildings].sort((a, b) => {
      const ao = a.sortOrder ?? 1_000_000;
      const bo = b.sortOrder ?? 1_000_000;
      if (ao !== bo) return ao - bo;
      return minFloorOrder(a.id) - minFloorOrder(b.id) || a.name.localeCompare(b.name, "zh-CN");
    });
  }, [buildings, floors]);

  const [pickedBuildingId, setPickedBuildingId] = useState<string | null>(null);
  const resolvedBuildingId = useMemo(() => {
    if (pickedBuildingId && buildingsInMapOrder.some((b) => b.id === pickedBuildingId)) {
      return pickedBuildingId;
    }
    return buildingsInMapOrder[0]?.id ?? "";
  }, [pickedBuildingId, buildingsInMapOrder]);

  const floorsInBuilding = useMemo(
    () => sortedFloors.filter((f) => f.buildingId === resolvedBuildingId),
    [sortedFloors, resolvedBuildingId],
  );

  const [floorId, setFloorId] = useState("");

  useEffect(() => {
    const list = sortedFloors.filter((f) => f.buildingId === resolvedBuildingId);
    if (!list.length) {
      setFloorId("");
      return;
    }
    setFloorId((cur) => (list.some((f) => f.id === cur) ? cur : list[0].id));
  }, [resolvedBuildingId, sortedFloors]);

  /** 从详情页 ?shop= 进入时，切换到该铺位所在的食堂与楼层（仅对该目标执行一次） */
  useEffect(() => {
    const sid = highlightShopId?.trim();
    if (!sid) {
      highlightNavigateKeyRef.current = "";
      return;
    }
    const shape = shapes.find((s) => isShopShape(s) && s.shopId === sid);
    if (!shape) return;
    const fl = sortedFloors.find((f) => f.id === shape.floorId);
    if (!fl) return;
    const navKey = `${sid}:${shape.floorId}:${fl.buildingId}`;
    if (highlightNavigateKeyRef.current === navKey) return;
    highlightNavigateKeyRef.current = navKey;
    setPickedBuildingId(fl.buildingId);
    setFloorId(shape.floorId);
  }, [highlightShopId, shapes, sortedFloors]);

  const floor = floorsInBuilding.find((f) => f.id === floorId) ?? floorsInBuilding[0];

  const shopMap = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);

  const floorShapes = useMemo(
    () => shapes.filter((s) => s.floorId === floor?.id),
    [shapes, floor?.id],
  );

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 48, y: 48 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const [pickedShopId, setPickedShopId] = useState<string | null>(null);
  const pickedShopIdRef = useRef<string | null>(null);
  pickedShopIdRef.current = pickedShopId;
  const stageRef = useRef<Konva.Stage | null>(null);
  /** 每个「楼层 + URL 指定店铺」仅自动弹出底部卡片一次（不改变默认缩放与位移） */
  const highlightFloorAppliedRef = useRef<string>("");
  /** 同一 ?shop= 目的地下仅自动切换食堂/楼层一次，避免用户手动换楼后被拉回 */
  const highlightNavigateKeyRef = useRef<string>("");

  function attachPanFromClientPointer(startClientX: number, startClientY: number) {
    const ox = posRef.current.x;
    const oy = posRef.current.y;
    function move(ev: MouseEvent | TouchEvent) {
      let x: number | undefined;
      let y: number | undefined;
      if ("touches" in ev && ev.touches.length) {
        x = ev.touches[0].clientX;
        y = ev.touches[0].clientY;
      } else if ("clientX" in ev) {
        x = (ev as MouseEvent).clientX;
        y = (ev as MouseEvent).clientY;
      }
      if (x == null || y == null) return;
      setPos({ x: ox + x - startClientX, y: oy + y - startClientY });
    }
    function end() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchmove", move as EventListener);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    window.addEventListener("touchmove", move as EventListener, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
  }

  useEffect(() => {
    setPixelRatio(Math.min(2.5, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
  }, []);

  useLayoutEffect(() => {
    const hdr = document.querySelector("header");
    if (!hdr) return;
    const apply = () => setHeaderBottomPx(hdr.getBoundingClientRect().bottom);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(hdr);
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, true);
    };
  }, []);

  useEffect(() => {
    function measure() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(280, Math.floor(r.width));
      const h = Math.max(280, Math.floor(r.height));
      setSize({ w, h });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  /** 阻止手指在画布区拖动时带动整页滚动，避免顶栏工具条跟着跑出视口 */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const blockScrollChaining = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener("touchmove", blockScrollChaining, { passive: false });
    return () => el.removeEventListener("touchmove", blockScrollChaining);
  }, []);

  useLayoutEffect(() => {
    setScale(initialMapScaleForViewport());
    setPos({ x: 48, y: 48 });
    setPickedShopId(null);
    highlightFloorAppliedRef.current = "";
  }, [floorId]);

  useEffect(() => {
    const sid = highlightShopId?.trim();
    if (!sid || !floor) {
      highlightFloorAppliedRef.current = "";
      return;
    }
    if (!floorShapes.some((s) => isShopShape(s) && s.shopId === sid)) {
      highlightFloorAppliedRef.current = "";
      return;
    }
    const focusKey = `${floor.id}:${sid}`;
    if (highlightFloorAppliedRef.current === focusKey) return;
    highlightFloorAppliedRef.current = focusKey;
    setPickedShopId(sid);
  }, [highlightShopId, floor, floorShapes]);

  /** 触控：双指捏合缩放、单指空白处平移；轻点空白取消已选店铺 */
  useEffect(() => {
    const stageNode = stageRef.current;
    if (!stageNode || !floor) return;
    const el = stageNode.container();

    type Gesture =
      | { kind: "idle" }
      | { kind: "pan"; lastClientX: number; lastClientY: number }
      | {
          kind: "pinch";
          startDist: number;
          startScale: number;
          world: { x: number; y: number };
        };

    let gesture: Gesture = { kind: "idle" };
    let touchStart: { clientX: number; clientY: number } | null = null;
    let didPanOrPinch = false;

    function clientToStage(clientX: number, clientY: number) {
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function touchDist(a: Touch, b: Touch) {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function midStageFromTouches(t0: Touch, t1: Touch) {
      const mcx = (t0.clientX + t1.clientX) / 2;
      const mcy = (t0.clientY + t1.clientY) / 2;
      return clientToStage(mcx, mcy);
    }

    function hitNameAt(stageX: number, stageY: number): string | undefined {
      const st = stageRef.current;
      if (!st) return undefined;
      const hit = st.getIntersection({ x: stageX, y: stageY });
      return hit?.name() ?? undefined;
    }

    function beginPinch(t0: Touch, t1: Touch) {
      const d0 = touchDist(t0, t1);
      if (d0 < 1) return;
      const mid = midStageFromTouches(t0, t1);
      const px = posRef.current.x;
      const py = posRef.current.y;
      const sc = scaleRef.current;
      gesture = {
        kind: "pinch",
        startDist: d0,
        startScale: sc,
        world: { x: (mid.x - px) / sc, y: (mid.y - py) / sc },
      };
      didPanOrPinch = true;
      touchStart = null;
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        beginPinch(e.touches[0], e.touches[1]);
        return;
      }
      if (e.touches.length === 1) {
        gesture = { kind: "idle" };
        didPanOrPinch = false;
        const t = e.touches[0];
        touchStart = { clientX: t.clientX, clientY: t.clientY };
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        if (gesture.kind !== "pinch") {
          beginPinch(e.touches[0], e.touches[1]);
        }
        if (gesture.kind !== "pinch") return;
        e.preventDefault();
        const g = gesture;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const d = touchDist(t0, t1);
        const newScale = Math.min(3.2, Math.max(0.28, g.startScale * (d / g.startDist)));
        const mid = midStageFromTouches(t0, t1);
        setScale(newScale);
        setPos({
          x: mid.x - g.world.x * newScale,
          y: mid.y - g.world.y * newScale,
        });
        return;
      }

      if (e.touches.length === 1 && gesture.kind === "pan") {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - gesture.lastClientX;
        const dy = t.clientY - gesture.lastClientY;
        gesture = { kind: "pan", lastClientX: t.clientX, lastClientY: t.clientY };
        setPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        return;
      }

      if (e.touches.length === 1 && touchStart && gesture.kind === "idle") {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchStart.clientX);
        const dy = Math.abs(t.clientY - touchStart.clientY);
        if (dx <= 8 && dy <= 8) return;
        const p = clientToStage(t.clientX, t.clientY);
        const hit = hitNameAt(p.x, p.y);
        if (hit === "mapBlank" || hit === undefined) {
          e.preventDefault();
          didPanOrPinch = true;
          gesture = { kind: "pan", lastClientX: t.clientX, lastClientY: t.clientY };
        }
        touchStart = null;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (gesture.kind === "pinch" && e.touches.length === 1) {
        gesture = { kind: "idle" };
        const t = e.touches[0];
        touchStart = { clientX: t.clientX, clientY: t.clientY };
        didPanOrPinch = false;
        return;
      }

      if (e.touches.length === 0) {
        const g = gesture;
        gesture = { kind: "idle" };

        if (
          !didPanOrPinch &&
          g.kind !== "pinch" &&
          pickedShopIdRef.current &&
          touchStart &&
          e.changedTouches[0]
        ) {
          const t = e.changedTouches[0];
          const dx = Math.abs(t.clientX - touchStart.clientX);
          const dy = Math.abs(t.clientY - touchStart.clientY);
          const p = clientToStage(t.clientX, t.clientY);
          const hit = hitNameAt(p.x, p.y);
          if ((hit === "mapBlank" || hit === undefined) && dx < 14 && dy < 14) {
            setPickedShopId(null);
          }
        }

        touchStart = null;
        didPanOrPinch = false;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [floor, floorId, size.w, size.h]);

  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = {
        x: (pointer.x - pos.x) / oldScale,
        y: (pointer.y - pos.y) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * 1.06 : oldScale / 1.06;
      const clamped = Math.min(3.2, Math.max(0.28, newScale));
      setScale(clamped);
      setPos({
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      });
    },
    [pos.x, pos.y, scale],
  );

  const selectedShopId =
    highlightShopId && floorShapes.some((s) => isShopShape(s) && s.shopId === highlightShopId)
      ? highlightShopId
      : null;

  const pickedShop = pickedShopId ? shopMap.get(pickedShopId) : undefined;

  function pickFromShape(shape: MapShape) {
    if (!isShopShape(shape) || !shape.shopId) return;
    setPickedShopId(shape.shopId);
  }

  /** 浅色底铺满逻辑坐标，便于向四周扩展铺位 */
  const bgExtent = useMemo(() => {
    const pad = 2400;
    const fw = floor?.width ?? 1200;
    const fh = floor?.height ?? 800;
    return { x: -pad, y: -pad, w: fw + pad * 2, h: fh + pad * 2 };
  }, [floor?.width, floor?.height]);

  const toolbarTop = Math.max(0, headerBottomPx);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div
        ref={wrapRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden overscroll-none bg-[#fff7ed] touch-none"
        style={{ touchAction: "none" }}
      >
        {floor ? (
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            onWheel={onWheel}
            pixelRatio={pixelRatio}
            className="block touch-none"
          >
            {/* 底层：平移热区；顶层单独铺形状，避免大块 mapBlank 在同层抢走命中 */}
            <Layer listening={true}>
              <Rect width={size.w} height={size.h} fill="transparent" listening={false} />
              <Group x={pos.x} y={pos.y} scaleX={scale} scaleY={scale}>
                <Rect
                  x={bgExtent.x}
                  y={bgExtent.y}
                  width={bgExtent.w}
                  height={bgExtent.h}
                  fill="#fffaf3"
                  listening={false}
                />
                <Rect
                  name="mapBlank"
                  x={bgExtent.x}
                  y={bgExtent.y}
                  width={bgExtent.w}
                  height={bgExtent.h}
                  fill="rgba(251,191,36,0.05)"
                  listening={true}
                  onMouseDown={(e) => {
                    if (e.evt.button !== 0) return;
                    e.cancelBubble = true;
                    attachPanFromClientPointer(e.evt.clientX, e.evt.clientY);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    setPickedShopId((id) => (id ? null : id));
                  }}
                />
              </Group>
            </Layer>
            <Layer listening={true}>
              <Group x={pos.x} y={pos.y} scaleX={scale} scaleY={scale}>
                {floorShapes.map((shape) => {
                  const shop = isShopShape(shape) ? shopMap.get(shape.shopId) : undefined;
                  const active =
                    isShopShape(shape) &&
                    (selectedShopId === shape.shopId || pickedShopId === shape.shopId);
                  const colors = shapeColors(shape, active);
                  const labelText =
                    shape.label ??
                    (isShopShape(shape) ? shop?.name ?? "店铺" : shape.kind === "stairs" ? "楼梯" : "入口");

                  function handlePick(e: { cancelBubble: boolean }) {
                    e.cancelBubble = true;
                    pickFromShape(shape);
                  }

                  return (
                    <Group key={shape.id} x={shape.x} y={shape.y}>
                      <Rect
                        name="cellRect"
                        x={0}
                        y={0}
                        width={shape.width}
                        height={shape.height}
                        cornerRadius={8}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={colors.strokeW}
                        shadowBlur={active ? 12 : 4}
                        shadowColor="rgba(0,0,0,0.1)"
                        hitStrokeWidth={Math.max(12, shape.height * 0.08)}
                        onTap={handlePick}
                        onClick={handlePick}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = "pointer";
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = "default";
                        }}
                      />
                      <KonvaCrispLabel shape={shape} text={labelText} fill={colors.labelFill} />
                    </Group>
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center text-amber-800/70">
            暂无楼层数据，请先在后台创建画布。
          </div>
        )}

      </div>

      {/* 透明底浮动条：fixed 在页眉下，竖向拖动页面时不会跟着跑；空白处事件穿透到地图 */}
      <div
        className="pointer-events-none fixed inset-x-0 z-30 px-4 py-2 sm:px-7 md:px-10 md:py-2.5"
        style={{ top: toolbarTop }}
      >
        <div className="pointer-events-auto mx-auto flex min-w-0 max-w-[min(100%,680px)] flex-col gap-2 sm:gap-2.5">
          <div className="flex flex-nowrap gap-2.5 overflow-x-auto px-1 py-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 sm:px-2 [&::-webkit-scrollbar]:hidden">
            {buildingsInMapOrder.map((b) => {
              const hasFloors = floors.some((f) => f.buildingId === b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  title={hasFloors ? undefined : "该食堂尚未配置楼层，请至后台地图搭建添加"}
                  onClick={() => setPickedBuildingId(b.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-inset transition md:text-sm ${
                    resolvedBuildingId === b.id
                      ? "bg-amber-600 text-white ring-amber-600"
                      : hasFloors
                        ? "bg-white/45 text-amber-950 ring-amber-900/20 backdrop-blur-md hover:bg-white/60"
                        : "bg-white/35 text-amber-800/55 ring-amber-900/15 backdrop-blur-md hover:bg-white/50"
                  }`}
                >
                  {b.name}
                  {!hasFloors ? (
                    <span className="ml-1 text-[10px] font-normal opacity-80">待建</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex flex-nowrap gap-2.5 overflow-x-auto px-1 py-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 sm:px-2 [&::-webkit-scrollbar]:hidden">
            {floorsInBuilding.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFloorId(f.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-inset transition md:text-sm ${
                  floorId === f.id
                    ? "bg-amber-600 text-white ring-amber-600"
                    : "bg-white/45 text-amber-950 ring-amber-900/20 backdrop-blur-md hover:bg-white/60"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pickedShop ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-900/15 bg-[#fffaf3]/98 px-3 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md max-md:px-2.5 max-md:pt-2.5"
          style={{
            paddingBottom: "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
          }}
        >
          <div className="mx-auto max-w-lg space-y-2.5">
            <ShopCardMeituan
              shop={pickedShop}
              floors={floors}
              rating={ratings[pickedShop.id]}
              priceDisplay={priceDisplays[pickedShop.id]}
            />
            <div className="flex gap-2">
              <Link
                href={`/shop/${pickedShop.id}`}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-amber-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-amber-700 active:bg-amber-800"
              >
                进入店铺
              </Link>
              <button
                type="button"
                onClick={() => setPickedShopId(null)}
                className="min-h-[44px] shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50 active:bg-amber-100"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
