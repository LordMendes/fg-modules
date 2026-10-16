import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getEntityDetail } from "@/lib/entities";
import { EntityDetailView } from "@/components/entity-detail";
import { JsonLd, absoluteBreadcrumbJsonLd, entityJsonLd, faqPageJsonLd } from "@/components/json-ld";
import { buildEntityFaqs, buildEntityKeyFacts, buildEntityLead } from "@/lib/entity-lead";
import { absoluteUrl, buildEntityMetadata, truncateMetaDescription } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

/** Entity pages change only on data import — revalidate daily for crawl efficiency. */
export const revalidate = 86400;

// Empty list: nothing is prerendered at build. Each entity is generated on first
// request and then cached (ISR). Without this export, Next treats the dynamic
// segment as fully dynamic and ignores revalidate.
export function generateStaticParams() {
  return [];
}

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) return {};
  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) return {};
  const lead = buildEntityLead(category as CategoryKey, entity);
  return buildEntityMetadata(entity, category as CategoryKey, slug, lead);
}

export default async function EntityDetailPage({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) notFound();

  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) notFound();

  const label = getCategoryLabel(category);
  const categoryKey = category as CategoryKey;
  const lead = buildEntityLead(categoryKey, entity);
  const faqs = buildEntityFaqs(categoryKey, entity);
  const description =
    truncateMetaDescription(
      entity.descriptionText ??
        lead ??
        `${entity.name}: ${label} reference for D&D 3.5 Edition.`,
      300,
    );

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: label, path: `/${category}` },
              { name: entity.name, path: `/${category}/${slug}` },
            ],
            absoluteUrl,
          ),
          ...entityJsonLd({
            name: entity.name,
            description,
            url: absoluteUrl(`/${category}/${slug}`),
            termSetName: label,
            termSetUrl: absoluteUrl(`/${category}`),
            properties: buildEntityKeyFacts(categoryKey, entity),
            source: entity.source,
            dateModified: entity.updatedAt ?? null,
          }),
          ...(faqs.length > 0 ? [faqPageJsonLd(faqs)] : []),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href={`/${category}`}>{label}</Link> /{" "}
        {entity.name}
      </nav>
      <EntityDetailView category={category} entity={entity} />
    </>
  );
}
