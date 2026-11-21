"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountBackLink } from "@/components/AccountBackLink";
import { useAuth } from "@/components/AuthProvider";
import { accountContactLine } from "@/lib/account-display";

export default function AccountProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "merchant") {
      router.replace("/account");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="px-4 py-12 text-center text-sm text-amber-800/75">加载中…</div>
    );
  }

  if (user.role !== "merchant") {
    return (
      <div className="px-4 py-12 text-center text-sm text-amber-800/75">正在返回账户首页…</div>
    );
  }

  const mp = user.merchantProfile;

  return (
    <div className="space-y-6 px-4 pb-8 pt-2 md:px-0">
      <AccountBackLink />

      <header className="relative overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-[#fffbf5] to-amber-100/50 px-5 py-6 shadow-sm md:shadow-md md:shadow-amber-900/[0.05]">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-200/35 blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xl font-bold tracking-tight text-amber-950">你好，{user.nickname}</p>
          <p className="mt-2 text-sm text-amber-800/85">{accountContactLine(user)}</p>
          <p className="mt-3 inline-flex rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-900/12">
            商户 · 登记信息
          </p>
        </div>
      </header>

      {mp ? (
        <div className="rounded-2xl border border-amber-900/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">商户登记详情</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex flex-col gap-0.5 border-b border-amber-900/8 pb-3 last:border-0 last:pb-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-800/55">店铺名称</dt>
              <dd className="font-medium text-amber-950">{mp.shopName}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-amber-900/8 pb-3 last:border-0 last:pb-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-800/55">位置</dt>
              <dd className="font-medium text-amber-950">{mp.location}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-amber-900/8 pb-3 last:border-0 last:pb-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-800/55">商铺编号</dt>
              <dd className="font-medium text-amber-950">{mp.shopNumber}</dd>
            </div>
            {mp.notes ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-800/55">备注</dt>
                <dd className="leading-relaxed text-amber-950">{mp.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 px-4 py-6 text-center text-sm text-amber-800/75">
          暂无商户登记详情。
        </p>
      )}
    </div>
  );
}
