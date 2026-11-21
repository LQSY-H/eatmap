import { NextResponse } from "next/server";
import { loadUserRecords, toPublicUser } from "@/lib/auth-users";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim();
  let rows = await loadUserRecords();
  if (q) {
    if (session.role !== "super_admin" && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const lower = q.toLowerCase();
    rows = rows.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(lower)) ||
        u.nickname.includes(q) ||
        (u.phone && u.phone.includes(q)),
    );
  }
  return NextResponse.json(rows.map(toPublicUser));
}
