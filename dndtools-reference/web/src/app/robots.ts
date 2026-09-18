import type { MetadataRoute } from "next";
import { sitemapChunkUrls } from "@/lib/sitemap";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const CRAWL_DISALLOW = ["/api/", "/health", "/login", "/register", "/profile"];

const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  const defaultRule = {
    userAgent: "*",
    allow: "/",
    // Thin/duplicate URLs are handled via per-page robots noindex
    // (filtered category lists and /search?q=…). Keep crawl of hubs.
    disallow: CRAWL_DISALLOW,
  };

  const aiRules = AI_CRAWLER_AGENTS.map((userAgent) => ({
    userAgent,
    allow: "/",
    disallow: CRAWL_DISALLOW,
  }));

  return {
    rules: [defaultRule, ...aiRules],
    // generateSitemaps serves chunks at /sitemap/[id].xml. Listing each chunk
    // here avoids a root /sitemap.xml index (conflicts with [category]).
    sitemap: sitemapChunkUrls(base),
  };
}
