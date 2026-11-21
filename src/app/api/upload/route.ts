import { NextResponse } from "next/server";
import { getShop } from "@/lib/data";
import { saveCompressedWebp } from "@/lib/process-upload";
import { getSession } from "@/lib/session";
import { appendUploadLog } from "@/lib/upload-log";
import { canEditShop } from "@/lib/shop-access";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const file = form.get("file");
  const purpose = String(form.get("purpose") ?? "");
  const shopId = form.get("shopId") ? String(form.get("shopId")) : "";

  if (!(file instanceof Blob) || !purpose) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const needsShop =
    purpose === "shop-cover" ||
    purpose === "shop-menu" ||
    purpose === "shop-scene" ||
    purpose === "shop-dish" ||
    purpose === "ad-promo" ||
    purpose === "review";

  if (needsShop && !shopId) {
    return NextResponse.json({ error: "need_shopId" }, { status: 400 });
  }

  if (needsShop) {
    const shop = await getShop(shopId);
    if (!shop) {
      return NextResponse.json({ error: "shop_not_found" }, { status: 404 });
    }
    if (purpose !== "review" && !canEditShop(session, shop)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "invalid_purpose" }, { status: 400 });
  }

  const url = await saveCompressedWebp(buf);
  await appendUploadLog({
    path: url,
    userId: session.userId,
    shopId: shopId || undefined,
    kind: purpose,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ url });
}
