import type { MetadataRoute } from "next";
import { eatmapStaticImg } from "@/lib/eatmap-static-img";
import { normalizeEatmapBasePath } from "@/lib/base-path-config";

/**
 * Chrome / Edge / Android / Safari「添加到主屏幕」依赖 Web Manifest。
 *
 * 在子路径部署（如 /eatmap）时，`start_url` 必须为带 basePath 的根（如 `/eatmap/`），不能写成站点根的 `/`，
 * 否则主屏幕会打开 `https://域名/` 而不是应用子路径，样式与路由会错。
 */
export default function manifest(): MetadataRoute.Manifest {
  const bp = normalizeEatmapBasePath(process.env.NEXT_PUBLIC_EATMAP_BASE_PATH);
  const start_url = bp ? `${bp}/` : "/";
  const scope = bp ? `${bp}/` : "/";

  return {
    name: "食图 eatMap · 校园美食地图",
    short_name: "食图",
    description: "瀑布流探店与室内地图寻档口，eatMap / 食图",
    start_url,
    scope,
    display: "standalone",
    background_color: "#fffaf3",
    theme_color: "#fffaf3",
    icons: [
      {
        src: eatmapStaticImg("icon-180.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: eatmapStaticImg("icon512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: eatmapStaticImg("icon512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
