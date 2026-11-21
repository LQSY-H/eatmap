#!/usr/bin/env node
/**
 * 从 public/icon.svg 生成 Apple 推荐的 apple-touch-icon PNG（180 / 167 / 152 / 120）。
 * 用法：在仓库根目录执行 npm run gen:apple-icons
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "icon.svg");
const sizes = [180, 167, 152, 120];

if (!fs.existsSync(src)) {
  console.error("[eatmap] 缺少 public/icon.svg");
  process.exit(1);
}

for (const s of sizes) {
  const out = path.join(root, "public", `icon-${s}.png`);
  await sharp(src).resize(s, s).png().toFile(out);
  console.log("[eatmap] wrote", path.relative(root, out));
}
