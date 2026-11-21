import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eatmapUrl, getEatmapBasePath } from "@/lib/base-path";
import { getEatmapSecretBytes } from "@/lib/eatmap-env";

/** admin 路由在 basePath 下为 /eatmap/admin，不能写成 /admin */
function eatmapAdminPathPrefix(): string {
  const bp = (process.env.NEXT_PUBLIC_EATMAP_BASE_PATH ?? "").trim().replace(/\/+$/, "");
  return bp ? `${bp}/admin` : "/admin";
}

/** 反代后应用层看到的 origin；避免用内网 URL 拼 Location 引发浏览器与 CDN/HTTPS 打架 */
function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    "";
  if (host && (proto === "http" || proto === "https")) {
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /**
   * 子路径部署时，旧缓存 / 错误构建会让浏览器请求站点根的 `/_next/…`，而反代只挂了 `/eatmap/`，样式全部失效。
   * 这里只做「根路径下的 _next → 应用内可用的同一 pathname」；勿写成 `/eatmap/_next/…`：
   * Next 在配置了 basePath 时会对 rewrite 目标再挂一层前缀，手动拼 `${bp}${pathname}` 会变成 `/eatmap/eatmap/_next/…`（CSS/JS 全 404）。
   * 仍建议在 Nginx 把 `/_next/` rewrite 到 `/<basePath>/_next/`（见 deploy/nginx-eatmap-subpath.conf）。
   */
  const bp = getEatmapBasePath().trim().replace(/\/+$/, "");
  if (bp && (pathname === "/_next" || pathname.startsWith("/_next/"))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.rewrite(url);
  }

  /**
   * 终端请求日志（与之前行为一致）
   * - development：默认打印；若要关掉：`EATMAP_DEBUG_HTTP=0`
   * - production：默认不打印；需要时：`EATMAP_DEBUG_HTTP=1`
   */
  const logRequests =
    process.env.EATMAP_DEBUG_HTTP !== "0" &&
    (process.env.NODE_ENV !== "production" || process.env.EATMAP_DEBUG_HTTP === "1");
  if (logRequests) {
    const line =
      pathname.startsWith("/api") || pathname.includes("/_next/")
        ? `${pathname}${search || ""}`
        : pathname;
    console.log(`→ ${request.method} ${line}`);
  }

  if (!pathname.startsWith(eatmapAdminPathPrefix())) {
    return NextResponse.next();
  }

  const token = request.cookies.get("eatmap_session")?.value;
  if (!token) {
    const login = new URL(eatmapUrl("/login"), publicOrigin(request));
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  try {
    const { payload } = await jwtVerify(token, getEatmapSecretBytes());
    const role = payload.role as string;
    const isImpersonating = typeof payload.imp === "string";
    if (
      !isImpersonating &&
      !["super_admin", "admin", "merchant"].includes(role)
    ) {
      return NextResponse.redirect(new URL(eatmapUrl("/"), publicOrigin(request)));
    }
    return NextResponse.next();
  } catch {
    const login = new URL(eatmapUrl("/login"), publicOrigin(request));
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
}

/**
 * 须为静态字面量（Next 编译期解析）。
 * 绝对不能匹配 `…/_next/…`（含 `/eatmap/_next/static/**`）：否则会先于静态文件处理，
 * 在部分环境下触发 x-middleware-refresh 短路，CSS/JS 全部 404 → 只有字图无样式。
 * 若浏览器仍请求站点根下的 `/_next/…`，请在 Nginx 层 rewrite 到 `/<basePath>/_next/…`（见 deploy/nginx-eatmap-subpath.conf）。
 */
export const config = {
  matcher: ["/((?!.*\\/(?:_next)(?:\\/|$)).*)"],
};
