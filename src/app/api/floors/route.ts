import { NextResponse } from "next/server";
import { getFloors } from "@/lib/data";
import { newId, readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { Floor } from "@/lib/types";

export async function GET() {
  const floors = await getFloors();
  return NextResponse.json(floors.sort((a, b) => a.order - b.order));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as Partial<Floor>;
  if (!body.buildingId || !body.name || body.order == null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const floors = await readJsonFile<Floor[]>("floors.json");
  const floor: Floor = {
    id: newId("f"),
    buildingId: body.buildingId,
    name: body.name,
    order: body.order,
    width: body.width ?? 900,
    height: body.height ?? 600,
    backgroundImage: body.backgroundImage,
  };
  floors.push(floor);
  await writeJsonFile("floors.json", floors);
  return NextResponse.json(floor);
}
