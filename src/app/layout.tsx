import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { AuthProvider } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { getEatmapBasePath } from "@/lib/base-path";
import { eatmapStaticImg } from "@/lib/eatmap-static-img";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "食图 eatMap · 校园美食地图";
const siteDescription = "瀑布流探店与室内地图寻档口，eatMap / 食图";

/**
 * QQ 分享图硬性要求：须为 HTTPS 绝对 URL（禁止相对路径、禁止 http）。
 * 外网域名在反代漏传 X-Forwarded-Proto 时也可能落成 http，此处对非公网主机一律改为 https。
 */
function forceHttpsIfPublicSite(base: URL): URL {
  const host = base.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1";
  if (loopback) return base;
  const u = new URL(base.href);
  u.protocol = "https:";
  return u;
}

/** 解析 metadata 绝对 URL：优先反代头（外网域名），避免 NEXT_PUBLIC_SITE_URL 仍为 127.0.0.1 时浏览器去拉 localhost 资源。 */
async function resolveMetadataBase(): Promise<URL> {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = forwardedHost || h.get("host")?.trim();

  if (host) {
    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    const loopback = hostname === "localhost" || hostname === "127.0.0.1";
    const proto =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : loopback
          ? "http"
          : "https";
    const bp = getEatmapBasePath();
    const path = bp ? `${bp.replace(/\/$/, "")}/` : "/";
    return new URL(path, `${proto}://${host}`);
  }

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:4000");
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = forceHttpsIfPublicSite(await resolveMetadataBase());
  const shareThumb = eatmapStaticImg("icon512.png");
  return {
    metadataBase,
    title: siteTitle,
    description: siteDescription,
    applicationName: "食图 eatMap",
    /** Safari 主屏幕；apple-mobile-web-app-title 来自 title 字段 */
    appleWebApp: {
      capable: true,
      title: "食图",
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: eatmapStaticImg("icon-180.png"), sizes: "180x180", type: "image/png" },
        { url: eatmapStaticImg("icon512.png"), sizes: "512x512", type: "image/png" },
      ],
      shortcut: eatmapStaticImg("icon-180.png"),
      apple: [
        { url: eatmapStaticImg("icon-180.png"), sizes: "180x180", type: "image/png" },
        { url: eatmapStaticImg("icon-167.png"), sizes: "167x167", type: "image/png" },
        { url: eatmapStaticImg("icon-152.png"), sizes: "152x152", type: "image/png" },
        { url: eatmapStaticImg("icon-120.png"), sizes: "120x120", type: "image/png" },
      ],
    },
    alternates: {
      canonical: metadataBase.href,
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName: "食图 eatMap",
      locale: "zh_CN",
      type: "website",
      url: metadataBase.href,
      images: [
        {
          url: shareThumb,
          width: 512,
          height: 512,
          type: "image/png",
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [shareThumb],
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fffaf3",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shareThumb = eatmapStaticImg("icon512.png");

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#fffaf3] antialiased`}
    >
      <head>
        <meta itemProp="name" content={siteTitle} />
        <meta itemProp="description" content={siteDescription} />
        <meta itemProp="image" content={shareThumb} />
      </head>
      <body className="flex min-h-full min-h-[100dvh] flex-col bg-[#fffaf3] text-amber-950 [touch-action:manipulation] max-md:text-[13px] max-md:leading-snug">
        <AuthProvider>
          <SiteHeader />
          {/* overflow 只包主内容，避免写在 html/body 上导致页眉内 sticky 无法相对视口固定 */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
