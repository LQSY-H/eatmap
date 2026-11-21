import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { Floor, MapShape } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json()) as Partial<
    Pick<Floor, "name" | "order" | "width" | "height" | "buildingId" | "backgroundImage">
  >;
  const floors = await readJsonFile<Floor[]>("floors.json");
  const idx = floors.findIndex((f) => f.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const cur = floors[idx];
  const next: Floor = {
    ...cur,
    name: body.name != null ? String(body.name).trim() || cur.name : cur.name,
    order: body.order != null ? Number(body.order) : cur.order,
    width: body.width != null ? Number(body.width) : cur.width,
    height: body.height != null ? Number(body.height) : cur.height,
    buildingId: body.buildingId != null ? String(body.buildingId) : cur.buildingId,
    backgroundImage:
      body.backgroundImage !== undefined ? body.backgroundImage : cur.backgroundImage,
  };
  floors[idx] = next;
  await writeJsonFile("floors.json", floors);
  return NextResponse.json(next);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const floors = await readJsonFile<Floor[]>("floors.json");
  if (!floors.some((f) => f.id === id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const nextFloors = floors.filter((f) => f.id !== id);
  await writeJsonFile("floors.json", nextFloors);

  const shapes = await readJsonFile<MapShape[]>("mapShapes.json");
  const nextShapes = shapes.filter((s) => s.floorId !== id);
  await writeJsonFile("mapShapes.json", nextShapes);

  return NextResponse.json({ ok: true });
}
