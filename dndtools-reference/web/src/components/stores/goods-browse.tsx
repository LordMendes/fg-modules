"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoodsReferenceTable } from "@/components/stores/goods-reference-table";
import { GoodsToc } from "@/components/stores/goods-toc";
import {
  SECTION_FILTER_GROUPS,
  buildGoodsBrowseParams,
  filterGoodsSections,
  formatKindLabel,
  parseGoodsBrowseParams,
  type GoodsSectionBlock,
} from "@/lib/stores/goods";

export function GoodsBrowse({
  sections,
  slugByName,
}: {
  sections: GoodsSectionBlock[];
  slugByName: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = parseGoodsBrowseParams(Object.fromEntries(searchParams.entries()));

  const [query, setQuery] = useState(initial.query);
  const [filter, setFilter] = useState<string | null>(initial.filter);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const next = parseGoodsBrowseParams(Object.fromEntries(searchParams.entries()));
    setQuery(next.query);
    setFilter(next.filter);
  }, [searchParams]);

  const syncUrl = useCallback(
    (nextQuery: string, nextFilter: string | null) => {
      const params = buildGoodsBrowseParams(nextQuery, nextFilter);
      const qs = params.toString();
      router.replace(qs ? `/stores/goods?${qs}` : "/stores/goods", { scroll: false });
    },
    [router],
  );

  const filteredSections = useMemo(
    () => filterGoodsSections(sections, query, filter),
    [sections, query, filter],
  );

  const totalItems = useMemo(
    () => filteredSections.reduce((sum, section) => sum + section.items.length, 0),
    [filteredSections],
  );

  const tocSections = useMemo(
    () =>
      filteredSections.map((section) => ({
        slug: section.slug,
        label: section.label,
        itemCount: section.items.length,
      })),
    [filteredSections],
  );

  useEffect(() => {
    const sectionEls = filteredSections
      .map((section) => document.getElementById(section.slug))
      .filter((el): el is HTMLElement => Boolean(el));

    if (sectionEls.length === 0) {
      setActiveSection(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0]?.target.id ?? null);
        }
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredSections]);

  function handleQueryChange(value: string) {
    setQuery(value);
    syncUrl(value, filter);
  }

  function handleFilterClick(nextFilter: string | null) {
    const resolved = filter === nextFilter ? null : nextFilter;
    setFilter(resolved);
    syncUrl(query, resolved);
  }

  function clearFilters() {
    setQuery("");
    setFilter(null);
    syncUrl("", null);
  }

  const hasActiveFilters = Boolean(query.trim() || filter);

  return (
    <div className="goods-layout">
      <GoodsToc sections={tocSections} activeSection={activeSection} />

      <div className="goods-main">
        <div className="entity-filters goods-filters">
          <div className="filter-row">
            <label className="filter-search">
              <span className="multi-select-label">Search</span>
              <div className="filter-search-input">
                <Search className="h-4 w-4" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder="Search goods and services…"
                  aria-label="Search goods and services"
                />
              </div>
            </label>

            {query.trim() ? (
              <div className="filter-actions">
                <button
                  type="button"
                  className="filter-clear"
                  onClick={() => handleQueryChange("")}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Clear search
                </button>
              </div>
            ) : null}
          </div>

          <div className="filter-chip-group">
            <span className="multi-select-label">Category</span>
            <div className="filter-chips" role="toolbar" aria-label="Section filters">
              {SECTION_FILTER_GROUPS.map((group) => {
                const isActive =
                  group.filter === null ? filter === null : filter === group.filter;
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`filter-chip${isActive ? " is-active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => handleFilterClick(group.filter)}
                  >
                    {group.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="goods-result-count" aria-live="polite">
            {totalItems.toLocaleString()} {totalItems === 1 ? "item" : "items"} in{" "}
            {filteredSections.length}{" "}
            {filteredSections.length === 1 ? "section" : "sections"}
          </p>
        </div>

        {filteredSections.map((section) => (
          <section key={section.slug} id={section.slug} className="goods-section">
            <header className="goods-section-header">
              <h2>
                {section.label}
                {section.items.length > 0 && (
                  <span className="goods-section-count">
                    {section.items.length} {section.items.length === 1 ? "item" : "items"}
                  </span>
                )}
              </h2>
              {section.sourceAbbrev && (
                <p className="goods-section-source">
                  Source: {section.sourceName}{" "}
                  <Link href={`/sources/${section.sourceAbbrev}`} className="source-badge">
                    {section.sourceAbbrev}
                  </Link>
                </p>
              )}
            </header>

            {section.tables.map((table, tableIndex) => (
              <GoodsReferenceTable
                key={`${section.slug}-${tableIndex}-${table.title}`}
                table={table}
                slugByName={slugByName}
              />
            ))}

            {section.items.length > 0 && (
              <div className="table-wrap">
                <table className="entity-table goods-item-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Cost</th>
                      <th>Weight</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.slug}>
                        <td>
                          <Link href={`/equipment/${item.slug}`} className="entity-link">
                            {item.name}
                          </Link>
                          {item.hasDescription && (
                            <span className="goods-rules-badge" title="Includes rules text">
                              Rules
                            </span>
                          )}
                        </td>
                        <td>{formatKindLabel(item.kind)}</td>
                        <td>{item.cost ?? "—"}</td>
                        <td>{item.weight ?? "—"}</td>
                        <td>
                          {item.sourceAbbrev ? (
                            <Link href={`/sources/${item.sourceAbbrev}`} className="source-badge">
                              {item.sourceAbbrev}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {filteredSections.length === 0 && (
          <div className="goods-empty-state">
            <p>No goods matched your search.</p>
            {hasActiveFilters ? (
              <button type="button" className="filter-clear" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden />
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
