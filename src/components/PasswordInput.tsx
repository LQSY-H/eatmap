"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** 外层容器 class，默认含 `relative mt-1` */
  wrapperClassName?: string;
  /** 后台重置密码等窄位输入 */
  variant?: "default" | "compact";
};

const defaultInputClass =
  "w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 pr-10 text-amber-950 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-sm";

const compactInputClass =
  "w-full rounded border border-amber-900/15 bg-[#fffaf3] px-1.5 py-1 pr-7 text-[11px] text-amber-950 outline-none focus:ring-1 focus:ring-amber-400/40";

export function PasswordInput({
  className,
  wrapperClassName,
  variant = "default",
  id,
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;
  const wrap = wrapperClassName ?? "relative mt-1";
  const base = variant === "compact" ? compactInputClass : defaultInputClass;
  const inputCls = [base, className].filter(Boolean).join(" ");
  const btnSize =
    variant === "compact"
      ? "right-0.5 h-6 w-6"
      : "right-1.5 h-8 w-8";

  return (
    <div className={wrap}>
      <input
        id={inputId}
        type={visible ? "text" : "password"}
        className={inputCls}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-amber-700/85 hover:bg-amber-100/90 hover:text-amber-950 ${btnSize}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
      >
        {visible ? (
          <Eye className={`shrink-0 ${variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}`} aria-hidden />
        ) : (
          <EyeOff className={`shrink-0 ${variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"}`} aria-hidden />
        )}
      </button>
    </div>
  );
}
