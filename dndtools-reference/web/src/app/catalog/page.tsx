import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/entities";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: "Catalog",
  description:
    "A-Z crawlable indexes for every D&D 3.5 compendium category on DnD Helper.",
  path: "/catalog",
});

export default async function CatalogHubPage() {
  const counts = await getCategoryCounts();

  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Catalog", path: "/catalog" },
          ],
          absoluteUrl,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / Catalog
      </nav>
      <div className="page-header">
        <h1>Catalog</h1>
        <p>
          Browse every compendium entry by letter. Each page lists direct links
          to entity reference pages for crawlers and quick lookup.
        </p>
      </div>
      <section className="category-grid" aria-labelledby="catalog-categories-heading">
        <h2 id="catalog-categories-heading" className="sr-only">
          Categories
        </h2>
        {CATEGORIES.map((category) => (
          <Link
            key={category.key}
            href={`/catalog/${category.key}`}
            className="category-card"
          >
            <div className="icon">{category.icon}</div>
            <h3>{category.label}</h3>
            <span className="count">
              {counts[category.key].toLocaleString("en-US")} entries
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}
