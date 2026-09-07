import path from "path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "..");
const isDev = process.env.NODE_ENV === "development";
const plausibleOrigin = "http://analytics.lcmendes.com";
const r2PublicOrigin =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://pub-f74b850de3e6476e8302459341d9917e.r2.dev";

/**
 * Security headers for Lighthouse Best Practices (CSP, clickjacking, COOP, HSTS).
 * Trusted Types omitted — they break React/Next HTML sinks without a larger refactor.
 *
 * HSTS is only attached when the request is HTTPS (via x-forwarded-proto), so local
 * HTTP audits do not emit a confusing HSTS header on an insecure origin.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // unsafe-eval kept in dev for Next HMR.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${plausibleOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${r2PublicOrigin}`,
  "font-src 'self' data:",
  "media-src 'self'",
  `connect-src 'self' ${plausibleOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .join("; ")
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  transpilePackages: ["@3d-dice/dice-box-threejs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  turbopack: {
    root: monorepoRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "https" }],
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
