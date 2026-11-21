"use client";

import { Bookmark, MessageSquareText, Shield } from "lucide-react";
import { AccountNavLink } from "@/components/AccountNavLink";
import { useAuth } from "@/components/AuthProvider";
import { MerchantAccountHub } from "@/components/MerchantAccountHub";
import { accountContactLine } from "@/lib/account-display";

const cards = [
  {
    href: "/account/reviews",
    title: "评价",
    desc: "查看与管理我发布的评价",
    icon: MessageSquareText,
  },
  {
    href: "/account/favorites",
    title: "想吃",
    desc: "收藏与想吃清单",
    icon: Bookmark,
  },
  {
    href: "/account/security",
    title: "账户与安全",
    desc: "修改密码与昵称",
    icon: Shield,
  },
];

export default function AccountHomePage() {
  const { user } = useAuth();
  const nickname = user?.nickname ?? "用户";
  const isMerchant = user?.role === "merchant";

  return (
    <div className="pb-2">
      <header className="relative mx-4 mt-3 overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-[#fffbf5] to-amber-100/55 px-5 pb-8 pt-7 shadow-md shadow-amber-900/[0.06] md:mx-0 md:mt-0">
        <div
          className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 -left-12 h-32 w-32 rounded-full bg-orange-200/30 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <h1 className="text-[22px] font-bold leading-snug tracking-tight text-amber-950 max-md:text-xl">
            你好，{nickname}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-800/85">{accountContactLine(user)}</p>
        </div>
      </header>

      {isMerchant ? (
        <MerchantAccountHub />
      ) : (
        <nav className="mt-6 space-y-2.5 px-4 md:mt-7 md:px-0" aria-label="账户功能">
          {cards.map(({ href, title, desc, icon }) => (
            <AccountNavLink key={href} href={href} title={title} desc={desc} icon={icon} />
          ))}
        </nav>
      )}
    </div>
  );
}
