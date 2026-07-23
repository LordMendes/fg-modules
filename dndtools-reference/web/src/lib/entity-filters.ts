import type { CategoryKey } from "@/lib/categories";
import { DEFAULT_ENTITY_SORT, normalizeEntitySort } from "@/lib/entity-sort";
import { SPELL_COMPONENT_KEYS } from "@/lib/spell-utils";
import type { TableSort } from "@/lib/table-sort";

export type FilterFieldDef = {
  /** URL query param key (also used as MultiSelect id). */
  param: string;
  /** Human-readable label. */
  label: string;
  /** Prisma model field name (or virtual key for special filters). */
  prismaField: string;
  /** How to interpret filter values when building Prisma where clauses. */
  valueType?: "string" | "int" | "boolean" | "enum" | "component" | "relation" | "prestige";
  /** Render as toggle chips instead of a dropdown (e.g. spell components). */
  ui?: "multiselect" | "chips";
};

export type ParsedListFilters = {
  search: string;
  description: string;
  sources: string[];
  editions: string[];
  fields: Record<string, string[]>;
  sort: TableSort | null;
};

export type CategoryFilterOptions = {
  sources: { value: string; label: string }[];
  editions: { value: string; label: string }[];
  fields: Record<string, { value: string; label: string }[]>;
};

/** Categories that expose a description/content text search (new.dndtools.org). */
export const DESCRIPTION_SEARCH_CATEGORIES = new Set<CategoryKey>([
  "spells",
  "feats",
  "classes",
  "items",
  "domains",
  "templates",
  "rules",
]);

export const DESCRIPTION_SEARCH_PLACEHOLDERS: Partial<Record<CategoryKey, string>> = {
  spells: "Search description…",
  feats: "Search description…",
  classes: "Search class feature / description…",
  items: "Search description…",
  domains: "Search granted power…",
  templates: "Search content…",
  rules: "Search description…",
};

/**
 * Per-category filters aligned with https://new.dndtools.org/
 * Common: Name (+ Description where applicable), Source, Edition.
 */
export const CATEGORY_FILTER_FIELDS: Record<CategoryKey, FilterFieldDef[]> = {
  spells: [
    { param: "school", label: "School", prismaField: "school" },
    { param: "class", label: "Class", prismaField: "classLevels", valueType: "relation" },
    { param: "level", label: "Level", prismaField: "minLevel", valueType: "int" },
    {
      param: "components",
      label: "Components",
      prismaField: "components",
      valueType: "component",
      ui: "chips",
    },
  ],
  feats: [{ param: "type", label: "Category", prismaField: "featType" }],
  monsters: [
    { param: "type", label: "Type", prismaField: "creatureType" },
    { param: "subtype", label: "Subtype", prismaField: "subtypes" },
    { param: "cr", label: "CR", prismaField: "challengeRating" },
  ],
  classes: [
    {
      param: "classType",
      label: "Type",
      prismaField: "isPrestige",
      valueType: "prestige",
    },
    { param: "hitDie", label: "Hit Die", prismaField: "hitDie" },
    { param: "skillPoints", label: "Skill Points", prismaField: "skillPoints" },
  ],
  skills: [
    { param: "trainedOnly", label: "Trained Only", prismaField: "trainedOnly", valueType: "boolean" },
    {
      param: "armorCheck",
      label: "Armor Check Penalty",
      prismaField: "armorCheckPenalty",
      valueType: "boolean",
    },
  ],
  races: [
    { param: "size", label: "Size", prismaField: "size" },
    { param: "la", label: "Level Adj.", prismaField: "levelAdjustment" },
  ],
  items: [{ param: "type", label: "Type", prismaField: "itemType" }],
  equipment: [
    { param: "kind", label: "Kind", prismaField: "kind" },
    { param: "category", label: "Category", prismaField: "category" },
  ],
  domains: [],
  deities: [
    { param: "alignment", label: "Alignment", prismaField: "alignment" },
    { param: "pantheon", label: "Pantheon", prismaField: "pantheon" },
  ],
  psionics: [
    { param: "discipline", label: "Discipline", prismaField: "discipline" },
    { param: "class", label: "Class", prismaField: "classLevels", valueType: "relation" },
    { param: "powerPoints", label: "Power Points", prismaField: "powerPoints" },
  ],
  templates: [{ param: "type", label: "Template Type", prismaField: "templateType" }],
  rules: [
    { param: "category", label: "Category", prismaField: "category" },
    { param: "subcategory", label: "Subcategory", prismaField: "subcategory" },
  ],
};

export const SPELL_COMPONENT_FILTER_OPTIONS = SPELL_COMPONENT_KEYS.map((key) => ({
  value: key,
  label:
    key === "V"
      ? "V (Verbal)"
      : key === "S"
        ? "S (Somatic)"
        : key === "M"
          ? "M (Material)"
          : key === "F"
            ? "F (Focus)"
            : key === "DF"
              ? "DF (Divine)"
              : "XP Cost",
}));

export const CLASS_TYPE_FILTER_OPTIONS = [
  { value: "base", label: "Base" },
  { value: "prestige", label: "Prestige" },
];

/** Pinned feat subcategories for quick chip filters (classic dndtools Feat Categories). */
export const FEAT_QUICK_CATEGORY_CHIPS = [{ value: "Flaw", label: "Flaws" }] as const;

export type FilterOption = { value: string; label: string };

/** Merge pinned options first; dynamic DB values fill in the rest without duplicates. */
export function mergePinnedFilterOptions(
  pinned: readonly FilterOption[],
  dynamic: FilterOption[],
): FilterOption[] {
  const byValue = new Map<string, FilterOption>();
  for (const opt of pinned) byValue.set(opt.value, opt);
  for (const opt of dynamic) {
    if (!byValue.has(opt.value)) byValue.set(opt.value, opt);
  }
  return [...byValue.values()];
}

export function isFlawsFeatFilter(filters: ParsedListFilters): boolean {
  return filters.fields.type?.includes("Flaw") ?? false;
}

function splitCsv(raw: string | string[] | undefined): string[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  const values: string[] = [];
  for (const part of parts) {
    for (const token of part.split(",")) {
      const trimmed = token.trim();
      if (trimmed) values.push(trimmed);
    }
  }
  return [...new Set(values)];
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | string[] | undefined {
  return searchParams[key];
}

function readTextParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const raw = getParam(searchParams, key);
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return (raw[0] ?? "").trim();
  return "";
}

/** Parse listing URL search params into a structured filter object. */
export function parseListSearchParams(
  category: CategoryKey,
  searchParams: Record<string, string | string[] | undefined>,
): ParsedListFilters {
  const search = readTextParam(searchParams, "q");
  const description = DESCRIPTION_SEARCH_CATEGORIES.has(category)
    ? readTextParam(searchParams, "description")
    : "";

  const sources = splitCsv(getParam(searchParams, "source"));
  const editions = splitCsv(getParam(searchParams, "edition"));

  const fields: Record<string, string[]> = {};
  for (const def of CATEGORY_FILTER_FIELDS[category]) {
    const values = splitCsv(getParam(searchParams, def.param));
    if (values.length) fields[def.param] = values;
  }

  const sortColumn = readTextParam(searchParams, "sort");
  const sortOrder = readTextParam(searchParams, "order");
  const rawSort: TableSort | null = sortColumn
    ? {
        column: sortColumn,
        direction: sortOrder === "desc" ? "desc" : "asc",
      }
    : null;
  const normalizedSort = normalizeEntitySort(category, rawSort);
  const sort =
    normalizedSort.column === DEFAULT_ENTITY_SORT.column &&
    normalizedSort.direction === DEFAULT_ENTITY_SORT.direction
      ? null
      : normalizedSort;

  return { search, description, sources, editions, fields, sort };
}

/** Build URLSearchParams from current filter state for client navigation. */
export function buildListSearchParams(filters: ParsedListFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.description) params.set("description", filters.description);
  if (filters.sources.length) params.set("source", filters.sources.join(","));
  if (filters.editions.length) params.set("edition", filters.editions.join(","));
  for (const [key, values] of Object.entries(filters.fields)) {
    if (values.length) params.set(key, values.join(","));
  }
  if (filters.sort) {
    params.set("sort", filters.sort.column);
    if (filters.sort.direction === "desc") params.set("order", "desc");
  }
  return params;
}

/** Stable string key used to remount the paginated list when filters change. */
export function serializeFilters(filters: ParsedListFilters): string {
  return buildListSearchParams(filters).toString();
}

export function hasActiveFilters(filters: ParsedListFilters): boolean {
  return (
    Boolean(filters.search) ||
    Boolean(filters.description) ||
    filters.sources.length > 0 ||
    filters.editions.length > 0 ||
    Object.values(filters.fields).some((v) => v.length > 0)
  );
}

/**
 * Normalize UI filter values for Prisma where clauses.
 * Boolean fields use yes/no in the URL; ints are parsed for minLevel etc.
 */
export function normalizeFilterValues(
  def: FilterFieldDef,
  values: string[],
): string[] | number[] | boolean[] {
  const type = def.valueType ?? "string";
  if (type === "int") {
    return values
      .map((v) => Number.parseInt(v, 10))
      .filter((n) => Number.isFinite(n));
  }
  if (type === "boolean") {
    return values.map((v) => {
      const lower = v.toLowerCase();
      if (lower === "yes" || lower === "true" || lower === "1") return true;
      return false;
    });
  }
  return values;
}

/** Display label for boolean filter options. */
export function formatBooleanFilterLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

/** URL value for boolean filter options. */
export function formatBooleanFilterValue(value: boolean): string {
  return value ? "yes" : "no";
}
