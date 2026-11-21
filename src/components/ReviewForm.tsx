"use client";
import { eatmapUrl, resolveEatmapMediaUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageIcon, Send, Star } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { ContentModerationMode } from "@/lib/site-settings";

export function ReviewForm({
  shopId,
  reviewModerationMode,
}: {
  shopId: string;
  reviewModerationMode: ContentModerationMode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [perPerson, setPerPerson] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-900/10 bg-amber-50/60 px-4 py-6 text-center shadow-sm max-md:px-3 max-md:py-5">
        <p className="text-sm font-medium text-amber-950 max-md:text-xs">写评价请先登录或注册</p>
        <div className="mt-3 flex justify-center gap-3 text-sm max-md:text-xs">
          <Link
            href={`/login?next=${encodeURIComponent(`/shop/${shopId}`)}`}
            className="rounded-full bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-white px-4 py-2 font-semibold text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-50"
          >
            注册
          </Link>
        </div>
      </div>
    );
  }

  async function onPickImages(files: FileList | null) {
    // Copy before any await: clearing the file input in onChange invalidates FileList on many browsers.
    const list = files?.length ? Array.from(files) : [];
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("purpose", "review");
        fd.append("shopId", shopId);
        const res = await fetch(eatmapUrl("/api/upload"), {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) {
          setError("部分图片上传失败");
          continue;
        }
        const data = (await res.json()) as { url: string };
        uploaded.push(data.url);
      }
      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccessHint(null);
    setLoading(true);
    try {
      const userName = (user.nickname ?? "").trim() || "匿名用户";
      const res = await fetch(eatmapUrl("/api/reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shopId,
          userName,
          rating,
          content,
          userId: user.id,
          perPersonSpend: perPerson.trim() ? Number(perPerson) : undefined,
          images: images.length ? images : undefined,
        }),
      });
      const pack = (await res.json().catch(() => ({}))) as {
        error?: string;
        review?: { id: string };
        requiresReviewApproval?: boolean;
      };
      if (!res.ok) {
        setError(pack.error ?? "提交失败");
        return;
      }
      if (pack.requiresReviewApproval && pack.review?.id && typeof window !== "undefined") {
        try {
          const key = `eatmap-pending-review:${shopId}`;
          const prev = JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown;
          const arr = Array.isArray(prev) ? prev.filter((x): x is string => typeof x === "string") : [];
          if (!arr.includes(pack.review.id)) arr.push(pack.review.id);
          sessionStorage.setItem(key, JSON.stringify(arr));
        } catch {
          /* ignore */
        }
      }
      setSuccessHint(
        pack.requiresReviewApproval
          ? "已提交，管理员审核通过后将公开展示；届时本页会提示。"
          : reviewModerationMode === "post"
            ? "已公开展示；管理员可能后续抽查。"
            : "提交成功。",
      );
      setContent("");
      setPerPerson("");
      setImages([]);
      setRating(5);
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3 max-md:text-xs"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-semibold text-amber-950 max-md:text-sm">写评价</h3>
        <p className="max-w-[min(100%,14rem)] truncate text-xs text-amber-800/75 max-md:max-w-[11rem] max-md:text-[11px]" title={(user.nickname ?? "").trim() || undefined}>
          将以昵称「{(user.nickname ?? "").trim() || "匿名用户"}」展示
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-amber-900/75 max-md:text-xs">评分</span>
        <div className="flex items-center gap-0.5" aria-label={`当前评分 ${rating} 星，最高 5 星`}>
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const active = n <= rating;
            return (
              <button
                key={n}
                type="button"
                aria-label={`设为 ${n} 星`}
                aria-current={rating === n ? "true" : undefined}
                onClick={() => setRating(n)}
                className="rounded-lg p-1 transition hover:bg-amber-100/80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400/50 active:scale-95"
              >
                <Star
                  className={`h-8 w-8 max-md:h-7 max-md:w-7 ${
                    active
                      ? "fill-amber-400 text-amber-500"
                      : "fill-transparent text-amber-300/75"
                  }`}
                  strokeWidth={active ? 0 : 1.75}
                />
              </button>
            );
          })}
        </div>
        <span className="text-sm font-medium tabular-nums text-amber-950 max-md:text-xs">{rating} / 5</span>
      </div>
      <label className="block text-sm max-md:text-xs">
        <span className="text-amber-900/75">本次人均消费（元，选填，支持小数）</span>
        <input
          type="number"
          min={0.01}
          step="any"
          className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-xs"
          value={perPerson}
          onChange={(e) => setPerPerson(e.target.value)}
          placeholder="例如：20 或 28.5"
        />
      </label>
      <label className="block text-sm max-md:text-xs">
        <span className="text-amber-900/75">内容</span>
        <textarea
          rows={2}
          className="mt-1 min-h-0 w-full resize-y rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:text-xs"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="口味、排队、性价比……"
          required
          maxLength={800}
        />
      </label>

      <div className="rounded-xl border border-amber-900/10 bg-[#fffaf3] p-3 max-md:p-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <ImageIcon className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <span className="text-sm font-medium text-amber-950 max-md:text-xs">有图</span>
          <label className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 max-md:py-1">
            {uploading ? "上传中…" : "上传图片"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void onPickImages(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-amber-800/55 max-md:text-[9px]">
          可从相册一次选多张，或在系统菜单里选拍照；可多次点击继续添加。
        </p>
        {images.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((src) => (
              <div key={src} className="relative h-14 w-14 overflow-hidden rounded-lg ring-1 ring-amber-900/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveEatmapMediaUrl(src)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0 top-0 rounded-bl bg-black/55 px-1 text-[10px] text-white"
                  onClick={() => setImages((list) => list.filter((u) => u !== src))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600 max-md:text-xs">{error}</p> : null}
      {successHint ? (
        <p className="text-sm font-medium text-emerald-800 max-md:text-xs">{successHint}</p>
      ) : null}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60 max-md:px-3 max-md:py-2 max-md:text-xs"
        >
          <Send className="h-4 w-4 max-md:h-3.5 max-md:w-3.5" aria-hidden />
          {loading ? "提交中…" : "发布评价"}
        </button>
      </div>
    </form>
  );
}
