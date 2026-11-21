import { NextResponse } from "next/server";
import { getMapShapes } from "@/lib/data";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { MapShape } from "@/lib/types";

export async function GET() {
  const shapes = await getMapShapes();
  return NextResponse.json(shapes);
}

/** body: { floorId: string, shapes: MapShape[] } — 替换该楼层全部形状 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    floorId?: string;
    shapes?: MapShape[];
  };
  if (!body.floorId || !Array.isArray(body.shapes)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const all = await readJsonFile<MapShape[]>("mapShapes.json");
  const rest = all.filter((s) => s.floorId !== body.floorId);
  const merged = [...rest, ...body.shapes];
  await writeJsonFile("mapShapes.json", merged);
  return NextResponse.json({ ok: true, count: body.shapes.length });
}
