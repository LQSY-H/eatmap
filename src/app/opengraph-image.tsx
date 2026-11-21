import { ImageResponse } from "next/og";
import { getEatmapBrandPngDataUrl } from "@/lib/eatmap-brand-png-data-url";

export const runtime = "nodejs";

export const alt = "食图 eatMap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OG_W = 1200;
const OG_H = 630;
/** 使用 256px 源图放大展示，避免模糊 */
const ICON_DISPLAY = 480;

export default async function Image() {
  const src = await getEatmapBrandPngDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_W,
          height: OG_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf3",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori / ImageResponse */}
        <img src={src} width={ICON_DISPLAY} height={ICON_DISPLAY} alt="" />
      </div>
    ),
    { width: OG_W, height: OG_H },
  );
}
