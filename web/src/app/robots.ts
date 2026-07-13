import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/health"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
