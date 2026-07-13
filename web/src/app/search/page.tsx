import Link from "next/link";
import { searchAll } from "@/lib/entities";
import { getCategoryLabel, isCategoryKey } from "@/lib/categories";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return buildPageMetadata({
    title: query ? `Search: ${query}` : "Search",
    description: "Search the Arcane Archives D&D 3.5 Edition reference.",
    path: "/search",
    noindex: Boolean(query),
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query.length >= 2 ? await searchAll(query, 50) : [];

  return (
    <>
      <div className="page-header">
        <h1>Search</h1>
        {query ? (
          <p>
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <p>Enter at least 2 characters to search.</p>
        )}
      </div>

      <div className="search-results">
        {results.map((r) => (
          <Link
            key={`${r.category}-${r.slug}`}
            href={`/${r.category}/${r.slug}`}
            className="search-result-item"
          >
            <span className="category-tag">
              {isCategoryKey(r.category) ? getCategoryLabel(r.category) : r.category}
            </span>
            <h3>{r.name}</h3>
            {r.snippet && <p className="snippet">{r.snippet}…</p>}
          </Link>
        ))}
      </div>
    </>
  );
}
