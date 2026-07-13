import type { Metadata } from "next";

export const SITE_NAME = "Arcane Archives";

export const DEFAULT_DESCRIPTION =
  "A comprehensive D&D 3.5 Edition reference — spells, feats, monsters, classes, and more.";

export function siteUrl(): string {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
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
};

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noindex = false,
  type = "website",
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const ogTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — D&D 3.5 Reference`;

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
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
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
