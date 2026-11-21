import { NextResponse } from "next/server";
import { getBuildings } from "@/lib/data";
import { newId, readJsonFile, writeJsonFile } from "@/lib/io";
import { canEditMapEditor } from "@/lib/map-editor-access";
import { getSession } from "@/lib/session";
import type { Building } from "@/lib/types";

export async function GET() {
  const buildings = await getBuildings();
  return NextResponse.json(buildings);
}

/** 按名称复用或新建食堂（地图搭建里输入新名称时落盘到 buildings.json） */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !canEditMapEditor(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const buildings = await readJsonFile<Building[]>("buildings.json");
  const existing = buildings.find((b) => b.name === name);
  if (existing) {
    return NextResponse.json(existing);
  }
  const maxSort = buildings.reduce((m, b) => Math.max(m, b.sortOrder ?? 0), 0);
  const row: Building = { id: newId("b"), name, sortOrder: maxSort + 10 };
  buildings.push(row);
  await writeJsonFile("buildings.json", buildings);
  return NextResponse.json(row);
}
