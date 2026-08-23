import goodsTables from "@/lib/stores/goods-tables.json";

export const GOODS_KINDS = [
  "gear",
  "tool",
  "clothing",
  "consumable",
  "mount",
  "vehicle",
  "building",
  "siege",
  "service",
] as const;

export type GoodsKind = (typeof GOODS_KINDS)[number];

export type GoodsTableRecord = {
  section_slug: string;
  section_title: string;
  title: string;
  headers: string[];
  rows: string[][];
  footnotes: string[];
  source: { name: string; abbrev: string; edition: string };
};

export type GoodsSectionGroup = {
  id: string;
  label: string;
  filter: string | null;
};

export const GOODS_INTRO =
  "Weights for all the items listed on Goods and Services are their filled weights (except where otherwise designated).";

export const SECTION_ORDER: string[] = [
  "adventuring-gear",
  "light-and-vision",
  "class-tools",
  "clothing",
  "food-drink-lodging",
  "mounts",
  "ships",
  "transportation",
  "buildings",
  "siege-engines",
  "adventuring-items-faerun",
  "gear-for-greeners",
  "frostfell-equipment",
  "frostfell-gear",
  "wastes-gear",
  "vehicles",
  "planar",
  "hired-passage",
  "gear-of-the-waters",
  "gear-for-the-dungeoneer",
  "alternative-keys",
];

export const SECTION_LABELS: Record<string, string> = {
  "adventuring-gear": "Adventuring Gear",
  "light-and-vision": "Light and Vision",
  "class-tools": "Class Tools And Skill Kits",
  "clothing": "Clothing",
  "food-drink-lodging": "Food, Drink, And Lodging",
  "mounts": "Mounts And Related Gear",
  "ships": "Ships",
  "transportation": "Transportation",
  "buildings": "Buildings",
  "siege-engines": "Siege Engines",
  "adventuring-items-faerun": "Adventuring Items of Faerûn",
  "gear-for-greeners": "Gear for Greeners",
  "frostfell-equipment": "Frostfell Equipment",
  "frostfell-gear": "Frostfell Gear",
  "wastes-gear": "Wastes Gear",
  "vehicles": "Vehicles",
  "planar": "Planar",
  "hired-passage": "Hired Passage",
  "gear-of-the-waters": "Gear Of The Waters",
  "gear-for-the-dungeoneer": "Gear for the Dungeoneer",
  "alternative-keys": "Alternative Keys",
};

export const SECTION_FILTER_GROUPS: GoodsSectionGroup[] = [
  { id: "all", label: "All", filter: null },
  { id: "adventuring", label: "Adventuring", filter: "adventuring" },
  { id: "tools", label: "Tools & Kits", filter: "class-tools" },
  { id: "clothing", label: "Clothing", filter: "clothing" },
  { id: "mounts", label: "Mounts", filter: "mounts" },
  { id: "vehicles", label: "Vehicles", filter: "vehicles" },
  { id: "buildings", label: "Buildings", filter: "buildings" },
  { id: "services", label: "Services", filter: "services" },
  { id: "environment", label: "Environment", filter: "environment" },
];

export const VALID_GOODS_FILTERS = new Set(
  SECTION_FILTER_GROUPS.map((group) => group.filter).filter((value): value is string => Boolean(value)),
);

const ENVIRONMENT_SECTIONS = new Set([
  "frostfell-equipment",
  "frostfell-gear",
  "wastes-gear",
  "gear-of-the-waters",
  "gear-for-the-dungeoneer",
  "gear-for-greeners",
  "adventuring-items-faerun",
  "planar",
  "alternative-keys",
]);

export function sectionLabel(slug: string | null | undefined): string {
  if (!slug) return "Goods";
  return SECTION_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function matchesSectionFilter(sectionSlug: string, filter: string | null): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "environment") return ENVIRONMENT_SECTIONS.has(sectionSlug);
  if (filter === "adventuring") {
    return sectionSlug === "adventuring-gear" || sectionSlug === "light-and-vision";
  }
  if (filter === "services") {
    return (
      sectionSlug === "transportation" ||
      sectionSlug === "hired-passage" ||
      sectionSlug === "food-drink-lodging"
    );
  }
  if (filter === "vehicles") {
    return sectionSlug === "vehicles" || sectionSlug === "ships";
  }
  if (filter === "buildings") {
    return sectionSlug === "buildings" || sectionSlug === "siege-engines";
  }
  return sectionSlug === filter;
}

export function itemMatchesQuery(item: GoodsListItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return (
    item.name.toLowerCase().includes(normalizedQuery) ||
    item.category?.toLowerCase().includes(normalizedQuery) ||
    item.kind?.toLowerCase().includes(normalizedQuery) ||
    item.cost?.toLowerCase().includes(normalizedQuery) ||
    item.weight?.toLowerCase().includes(normalizedQuery)
  );
}

export function tableMatchesQuery(table: GoodsTableRecord, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [table.title, ...table.headers, ...table.footnotes, ...table.rows.flat()]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function filterGoodsSections(
  sections: GoodsSectionBlock[],
  query: string,
  filter: string | null,
): GoodsSectionBlock[] {
  const normalizedQuery = query.trim().toLowerCase();
  return sections
    .filter((section) => matchesSectionFilter(section.slug, filter))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => itemMatchesQuery(item, normalizedQuery)),
      tables: section.tables.filter((table) => tableMatchesQuery(table, normalizedQuery)),
    }))
    .filter((section) => section.items.length > 0 || section.tables.length > 0);
}

export function formatKindLabel(kind: string | null): string {
  if (!kind) return "—";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function parseGoodsBrowseParams(
  params: Record<string, string | string[] | undefined>,
): { query: string; filter: string | null } {
  const query = typeof params.q === "string" ? params.q : "";
  const groupRaw = typeof params.group === "string" ? params.group : null;
  const filter = groupRaw && VALID_GOODS_FILTERS.has(groupRaw) ? groupRaw : null;
  return { query, filter };
}

export function buildGoodsBrowseParams(query: string, filter: string | null): URLSearchParams {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  if (filter) params.set("group", filter);
  return params;
}

export function loadGoodsTables(): GoodsTableRecord[] {
  return goodsTables as GoodsTableRecord[];
}

export function tablesForSection(sectionSlug: string): GoodsTableRecord[] {
  return loadGoodsTables().filter((table) => table.section_slug === sectionSlug);
}

export type GoodsListItem = {
  slug: string;
  name: string;
  kind: string | null;
  category: string | null;
  cost: string | null;
  weight: string | null;
  sourceAbbrev: string | null;
  sourceName: string | null;
  hasDescription: boolean;
};

export type GoodsSectionBlock = {
  slug: string;
  label: string;
  sourceAbbrev: string | null;
  sourceName: string | null;
  items: GoodsListItem[];
  tables: GoodsTableRecord[];
};

export function buildSlugByName(items: GoodsListItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[item.name.toLowerCase().replace(/[^a-z0-9]+/g, "")] = item.slug;
  }
  return map;
}

export function groupGoodsSections(
  items: GoodsListItem[],
  tables: GoodsTableRecord[],
): GoodsSectionBlock[] {
  const bySection = new Map<string, GoodsSectionBlock>();

  for (const item of items) {
    const slug = item.category ?? "misc";
    if (!bySection.has(slug)) {
      bySection.set(slug, {
        slug,
        label: sectionLabel(slug),
        sourceAbbrev: item.sourceAbbrev,
        sourceName: item.sourceName,
        items: [],
        tables: [],
      });
    }
    bySection.get(slug)!.items.push(item);
  }

  for (const table of tables) {
    const slug = table.section_slug;
    if (!bySection.has(slug)) {
      bySection.set(slug, {
        slug,
        label: sectionLabel(slug),
        sourceAbbrev: table.source.abbrev,
        sourceName: table.source.name,
        items: [],
        tables: [],
      });
    }
    bySection.get(slug)!.tables.push(table);
  }

  return Array.from(bySection.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function orderedSectionSlugs(presentSlugs: Iterable<string>): string[] {
  const present = new Set(presentSlugs);
  const ordered = SECTION_ORDER.filter((slug) => present.has(slug));
  for (const slug of present) {
    if (!ordered.includes(slug)) ordered.push(slug);
  }
  return ordered;
}
