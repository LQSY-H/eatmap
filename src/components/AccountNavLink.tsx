import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function AccountNavLink({
  href,
  title,
  desc,
  icon: Icon,
}: {
  href: string;
  title: string;
  desc?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white px-4 py-3.5 shadow-sm shadow-amber-950/[0.04] ring-1 ring-amber-950/[0.03] transition hover:border-amber-400/40 hover:bg-amber-50/70 active:scale-[0.99] max-md:rounded-xl max-md:py-3"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 ring-1 ring-amber-900/10 max-md:h-10 max-md:w-10">
        <Icon className="h-5 w-5 max-md:h-[18px] max-md:w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-amber-950 max-md:text-[15px]">{title}</div>
        {desc ? (
          <div className="text-[11px] leading-snug text-amber-800/65 max-md:text-[10px]">{desc}</div>
        ) : null}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-amber-800/35 transition group-hover:text-amber-800/55 max-md:h-4 max-md:w-4"
        aria-hidden
      />
    </Link>
  );
}
