"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountBackLink } from "@/components/AccountBackLink";
import { MerchantPromoPanel } from "@/components/MerchantPromoPanel";
import { useAuth } from "@/components/AuthProvider";
import type { Shop } from "@/lib/types";

export function MerchantPromoPageClient({ shops }: { shops: Shop[] }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && user.role !== "merchant") router.replace("/account");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-sm text-amber-800/80">
          加载中…
        </div>
      </div>
    );
  }

  if (user.role !== "merchant") {
    return (
      <div className="px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-amber-900/10 bg-white p-6 text-center text-sm text-amber-800/80">
          正在返回账户首页…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pb-8 md:px-0">
      <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <AccountBackLink />
        <h1 className="mt-3 text-lg font-bold text-amber-950 max-md:text-base">首页推荐</h1>
        <p className="mt-1 text-xs text-amber-800/75 max-md:text-[11px]">
          报名店铺在首页展示位中的档期与素材。
        </p>
      </div>
      <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <MerchantPromoPanel shops={shops} userId={user.id} onCreated={() => router.refresh()} />
      </div>
    </div>
  );
}
