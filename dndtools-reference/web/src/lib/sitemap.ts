import { CATEGORY_KEYS } from "@/lib/categories";

/** Sitemap 0 = hubs; 1..N = categories; last = sources. */
export const HUB_SITEMAP_ID = 0;
export const SOURCE_SITEMAP_ID = CATEGORY_KEYS.length + 1;
export const SITEMAP_COUNT = SOURCE_SITEMAP_ID + 1;

export function sitemapChunkUrls(base: string): string[] {
  return Array.from(
    { length: SITEMAP_COUNT },
    (_, id) => `${base}/sitemap/${id}.xml`,
  );
}
