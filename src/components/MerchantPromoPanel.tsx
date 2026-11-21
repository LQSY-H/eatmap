"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  addCalendarDaysYMD,
  daysInclusiveYMD,
  isValidYMD,
  todayYMDShanghai,
} from "@/lib/date-utils";
import { featuredAdScheduleCn } from "@/lib/ad-display";
import type { Ad, Shop } from "@/lib/types";

type Props = {
  shops: Shop[];
  userId: string;
  onCreated: (ad: Ad) => void;
};

export function MerchantPromoPanel({ shops, userId, onCreated }: Props) {
  const myShops = useMemo(
    () => shops.filter((s) => s.ownerUserId === userId),
    [shops, userId],
  );

  const [shopId, setShopId] = useState(myShops[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"fromToday" | "range">("fromToday");
  const [dayCount, setDayCount] = useState(7);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recentNonce, setRecentNonce] = useState(0);
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoUploadBusy, setPromoUploadBusy] = useState(false);

  const computedRange = useMemo(() => {
    if (mode === "fromToday") {
      const start = todayYMDShanghai();
      const n = Math.min(90, Math.max(1, Math.floor(dayCount)));
      const end = addCalendarDaysYMD(start, n - 1);
      return { start, end };
    }
    if (!isValidYMD(rangeStart) || !isValidYMD(rangeEnd)) return null;
    if (rangeEnd < rangeStart) return null;
    return { start: rangeStart, end: rangeEnd };
  }, [mode, dayCount, rangeStart, rangeEnd]);

  const summaryDays =
    computedRange != null ? daysInclusiveYMD(computedRange.start, computedRange.end) : 0;

  async function uploadPromoImage(file: File | null) {
    if (!file || !shopId) return;
    setMsg(null);
    setPromoUploadBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("purpose", "ad-promo");
      fd.set("shopId", shopId);
      const res = await fetch(eatmapUrl("/api/upload"), { method: "POST", credentials: "include", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        const err =
          data.error === "too_large"
            ? "图片过大（≤12MB）"
            : data.error === "forbidden"
              ? "无权限上传"
              : "上传失败";
        setMsg(err);
        return;
      }
      if (data.url) setPromoImageUrl(data.url);
    } finally {
      setPromoUploadBusy(false);
    }
  }

  async function submit() {
    setMsg(null);
    if (!shopId) {
      setMsg("请选择店铺");
      return;
    }
    if (!title.trim()) {
      setMsg("请填写推广短文案");
      return;
    }
    if (title.trim().length > 14) {
      setMsg("文案请控制在 14 字以内");
      return;
    }
    if (!computedRange) {
      setMsg("请检查投放日期");
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        shopId,
        title: title.trim(),
        slot: "home_featured",
        startDate: computedRange.start,
        endDate: computedRange.end,
      };
      if (promoImageUrl.trim()) {
        payload.promoImage = promoImageUrl.trim();
      }
      const res = await fetch(eatmapUrl("/api/ads"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as Ad & { error?: string };
      if (!res.ok) {
        const map: Record<string, string> = {
          forbidden: "无权限",
          invalid_body: "请填写完整",
          invalid_dates: "日期格式不正确",
          invalid_slot: "类型错误",
          start_in_past: "开始日期不能早于今天（上海时间）",
          invalid_range: "结束日期不能早于开始日期",
          range_too_long: "单次最长 90 天",
          shop_not_found: "店铺不存在",
          title_too_long: "文案请控制在 14 字以内",
          invalid_promo_image: "展示图地址无效，请重新上传",
        };
        setMsg(map[data.error ?? ""] ?? "提交失败");
        return;
      }
      onCreated(data);
      setRecentNonce((n) => n + 1);
      setMsg("已提交审核；通过后将出现在瀑布流顶部「今日推荐」，进度见下方列表。");
      setTitle("");
      setPromoImageUrl("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-amber-950">申请瀑布流顶部「今日推荐」展位</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900/75">
        免费推广：可选择从即日起连续投放天数，或自定义日期区间；提交审核通过后出现在瀑布流顶部横条（限14字）。可选上传一张顶部展示图，不上传则使用店铺封面。
      </p>

      {myShops.length === 0 ? (
        <p className="mt-6 text-sm text-amber-800/70">当前账号未绑定店铺，无法申请。</p>
      ) : (
        <div className="mt-6 space-y-4">
          <label className="block text-sm text-amber-950">
            <span className="mb-1 block text-xs text-amber-800/70">店铺</span>
            <select
              className="w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-sm"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            >
              {myShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-amber-950">
            <span className="mb-1 block text-xs text-amber-800/70">推广短文案（瀑布流顶部配图下展示）</span>
            <input
              className="w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 14))}
              placeholder="尽量精炼，14 字以内"
              maxLength={14}
            />
          </label>

          <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4">
            <p className="text-xs font-medium text-amber-900/80">顶部展示图（可选）</p>
            <p className="mt-1 text-[11px] text-amber-800/65">
              上传后将在瀑布流「今日推荐」横条中代替店铺封面；建议横图、清晰主体。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={promoUploadBusy || !shopId}
                  onChange={(e) => void uploadPromoImage(e.target.files?.[0] ?? null)}
                />
                {promoUploadBusy ? "上传中…" : "选择图片"}
              </label>
              {promoImageUrl ? (
                <>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 underline"
                    onClick={() => setPromoImageUrl("")}
                  >
                    移除图片
                  </button>
                  <Image
                    src={resolveEatmapMediaUrl(promoImageUrl)}
                    alt=""
                    width={96}
                    height={56}
                    className="h-14 w-24 rounded-lg object-cover ring-1 ring-amber-900/15"
                    unoptimized={
                      promoImageUrl.startsWith("/api/") || /^https?:\/\//i.test(promoImageUrl)
                    }
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-4">
            <p className="text-xs font-medium text-amber-900/80">投放方式</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="promo-mode"
                  checked={mode === "fromToday"}
                  onChange={() => setMode("fromToday")}
                />
                从即日起连续天数
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="promo-mode"
                  checked={mode === "range"}
                  onChange={() => setMode("range")}
                />
                自选日期范围
              </label>
            </div>

            {mode === "fromToday" ? (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-xs text-amber-800/70">天数（1–90）</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="w-full max-w-[200px] rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm"
                  value={dayCount}
                  onChange={(e) => setDayCount(Number(e.target.value))}
                />
              </label>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-amber-800/70">开始日期</span>
                  <input
                    type="date"
                    className="rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs text-amber-800/70">结束日期</span>
                  <input
                    type="date"
                    className="rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </label>
              </div>
            )}

            {computedRange ? (
              <p className="mt-4 text-sm font-medium text-amber-950">
                投放区间：{computedRange.start} 至 {computedRange.end}（共 {summaryDays} 天）
              </p>
            ) : (
              <p className="mt-4 text-sm text-red-700">请填写有效的日期范围。</p>
            )}
          </div>

          <button
            type="button"
            disabled={busy || !computedRange}
            onClick={() => void submit()}
            className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-700 disabled:opacity-40"
          >
            {busy ? "提交中…" : "提交审核"}
          </button>

          {msg ? <p className="text-sm text-amber-900/85">{msg}</p> : null}

          <div className="border-t border-amber-900/10 pt-4">
            <p className="text-xs font-semibold text-amber-800/70">最近本人提交的申请</p>
            <MerchantPromoRecent refreshKey={recentNonce} onListChanged={() => setRecentNonce((n) => n + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

function MerchantPromoRecent({
  refreshKey,
  onListChanged,
}: {
  refreshKey: number;
  onListChanged?: () => void;
}) {
  const [rows, setRows] = useState<Ad[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void (async () => {
      const r = await fetch(eatmapUrl("/api/ads"), { credentials: "include" });
      if (!r.ok || cancelled) return;
      const list = (await r.json()) as Ad[];
      const next = list.filter((a) => a.slot === "home_featured").slice(-8).reverse();
      if (!cancelled) {
        setRows(next);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function withdraw(adId: string) {
    if (
      !window.confirm("确定要撤回该推荐申请吗？撤回后本条记录将删除，如需展示需重新提交。")
    ) {
      return;
    }
    setWithdrawingId(adId);
    try {
      const res = await fetch(eatmapUrl(`/api/ads?id=${encodeURIComponent(adId)}`), {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const map: Record<string, string> = {
          forbidden: "无权限",
          not_found: "记录不存在",
          not_withdrawable: "仅待审核的申请可撤回",
          invalid_body: "请求无效",
        };
        window.alert(map[data.error ?? ""] ?? "撤回失败");
        return;
      }
      onListChanged?.();
    } finally {
      setWithdrawingId(null);
    }
  }

  if (!loaded) return <p className="mt-2 text-xs text-amber-700/50">加载中…</p>;
  if (rows.length === 0) return <p className="mt-2 text-xs text-amber-700/60">暂无记录</p>;

  return (
    <ul className="mt-2 space-y-2 text-xs text-amber-900">
      {rows.map((a) => {
        const schedule = featuredAdScheduleCn(a);
        const pi = a.promoImage?.trim();
        const canWithdraw = a.status === "pending";
        return (
          <li
            key={a.id}
            className="flex gap-2 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-amber-900/10"
          >
            {pi ? (
              <Image
                src={resolveEatmapMediaUrl(pi)}
                alt=""
                width={64}
                height={48}
                className="h-12 w-16 shrink-0 rounded object-cover ring-1 ring-amber-900/10"
                unoptimized={pi.startsWith("/api/") || /^https?:\/\//i.test(pi)}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <span className="font-medium">{a.title}</span>
              <span className="mx-2 text-amber-700/60">·</span>
              <span>
                {a.status === "approved" ? "已通过" : a.status === "pending" ? "待审核" : "已驳回"}
              </span>
              {schedule ? <span className="mt-1 block text-amber-800/75">{schedule}</span> : null}
            </div>
            {canWithdraw ? (
              <div className="flex shrink-0 items-start pt-0.5">
                <button
                  type="button"
                  disabled={withdrawingId === a.id}
                  onClick={() => void withdraw(a.id)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-red-700 underline decoration-red-700/40 underline-offset-2 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawingId === a.id ? "撤回中…" : "撤回申请"}
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
