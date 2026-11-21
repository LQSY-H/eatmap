import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { randomBytes } from "crypto";
import { getDataDir } from "@/lib/io";

const UPLOAD_SUBDIR = "uploads";

/** 限制并发图像线程，避免短时间多图上传把 CPU（及部分环境下 GPU 加速）占满 */
sharp.concurrency(1);

export async function saveCompressedWebp(buffer: Buffer): Promise<string> {
  const dir = path.join(getDataDir(), UPLOAD_SUBDIR);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.webp`;
  const full = path.join(dir, name);
  await sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    /** effort 越低 CPU 占用越低；quality 略降可换更稳的峰值负载 */
    .webp({ quality: 82, effort: 2 })
    .toFile(full);
  return `/api/files/${UPLOAD_SUBDIR}/${name}`;
}
