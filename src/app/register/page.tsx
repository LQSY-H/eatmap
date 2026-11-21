import Link from "next/link";
import { GraduationCap, Store } from "lucide-react";

export default function RegisterHubPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-md space-y-4 px-3 py-8 max-md:py-6">
      <h1 className="text-xl font-bold text-amber-950 max-md:text-lg">注册食图</h1>
      <p className="text-xs text-amber-800/75 max-md:text-[11px]">
        请选择注册类型。忘记密码请联系管理员重置。
      </p>
      <div className="grid gap-3 pt-2">
        <Link
          href="/register/student"
          className="flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm ring-amber-400/0 transition hover:ring-2 max-md:p-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <div className="font-semibold text-amber-950">学生账户</div>
            <div className="text-xs text-amber-800/70">邮箱 + 昵称 + 密码</div>
          </div>
        </Link>
        <Link
          href="/register/merchant"
          className="flex items-center gap-3 rounded-2xl border border-amber-900/10 bg-white p-4 shadow-sm transition hover:ring-2 hover:ring-orange-300 max-md:p-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-900">
            <Store className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <div className="font-semibold text-amber-950">店铺账户</div>
            <div className="text-xs text-amber-800/70">手机号 + 昵称 + 密码，再创建店铺</div>
          </div>
        </Link>
      </div>
      <p className="text-center text-xs text-amber-800/75">
        已有账号？{" "}
        <Link href="/login" className="font-medium text-amber-800 underline-offset-4 hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}
