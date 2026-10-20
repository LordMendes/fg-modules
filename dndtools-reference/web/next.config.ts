import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import {
  dsnIngestOrigin,
  getRelease,
  sentryUploadUrl,
} from "./src/lib/monitoring/config";

const monorepoRoot = path.join(__dirname, "..");
const isDev = process.env.NODE_ENV === "development";
const plausibleOrigin = "https://analytics.lcmendes.com";
const cloudflareInsightsScriptOrigin = "https://static.cloudflareinsights.com";
const cloudflareInsightsConnectOrigin = "https://cloudflareinsights.com";
const r2PublicOrigin =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://pub-f74b850de3e6476e8302459341d9917e.r2.dev";
const sentryIngestOrigin = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? dsnIngestOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN)
  : undefined;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim() ?? "";
const sentryRelease = getRelease();
const configuredSentryUrl = process.env.SENTRY_URL?.trim();
const sentryUrl = sentryUploadUrl(configuredSentryUrl);
if (
  sentryUrl &&
  configuredSentryUrl &&
  sentryUrl !== configuredSentryUrl.replace(/\/$/, "")
) {
  console.warn(
    `[sentry] SENTRY_URL is ${configuredSentryUrl}. Source map upload will use ${sentryUrl}.`,
  );
}

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
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${plausibleOrigin} ${cloudflareInsightsScriptOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${r2PublicOrigin}`,
  "font-src 'self' data:",
  "media-src 'self'",
  `connect-src 'self' ${plausibleOrigin} ${cloudflareInsightsConnectOrigin}${sentryIngestOrigin ? ` ${sentryIngestOrigin}` : ""} ws: wss:`,
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
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease ?? "",
  },
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  // Native addon. scripts/stage-runtime-packages.mjs copies the musl build
  // into the runner image. Next's file tracer does not follow that pnpm path.
  serverExternalPackages: ["sharp"],
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
  async rewrites() {
    if (!isDev) return [];
    const wsPort = process.env.WS_PORT || "3001";
    return [
      {
        source: "/ws/campaign/:campaignId",
        destination: `http://127.0.0.1:${wsPort}/ws/campaign/:campaignId`,
      },
    ];
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

export default withSentryConfig(nextConfig, {
  sentryUrl,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken || undefined,
  telemetry: false,
  ...(sentryRelease ? { release: { name: sentryRelease } } : {}),
  sourcemaps: {
    disable: !sentryAuthToken,
  },
  // A GlitchTip outage or a bad build-time URL must not fail the image build.
  errorHandler(error) {
    console.warn(
      `[sentry] Source map upload failed. The production build will continue. ${error.message}`,
    );
  },
  suppressOnRouterTransitionStartWarning: true,
});
