"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MultiSelect } from "@/components/multi-select";
import {
  CATEGORY_FILTER_FIELDS,
  DESCRIPTION_SEARCH_CATEGORIES,
  DESCRIPTION_SEARCH_PLACEHOLDERS,
  FEAT_QUICK_CATEGORY_CHIPS,
  buildListSearchParams,
  hasActiveFilters,
  type CategoryFilterOptions,
  type ParsedListFilters,
} from "@/lib/entity-filters";
import type { CategoryKey } from "@/lib/categories";
import { getCategoryLabel } from "@/lib/categories";

export function EntityListFilters({
  category,
  options,
  initialFilters,
}: {
  category: CategoryKey;
  options: CategoryFilterOptions;
  initialFilters: ParsedListFilters;
}) {
  const router = useRouter();
  const fieldDefs = CATEGORY_FILTER_FIELDS[category];
  const showDescription = DESCRIPTION_SEARCH_CATEGORIES.has(category);

  const [search, setSearch] = useState(initialFilters.search);
  const [description, setDescription] = useState(initialFilters.description);
  const [sources, setSources] = useState(initialFilters.sources);
  const [editions, setEditions] = useState(initialFilters.editions);
  const [fields, setFields] = useState<Record<string, string[]>>(() => {
    const next: Record<string, string[]> = {};
    for (const def of fieldDefs) {
      next[def.param] = initialFilters.fields[def.param] ?? [];
    }
    return next;
  });

  const draftFilters: ParsedListFilters = useMemo(
    () => ({
      search: search.trim(),
      description: description.trim(),
      sources,
      editions,
      fields,
      sort: initialFilters.sort,
    }),
    [search, description, sources, editions, fields, initialFilters.sort],
  );

  const active = hasActiveFilters(draftFilters) || hasActiveFilters(initialFilters);

  function applyFilters(next: ParsedListFilters) {
    const params = buildListSearchParams(next);
    const qs = params.toString();
    router.push(qs ? `/${category}?${qs}` : `/${category}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters(draftFilters);
  }

  function handleClear() {
    setSearch("");
    setDescription("");
    setSources([]);
    setEditions([]);
    const cleared: Record<string, string[]> = {};
    for (const def of fieldDefs) cleared[def.param] = [];
    setFields(cleared);
    applyFilters({
      search: "",
      description: "",
      sources: [],
      editions: [],
      fields: cleared,
      sort: initialFilters.sort,
    });
  }

  function setField(param: string, values: string[]) {
    setFields((prev) => ({ ...prev, [param]: values }));
  }

  function toggleChip(param: string, value: string) {
    const current = fields[param] ?? [];
    if (current.includes(value)) {
      setField(
        param,
        current.filter((v) => v !== value),
      );
    } else {
      setField(param, [...current, value]);
    }
  }

  return (
    <form className="entity-filters" onSubmit={handleSubmit}>
      <div className="filter-row">
        <label className="filter-search">
          <span className="multi-select-label">Name</span>
          <div className="filter-search-input">
            <Search className="h-4 w-4" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${getCategoryLabel(category).toLowerCase()}…`}
              aria-label="Search by name"
            />
          </div>
        </label>

        {showDescription ? (
          <label className="filter-search">
            <span className="multi-select-label">Description</span>
            <div className="filter-search-input">
              <Search className="h-4 w-4" aria-hidden />
              <input
                type="search"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={DESCRIPTION_SEARCH_PLACEHOLDERS[category] ?? "Search description…"}
                aria-label="Search description"
              />
            </div>
          </label>
        ) : null}

        <MultiSelect
          label="Source"
          options={options.sources}
          value={sources}
          onChange={setSources}
        />

        <MultiSelect
          label="Edition"
          options={options.editions}
          value={editions}
          onChange={setEditions}
          searchable={false}
        />

        {category === "feats" ? (
          <div className="filter-chip-group">
            <span className="multi-select-label">Flaws</span>
            <div className="filter-chips">
              {FEAT_QUICK_CATEGORY_CHIPS.map((opt) => {
                const selected = fields.type ?? [];
                const isOn = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`filter-chip${isOn ? " is-active" : ""}`}
                    aria-pressed={isOn}
                    onClick={() => toggleChip("type", opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {fieldDefs.map((def) => {
          if (def.ui === "chips") {
            const selected = fields[def.param] ?? [];
            const chipOptions = options.fields[def.param] ?? [];
            return (
              <div key={def.param} className="filter-chip-group">
                <span className="multi-select-label">{def.label}</span>
                <div className="filter-chips">
                  {chipOptions.map((opt) => {
                    const isOn = selected.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`filter-chip${isOn ? " is-active" : ""}`}
                        aria-pressed={isOn}
                        onClick={() => toggleChip(def.param, opt.value)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <MultiSelect
              key={def.param}
              label={def.label}
              options={options.fields[def.param] ?? []}
              value={fields[def.param] ?? []}
              onChange={(next) => setField(def.param, next)}
              searchable={(options.fields[def.param] ?? []).length > 8}
            />
          );
        })}
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn-secondary filter-apply">
          Apply filters
        </button>
        {active ? (
          <button type="button" className="filter-clear" onClick={handleClear}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>
    </form>
  );
}
