"use client";
import { eatmapUrl } from "@/lib/base-path";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Building, Floor, Shop } from "@/lib/types";

type Props = {
  buildings: Building[];
  floors: Floor[];
  shops: Shop[];
};

export function AdminCampusPanel({ buildings, floors, shops }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orderIds, setOrderIds] = useState<string[]>(() => buildings.map((b) => b.id));
  /** 点击「新建」后展开该食堂下的新建楼层表单（同时只展开一个） */
  const [creatingFloorFor, setCreatingFloorFor] = useState<string | null>(null);
  const [showNewBuilding, setShowNewBuilding] = useState(false);

  useEffect(() => {
    setOrderIds(buildings.map((b) => b.id));
  }, [buildings]);

  const buildingById = useMemo(() => new Map(buildings.map((b) => [b.id, b])), [buildings]);

  const orderedBuildings = useMemo(() => {
    return orderIds.map((id) => buildingById.get(id)).filter(Boolean) as Building[];
  }, [orderIds, buildingById]);

  const floorsByBuilding = useMemo(() => {
    const m = new Map<string, Floor[]>();
    for (const f of floors) {
      const list = m.get(f.buildingId) ?? [];
      list.push(f);
      m.set(f.buildingId, list);
    }
    for (const [, list] of m) {
      list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));
    }
    return m;
  }, [floors]);

  async function postReorder(ids: string[]) {
    setMessage(null);
    try {
      const res = await fetch(eatmapUrl("/api/buildings/reorder"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "reorder_failed");
      }
      setOrderIds(ids);
      router.refresh();
      setMessage("已更新食堂顺序");
    } catch {
      setMessage("调整顺序失败，请重试");
    }
  }

  function moveBuilding(id: string, dir: -1 | 1) {
    const idx = orderIds.indexOf(id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= orderIds.length) return;
    const next = [...orderIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    void postReorder(next);
  }

  async function deleteBuilding(b: Building) {
    const nFloors = floors.filter((f) => f.buildingId === b.id).length;
    const nShops = shops.filter((s) => s.buildingId === b.id).length;
    const ok = window.confirm(
      `确定删除食堂「${b.name}」？将一并删除该食堂下 ${nFloors} 个楼层、地图铺位，以及 ${nShops} 家店铺及其评价与广告，且不可恢复。`,
    );
    if (!ok) return;
    setBusyId(b.id);
    setMessage(null);
    try {
      const res = await fetch(eatmapUrl(`/api/buildings/${b.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        if (d.error === "forbidden") setMessage("无权限删除食堂");
        else setMessage("删除食堂失败");
        return;
      }
      setCreatingFloorFor((cur) => (cur === b.id ? null : cur));
      router.refresh();
      setMessage("已删除食堂");
    } finally {
      setBusyId(null);
    }
  }

  async function saveBuildingName(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("食堂名称不能为空");
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(eatmapUrl(`/api/buildings/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (d.error === "duplicate_name") setMessage("已存在同名食堂");
        else setMessage("保存食堂失败");
        return;
      }
      router.refresh();
      setMessage("食堂名称已保存（已同步店铺里的地点文案）");
    } finally {
      setBusyId(null);
    }
  }

  async function saveFloor(
    f: Floor,
    name: string,
    orderStr: string,
    widthStr: string,
    heightStr: string,
  ) {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("楼层名称不能为空");
      return;
    }
    const order = Number(orderStr);
    if (!Number.isFinite(order)) {
      setMessage("排序须为数字");
      return;
    }
    const width = Number(widthStr);
    const height = Number(heightStr);
    if (!Number.isFinite(width) || width < 100 || !Number.isFinite(height) || height < 100) {
      setMessage("参考宽高须为不小于 100 的数字");
      return;
    }
    const key = f.id;
    setBusyId(key);
    setMessage(null);
    try {
      const res = await fetch(eatmapUrl(`/api/floors/${f.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed, order, width, height }),
      });
      if (!res.ok) {
        setMessage("保存楼层失败");
        return;
      }
      router.refresh();
      setMessage("楼层已保存");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteFloor(f: Floor) {
    const ok = window.confirm(
      `确定删除楼层「${f.name}」？该楼层上的地图铺位与标识将被一并删除，且不可恢复。`,
    );
    if (!ok) return;
    setBusyId(f.id);
    setMessage(null);
    try {
      const res = await fetch(eatmapUrl(`/api/floors/${f.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        if (d.error === "forbidden") setMessage("无权限删除楼层");
        else setMessage("删除楼层失败");
        return;
      }
      router.refresh();
      setMessage("已删除楼层");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-amber-900/75">
        调整<strong>食堂顺序</strong>将影响瀑布流区域筛选、地图页食堂切换条等。修改食堂名会同步更新店铺的「地点」展示名。需要在某食堂下<strong>新建楼层</strong>时，点击该行右侧<strong>新建</strong>即可展开表单；建好楼层后到「地图搭建」绘制铺位。删除食堂将移除其下全部楼层、地图数据及店铺、评价与广告。
      </p>
      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busyId !== null}
          onClick={() => setShowNewBuilding((v) => !v)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-900/20 hover:bg-amber-100 disabled:opacity-40"
        >
          {showNewBuilding ? "收起新建食堂" : "新建食堂"}
        </button>
      </div>
      {showNewBuilding ? (
        <NewBuildingForm
          disabled={busyId !== null}
          busy={busyId === "new-building"}
          routerRefresh={() => router.refresh()}
          onMessage={setMessage}
          onBusy={(id) => setBusyId(id)}
          onDone={() => setShowNewBuilding(false)}
        />
      ) : null}

      <div className="space-y-3">
        {orderedBuildings.map((b, rank) => (
          <div
            key={b.id}
            className="overflow-hidden rounded-2xl border border-amber-900/10 bg-[#fffaf3] shadow-sm ring-1 ring-amber-900/5"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-amber-900/10 bg-white px-3 py-3 sm:px-4">
              <span className="w-8 shrink-0 text-center text-xs font-semibold text-amber-800/70">{rank + 1}</span>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="上移"
                  disabled={rank === 0 || busyId !== null}
                  onClick={() => moveBuilding(b.id, -1)}
                  className="rounded-md p-1 text-amber-800 hover:bg-amber-100 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="下移"
                  disabled={rank === orderedBuildings.length - 1 || busyId !== null}
                  onClick={() => moveBuilding(b.id, 1)}
                  className="rounded-md p-1 text-amber-800 hover:bg-amber-100 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <BuildingNameRow
                building={b}
                disabled={busyId === b.id}
                onSave={(name) => void saveBuildingName(b.id, name)}
              />
              <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() =>
                    setCreatingFloorFor((cur) => (cur === b.id ? null : b.id))
                  }
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 disabled:opacity-40 ${
                    creatingFloorFor === b.id
                      ? "bg-amber-200 text-amber-950 ring-amber-600/30"
                      : "text-amber-900 ring-amber-900/15 hover:bg-amber-50"
                  }`}
                >
                  {creatingFloorFor === b.id ? "收起" : "新建"}
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void deleteBuilding(b)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                  title="删除整个食堂及下属数据"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  删除食堂
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-amber-900/10 bg-[#fffaf3]/80 px-3 py-3 sm:px-4">
              {creatingFloorFor === b.id ? (
                <NewFloorForm
                  buildingId={b.id}
                  floorsInBuilding={floorsByBuilding.get(b.id) ?? []}
                  disabled={busyId !== null}
                  busy={busyId === `new-${b.id}`}
                  routerRefresh={() => router.refresh()}
                  onMessage={setMessage}
                  onBusy={(id) => setBusyId(id)}
                  onClose={() => setCreatingFloorFor(null)}
                />
              ) : null}
              {(floorsByBuilding.get(b.id) ?? []).length === 0 ? (
                <p className="text-xs text-amber-800/65">该食堂下暂无楼层，点击右侧「新建」添加。</p>
              ) : (
                (floorsByBuilding.get(b.id) ?? []).map((f) => (
                  <FloorRow
                    key={f.id}
                    floor={f}
                    disabled={busyId === f.id || busyId === b.id}
                    onSave={(name, order, width, height) =>
                      void saveFloor(f, name, order, width, height)
                    }
                    onDelete={() => void deleteFloor(f)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewBuildingForm({
  disabled,
  busy,
  routerRefresh,
  onMessage,
  onBusy,
  onDone,
}: {
  disabled: boolean;
  busy: boolean;
  routerRefresh: () => void;
  onMessage: (m: string | null) => void;
  onBusy: (id: string | null) => void;
  onDone?: () => void;
}) {
  const [name, setName] = useState("");

  async function submit() {
    onMessage(null);
    const trimmed = name.trim();
    if (!trimmed) {
      onMessage("请填写新食堂名称");
      return;
    }
    onBusy("new-building");
    try {
      const res = await fetch(eatmapUrl("/api/buildings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        if (d.error === "forbidden") onMessage("无权限新建食堂");
        else onMessage("新建食堂失败");
        return;
      }
      setName("");
      routerRefresh();
      onMessage("操作完成：新食堂已加入列表；若名称已存在则沿用原记录。可在该行点「新建」添加楼层。");
      onDone?.();
    } finally {
      onBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-amber-500/45 bg-white px-3 py-3 shadow-sm sm:px-4">
      <p className="w-full text-xs font-semibold text-amber-950">新建食堂</p>
      <label className="min-w-[200px] flex-1 text-xs">
        <span className="mb-1 block text-amber-800/70">食堂名称</span>
        <input
          className="w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="必填，勿与已有食堂重名（重名将沿用已有记录）"
          disabled={disabled || busy}
        />
      </label>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void submit()}
        className="rounded-xl bg-amber-950 px-4 py-2 text-xs font-medium text-amber-50 hover:bg-amber-900 disabled:opacity-40"
      >
        {busy ? "创建中…" : "创建食堂"}
      </button>
    </div>
  );
}

function BuildingNameRow({
  building,
  disabled,
  onSave,
}: {
  building: Building;
  disabled: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(building.name);
  useEffect(() => {
    setName(building.name);
  }, [building.name]);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === building.name) return;
    const t = setTimeout(() => void onSaveRef.current(name), 650);
    return () => clearTimeout(t);
  }, [name, building.name, building.id]);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:flex-nowrap">
      <label className="min-w-[160px] flex-1 text-xs">
        <span className="mb-1 block text-amber-800/70">食堂名称</span>
        <input
          className="w-full rounded-xl border border-amber-900/15 bg-white px-3 py-2 text-sm text-amber-950"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </label>
      <span className="hidden text-[10px] text-amber-800/55 sm:inline">修改后自动保存</span>
    </div>
  );
}

function NewFloorForm({
  buildingId,
  floorsInBuilding,
  disabled,
  busy,
  routerRefresh,
  onMessage,
  onBusy,
  onClose,
}: {
  buildingId: string;
  floorsInBuilding: Floor[];
  disabled: boolean;
  busy: boolean;
  routerRefresh: () => void;
  onMessage: (m: string | null) => void;
  onBusy: (id: string | null) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [width, setWidth] = useState("900");
  const [height, setHeight] = useState("600");

  async function submit() {
    onMessage(null);
    const trimmed = name.trim();
    if (!trimmed) {
      onMessage("请填写新楼层名称");
      return;
    }
    const maxOrder = floorsInBuilding.reduce((m, x) => Math.max(m, x.order), 0);
    const orderNum = order.trim() ? Number(order) : maxOrder + 1;
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(orderNum)) {
      onMessage("排序须为数字");
      return;
    }
    if (!Number.isFinite(w) || w < 100 || !Number.isFinite(h) || h < 100) {
      onMessage("参考宽高须为不小于 100 的数字");
      return;
    }
    onBusy(`new-${buildingId}`);
    try {
      const res = await fetch(eatmapUrl("/api/floors"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          buildingId,
          name: trimmed,
          order: orderNum,
          width: w,
          height: h,
        }),
      });
      if (!res.ok) {
        onMessage("新建楼层失败");
        return;
      }
      setName("");
      setOrder("");
      setWidth("900");
      setHeight("600");
      routerRefresh();
      onMessage("已新建楼层（可到「地图搭建」编辑铺位）");
    } finally {
      onBusy(null);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-amber-400/50 bg-white/90 px-3 py-2.5">
      <p className="w-full text-xs font-semibold text-amber-950">新建楼层</p>
      <label className="min-w-[120px] flex-1 text-xs">
        <span className="mb-1 block text-amber-800/70">楼层名称</span>
        <input
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="必填"
          disabled={disabled || busy}
        />
      </label>
      <label className="w-24 text-xs">
        <span className="mb-1 block text-amber-800/70">排序</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="默认接在最后"
          disabled={disabled || busy}
        />
      </label>
      <label className="w-24 text-xs">
        <span className="mb-1 block text-amber-800/70">参考宽</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          disabled={disabled || busy}
        />
      </label>
      <label className="w-24 text-xs">
        <span className="mb-1 block text-amber-800/70">参考高</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          disabled={disabled || busy}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void submit()}
          className="rounded-lg bg-amber-950 px-3 py-2 text-xs font-medium text-amber-50 hover:bg-amber-900 disabled:opacity-40"
        >
          {busy ? "创建中…" : "创建楼层"}
        </button>
        {onClose ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-900/15 hover:bg-amber-50 disabled:opacity-40"
          >
            取消
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FloorRow({
  floor,
  disabled,
  onSave,
  onDelete,
}: {
  floor: Floor;
  disabled: boolean;
  onSave: (name: string, order: string, width: string, height: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(floor.name);
  const [order, setOrder] = useState(String(floor.order));
  const [width, setWidth] = useState(String(floor.width));
  const [height, setHeight] = useState(String(floor.height));
  useEffect(() => {
    setName(floor.name);
    setOrder(String(floor.order));
    setWidth(String(floor.width));
    setHeight(String(floor.height));
  }, [floor.name, floor.order, floor.width, floor.height]);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const orderNum = Number(order);
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(orderNum)) return;
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    if (
      trimmed === floor.name &&
      orderNum === floor.order &&
      w === floor.width &&
      h === floor.height
    )
      return;
    const t = setTimeout(() => void onSaveRef.current(name, order, width, height), 650);
    return () => clearTimeout(t);
  }, [name, order, width, height, floor.name, floor.order, floor.width, floor.height, floor.id]);

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-amber-900/10 bg-white px-3 py-2">
      <label className="min-w-[120px] flex-1 text-xs">
        <span className="mb-1 block text-amber-800/70">楼层名称</span>
        <input
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="w-20 text-xs">
        <span className="mb-1 block text-amber-800/70">排序</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="w-24 text-xs">
        <span className="mb-1 block text-amber-800/70">参考宽</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="w-24 text-xs">
        <span className="mb-1 block text-amber-800/70">参考高</span>
        <input
          type="number"
          className="w-full rounded-lg border border-amber-900/15 bg-[#fffaf3] px-2 py-1.5 text-sm"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          disabled={disabled}
        />
      </label>
      <span className="self-center text-[10px] text-amber-800/55">自动保存</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
        title="删除该楼层及地图上对应铺位"
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        删除
      </button>
    </div>
  );
}
