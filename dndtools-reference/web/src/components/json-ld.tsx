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

type CollectionPageJsonLdInput = {
  name: string;
  description: string;
  url: string;
  numberOfItems?: number;
};

export function collectionPageJsonLd({
  name,
  description,
  url,
  numberOfItems,
}: CollectionPageJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    ...(numberOfItems !== undefined ? { numberOfItems } : {}),
  };
}

type WebApplicationJsonLdInput = {
  name: string;
  description: string;
  url: string;
};

export function webApplicationJsonLd({
  name,
  description,
  url,
}: WebApplicationJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
  };
}

type BookJsonLdInput = {
  name: string;
  description: string;
  url: string;
  edition?: string;
  numberOfItems?: number;
};

export function bookJsonLd({
  name,
  description,
  url,
  edition,
  numberOfItems,
}: BookJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name,
    description,
    url,
    ...(edition ? { bookEdition: edition } : {}),
    isPartOf: {
      "@type": "CreativeWork",
      name: "Dungeons & Dragons 3.5 Edition",
    },
    ...(numberOfItems !== undefined ? { numberOfItems } : {}),
  };
}

type OrganizationJsonLdInput = {
  name: string;
  url: string;
  description: string;
};

export function organizationJsonLd({
  name,
  url,
  description,
}: OrganizationJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    description,
  };
}

type FaqItem = {
  question: string;
  answer: string;
};

export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function toolPageJsonLd(
  breadcrumbs: BreadcrumbItem[],
  app: WebApplicationJsonLdInput,
  toAbsoluteUrl: (path: string) => string,
  faqs: FaqItem[] = [],
) {
  return [
    absoluteBreadcrumbJsonLd(breadcrumbs, toAbsoluteUrl),
    webApplicationJsonLd(app),
    ...(faqs.length > 0 ? [faqPageJsonLd(faqs)] : []),
  ];
}

type EntityJsonLdInput = {
  name: string;
  description: string;
  url: string;
  termSetName: string;
  termSetUrl: string;
  properties: { name: string; value: string }[];
  source: { name: string; abbrev: string | null; page: number | null };
  dateModified?: string | null;
};

/**
 * DefinedTerm for the entry plus a WebPage that carries dateModified and the
 * source citation. schema.org defines dateModified and citation on CreativeWork,
 * so they sit on the page node rather than on the term.
 */
export function entityJsonLd(input: EntityJsonLdInput): Record<string, unknown>[] {
  const termId = `${input.url}#term`;
  const term: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": termId,
    name: input.name,
    description: input.description,
    url: input.url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: input.termSetName,
      url: input.termSetUrl,
    },
    ...(input.properties.length > 0
      ? {
          additionalProperty: input.properties.map((property) => ({
            "@type": "PropertyValue",
            name: property.name,
            value: property.value,
          })),
        }
      : {}),
  };

  const citation: Record<string, unknown> = {
    "@type": "CreativeWork",
    name: input.source.name,
    ...(input.source.abbrev ? { alternateName: input.source.abbrev } : {}),
    ...(input.source.page ? { pagination: String(input.source.page) } : {}),
  };

  const page: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": input.url,
    url: input.url,
    name: input.name,
    mainEntity: { "@id": termId },
    citation,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };

  return [term, page];
}
