import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  getAds,
  getBuildings,
  getFloors,
  getMapShapes,
  getReviews,
  getShops,
  getTags,
  getUsers,
} from "@/lib/data";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  /** 真实商户统一走「账户」下的独立页面；超管代登录预览（impersonatorId）仍可进后台 */
  if (session?.role === "merchant" && !session.impersonatorId) {
    redirect("/account");
  }
  const [buildings, floors, shops, shapes, reviews, adsAll, users, tags] = await Promise.all([
    getBuildings(),
    getFloors(),
    getShops(),
    getMapShapes(),
    getReviews(),
    getAds(),
    getUsers(),
    getTags(),
  ]);

  const ads =
    session?.role === "merchant"
      ? adsAll.filter((a) =>
          shops.some((s) => s.ownerUserId === session.userId && s.id === a.shopId),
        )
      : adsAll;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-base text-amber-800/80">
          加载后台…
        </div>
      }
    >
      <AdminDashboard
        buildings={buildings}
        floors={floors}
        shops={shops}
        shapes={shapes}
        reviews={reviews}
        ads={ads}
        users={users}
        tagsCatalog={tags}
      />
    </Suspense>
  );
}
