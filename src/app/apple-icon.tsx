import { ImageResponse } from "next/og";
import { getEatmapBrandPngDataUrl } from "@/lib/eatmap-brand-png-data-url";

export const runtime = "nodejs";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function Image() {
  const src = await getEatmapBrandPngDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffaf3",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori / ImageResponse */}
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
