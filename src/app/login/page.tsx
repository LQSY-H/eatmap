import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-sm text-amber-800/70">加载中…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
