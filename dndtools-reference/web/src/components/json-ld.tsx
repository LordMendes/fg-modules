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
