import type { MetadataRoute } from "next";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { TOOLS } from "@/lib/tools";
import {
  listEntitySlugsForSitemap,
  listSourceAbbrevsForSitemap,
} from "@/lib/entities";
import {
  HUB_SITEMAP_ID,
  SOURCE_SITEMAP_ID,
  SITEMAP_COUNT,
} from "@/lib/sitemap";
import { CATALOG_LETTERS, catalogLetterHref } from "@/lib/catalog";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Campaign tables need login and are noindex, so they stay out of the sitemap. */
const SITEMAP_TOOLS = TOOLS.filter((tool) => tool.key !== "campaign");

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
    // Hub pages have no real modification date, so lastModified is omitted
    // instead of stamping every URL with the request time.
    const categoryUrls = CATEGORIES.map((c) => ({
      url: `${base}/${c.key}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [
      {
        url: base,
        changeFrequency: "weekly",
        priority: 1,
      },
      {
        url: `${base}/sources`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${base}/tools`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${base}/stores/goods`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...SITEMAP_TOOLS.map((tool) => ({
        url: `${base}${tool.href}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      {
        url: `${base}/search`,
        changeFrequency: "monthly",
        priority: 0.3,
      },
      {
        url: `${base}/privacy`,
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${base}/about`,
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${base}/changelog`,
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${base}/catalog`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...CATEGORIES.flatMap((category) => [
        {
          url: `${base}/catalog/${category.key}`,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
        ...CATALOG_LETTERS.map((letter) => ({
          url: `${base}${catalogLetterHref(category.key, letter)}`,
          changeFrequency: "monthly" as const,
          priority: 0.5,
        })),
      ]),
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
