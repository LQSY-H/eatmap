import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/io";
import { getSession } from "@/lib/session";

export async function GET() {
  const tags = await readJsonFile<string[]>("tags.json");
  return NextResponse.json(tags);
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as { tags?: string[] };
  if (!Array.isArray(body.tags)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of body.tags) {
    const t = String(raw).trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    cleaned.push(t);
  }
  await writeJsonFile("tags.json", cleaned);
  return NextResponse.json(cleaned);
}
