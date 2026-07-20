import type { MetadataRoute } from "next";
import { sitemapChunkUrls } from "@/lib/sitemap";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Thin/duplicate URLs are handled via per-page robots noindex
      // (filtered category lists and /search?q=…). Keep crawl of hubs.
      disallow: ["/api/", "/health"],
    },
    // generateSitemaps serves chunks at /sitemap/[id].xml. Listing each chunk
    // here avoids a root /sitemap.xml index (conflicts with [category]).
    sitemap: sitemapChunkUrls(base),
  };
}
