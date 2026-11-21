"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawNext = sp.get("next");
  const next =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("://")
      ? rawNext
      : "/";
  const { refresh } = useAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(eatmapUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login, password }),
      });
      if (!res.ok) {
        setErr("账号或密码不正确");
        return;
      }
      await refresh();
      router.replace(next);
      router.refresh();
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-md px-3 py-8 max-md:py-6">
      <h1 className="text-xl font-bold text-amber-950 max-md:text-lg">登录食图</h1>
      <p className="mt-1 text-xs text-amber-800/75 max-md:text-[11px]">
        请使用注册邮箱或手机号登录。
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">邮箱 / 手机</span>
          <input
            className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-amber-950 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-sm"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">密码</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {err ? <p className="text-sm text-red-600 max-md:text-xs">{err}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white py-2.5 text-base font-semibold text-amber-950 shadow-sm ring-1 ring-amber-900/15 transition-colors hover:bg-amber-50 active:bg-amber-100/80 disabled:opacity-60 max-md:py-2 max-md:text-sm"
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="mt-4 text-center text-[11px] text-amber-800/70 max-md:text-[10px]">首次使用请注册：</p>
      <Link
        href="/register"
        className="mt-2 flex w-full items-center justify-center rounded-xl bg-amber-600 py-2.5 text-base font-semibold text-white shadow-sm ring-1 ring-amber-700/25 transition-colors hover:bg-amber-700 active:bg-amber-800 max-md:py-2 max-md:text-sm"
      >
        注册
      </Link>
    </div>
  );
}
