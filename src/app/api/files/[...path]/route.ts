import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getDataDir } from "@/lib/io";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Params) {
  const segments = (await params).path;
  if (!segments?.length || segments[0] !== "uploads") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const unsafe = path.join(getDataDir(), ...segments);
  const base = path.resolve(path.join(getDataDir(), "uploads"));
  const resolved = path.resolve(unsafe);
  if (!resolved.startsWith(base)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const buf = await fs.readFile(resolved);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
