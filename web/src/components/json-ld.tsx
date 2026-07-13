type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
