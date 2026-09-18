import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getSourceByAbbrev, listEntities } from "@/lib/entities";
import { CatalogLetterNav } from "@/components/catalog-letter-nav";
import { JsonLd, absoluteBreadcrumbJsonLd, collectionPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

export const revalidate = 86400;

type Props = {
  params: Promise<{ abbrev: string; category: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { abbrev, category } = await params;
  if (!isCategoryKey(category)) return {};
  const source = await getSourceByAbbrev(abbrev);
  if (!source) return {};
  const label = getCategoryLabel(category);
  const count = source._count[category as keyof typeof source._count] ?? 0;
  if (count === 0) return {};
  return buildPageMetadata({
    title: `${label} from ${abbrev}`,
    description: `Browse ${count.toLocaleString("en-US")} ${label.toLowerCase()} from ${source.name} (${abbrev}) in D&D 3.5.`,
    path: `/sources/${abbrev}/${category}`,
  });
}

export default async function SourceCategoryPage({ params }: Props) {
  const { abbrev, category } = await params;
  if (!isCategoryKey(category)) notFound();

  const source = await getSourceByAbbrev(abbrev);
  if (!source) notFound();

  const categoryKey = category as CategoryKey;
  const label = getCategoryLabel(categoryKey);
  const count = source._count[categoryKey as keyof typeof source._count] ?? 0;
  if (count === 0) notFound();

  const { items } = await listEntities(categoryKey, {
    sourceAbbrev: abbrev,
  });

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: "Sources", path: "/sources" },
              { name: abbrev, path: `/sources/${abbrev}` },
              { name: label, path: `/sources/${abbrev}/${category}` },
            ],
            absoluteUrl,
          ),
          collectionPageJsonLd({
            name: `${label} from ${abbrev}`,
            description: `${label} entries from ${source.name}.`,
            url: absoluteUrl(`/sources/${abbrev}/${category}`),
            numberOfItems: count,
          }),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href="/sources">Sources</Link> /{" "}
        <Link href={`/sources/${abbrev}`}>{abbrev}</Link> / {label}
      </nav>
      <div className="page-header">
        <h1>
          {label} from {source.name}
        </h1>
        <p>
          {count.toLocaleString("en-US")} entries from {abbrev}. Use the{" "}
          <Link href={`/${category}?source=${encodeURIComponent(abbrev)}`}>
            interactive {label.toLowerCase()} hub
          </Link>{" "}
          for filters and search.
        </p>
      </div>
      <CatalogLetterNav category={categoryKey} />
      {items.length > 0 ? (
        <>
          <p className="catalog-hub-nav-label">
            First {items.length.toLocaleString("en-US")} entries (alphabetical):
          </p>
          <ul className="catalog-entity-list">
            {items.map((item) => (
              <li key={item.slug}>
                <Link href={`/${category}/${item.slug}`} className="entity-link">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
