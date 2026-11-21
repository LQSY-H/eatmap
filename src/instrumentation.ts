import { assertEatmapProductionEnv } from "@/lib/eatmap-env";
import { isUserDataBackupEnabled } from "@/lib/user-data-backup-config";

/**
 * Node 进程启动时执行一次（next dev / next start）。
 * npm run build 只做构建，不会执行常驻服务，因此看不到端口与请求日志。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const mode = process.env.NODE_ENV === "production" ? "production" : "development";

  if (mode === "development") {
    console.log(
      "\n[eatMap] 开发服务：端口请看上方 Next.js 的 Local / Network；刷新页面时 middleware 会打印 → METHOD 路径。\n" +
        "          关闭请求日志：环境变量 EATMAP_DEBUG_HTTP=0\n" +
        "          仅构建不启动：npm run build；本地预览生产包：npm run start\n",
    );
    if (isUserDataBackupEnabled()) {
      const backup = await import("@/lib/user-data-backup");
      void backup.runUserDataBackup().then((r) => {
        if (!r.ok) console.error("[eatmap-backup] startup:", r.error);
      });
      backup.startUserDataBackupScheduler();
    }
    return;
  }

  assertEatmapProductionEnv();

  if (process.env.EATMAP_START_BANNER !== "0") {
    const port = process.env.PORT ?? "4000";
    const bp = process.env.NEXT_PUBLIC_EATMAP_BASE_PATH?.trim();
    const baseInfo = bp ? ` · basePath=${bp}` : "";
    console.log(
      `\n[eatMap] production · PORT=${port}${baseInfo} · 请求日志需设置 EATMAP_DEBUG_HTTP=1\n`,
    );
  }

  if (isUserDataBackupEnabled()) {
    const backup = await import("@/lib/user-data-backup");
    void backup.runUserDataBackup().then((r) => {
      if (!r.ok) console.error("[eatmap-backup] startup:", r.error);
    });
    backup.startUserDataBackupScheduler();
  }
}
