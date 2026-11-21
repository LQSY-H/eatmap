import fs from "fs/promises";
import path from "path";

/**
 * JSON 数据目录，默认是仓库根目录下的 `data/`（即 `process.cwd()/data`）。
 * - `npm run dev` / `npm run start` 都在仓库根目录执行，因此无需额外配置。
 * - 也可用环境变量 `EATMAP_DATA_DIR` 指定绝对路径（Docker、只读代码目录等场景）。
 */
export function getDataDir(): string {
  const custom = process.env.EATMAP_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "data");
}

export async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(getDataDir(), filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filename: string, data: unknown): Promise<void> {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
