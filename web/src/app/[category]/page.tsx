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
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata, hasQueryParams } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { category } = await params;
  const rawParams = await searchParams;
  if (!isCategoryKey(category)) return {};
  const label = getCategoryLabel(category);
  return buildPageMetadata({
    title: label,
    description: `Browse and search the complete ${label.toLowerCase()} compendium for D&D 3.5 Edition.`,
    path: `/${category}`,
    noindex: hasQueryParams(rawParams),
  });
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
      sort: filters.sort,
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

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: getCategoryLabel(category), path: `/${category}` },
  ];
  if (filters.sources.length === 1) {
    breadcrumbItems.push({
      name: filters.sources[0],
      path: `/sources/${filters.sources[0]}`,
    });
  }

  return (
    <>
      <JsonLd data={absoluteBreadcrumbJsonLd(breadcrumbItems, absoluteUrl)} />
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
        sort={filters.sort}
      />
    </>
  );
}
