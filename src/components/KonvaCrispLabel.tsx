"use client";

import { Group, Text } from "react-konva";
import type { MapShape } from "@/lib/types";

const LINE_HEIGHT = 1.13;
/** 中文为主时单字宽约等于字号 × 系数 */
const CHAR_WIDTH_RATIO = 0.9;

function linesNeededForFont(innerW: number, len: number, fontSize: number): number {
  const charsPerLine = Math.max(1, Math.floor(innerW / (fontSize * CHAR_WIDTH_RATIO)));
  return Math.ceil(len / charsPerLine);
}

/**
 * 地图格内标签：长店名自动换行（最多 2～3 行），字号在可读范围内尽量大；仍放不下则省略号截断。
 * 坐标与格子一致，随 Stage 缩放。
 */
export function KonvaCrispLabel({
  shape,
  text,
  fill = "#422006",
}: {
  shape: MapShape;
  text: string;
  fill?: string;
}) {
  const display = (text.trim() || " ").replace(/\n/g, "");
  const len = Math.max([...display].length, 1);
  const w = Math.max(shape.width, 8);
  const h = Math.max(shape.height, 8);
  const pad = Math.max(2, Math.min(w, h) * 0.06);
  const innerW = Math.max(w - pad * 2, 4);
  const innerH = Math.max(h - pad * 2, 4);

  const maxLines = innerH >= 90 ? 3 : 2;

  const maxFsTry = Math.min(20, innerH * 0.48, innerW * 0.38);
  let fontSize = 7;
  for (let fs = maxFsTry; fs >= 7; fs -= 0.5) {
    const ln = linesNeededForFont(innerW, len, fs);
    const visualLines = Math.min(ln, maxLines);
    if (fs * LINE_HEIGHT * visualLines <= innerH * 0.96) {
      fontSize = fs;
      break;
    }
  }

  return (
    <Group listening={false} clipX={0} clipY={0} clipWidth={w} clipHeight={h}>
      <Text
        x={pad}
        y={pad}
        width={innerW}
        height={innerH}
        text={display}
        fontSize={fontSize}
        lineHeight={LINE_HEIGHT}
        fontStyle="bold"
        fill={fill}
        align="center"
        verticalAlign="middle"
        wrap="char"
        ellipsis={true}
        listening={false}
      />
    </Group>
  );
}
