import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/entities";
import { CatalogLetterNav } from "@/components/catalog-letter-nav";
import { JsonLd, absoluteBreadcrumbJsonLd, collectionPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isCategoryKey(category)) return {};
  const label = getCategoryLabel(category);
  return buildPageMetadata({
    title: `${label} catalog`,
    description: `A-Z index of every D&D 3.5 ${label.toLowerCase()} on DnD Helper.`,
    path: `/catalog/${category}`,
  });
}

export default async function CatalogCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isCategoryKey(category)) notFound();

  const categoryKey = category as CategoryKey;
  const label = getCategoryLabel(categoryKey);
  const counts = await getCategoryCounts();
  const count = counts[categoryKey];

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: "Catalog", path: "/catalog" },
              { name: label, path: `/catalog/${category}` },
            ],
            absoluteUrl,
          ),
          collectionPageJsonLd({
            name: `${label} catalog`,
            description: `A-Z index of D&D 3.5 ${label.toLowerCase()}.`,
            url: absoluteUrl(`/catalog/${category}`),
            numberOfItems: count,
          }),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href="/catalog">Catalog</Link> / {label}
      </nav>
      <div className="page-header">
        <h1>{label} catalog</h1>
        <p>
          {count.toLocaleString("en-US")} entries. Choose a letter to browse
          every {label.toLowerCase()} with direct links. For filters and search,
          use the{" "}
          <Link href={`/${category}`}>interactive {label.toLowerCase()} hub</Link>.
        </p>
      </div>
      <CatalogLetterNav category={categoryKey} />
    </>
  );
}
