"use client";

type Props = {
  catalog: string[];
  value: string[];
  onToggle: (tag: string) => void;
  disabled?: boolean;
  /** 默认「分类标签」 */
  label?: string;
};

export function DishTagsPicker({ catalog, value, onToggle, disabled, label = "分类标签" }: Props) {
  if (catalog.length === 0) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[10px] font-medium text-amber-800/70">{label}（可选）</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {catalog.map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(t)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 transition disabled:opacity-50 ${
              value.includes(t)
                ? "bg-amber-600 text-white ring-amber-600"
                : "bg-white text-amber-900 ring-amber-900/15 hover:bg-amber-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
