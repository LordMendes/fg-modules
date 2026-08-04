import { notFound } from "next/navigation";
import Link from "next/link";
import { getSourceByAbbrev } from "@/lib/entities";
import { CATEGORIES } from "@/lib/categories";
import { JsonLd, absoluteBreadcrumbJsonLd, bookJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata, truncateMetaDescription } from "@/lib/seo";

type Props = {
  params: Promise<{ abbrev: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { abbrev } = await params;
  const source = await getSourceByAbbrev(abbrev);
  if (!source) return {};
  const description = truncateMetaDescription(
    `Browse D&D 3.5 Edition entries from ${source.name} (${abbrev}), ${source.edition}.`,
  );
  return buildPageMetadata({
    title: `${source.name} (${abbrev})`,
    description,
    path: `/sources/${abbrev}`,
  });
}

export default async function SourceDetailPage({ params }: Props) {
  const { abbrev } = await params;
  const source = await getSourceByAbbrev(abbrev);
  if (!source) notFound();

  const counts = source._count;
  const totalEntries = Object.values(counts).reduce((a, b) => a + b, 0);
  const description = truncateMetaDescription(
    `Browse D&D 3.5 Edition entries from ${source.name} (${abbrev}), ${source.edition}.`,
  );
  const categoriesWithContent = CATEGORIES.filter((c) => {
    const key = c.key as keyof typeof counts;
    return counts[key] > 0;
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
            ],
            absoluteUrl,
          ),
          bookJsonLd({
            name: source.name,
            description,
            url: absoluteUrl(`/sources/${abbrev}`),
            edition: source.edition,
            numberOfItems: totalEntries,
          }),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/sources">Sources</Link> / {abbrev}
      </nav>
      <div className="page-header">
        <h1>{source.name}</h1>
        <p>
          <span className="edition-chip">{source.edition}</span>
          {" · "}
          {Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()} total entries
        </p>
      </div>

      <div className="category-grid">
        {categoriesWithContent.map((cat) => {
          const count = counts[cat.key as keyof typeof counts];
          return (
            <Link
              key={cat.key}
              href={`/${cat.key}?source=${abbrev}`}
              className="category-card"
            >
              <div className="icon">{cat.icon}</div>
              <h3>{cat.label}</h3>
              <span className="count">{count.toLocaleString()} entries</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
