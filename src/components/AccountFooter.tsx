"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { eatmapUrl } from "@/lib/base-path";

function isAccountHubPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/account" || pathname === "/account/";
}

export function AccountFooter() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const hideLogoutOnMobileSubpage = !isAccountHubPath(pathname);

  return (
    <div
      className={`mt-8 border-t border-amber-900/10 px-4 pt-4 pb-6 md:px-0 ${hideLogoutOnMobileSubpage ? "hidden md:block" : ""}`}
    >
      <button
        type="button"
        onClick={() => logout().then(() => (window.location.href = eatmapUrl("/")))}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-medium text-red-700 hover:bg-red-50 max-md:py-2.5 max-md:text-xs"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        退出登录
      </button>
    </div>
  );
}
