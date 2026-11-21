"use client";
import { eatmapUrl } from "@/lib/base-path";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, X } from "lucide-react";

type Props = {
  tagsCatalog: string[];
};

/** 去重并保持首次出现顺序 */
function dedupeOrdered(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of arr) {
    const x = String(t).trim();
    if (!x || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** 食物标签库维护（仅超级管理员入口）；拖拽排序，增删后短暂防抖自动保存 */
export function AdminTagsPanel({ tagsCatalog }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(() => dedupeOrdered(tagsCatalog));
  const [draft, setDraft] = useState("");
  const [catalogMsg, setCatalogMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canonicalFromServer = useRef(dedupeOrdered(tagsCatalog).join("\0"));
  const saveGen = useRef(0);

  useEffect(() => {
    const ordered = dedupeOrdered(tagsCatalog);
    setItems(ordered);
    canonicalFromServer.current = ordered.join("\0");
  }, [tagsCatalog]);

  const ordered = useMemo(() => dedupeOrdered(items), [items]);

  const listSignature = useMemo(() => ordered.join("\0"), [ordered]);

  useEffect(() => {
    if (listSignature === canonicalFromServer.current) return;
    const gen = ++saveGen.current;
    const t = setTimeout(() => {
      void (async () => {
        setSaving(true);
        setCatalogMsg(null);
        const list = dedupeOrdered(items);
        const res = await fetch(eatmapUrl("/api/tags"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tags: list }),
        });
        if (gen !== saveGen.current) {
          setSaving(false);
          return;
        }
        setSaving(false);
        if (!res.ok) {
          setCatalogMsg("仅超级管理员可保存标签库");
          return;
        }
        canonicalFromServer.current = list.join("\0");
        setCatalogMsg("已自动保存");
        router.refresh();
      })();
    }, 480);
    return () => clearTimeout(t);
  }, [listSignature, items, router]);

  function addTag() {
    const t = draft.trim();
    if (!t) return;
    setItems((prev) => {
      const d = dedupeOrdered(prev);
      if (d.includes(t)) return d;
      return [...d, t];
    });
    setDraft("");
  }

  function removeTag(t: string) {
    setItems((prev) => dedupeOrdered(prev).filter((x) => x !== t));
  }

  function moveTag(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setItems((prev) => {
      const list = dedupeOrdered(prev);
      if (from >= list.length || to >= list.length) return list;
      const next = [...list];
      const [el] = next.splice(from, 1);
      next.splice(to, 0, el);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-amber-950">食物标签库</h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900/75">
        店铺管理里只能从下列标签中勾选。拖动整行可调整顺序（顺序会写入标签库并在店铺勾选器中沿用）。「今日推荐」等为运营向标签：商户侧不可见。修改后会自动保存。移动端浏览器对拖拽支持较弱，建议在桌面端排序。
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {ordered.length === 0 ? (
          <p className="text-sm text-amber-800/65">暂无标签，请在下方添加。</p>
        ) : (
          ordered.map((t, i) => (
            <div
              key={t}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex === null) return;
                moveTag(dragIndex, i);
                setDragIndex(null);
              }}
              className={`flex max-w-full items-center gap-1 rounded-xl border border-amber-900/12 bg-[#fffaf3] py-1.5 pl-1 pr-1 text-sm text-amber-950 shadow-sm transition-opacity ${
                dragIndex === i ? "opacity-60 ring-2 ring-amber-400/50" : ""
              }`}
            >
              <span
                className="cursor-grab touch-none rounded-lg p-1.5 text-amber-700/70 hover:bg-amber-200/50 active:cursor-grabbing"
                title="拖动排序"
                aria-hidden
              >
                <GripVertical className="h-4 w-4 shrink-0" />
              </span>
              <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{t}</span>
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="shrink-0 rounded-full p-1 text-amber-700 hover:bg-amber-200/80"
                aria-label={`删除标签 ${t}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-amber-900/10 pt-4">
        <label className="min-w-[160px] flex-1 text-xs text-amber-900">
          <span className="text-amber-800/75">新增标签</span>
          <input
            className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="输入后点击添加或回车"
          />
        </label>
        <button
          type="button"
          onClick={addTag}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2 text-xs font-medium text-amber-950 ring-1 ring-amber-900/15 hover:bg-amber-200/80"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          添加
        </button>
      </div>

      <p className="mt-3 text-xs text-amber-800/70">
        {saving ? "正在保存…" : null}
        {!saving && catalogMsg ? <span>{catalogMsg}</span> : null}
      </p>
    </div>
  );
}
