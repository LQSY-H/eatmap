/**
 * 将 `getDataDir()` 下全部 JSON、uploads 等复制到备份根目录下的 `latest/`（每次运行整目录替换）。
 * 默认备份根：仓库根目录下的 `data-backup/`，可用 `EATMAP_BACKUP_DIR` 覆盖。
 */

import "server-only";

import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import { getDataDir } from "@/lib/io";
import {
  getUserDataBackupRootRaw,
  isUserDataBackupEnabled,
} from "@/lib/user-data-backup-config";

let cronStarted = false;

export function getUserDataBackupRoot(): string {
  return path.resolve(getUserDataBackupRootRaw());
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function removeStaleTmpDirs(backupRoot: string): Promise<void> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(backupRoot, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory() && e.name.startsWith(".tmp-")) {
      await fs.rm(path.join(backupRoot, e.name), { recursive: true, force: true });
    }
  }
}

export type BackupResult = { ok: true; ms: number; dest: string } | { ok: false; error: string };

/**
 * 把数据目录完整复制到 `{backupRoot}/latest`，先写入临时目录再替换。
 */
export async function runUserDataBackup(): Promise<BackupResult> {
  const t0 = Date.now();
  const backupRoot = getUserDataBackupRoot();
  const dataDir = getDataDir();
  const latestDir = path.join(backupRoot, "latest");

  try {
    await fs.mkdir(backupRoot, { recursive: true });
    await removeStaleTmpDirs(backupRoot);

    if (!(await pathExists(dataDir))) {
      return { ok: false, error: `数据目录不存在: ${dataDir}` };
    }

    const tmpName = `.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tmpDir = path.join(backupRoot, tmpName);

    await fs.cp(dataDir, tmpDir, { recursive: true, force: true });

    await fs.rm(latestDir, { recursive: true, force: true });
    await fs.rename(tmpDir, latestDir);

    const ms = Date.now() - t0;
    console.info(`[eatmap-backup] ok · ${ms}ms · ${latestDir}`);
    return { ok: true, ms, dest: latestDir };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[eatmap-backup] failed · ${backupRoot}`, e);
    return { ok: false, error: msg };
  }
}

/** 北京时间每日 04:00 执行一次（覆盖 `latest/`） */
export function startUserDataBackupScheduler(): void {
  if (cronStarted) return;
  if (!isUserDataBackupEnabled()) return;
  cronStarted = true;

  cron.schedule(
    "0 4 * * *",
    () => {
      void runUserDataBackup().then((r) => {
        if (!r.ok) console.error("[eatmap-backup] scheduled run:", r.error);
      });
    },
    { timezone: "Asia/Shanghai" },
  );

  console.info("[eatmap-backup] scheduler · daily 04:00 Asia/Shanghai ·", getUserDataBackupRoot());
}
