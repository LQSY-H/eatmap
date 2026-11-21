/**
 * 纯环境变量判断，供 instrumentation 引用（勿在此文件使用 fs/path，以免被打进 Edge 产物）。
 */

/** 默认备份根：仓库根目录下的 `data-backup/`（每次将 `data/` 整体覆盖到 `latest/`） */
export const DEFAULT_USER_DATA_BACKUP_ROOT = "./data-backup";

export function getUserDataBackupRootRaw(): string {
  const raw = process.env.EATMAP_BACKUP_DIR?.trim();
  return raw || DEFAULT_USER_DATA_BACKUP_ROOT;
}

export function isUserDataBackupEnabled(): boolean {
  if (process.env.EATMAP_BACKUP_DISABLED === "1") return false;
  if (process.env.EATMAP_USER_DATA_BACKUP === "1") return true;
  return process.env.NODE_ENV === "production";
}
