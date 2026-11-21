import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** 品牌 PNG（`src/app/icon.png`，当前构建为 256×256）→ data URL，供 OG / Apple 等栅格合成 */
export async function getEatmapBrandPngDataUrl(): Promise<string> {
  const buf = await readFile(join(process.cwd(), "src/app/icon.png"));
  return `data:image/png;base64,${buf.toString("base64")}`;
}
