"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export function RequireAuth({
  children,
  next = "/account",
}: {
  children: React.ReactNode;
  next?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, user, router, next]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-sm text-amber-800/70 max-md:text-xs">
        加载中…
      </div>
    );
  }
  if (!user) {
    return null;
  }
  return <>{children}</>;
}
