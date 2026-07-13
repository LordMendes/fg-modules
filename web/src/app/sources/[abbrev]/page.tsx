import { notFound } from "next/navigation";
import Link from "next/link";
import { getSourceByAbbrev } from "@/lib/entities";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  params: Promise<{ abbrev: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { abbrev } = await params;
  const source = await getSourceByAbbrev(abbrev);
  if (!source) return {};
  return { title: `${source.name} (${abbrev})` };
}

export default async function SourceDetailPage({ params }: Props) {
  const { abbrev } = await params;
  const source = await getSourceByAbbrev(abbrev);
  if (!source) notFound();

  const counts = source._count;
  const categoriesWithContent = CATEGORIES.filter((c) => {
    const key = c.key as keyof typeof counts;
    return counts[key] > 0;
  });

  return (
    <>
      <nav className="breadcrumb">
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
