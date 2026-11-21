"use client";
import { eatmapUrl } from "@/lib/base-path";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PasswordInput } from "@/components/PasswordInput";
import { RegisterTermsAgreement } from "@/components/RegisterTermsAgreement";

type FieldKey = "phone" | "nickname" | "password" | "confirm";

const errMap: Record<string, string> = {
  invalid_body: "请填写必填项",
  invalid_phone: "请输入 11 位手机号",
  password_short: "密码至少 6 位",
  password_mismatch: "两次密码不一致",
  phone_taken: "该手机号已注册",
  nickname_taken: "该昵称已被使用，请换一个",
};

function validateMerchantForm(values: {
  phone: string;
  nickname: string;
  password: string;
  confirm: string;
}): { fields: FieldKey[]; message: string | null } {
  const phone = values.phone.replace(/\s+/g, "").trim();
  const nickname = values.nickname.trim();
  const { password, confirm } = values;
  const missing: FieldKey[] = [];
  if (!phone) missing.push("phone");
  if (!nickname) missing.push("nickname");
  if (!password) missing.push("password");
  if (!confirm) missing.push("confirm");
  if (missing.length > 0) {
    return { fields: missing, message: "请填写必填项" };
  }
  if (!/^1\d{10}$/.test(phone)) {
    return { fields: ["phone"], message: "请输入 11 位手机号" };
  }
  if (password.length < 6) {
    return { fields: ["password"], message: "密码至少 6 位" };
  }
  if (password !== confirm) {
    return { fields: ["password", "confirm"], message: "两次密码不一致" };
  }
  return { fields: [], message: null };
}

function fieldHighlight(on: boolean) {
  return on
    ? "border-red-500/80 bg-red-50/40 ring-2 ring-red-400/35 focus:border-red-500 focus:ring-red-400/50"
    : "border-amber-900/15 focus:ring-amber-400/40";
}

export default function RegisterMerchantPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  function clearFieldError(key: FieldKey) {
    setFieldErr((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function clearFieldErrors(...keys: FieldKey[]) {
    setFieldErr((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        if (next[k]) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setFieldErr({});
    if (!agreeTerms) {
      setErr("请先阅读并勾选同意《用户须知》");
      return;
    }
    const local = validateMerchantForm({ phone, nickname, password, confirm });
    if (local.message) {
      setFieldErr(Object.fromEntries(local.fields.map((k) => [k, true])) as Partial<Record<FieldKey, boolean>>);
      setErr(local.message);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(eatmapUrl("/api/auth/register-merchant"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          nickname,
          password,
          confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (data as { error?: string }).error ?? "";
        if (code === "invalid_body") {
          const again = validateMerchantForm({ phone, nickname, password, confirm });
          if (again.message) {
            setFieldErr(Object.fromEntries(again.fields.map((k) => [k, true])) as Partial<Record<FieldKey, boolean>>);
          }
        } else if (code === "invalid_phone") {
          setFieldErr({ phone: true });
        } else if (code === "password_short") {
          setFieldErr({ password: true });
        } else if (code === "password_mismatch") {
          setFieldErr({ password: true, confirm: true });
        } else if (code === "phone_taken") {
          setFieldErr({ phone: true });
        } else if (code === "nickname_taken") {
          setFieldErr({ nickname: true });
        }
        setErr(errMap[code] ?? "注册失败");
        return;
      }
      const loginRes = await fetch(eatmapUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: phone, password }),
      });
      if (!loginRes.ok) {
        router.push("/login");
        return;
      }
      await refresh();
      router.replace("/account/setup-shop");
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
      <h1 className="mt-3 text-xl font-bold text-amber-950 max-md:text-lg">店铺账户注册</h1>
      <p className="mt-1 text-xs text-amber-800/75 max-md:text-[11px]">
        手机号用于登录。注册成功后将进入「创建店铺」页面；店铺创建后需管理员审核通过方可在站内对外展示。
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm max-md:p-3">
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">手机号</span>
          <input
            inputMode="numeric"
            autoComplete="tel"
            className={`mt-1 w-full rounded-xl border bg-[#fffaf3] px-3 py-2 text-amber-950 outline-none focus:ring-2 max-md:py-1.5 max-md:text-sm ${fieldHighlight(!!fieldErr.phone)}`}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError("phone");
            }}
            required
            pattern="^1\d{10}$"
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">昵称</span>
          <input
            autoComplete="nickname"
            className={`mt-1 w-full rounded-xl border bg-[#fffaf3] px-3 py-2 text-amber-950 outline-none focus:ring-2 max-md:py-1.5 max-md:text-sm ${fieldHighlight(!!fieldErr.nickname)}`}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              clearFieldError("nickname");
            }}
            required
            maxLength={32}
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">密码</span>
          <PasswordInput
            autoComplete="new-password"
            className={`focus:ring-2 max-md:py-1.5 max-md:text-sm ${fieldHighlight(!!fieldErr.password)}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldErrors("password", "confirm");
            }}
            required
            minLength={6}
          />
        </label>
        <label className="block text-sm max-md:text-xs">
          <span className="text-amber-900/75">确认密码</span>
          <PasswordInput
            autoComplete="new-password"
            className={`focus:ring-2 max-md:py-1.5 max-md:text-sm ${fieldHighlight(!!fieldErr.confirm)}`}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearFieldErrors("password", "confirm");
            }}
            required
            minLength={6}
          />
        </label>
        {err ? <p className="text-sm text-red-600 max-md:text-xs">{err}</p> : null}
        <RegisterTermsAgreement checked={agreeTerms} onChange={setAgreeTerms} />
        <button
          type="submit"
          disabled={loading || !agreeTerms}
          className="w-full rounded-xl bg-orange-600 py-2.5 text-base font-semibold text-white shadow-sm ring-1 ring-orange-700/25 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-60 max-md:py-2 max-md:text-sm"
        >
          {loading ? "提交中…" : "注册并去创建店铺"}
        </button>
      </form>
    </div>
  );
}
