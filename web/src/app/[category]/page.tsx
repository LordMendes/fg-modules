import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getCategoryFilterOptions, listEntities } from "@/lib/entities";
import {
  hasActiveFilters,
  parseListSearchParams,
  serializeFilters,
} from "@/lib/entity-filters";
import { PaginatedEntityList } from "@/components/paginated-list";
import { EntityListFilters } from "@/components/entity-list-filters";
import type { CategoryKey } from "@/lib/categories";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isCategoryKey(category)) return {};
  return { title: getCategoryLabel(category) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const rawParams = await searchParams;
  if (!isCategoryKey(category)) notFound();

  const categoryKey = category as CategoryKey;
  const filters = parseListSearchParams(categoryKey, rawParams);
  const [listResult, filterOptions] = await Promise.all([
    listEntities(categoryKey, {
      search: filters.search || undefined,
      description: filters.description || undefined,
      sources: filters.sources,
      editions: filters.editions,
      fields: filters.fields,
    }),
    getCategoryFilterOptions(categoryKey),
  ]);

  const { items, nextCursor } = listResult;
  const sourceLabel =
    filters.sources.length === 1
      ? filters.sources[0]
      : filters.sources.length > 1
        ? `${filters.sources.length} sources`
        : null;

  return (
    <>
      <nav className="breadcrumb">
        <Link href="/">Home</Link> / {getCategoryLabel(category)}
        {filters.sources.length === 1 && (
          <>
            {" "}/{" "}
            <Link href={`/sources/${filters.sources[0]}`}>{filters.sources[0]}</Link>
          </>
        )}
      </nav>
      <div className="page-header">
        <h1>{getCategoryLabel(category)}</h1>
        <p>
          {hasActiveFilters(filters)
            ? sourceLabel
              ? `Filtered results${filters.sources.length === 1 ? ` from ${sourceLabel}` : ` across ${sourceLabel}`}.`
              : "Filtered results for this category."
            : `Browse and search the complete ${getCategoryLabel(category).toLowerCase()} compendium.`}
        </p>
      </div>
      <EntityListFilters
        key={serializeFilters(filters)}
        category={categoryKey}
        options={filterOptions}
        initialFilters={filters}
      />
      <PaginatedEntityList
        key={`list-${serializeFilters(filters)}`}
        category={categoryKey}
        initialItems={items}
        initialCursor={nextCursor}
        search={filters.search || undefined}
        description={filters.description || undefined}
        sources={filters.sources}
        editions={filters.editions}
        fields={filters.fields}
      />
    </>
  );
}
