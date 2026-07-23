import type { MetadataRoute } from "next";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import {
  listEntitySlugsForSitemap,
  listSourceAbbrevsForSitemap,
} from "@/lib/entities";
import {
  HUB_SITEMAP_ID,
  SOURCE_SITEMAP_ID,
  SITEMAP_COUNT,
} from "@/lib/sitemap";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_COUNT }, (_, id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const base = siteUrl();
  const now = new Date();

  if (id === HUB_SITEMAP_ID) {
    const categoryUrls = CATEGORIES.map((c) => ({
      url: `${base}/${c.key}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [
      {
        url: base,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: `${base}/sources`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${base}/search`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.3,
      },
      {
        url: `${base}/flaws`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...categoryUrls,
    ];
  }

  if (id === SOURCE_SITEMAP_ID) {
    const sources = await listSourceAbbrevsForSitemap();
    return sources.map((s) => ({
      url: `${base}/sources/${encodeURIComponent(s.abbrev)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  }

  const categoryIndex = id - 1;
  const category = CATEGORY_KEYS[categoryIndex];
  if (!category) return [];

  const entries = await listEntitySlugsForSitemap(category);
  return entries.map((entry) => ({
    url: `${base}/${category}/${encodeURIComponent(entry.slug)}`,
    lastModified: entry.lastModified ?? now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}
