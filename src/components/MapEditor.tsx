"use client";
import { eatmapUrl } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { Group, Layer, Rect, Stage } from "react-konva";
import { ChevronsDown, DoorOpen, Plus, Trash2 } from "lucide-react";
import type { Building, Floor, MapShape, MapShapeKind, Shop } from "@/lib/types";
import { isShopShape } from "@/lib/map-shape";
import {
  clampCellDim,
  DEFAULT_NEW_SHOP_CELL,
  readNewShopCellFromLocalStorage,
  writeNewShopCellToLocalStorage,
} from "@/lib/map-editor-prefs-shared";
import { KonvaCrispLabel } from "@/components/KonvaCrispLabel";

/** 空楼层铺位列表用固定引用，避免 `?? []` 每次渲染新数组导致自动保存防抖永远无法触发 */
const NO_SHAPES: MapShape[] = [];

function shapeTempId() {
  return `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function shopPickLabel(s: Shop) {
  return `${s.name} · ${s.buildingName}`;
}

/** 匹配「店铺名 · 食堂名」整串；若店铺名唯一也可只填店铺名 */
function resolveShopIdFromPick(query: string, list: Shop[]): string {
  const t = query.trim();
  if (!t) return "";
  const full = list.find((s) => shopPickLabel(s) === t);
  if (full) return full.id;
  const byName = list.filter((s) => s.name === t);
  if (byName.length === 1) return byName[0].id;
  return "";
}

function initialMapFloorPick(floors: Floor[], buildingsIn: Building[]) {
  const sf = [...floors].sort((a, b) => a.order - b.order);
  const first = sf[0];
  return {
    floorId: first?.id ?? "",
    buildingId: first?.buildingId ?? buildingsIn[0]?.id ?? "",
  };
}

function MapShopBindControls({
  shops,
  shopPickInput,
  setShopPickInput,
  shopToAdd,
  compact,
  datalistId,
  onSelectShopId,
  onTextBlur,
}: {
  shops: Shop[];
  shopPickInput: string;
  setShopPickInput: (v: string) => void;
  shopToAdd: string;
  compact: boolean;
  datalistId: string;
  onSelectShopId?: (id: string) => void;
  onTextBlur?: () => void;
}) {
  const [shopSearch, setShopSearch] = useState("");
  const filteredShops = useMemo(() => {
    const q = shopSearch.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => {
      const lb = shopPickLabel(s).toLowerCase();
      return (
        lb.includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.buildingName.toLowerCase().includes(q)
      );
    });
  }, [shops, shopSearch]);

  const lab = compact ? "text-xs" : "text-sm";
  const ctl =
    "mt-0.5 block w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] text-amber-950 " +
    (compact ? "px-2 py-1 text-xs" : "rounded-xl px-3 py-2 text-sm");

  return (
    <div className={compact ? "flex w-full max-w-[320px] flex-col gap-1.5" : "flex max-w-md flex-col gap-2"}>
      <label className={lab}>
        <span className="text-amber-900/70">搜索店铺</span>
        <input
          type="search"
          className={ctl}
          value={shopSearch}
          onChange={(e) => setShopSearch(e.target.value)}
          placeholder="按店名或食堂筛选下列列表"
          autoComplete="off"
        />
      </label>
      <label className={lab}>
        <span className="text-amber-900/70">店铺（下拉）</span>
        <select
          className={ctl}
          value={shopToAdd}
          onChange={(e) => {
            const id = e.target.value;
            const s = shops.find((x) => x.id === id);
            setShopPickInput(s ? shopPickLabel(s) : "");
            if (id) onSelectShopId?.(id);
          }}
        >
          <option value="">请选择店铺…</option>
          {filteredShops.map((s) => (
            <option key={s.id} value={s.id}>
              {shopPickLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <label className={lab}>
        <span className="text-amber-900/70">店名 · 食堂名（可输入）</span>
        <input
          list={datalistId}
          aria-label="绑定店铺（输入）"
          className={ctl}
          value={shopPickInput}
          onChange={(e) => setShopPickInput(e.target.value)}
          onBlur={onTextBlur}
          placeholder="与下拉选项一致即可匹配"
        />
      </label>
    </div>
  );
}

type Props = {
  buildings: Building[];
  initialFloors: Floor[];
  shops: Shop[];
  initialShapes: MapShape[];
  /** 后台宽屏：左侧操作 / 右侧地图画布 */
  wideSplit?: boolean;
};

function editorShapeColors(shape: MapShape, selected: boolean) {
  if (shape.kind === "stairs") {
    return {
      fill: selected ? "rgba(59,130,246,0.65)" : "rgba(59,130,246,0.38)",
      stroke: "#1e3a8a",
      strokeW: selected ? 3 : 1.5,
      labelFill: "#f8fafc",
    };
  }
  if (shape.kind === "entrance") {
    return {
      fill: selected ? "rgba(34,197,94,0.65)" : "rgba(34,197,94,0.38)",
      stroke: "#14532d",
      strokeW: selected ? 3 : 1.5,
      labelFill: "#f0fdf4",
    };
  }
  return {
    fill: selected ? "rgba(251,191,36,0.65)" : "rgba(234,88,12,0.32)",
    stroke: selected ? "#9a3412" : "#c2410c",
    strokeW: selected ? 3 : 1.5,
    labelFill: "#431407",
  };
}

export default function MapEditor({
  buildings,
  initialFloors,
  shops,
  initialShapes,
  wideSplit = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingShapeRef = useRef(false);
  const shapesRef = useRef<MapShape[]>([]);
  const posRef = useRef({ x: 40, y: 40 });
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [pixelRatio, setPixelRatio] = useState(1);

  const [floorsList, setFloorsList] = useState<Floor[]>(() => [...initialFloors]);
  useEffect(() => {
    setFloorsList([...initialFloors]);
  }, [initialFloors]);

  const [buildingsList, setBuildingsList] = useState<Building[]>(() => [...buildings]);
  useEffect(() => {
    setBuildingsList([...buildings]);
  }, [buildings]);

  const sortedFloors = useMemo(
    () => [...floorsList].sort((a, b) => a.order - b.order),
    [floorsList],
  );
  const pick0 = initialMapFloorPick(initialFloors, buildings);
  const [floorId, setFloorId] = useState(pick0.floorId);
  const [buildingFilterId, setBuildingFilterId] = useState(pick0.buildingId);
  const [newShopCellDefaults, setNewShopCellDefaults] = useState(DEFAULT_NEW_SHOP_CELL);
  const cellPrefsLoadedRef = useRef(false);
  const lastSyncedCellKeyRef = useRef<string | null>(null);
  /** 避免 GET 较慢时覆盖用户已改的默认宽高 */
  const userTouchedCellPrefsRef = useRef(false);
  const floor = sortedFloors.find((f) => f.id === floorId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(eatmapUrl("/api/me/map-editor-prefs"), { credentials: "include" });
        if (!res.ok) throw new Error("prefs_fetch_failed");
        const data = (await res.json()) as { newShopCell?: { w?: number; h?: number } };
        const w = clampCellDim(Number(data.newShopCell?.w), DEFAULT_NEW_SHOP_CELL.w);
        const h = clampCellDim(Number(data.newShopCell?.h), DEFAULT_NEW_SHOP_CELL.h);
        if (cancelled) return;
        if (!userTouchedCellPrefsRef.current) {
          setNewShopCellDefaults({ w, h });
          writeNewShopCellToLocalStorage({ w, h });
          lastSyncedCellKeyRef.current = `${w}x${h}`;
        }
      } catch {
        if (cancelled) return;
        if (!userTouchedCellPrefsRef.current) {
          const ls = readNewShopCellFromLocalStorage();
          setNewShopCellDefaults(ls);
          lastSyncedCellKeyRef.current = `${ls.w}x${ls.h}`;
        }
      } finally {
        if (!cancelled) cellPrefsLoadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cellPrefsLoadedRef.current) return;
    const key = `${newShopCellDefaults.w}x${newShopCellDefaults.h}`;
    if (lastSyncedCellKeyRef.current === key) return;

    const t = window.setTimeout(() => {
      writeNewShopCellToLocalStorage(newShopCellDefaults);
      void (async () => {
        try {
          const res = await fetch(eatmapUrl("/api/me/map-editor-prefs"), {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newShopCell: newShopCellDefaults }),
          });
          if (res.ok) lastSyncedCellKeyRef.current = key;
        } catch {
          /* 下次变更会重试 */
        }
      })();
    }, 400);

    return () => window.clearTimeout(t);
  }, [newShopCellDefaults]);

  const buildingsOrdered = useMemo(
    () =>
      [...buildingsList].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "zh-CN"),
      ),
    [buildingsList],
  );

  const floorsForBuilding = useMemo(
    () =>
      sortedFloors
        .filter((f) => f.buildingId === buildingFilterId)
        .sort((a, b) => a.order - b.order),
    [sortedFloors, buildingFilterId],
  );

  useEffect(() => {
    const f = sortedFloors.find((x) => x.id === floorId);
    if (f && f.buildingId !== buildingFilterId) {
      setBuildingFilterId(f.buildingId);
    }
  }, [floorId, sortedFloors, buildingFilterId]);

  useEffect(() => {
    if (floorsForBuilding.length === 0) {
      if (floorId) setFloorId("");
      return;
    }
    if (!floorsForBuilding.some((f) => f.id === floorId)) {
      setFloorId(floorsForBuilding[0]!.id);
    }
  }, [floorsForBuilding, floorId]);

  const [shapesByFloor, setShapesByFloor] = useState<Record<string, MapShape[]>>(() => {
    const map: Record<string, MapShape[]> = {};
    initialShapes.forEach((s) => {
      if (!map[s.floorId]) map[s.floorId] = [];
      map[s.floorId].push(s);
    });
    return map;
  });

  const shapesByFloorRef = useRef(shapesByFloor);
  shapesByFloorRef.current = shapesByFloor;
  const floorIdRef = useRef(floorId);
  floorIdRef.current = floorId;

  const shapes = useMemo(() => {
    if (!floorId) return NO_SHAPES;
    return shapesByFloor[floorId] ?? NO_SHAPES;
  }, [floorId, shapesByFloor]);

  /** 以当前楼层所属食堂为准，避免「食堂」选择与楼层短暂不同步时下拉混入其他楼店铺 */
  const effectiveBuildingId = (floor?.buildingId ?? buildingFilterId).trim();

  const shopsInBuilding = useMemo(() => {
    if (!effectiveBuildingId) return [];
    return shops.filter((s) => (s.buildingId ?? "").trim() === effectiveBuildingId);
  }, [shops, effectiveBuildingId]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shopPickInput, setShopPickInput] = useState("");
  const shopToAdd = useMemo(
    () => resolveShopIdFromPick(shopPickInput, shopsInBuilding),
    [shopPickInput, shopsInBuilding],
  );
  const [inspectorShopPick, setInspectorShopPick] = useState("");
  const inspectorShopToAdd = useMemo(
    () => resolveShopIdFromPick(inspectorShopPick, shopsInBuilding),
    [inspectorShopPick, shopsInBuilding],
  );
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 40, y: 40 });

  shapesRef.current = shapes;
  posRef.current = pos;
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPixelRatio(Math.min(2.5, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
  }, []);

  useEffect(() => {
    let ro: ResizeObserver | null = null;
    let t: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;

    function applySize() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(360, Math.floor(r.height));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    }

    function schedule() {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(applySize);
      }, 80);
    }

    schedule();
    ro = new ResizeObserver(schedule);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      if (t) clearTimeout(t);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    setScale(1);
    setPos({ x: 40, y: 40 });
    setSelectedId(null);
  }, [floorId]);

  /** 切换食堂/楼层后，若当前输入绑定的是其他食堂的店，清空以免误添加 */
  useEffect(() => {
    if (!effectiveBuildingId) return;
    setShopPickInput((prev) => {
      const id = resolveShopIdFromPick(prev, shops);
      if (!id) return prev;
      const s = shops.find((x) => x.id === id);
      if (s && (s.buildingId ?? "").trim() !== effectiveBuildingId) return "";
      return prev;
    });
  }, [effectiveBuildingId, shops]);

  const persistShapesToServer = useCallback(
    async (floorIdForSave: string, list: MapShape[], opts?: { keepalive?: boolean }): Promise<boolean> => {
      if (!floorIdForSave) return false;
      try {
        const res = await fetch(eatmapUrl("/api/map-shapes"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          keepalive: opts?.keepalive === true,
          body: JSON.stringify({ floorId: floorIdForSave, shapes: list }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const persistLatestFromRefs = useCallback(async () => {
    const fid = floorIdRef.current;
    const list = shapesByFloorRef.current[fid] ?? [];
    return persistShapesToServer(fid, list);
  }, [persistShapesToServer]);

  /** 防抖自动保存：刷新/关页前另见 pagehide / 卸载冲刷 */
  useEffect(() => {
    if (!floorId) return;
    const fid = floorId;
    const t = setTimeout(() => {
      const list = shapesByFloorRef.current[fid] ?? [];
      void persistShapesToServer(fid, list);
    }, 320);
    return () => clearTimeout(t);
  }, [shapes, floorId, persistShapesToServer]);

  useEffect(() => {
    const onLeave = () => {
      const fid = floorIdRef.current;
      const list = shapesByFloorRef.current[fid] ?? [];
      if (!fid) return;
      void persistShapesToServer(fid, list, { keepalive: true });
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [persistShapesToServer]);

  useEffect(() => {
    return () => {
      void persistLatestFromRefs();
    };
  }, [persistLatestFromRefs]);

  const shopMap = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);

  const selectedShape = selectedId ? shapes.find((s) => s.id === selectedId) : undefined;

  const inspectorShopBindingKey = useMemo(() => {
    if (!selectedId) return "";
    const sh = shapes.find((s) => s.id === selectedId);
    if (!sh || !isShopShape(sh)) return "";
    return `${selectedId}:${sh.shopId}`;
  }, [selectedId, shapes]);

  useEffect(() => {
    if (!inspectorShopBindingKey) {
      setInspectorShopPick("");
      return;
    }
    const colon = inspectorShopBindingKey.indexOf(":");
    const boundShopId = colon >= 0 ? inspectorShopBindingKey.slice(colon + 1) : "";
    const s = shops.find((x) => x.id === boundShopId);
    setInspectorShopPick(s ? shopPickLabel(s) : "");
  }, [inspectorShopBindingKey, shops]);

  const updateShapes = useCallback(
    (next: MapShape[]) => {
      setShapesByFloor((prev) => ({ ...prev, [floorId]: next }));
    },
    [floorId],
  );

  const patchShape = useCallback(
    (id: string, patch: Partial<MapShape>) => {
      updateShapes(shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [shapes, updateShapes],
  );

  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      if (draggingShapeRef.current) return;
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

  function addShape() {
    if (!floor) return;
    if (!shopToAdd) {
      setMessage("请从建议中选择店铺，或输入「店铺名 · 食堂名」");
      return;
    }
    const shop = shopMap.get(shopToAdd);
    const w = newShopCellDefaults.w;
    const h = newShopCellDefaults.h;
    const shape: MapShape = {
      id: shapeTempId(),
      floorId: floor.id,
      shopId: shopToAdd,
      kind: "shop",
      x: Math.max(40, floor.width / 2 - w / 2),
      y: Math.max(40, floor.height / 2 - h / 2),
      width: w,
      height: h,
      label: shop?.name,
    };
    const next = [...shapes, shape];
    updateShapes(next);
    void persistShapesToServer(floor.id, next);
    setSelectedId(shape.id);
  }

  function addMarker(kind: "stairs" | "entrance") {
    if (!floor) return;
    const w = kind === "stairs" ? 76 : 100;
    const h = 58;
    const shape: MapShape = {
      id: shapeTempId(),
      floorId: floor.id,
      shopId: "",
      kind,
      x: Math.max(40, floor.width / 2 - w / 2),
      y: Math.max(40, floor.height / 2 - h / 2),
      width: w,
      height: h,
      label: kind === "stairs" ? "楼梯" : "入口",
    };
    const next = [...shapes, shape];
    updateShapes(next);
    void persistShapesToServer(floor.id, next);
    setSelectedId(shape.id);
  }

  function deleteSelected() {
    if (!selectedId || !floor) return;
    const next = shapes.filter((s) => s.id !== selectedId);
    updateShapes(next);
    void persistShapesToServer(floor.id, next);
    setSelectedId(null);
  }

  async function saveAndClearSelection() {
    if (!floor) {
      setSelectedId(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(null);
      return;
    }
    const list = shapesByFloorRef.current[floor.id] ?? shapesRef.current;
    const ok = await persistShapesToServer(floor.id, list);
    setSelectedId(null);
    setMessage(ok ? "已保存并退出选中" : "保存失败，请检查权限或稍后重试");
  }

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

  function changeBuilding(bid: string) {
    void (async () => {
      if (floor) {
        const fid = floor.id;
        await persistShapesToServer(fid, shapesByFloorRef.current[fid] ?? []);
      }
      setBuildingFilterId(bid);
      const list = sortedFloors
        .filter((f) => f.buildingId === bid)
        .sort((a, b) => a.order - b.order);
      setFloorId(list[0]?.id ?? "");
    })();
  }

  function changeFloor(fid: string) {
    void (async () => {
      if (floor) {
        const curFid = floor.id;
        await persistShapesToServer(curFid, shapesByFloorRef.current[curFid] ?? []);
      }
      setFloorId(fid);
      const nf = sortedFloors.find((x) => x.id === fid);
      if (nf) setBuildingFilterId(nf.buildingId);
    })();
  }

  const bgExtent = useMemo(() => {
    const pad = 2000;
    const fw = floor?.width ?? 900;
    const fh = floor?.height ?? 600;
    return { x: -pad, y: -pad, w: fw + pad * 2, h: fh + pad * 2 };
  }, [floor?.width, floor?.height]);

  const td = wideSplit;
  const toolbarShell =
    "flex flex-col gap-3 border border-amber-900/10 bg-white shadow-sm " +
    (td ? "rounded-xl px-3 py-2.5" : "rounded-2xl px-5 py-5 sm:px-6 sm:py-5");
  const btnPrimary =
    "inline-flex items-center gap-1.5 font-medium text-white " +
    (td ? "rounded-lg px-2.5 py-1.5 text-xs" : "rounded-xl px-4 py-2.5 text-sm");
  const btnGhost =
    "inline-flex items-center gap-1.5 font-medium ring-1 " +
    (td ? "rounded-lg px-2.5 py-1.5 text-xs" : "rounded-xl px-4 py-2.5 text-sm");

  const toolbarEl = (
    <div className={toolbarShell}>
      <div className={"flex flex-wrap items-end " + (td ? "gap-2" : "gap-4")}>
        <label className={td ? "text-xs" : "text-sm"}>
          <span className="text-amber-900/70">食堂</span>
          <select
            className={
              "mt-0.5 block rounded-lg border border-amber-900/15 bg-[#fffaf3] text-amber-950 " +
              (td ? "min-w-[128px] px-2 py-1 text-xs" : "min-w-[160px] rounded-xl px-3 py-2.5")
            }
            value={buildingFilterId}
            onChange={(e) => changeBuilding(e.target.value)}
          >
            {buildingsOrdered.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={td ? "text-xs" : "text-sm"}>
          <span className="text-amber-900/70">楼层</span>
          <select
            className={
              "mt-0.5 block rounded-lg border border-amber-900/15 bg-[#fffaf3] text-amber-950 " +
              (td ? "min-w-[128px] px-2 py-1 text-xs" : "min-w-[180px] rounded-xl px-3 py-2.5")
            }
            value={floorId}
            onChange={(e) => changeFloor(e.target.value)}
            disabled={floorsForBuilding.length === 0}
          >
            {floorsForBuilding.length === 0 ? (
              <option value="">暂无楼层（请至「食堂与楼层」新建）</option>
            ) : (
              floorsForBuilding.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div
        className={
          "rounded-lg border border-amber-900/15 bg-[#fffaf3]/90 " + (td ? "space-y-1.5 p-2" : "space-y-2 p-3")
        }
      >
        <p className={td ? "text-[10px] font-medium leading-snug text-amber-900/85" : "text-xs font-medium text-amber-900/85"}>
          新建店铺铺位的默认宽高（每次「添加铺位」使用；已同步到当前管理员账号，并备份在本机浏览器）
        </p>
        <div className={"flex flex-wrap items-end " + (td ? "gap-2" : "gap-3")}>
          <label className={td ? "text-[10px]" : "text-xs"}>
            <span className="text-amber-800/70">默认宽</span>
            <input
              type="number"
              min={24}
              className={
                "mt-0.5 block w-24 rounded-lg border border-amber-900/15 bg-white px-2 py-1 tabular-nums text-amber-950 " +
                (td ? "text-[11px]" : "text-xs")
              }
              value={newShopCellDefaults.w}
              onChange={(e) => {
                userTouchedCellPrefsRef.current = true;
                setNewShopCellDefaults((prev) => ({
                  ...prev,
                  w: clampCellDim(Number(e.target.value), prev.w),
                }));
              }}
            />
          </label>
          <label className={td ? "text-[10px]" : "text-xs"}>
            <span className="text-amber-800/70">默认高</span>
            <input
              type="number"
              min={24}
              className={
                "mt-0.5 block w-24 rounded-lg border border-amber-900/15 bg-white px-2 py-1 tabular-nums text-amber-950 " +
                (td ? "text-[11px]" : "text-xs")
              }
              value={newShopCellDefaults.h}
              onChange={(e) => {
                userTouchedCellPrefsRef.current = true;
                setNewShopCellDefaults((prev) => ({
                  ...prev,
                  h: clampCellDim(Number(e.target.value), prev.h),
                }));
              }}
            />
          </label>
        </div>
      </div>

      <MapShopBindControls
        shops={shopsInBuilding}
        shopPickInput={shopPickInput}
        setShopPickInput={setShopPickInput}
        shopToAdd={shopToAdd}
        compact={td}
        datalistId="map-editor-shop-datalist"
      />

      <div className={"flex flex-wrap items-center " + (td ? "gap-2" : "gap-3")}>
        <button
          type="button"
          onClick={addShape}
          className={`${btnPrimary} bg-amber-600 hover:bg-amber-700`}
        >
          <Plus className={td ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          添加铺位
        </button>
        <button
          type="button"
          onClick={() => addMarker("stairs")}
          className={`${btnPrimary} bg-blue-600 hover:bg-blue-700`}
        >
          <ChevronsDown className={td ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          楼梯
        </button>
        <button
          type="button"
          onClick={() => addMarker("entrance")}
          className={`${btnPrimary} bg-emerald-600 hover:bg-emerald-700`}
        >
          <DoorOpen className={td ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          入口
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedId}
          className={`${btnGhost} text-red-700 ring-red-200 hover:bg-red-50 disabled:opacity-40`}
        >
          <Trash2 className={td ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
          删除选中
        </button>
      </div>
      <p className={td ? "text-[10px] leading-snug text-amber-800/65" : "text-xs text-amber-800/70"}>
        铺位会自动保存。楼层名称、排序与画布参考宽高请在「食堂与楼层」页维护；新建楼层也在该页完成。
      </p>
    </div>
  );

  const messageEl = message ? (
    <p className={td ? "text-xs text-amber-900/80" : "text-sm text-amber-900/80"}>{message}</p>
  ) : null;

  const stageWrapClass =
    "w-full shrink-0 touch-none overflow-hidden overscroll-contain bg-[#fff7ed] " +
    (wideSplit
      ? "h-[min(72vh,680px)] min-h-[420px] xl:h-auto xl:min-h-[calc(100vh-9rem)] xl:flex-1"
      : "h-[min(72vh,680px)] min-h-[420px]");

  const stageEl = (
      <div ref={wrapRef} className={stageWrapClass}>
        {floor ? (
          <Stage
            width={size.w}
            height={size.h}
            onWheel={onWheel}
            pixelRatio={pixelRatio}
            className="block touch-none"
            style={{ touchAction: "none" }}
          >
            {/* 底层平移 + 空白点击保存；顶层仅铺位，避免 mapBlank 同层抢走单击选中 */}
            <Layer listening={true}>
              <Rect width={size.w} height={size.h} fill="rgba(255,250,240,0.4)" listening={false} />
              <Group x={pos.x} y={pos.y} scaleX={scale} scaleY={scale}>
                <Rect
                  x={bgExtent.x}
                  y={bgExtent.y}
                  width={bgExtent.w}
                  height={bgExtent.h}
                  fill="#fffbeb"
                  listening={false}
                />
                <Rect
                  name="mapBlank"
                  x={bgExtent.x}
                  y={bgExtent.y}
                  width={bgExtent.w}
                  height={bgExtent.h}
                  fill="rgba(251,191,36,0.06)"
                  listening={true}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (selectedId) void saveAndClearSelection();
                  }}
                  onMouseDown={(e) => {
                    if (selectedId) return;
                    if (e.evt.button !== 0) return;
                    e.cancelBubble = true;
                    attachPanFromClientPointer(e.evt.clientX, e.evt.clientY);
                  }}
                  onTouchStart={(e) => {
                    if (selectedId) return;
                    const t = e.evt.touches[0];
                    if (!t) return;
                    e.evt.preventDefault();
                    attachPanFromClientPointer(t.clientX, t.clientY);
                  }}
                />
              </Group>
            </Layer>
            <Layer listening={true}>
              <Group x={pos.x} y={pos.y} scaleX={scale} scaleY={scale}>
                {shapes.map((shape) => {
                  const shop = isShopShape(shape) ? shopMap.get(shape.shopId) : undefined;
                  const selected = selectedId === shape.id;
                  const colors = editorShapeColors(shape, selected);
                  const labelText =
                    shape.label ??
                    (isShopShape(shape) ? shop?.name ?? "店铺" : shape.kind === "stairs" ? "楼梯" : "入口");

                  function selectThis(e: { cancelBubble: boolean }) {
                    e.cancelBubble = true;
                    setSelectedId(shape.id);
                  }

                  return (
                    <Group key={shape.id}>
                      <Rect
                        name="cellRect"
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        cornerRadius={8}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={colors.strokeW}
                        draggable={selected}
                        listening={true}
                        dragDistance={6}
                        hitStrokeWidth={Math.max(10, shape.height * 0.06)}
                        onDragStart={(e) => {
                          e.cancelBubble = true;
                          draggingShapeRef.current = true;
                          e.evt.stopPropagation();
                        }}
                        onTap={selectThis}
                        onClick={selectThis}
                        onDragEnd={(e) => {
                          draggingShapeRef.current = false;
                          e.evt.stopPropagation();
                          const node = e.target;
                          setShapesByFloor((prev) => {
                            const list = prev[floorId] ?? [];
                            const next = list.map((s) =>
                              s.id === shape.id ? { ...s, x: node.x(), y: node.y() } : s,
                            );
                            return { ...prev, [floorId]: next };
                          });
                        }}
                      />
                      <Group x={shape.x} y={shape.y} listening={false}>
                        <KonvaCrispLabel shape={shape} text={labelText} fill={colors.labelFill} />
                      </Group>
                    </Group>
                  );
                })}
              </Group>
            </Layer>
          </Stage>
        ) : (
          <div className="flex h-[420px] items-center justify-center px-4 text-center text-sm text-amber-800/70">
            当前食堂下暂无楼层，请打开后台「食堂与楼层」新建楼层后再来此编辑地图。
          </div>
        )}
      </div>
  );

  const inspectorEl = selectedShape ? (
        <div
          className={
            "border border-amber-900/10 bg-white shadow-sm " + (td ? "rounded-xl p-2.5" : "rounded-2xl p-4")
          }
        >
          <h3 className={(td ? "text-xs" : "text-sm") + " font-semibold text-amber-950"}>选中项编辑</h3>
          <div className={(td ? "mt-2 gap-2" : "mt-3 gap-3") + " flex flex-wrap"}>
            <label className="text-xs">
              <span className="text-amber-800/70">格子宽</span>
              <input
                type="number"
                min={24}
                className="mt-1 block w-24 rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1"
                value={Math.round(selectedShape.width)}
                onChange={(e) =>
                  patchShape(selectedShape.id, {
                    width: Math.max(24, Number(e.target.value) || 24),
                  })
                }
              />
            </label>
            <label className="text-xs">
              <span className="text-amber-800/70">格子高</span>
              <input
                type="number"
                min={24}
                className="mt-1 block w-24 rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1"
                value={Math.round(selectedShape.height)}
                onChange={(e) =>
                  patchShape(selectedShape.id, {
                    height: Math.max(24, Number(e.target.value) || 24),
                  })
                }
              />
            </label>
            <label className="text-xs">
              <span className="text-amber-800/70">显示文字</span>
              <input
                className="mt-1 block w-48 rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1"
                value={selectedShape.label ?? ""}
                onChange={(e) => patchShape(selectedShape.id, { label: e.target.value })}
              />
            </label>
            <label className="text-xs">
              <span className="text-amber-800/70">类型</span>
              <select
                className="mt-1 block rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1"
                value={selectedShape.kind ?? "shop"}
                onChange={(e) => {
                  const kind = e.target.value as MapShapeKind;
                  if (kind === "shop") {
                    const sid =
                      inspectorShopToAdd ||
                      (isShopShape(selectedShape) ? selectedShape.shopId : "") ||
                      shopsInBuilding[0]?.id ||
                      "";
                    const shop = shopMap.get(sid);
                    patchShape(selectedShape.id, {
                      kind: "shop",
                      shopId: sid,
                      label: shop?.name ?? selectedShape.label,
                    });
                  } else {
                    patchShape(selectedShape.id, {
                      kind,
                      shopId: "",
                      label:
                        kind === "stairs"
                          ? "楼梯"
                          : kind === "entrance"
                            ? "入口"
                            : selectedShape.label,
                    });
                  }
                }}
              >
                <option value="shop">店铺</option>
                <option value="stairs">楼梯</option>
                <option value="entrance">入口</option>
              </select>
            </label>
            {isShopShape(selectedShape) ? (
              <div className="w-full basis-full border-t border-amber-900/10 pt-2">
                <p className="mb-1.5 text-xs font-medium text-amber-800/75">绑定店铺</p>
                <MapShopBindControls
                  shops={shopsInBuilding}
                  shopPickInput={inspectorShopPick}
                  setShopPickInput={setInspectorShopPick}
                  shopToAdd={inspectorShopToAdd}
                  compact
                  datalistId="map-editor-shop-datalist"
                  onSelectShopId={(id) => {
                    if (!selectedShape || !isShopShape(selectedShape)) return;
                    const shop = shopMap.get(id);
                    patchShape(selectedShape.id, {
                      shopId: id,
                      kind: "shop",
                      label: shop?.name ?? selectedShape.label,
                    });
                    setInspectorShopPick(shop ? shopPickLabel(shop) : "");
                  }}
                  onTextBlur={() => {
                    if (!selectedShape || !isShopShape(selectedShape)) return;
                    const sid = resolveShopIdFromPick(inspectorShopPick, shopsInBuilding);
                    if (sid) {
                      const shop = shopMap.get(sid);
                      patchShape(selectedShape.id, {
                        shopId: sid,
                        kind: "shop",
                        label: shop?.name ?? selectedShape.label,
                      });
                      setInspectorShopPick(shop ? shopPickLabel(shop) : inspectorShopPick);
                      return;
                    }
                    if (inspectorShopPick.trim()) {
                      const cur = shops.find((x) => x.id === selectedShape.shopId);
                      setInspectorShopPick(cur ? shopPickLabel(cur) : "");
                      setMessage("未匹配到店铺，请从建议中选择或输入「店铺名 · 食堂名」");
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
  ) : null;

  const hintEl = (
      <p className={td ? "text-[11px] leading-snug text-amber-800/65" : "text-xs text-amber-800/65"}>
        提示：未选中铺位时，在空白处拖动可平移视图；选中后只能拖动该铺位；点击空白处将保存并退出选中。滚轮缩放。
      </p>
  );

  return (
    <div
      className={
        wideSplit
          ? "space-y-5 xl:flex xl:min-h-[calc(100vh-7.5rem)] xl:flex-row xl:space-y-0 xl:gap-5"
          : "space-y-5"
      }
    >
      <datalist id="map-editor-shop-datalist">
        {shopsInBuilding
          .filter((s) => s.name.trim())
          .map((s) => (
            <option key={s.id} value={shopPickLabel(s)} />
          ))}
      </datalist>

      {wideSplit ? (
        <>
          <div className="min-w-0 space-y-4 xl:max-h-[calc(100vh-7.5rem)] xl:w-[min(100%,400px)] xl:max-w-[420px] xl:shrink-0 xl:space-y-2 xl:overflow-y-auto xl:pr-1">
            {toolbarEl}
            {messageEl}
            {inspectorEl}
            {hintEl}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{stageEl}</div>
        </>
      ) : (
        <>
          {toolbarEl}
          {messageEl}
          {stageEl}
          {inspectorEl}
          {hintEl}
        </>
      )}
    </div>
  );
}
