import { NextResponse } from "next/server";
import { getShops } from "@/lib/data";
import { getSession } from "@/lib/session";

/** 商户查看并编辑自己名下的店铺（完整字段，含全部菜单/实景条目及状态） */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "merchant") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const shops = await getShops();
  return NextResponse.json(shops.filter((s) => s.ownerUserId === session.userId));
}
