import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { Building } from "@/lib/types";

/** body.ids 为全部食堂 id 的新顺序（与 buildings.json 中条目一一对应） */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { ids?: string[] };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const buildings = await readJsonFile<Building[]>("buildings.json");
  const idSet = new Set(buildings.map((b) => b.id));
  if (body.ids.length !== buildings.length || body.ids.some((id) => !idSet.has(id))) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }
  const seen = new Set<string>();
  for (const id of body.ids) {
    if (seen.has(id)) {
      return NextResponse.json({ error: "duplicate_id" }, { status: 400 });
    }
    seen.add(id);
  }

  const map = new Map(buildings.map((b) => [b.id, b]));
  const next: Building[] = body.ids.map((bid, i) => {
    const row = map.get(bid)!;
    return { ...row, sortOrder: (i + 1) * 10 };
  });
  await writeJsonFile("buildings.json", next);
  return NextResponse.json(next);
}
