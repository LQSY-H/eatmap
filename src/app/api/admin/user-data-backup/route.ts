import { NextResponse } from "next/server";
import { runUserDataBackup } from "@/lib/user-data-backup";
import { getSession } from "@/lib/session";

/**
 * 管理员手动触发：将数据目录完整复制到 `{EATMAP_BACKUP_DIR}/latest/`。
 * 不受 `EATMAP_BACKUP_DISABLED` 影响（显式操作）；仍需进程对备份根目录有写权限。
 */
export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const r = await runUserDataBackup();
  if (!r.ok) {
    return NextResponse.json({ error: "backup_failed", message: r.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ms: r.ms, dest: r.dest });
}
