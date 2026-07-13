import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getEntityDetail } from "@/lib/entities";
import { EntityDetailView } from "@/components/entity-detail";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

/** Entity pages change only on data import — revalidate daily for crawl efficiency. */
export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) return {};
  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) return {};
  const label = getCategoryLabel(category);
  const description =
    entity.descriptionText?.slice(0, 160) ??
    `${entity.name} — ${label} reference for D&D 3.5 Edition.`;
  return buildPageMetadata({
    title: entity.name,
    description,
    path: `/${category}/${slug}`,
    type: "article",
  });
}

export default async function EntityDetailPage({ params }: Props) {
  const { category, slug } = await params;
  if (!isCategoryKey(category)) notFound();

  const entity = await getEntityDetail(category as CategoryKey, slug);
  if (!entity) notFound();

  const label = getCategoryLabel(category);
  const description =
    entity.descriptionText?.slice(0, 300) ??
    `${entity.name} — ${label} reference for D&D 3.5 Edition.`;

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
          {
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: entity.name,
            description,
            url: absoluteUrl(`/${category}/${slug}`),
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              name: label,
              url: absoluteUrl(`/${category}`),
            },
          },
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
