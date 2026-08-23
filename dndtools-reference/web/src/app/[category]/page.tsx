import { notFound } from "next/navigation";
import Link from "next/link";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getCategoryFilterOptions, getCategoryCounts, listEntities } from "@/lib/entities";
import {
  hasActiveFilters,
  isFlawsFeatFilter,
  parseListSearchParams,
  serializeFilters,
} from "@/lib/entity-filters";
import {
  equipmentPageIntro,
  equipmentPageTitle,
  parseEquipmentView,
} from "@/lib/equipment-display";
import { PaginatedEntityList } from "@/components/paginated-list";
import { EntityListFilters } from "@/components/entity-list-filters";
import { EquipmentKindTabs } from "@/components/equipment-kind-tabs";
import { JsonLd, absoluteBreadcrumbJsonLd, collectionPageJsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  buildCategoryHubDescription,
  buildPageMetadata,
  hasQueryParams,
} from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolvePageTitle(category: CategoryKey, filters: ReturnType<typeof parseListSearchParams>) {
  if (category === "feats" && isFlawsFeatFilter(filters)) return "Flaws";
  if (category === "equipment") return equipmentPageTitle(parseEquipmentView(filters.fields));
  return getCategoryLabel(category);
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { category } = await params;
  const rawParams = await searchParams;
  if (!isCategoryKey(category)) return {};
  const categoryKey = category as CategoryKey;
  const filters = parseListSearchParams(categoryKey, rawParams);
  const label = resolvePageTitle(categoryKey, filters);
  const counts = await getCategoryCounts();
  const count = counts[categoryKey];
  return buildPageMetadata({
    title: label,
    description: buildCategoryHubDescription(label, count),
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
  const equipmentView = categoryKey === "equipment" ? parseEquipmentView(filters.fields) : "all";
  const [listResult, filterOptions, counts] = await Promise.all([
    listEntities(categoryKey, {
      search: filters.search || undefined,
      description: filters.description || undefined,
      sources: filters.sources,
      editions: filters.editions,
      fields: filters.fields,
      ranges: filters.ranges,
      sort: filters.sort,
    }),
    getCategoryFilterOptions(categoryKey, { equipmentView }),
    getCategoryCounts(),
  ]);

  const { items, nextCursor } = listResult;
  const flawsView = categoryKey === "feats" && isFlawsFeatFilter(filters);
  const pageTitle = resolvePageTitle(categoryKey, filters);
  const categoryCount = counts[categoryKey];
  const hubDescription = buildCategoryHubDescription(pageTitle, categoryCount);
  const selectedSourceName =
    filters.sources.length === 1
      ? (filterOptions.sources.find((s) => s.value === filters.sources[0])?.label ??
        filters.sources[0])
      : null;
  const sourceLabel =
    selectedSourceName ??
    (filters.sources.length > 1 ? `${filters.sources.length} sources` : null);

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    {
      name: pageTitle,
      path:
        flawsView
          ? "/feats?type=Flaw"
          : categoryKey === "equipment" && equipmentView !== "all"
            ? `/equipment?kind=${equipmentView}`
            : `/${category}`,
    },
  ];
  if (filters.sources.length === 1) {
    breadcrumbItems.push({
      name: selectedSourceName ?? filters.sources[0],
      path: `/sources/${filters.sources[0]}`,
    });
  }

  const pageIntro =
    categoryKey === "equipment" && !hasActiveFilters(filters)
      ? equipmentPageIntro(equipmentView)
      : flawsView
        ? "Character flaws from Unearthed Arcana and other sources."
        : hasActiveFilters(filters)
          ? sourceLabel
            ? `Filtered results${filters.sources.length === 1 ? ` from ${sourceLabel}` : ` across ${sourceLabel}`}.`
            : "Filtered results for this category."
          : `Browse and search the complete ${getCategoryLabel(category).toLowerCase()} compendium.`;

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(breadcrumbItems, absoluteUrl),
          ...(!hasQueryParams(rawParams)
            ? [
                collectionPageJsonLd({
                  name: pageTitle,
                  description: hubDescription,
                  url: absoluteUrl(`/${category}`),
                  numberOfItems: categoryCount,
                }),
              ]
            : []),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / {pageTitle}
        {filters.sources.length === 1 && (
          <>
            {" "}/{" "}
            <Link href={`/sources/${filters.sources[0]}`}>
              {selectedSourceName ?? filters.sources[0]}
            </Link>
          </>
        )}
      </nav>
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <p>
          {pageIntro}
          {categoryKey === "equipment" && !hasActiveFilters(filters) ? (
            <>
              {" "}
              See also{" "}
              <Link href="/items">Magic Items</Link> and{" "}
              <Link href="/stores/goods">Goods &amp; Services</Link>.
            </>
          ) : null}
        </p>
      </div>
      {categoryKey === "equipment" ? <EquipmentKindTabs initialFilters={filters} /> : null}
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
        ranges={filters.ranges}
        sort={filters.sort}
        equipmentView={equipmentView}
      />
    </>
  );
}
