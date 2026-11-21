"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { RegisterTermsAgreement } from "@/components/RegisterTermsAgreement";

const errMap: Record<string, string> = {
  invalid_body: "请填写完整信息",
  invalid_email: "邮箱格式不正确",
  password_short: "密码至少 6 位",
  email_taken: "该邮箱已注册",
  nickname_taken: "该昵称已被使用，请换一个",
};

export default function RegisterStudentPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!agreeTerms) {
      setErr("请先阅读并勾选同意《用户须知》");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(eatmapUrl("/api/auth/register-student"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nickname, password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(errMap[(data as { error?: string }).error ?? ""] ?? "注册失败");
        return;
      }
      const loginRes = await fetch(eatmapUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: email, password }),
      });
      if (!loginRes.ok) {
        router.push("/login");
        return;
      }
      await refresh();
      router.replace("/account");
      router.refresh();
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-md px-3 py-8 max-md:py-6">
      <Link href="/register" className="text-xs font-medium text-amber-800 hover:underline">
        ← 返回
      </Link>
      <h1 className="mt-3 text-xl font-bold text-amber-950 max-md:text-lg">学生注册</h1>
      <p className="mt-1 text-xs text-amber-800/75 max-md:text-[11px]">邮箱用于登录。</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">邮箱</span>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-amber-950 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">昵称</span>
          <input
            className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 text-amber-950 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-sm"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            maxLength={32}
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">密码</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">确认密码</span>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>
        {err ? <p className="text-sm text-red-600 max-md:text-xs">{err}</p> : null}
        <RegisterTermsAgreement checked={agreeTerms} onChange={setAgreeTerms} />
        <button
          type="submit"
          disabled={loading || !agreeTerms}
          className="w-full rounded-xl bg-amber-600 py-2.5 text-base font-semibold text-white shadow-sm ring-1 ring-amber-700/25 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 max-md:py-2 max-md:text-sm"
        >
          {loading ? "提交中…" : "注册并登录"}
        </button>
      </form>
    </div>
  );
}
