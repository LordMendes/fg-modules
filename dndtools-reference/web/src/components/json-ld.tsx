type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function serializeJsonLd(data: JsonLdProps["data"]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** JSON-LD for SEO; rendered from server components only. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
      suppressHydrationWarning
    />
  );
}

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

/** Build BreadcrumbList with absolute item URLs when path is provided. */
export function absoluteBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  toAbsoluteUrl: (path: string) => string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: toAbsoluteUrl(item.path) } : {}),
    })),
  };
}
