/**
 * 环境与密钥约定（Middleware / Node 共用，勿引用 Node 专属模块以便 Edge 可打包）。
 *
 * 生产环境在 `instrumentation` 启动时再做一次整体验证；此处方法在运行时装载密钥时也会校验。
 */

/** HS256 密钥材料建议长度（UTF-8 字符数） */
export const EATMAP_SECRET_MIN_LENGTH = 32;

/** 与历史开发默认一致；生产环境禁止使用 */
export const EATMAP_DEV_SECRET_PLACEHOLDER = "eatmap-dev-secret-change-in-production";

let warnedDevSecret = false;

export function getEatmapSecretBytes(): Uint8Array {
  const raw = process.env.EATMAP_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!raw || raw.length < EATMAP_SECRET_MIN_LENGTH) {
      throw new Error(
        `Eatmap: EATMAP_SECRET must be set and at least ${EATMAP_SECRET_MIN_LENGTH} characters in production.`,
      );
    }
    if (raw === EATMAP_DEV_SECRET_PLACEHOLDER) {
      throw new Error("Eatmap: EATMAP_SECRET must not use the development placeholder in production.");
    }
    return new TextEncoder().encode(raw);
  }

  const key = raw ?? EATMAP_DEV_SECRET_PLACEHOLDER;
  if (!raw && !warnedDevSecret) {
    console.warn(
      "[eatmap] EATMAP_SECRET is unset; using a development-only default. Never deploy to production without a strong secret.",
    );
    warnedDevSecret = true;
  }
  return new TextEncoder().encode(key);
}

/** 在 Node 服务启动时调用：`next start` 会在接受请求前执行 instrumentation。 */
export function assertEatmapProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.EATMAP_SECRET?.trim();
  if (!secret || secret.length < EATMAP_SECRET_MIN_LENGTH) {
    throw new Error(
      `[eatmap] Refusing to start: set EATMAP_SECRET (>= ${EATMAP_SECRET_MIN_LENGTH} chars). Example: openssl rand -base64 32`,
    );
  }
  if (secret === EATMAP_DEV_SECRET_PLACEHOLDER) {
    throw new Error("[eatmap] Refusing to start: EATMAP_SECRET cannot be the development placeholder in production.");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) {
    throw new Error(
      "[eatmap] Refusing to start: set NEXT_PUBLIC_SITE_URL to the public origin, e.g. https://your-domain.com",
    );
  }

  let url: URL;
  try {
    url = new URL(site);
  } catch {
    throw new Error("[eatmap] Refusing to start: NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  const allowHttp =
    process.env.EATMAP_ALLOW_INSECURE_SITE_URL === "1" ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1";

  if (url.protocol === "http:" && !allowHttp) {
    throw new Error(
      "[eatmap] Refusing to start: NEXT_PUBLIC_SITE_URL must use https:// behind TLS (or set EATMAP_ALLOW_INSECURE_SITE_URL=1 only for non-public staging).",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("[eatmap] Refusing to start: NEXT_PUBLIC_SITE_URL must use http:// or https://.");
  }
}
