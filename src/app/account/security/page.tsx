"use client";
import { eatmapUrl } from "@/lib/base-path";

import { useEffect, useState } from "react";
import { AccountBackLink } from "@/components/AccountBackLink";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/components/AuthProvider";

const errMap: Record<string, string> = {
  invalid_body: "请填写完整且新密码至少 6 位",
  bad_old: "当前密码不正确",
};

const nickErrMap: Record<string, string> = {
  invalid_body: "昵称不能为空",
  nickname_too_long: "昵称过长（最多 32 字）",
  nickname_taken: "该昵称已被使用",
};

export default function AccountSecurityPage() {
  const { user, refresh } = useAuth();
  const [nickname, setNickname] = useState("");
  const [nickMsg, setNickMsg] = useState<string | null>(null);
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [nickSaving, setNickSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.nickname != null) setNickname(user.nickname);
  }, [user?.nickname]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!user) return;
    if (newPassword !== confirm) {
      setErr("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(eatmapUrl(`/api/users/${user.id}/password`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(errMap[(data as { error?: string }).error ?? ""] ?? "修改失败");
        return;
      }
      setMsg("密码已更新");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function saveNicknameIfChanged() {
    if (!user) return;
    setNickErr(null);
    setNickMsg(null);
    const next = nickname.trim().replace(/\s+/g, " ");
    if (!next) {
      setNickErr("昵称不能为空");
      setNickname(user.nickname);
      return;
    }
    if (next === user.nickname.trim()) return;
    setNickSaving(true);
    try {
      const res = await fetch(eatmapUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nickname: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNickErr(nickErrMap[(data as { error?: string }).error ?? ""] ?? "保存失败");
        setNickname(user.nickname);
        return;
      }
      setNickname((data as { user?: { nickname: string } }).user?.nickname ?? next);
      setNickMsg("昵称已保存");
      await refresh();
      window.dispatchEvent(new Event("eatmap-auth-refresh"));
    } catch {
      setNickErr("网络错误");
      setNickname(user.nickname);
    } finally {
      setNickSaving(false);
    }
  }

  return (
    <div className="space-y-4 px-4 pb-6 md:px-0">
      <AccountBackLink />
      <div className="rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <h1 className="text-lg font-bold text-amber-950 max-md:text-base">账户与安全</h1>
        <p className="mt-2 text-xs text-amber-800/75 max-md:text-[11px]">
          修改昵称与登录密码；忘记密码请联系管理员处理。
        </p>

        <div className="mt-4 space-y-2 border-t border-amber-900/10 pt-4">
          <h2 className="text-sm font-semibold text-amber-950 max-md:text-xs">昵称</h2>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">修改昵称</span>
            <input
              type="text"
              maxLength={32}
              className="mt-1 w-full rounded-xl border border-amber-900/15 bg-[#fffaf3] px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400/40 max-md:py-1.5 max-md:text-sm"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNickMsg(null);
                setNickErr(null);
              }}
              onBlur={() => void saveNicknameIfChanged()}
              autoComplete="nickname"
            />
          </label>
          {nickSaving ? (
            <p className="text-xs text-amber-800/70">保存中…</p>
          ) : nickErr ? (
            <p className="text-xs text-red-600">{nickErr}</p>
          ) : nickMsg ? (
            <p className="text-xs text-emerald-700">{nickMsg}</p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-amber-900/10 pt-4">
          <h2 className="text-sm font-semibold text-amber-950 max-md:text-xs">修改密码</h2>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">当前密码</span>
            <PasswordInput
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">新密码</span>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="block text-sm max-md:text-xs">
            <span className="text-amber-900/75">确认新密码</span>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          {err ? <p className="text-sm text-red-600 max-md:text-xs">{err}</p> : null}
          {msg ? <p className="text-sm text-emerald-700 max-md:text-xs">{msg}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 max-md:text-xs"
          >
            {loading ? "保存中…" : "保存新密码"}
          </button>
        </form>
      </div>
    </div>
  );
}
