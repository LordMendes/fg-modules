import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { listEntities } from "@/lib/entities";
import { PaginatedEntityList } from "@/components/paginated-list";
import type { CategoryKey } from "@/lib/categories";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ source?: string; edition?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isCategoryKey(category)) return {};
  return { title: getCategoryLabel(category) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { source, edition } = await searchParams;
  if (!isCategoryKey(category)) notFound();

  const { items, nextCursor } = await listEntities(category as CategoryKey, {
    sourceAbbrev: source,
    edition,
  });

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link> / {getCategoryLabel(category)}
        {source && (
          <>
            {" "}/ <Link href={`/sources/${source}`}>{source}</Link>
          </>
        )}
      </nav>
      <div className="page-header">
        <h1>{getCategoryLabel(category)}</h1>
        <p>
          {source
            ? `Entries from source ${source}.`
            : `Browse and search the complete ${getCategoryLabel(category).toLowerCase()} compendium.`}
        </p>
      </div>
      <PaginatedEntityList
        category={category as CategoryKey}
        initialItems={items}
        initialCursor={nextCursor}
        sourceAbbrev={source}
        edition={edition}
      />
    </>
  );
}
