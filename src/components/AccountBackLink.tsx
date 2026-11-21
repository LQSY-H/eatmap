import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AccountBackLink({
  href = "/account",
  label = "返回",
  className = "",
}: {
  href?: string;
  label?: string;
  /** 与标题同行时可传入压缩样式 */
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 py-2 text-base font-semibold text-amber-900 hover:bg-amber-50 max-md:text-[17px] ${className}`.trim()}
    >
      <ArrowLeft className="h-6 w-6 shrink-0 max-md:h-5 max-md:w-5" aria-hidden />
      {label}
    </Link>
  );
}
