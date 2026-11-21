import { Suspense } from "react";
import { AccountFooter } from "@/components/AccountFooter";
import { RequireAuth } from "@/components/RequireAuth";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth next="/account">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col py-4 md:px-3 max-md:max-w-none max-md:px-0 max-md:py-3">
        <div className="flex-1">{children}</div>
        <Suspense fallback={null}>
          <AccountFooter />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
