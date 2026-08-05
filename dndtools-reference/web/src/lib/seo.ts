import type { Metadata } from "next";
import type { CategoryKey } from "@/lib/categories";
import { getCategoryLabel } from "@/lib/categories";

export const SITE_NAME = "DnD Helper";

export const DEFAULT_DESCRIPTION =
  "A comprehensive D&D 3.5 Edition reference — spells, feats, monsters, classes, and more.";

const CATEGORY_SINGULAR: Record<CategoryKey, string> = {
  spells: "Spell",
  feats: "Feat",
  monsters: "Monster",
  classes: "Class",
  skills: "Skill",
  races: "Race",
  items: "Magic Item",
  equipment: "Equipment",
  domains: "Domain",
  deities: "Deity",
  psionics: "Psionic Power",
  templates: "Template",
  rules: "Rule",
};

export type EntityMetaInput = {
  name: string;
  descriptionText: string | null;
  statLine?: string | null;
  source: { abbrev: string | null };
  fields: Record<string, string | null>;
};

function normalizeSiteUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/$/, "");
  if (!trimmed) return "http://localhost:3000";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function siteUrl(): string {
  const raw =
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return normalizeSiteUrl(raw);
}

export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type BuildPageMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  type?: "website" | "article";
  /** Override OG image alt; defaults to ogTitle. */
  imageAlt?: string;
};

function ogImageUrl(path: string): string {
  const normalized = path === "/" ? "" : path.replace(/\/$/, "");
  return absoluteUrl(`${normalized}/opengraph-image`);
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noindex = false,
  type = "website",
  imageAlt,
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const ogTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — D&D 3.5 Reference`;
  const alt = imageAlt ?? ogTitle;
  const image = ogImageUrl(canonical);

  return {
    ...(title !== undefined ? { title } : {}),
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          alt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image],
    },
  };
}

/** Trim and truncate meta descriptions at a word boundary. */
export function truncateMetaDescription(text: string, max = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  const slice = normalized.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const truncated =
    lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice.trimEnd();
  return `${truncated}…`;
}

function sourceSuffix(abbrev: string | null): string {
  return abbrev ? ` from ${abbrev}` : "";
}

function buildEntityDescriptionFallback(
  entity: EntityMetaInput,
  category: CategoryKey,
): string {
  const label = getCategoryLabel(category);
  const fromSource = sourceSuffix(entity.source.abbrev);

  if (entity.statLine) {
    return truncateMetaDescription(
      `${entity.statLine}${fromSource}. D&D 3.5 ${label.toLowerCase()} reference.`,
    );
  }

  switch (category) {
    case "monsters": {
      const cr = entity.fields["Challenge Rating"];
      const type = entity.fields["Type"];
      if (cr || type) {
        const parts = [cr ? `CR ${cr}` : null, type].filter(Boolean).join(" ");
        return truncateMetaDescription(
          `${parts}${fromSource}. D&D 3.5 monster reference.`,
        );
      }
      break;
    }
    case "spells": {
      const level = entity.fields["Level"];
      if (level) {
        return truncateMetaDescription(
          `Level ${level} spell${fromSource}. D&D 3.5 spell reference.`,
        );
      }
      break;
    }
    case "feats": {
      const type = entity.fields["Type"];
      if (type) {
        return truncateMetaDescription(
          `${type} feat${fromSource}. D&D 3.5 feat reference.`,
        );
      }
      break;
    }
    default:
      break;
  }

  return truncateMetaDescription(
    `${entity.name} — ${label} reference for D&D 3.5 Edition${fromSource}.`,
  );
}

export function buildEntityMetadata(
  entity: EntityMetaInput,
  category: CategoryKey,
  slug: string,
): Metadata {
  const singular = CATEGORY_SINGULAR[category];
  const title = `${entity.name} (${singular})`;
  const description = entity.descriptionText
    ? truncateMetaDescription(
        entity.source.abbrev
          ? `${entity.descriptionText} — D&D 3.5 reference from ${entity.source.abbrev}.`
          : entity.descriptionText,
      )
    : buildEntityDescriptionFallback(entity, category);

  return buildPageMetadata({
    title,
    description,
    path: `/${category}/${slug}`,
    type: "article",
    imageAlt: `${entity.name} — D&D 3.5 ${singular}`,
  });
}

export function buildCategoryHubDescription(
  label: string,
  count: number,
): string {
  return `Browse ${count.toLocaleString("en-US")} ${label.toLowerCase()} from every D&D 3.5 sourcebook.`;
}

/** True when the request has any non-empty query string values. */
export function hasQueryParams(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  return Object.values(searchParams).some((value) => {
    if (Array.isArray(value)) return value.some((v) => Boolean(v));
    return Boolean(value);
  });
}
