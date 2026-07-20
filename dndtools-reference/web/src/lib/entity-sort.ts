import type { CategoryKey } from "@/lib/categories";
import type { TableSort } from "@/lib/table-sort";

export const DEFAULT_ENTITY_SORT: TableSort = { column: "name", direction: "asc" };

/** Sortable column keys shown in entity list tables, per category. */
export const ENTITY_SORT_COLUMNS: Record<CategoryKey, string[]> = {
  spells: ["name", "school", "level", "components", "source", "edition"],
  feats: ["name", "type", "source", "edition"],
  monsters: ["name", "type", "cr", "hd", "source", "edition"],
  classes: ["name", "hitDie", "skillPoints", "source", "edition"],
  skills: ["name", "keyAbility", "trainedOnly", "source", "edition"],
  races: ["name", "type", "la", "source", "edition"],
  items: ["name", "type", "price", "source", "edition"],
  equipment: ["name", "kind", "cost", "source", "edition"],
  domains: ["name", "type", "source", "edition"],
  deities: ["name", "alignment", "pantheon", "source", "edition"],
  psionics: ["name", "discipline", "powerPoints", "source", "edition"],
  templates: ["name", "type", "cr", "source", "edition"],
  rules: ["name", "category", "subcategory", "source", "edition"],
};

type OrderDir = "asc" | "desc";

function dir(sort: TableSort): OrderDir {
  return sort.direction === "desc" ? "desc" : "asc";
}

function withSlug(primary: Record<string, unknown>): Record<string, unknown>[] {
  return [primary, { slug: "asc" }];
}

/** Map UI column keys to Prisma orderBy clauses (slug tiebreaker for stable pagination). */
export function buildEntityOrderBy(
  category: CategoryKey,
  sort: TableSort | null | undefined,
): Record<string, unknown>[] {
  const normalized = normalizeEntitySort(category, sort);
  const direction = dir(normalized);
  const column = normalized.column;

  if (column === "source") {
    return withSlug({ source: { abbrev: direction } });
  }
  if (column === "edition") {
    return withSlug({ source: { edition: direction } });
  }

  const fieldMap: Record<string, Record<string, unknown>> = {
    spells: {
      name: { name: direction },
      school: { school: direction },
      level: { minLevel: direction },
      components: { components: direction },
    },
    feats: {
      name: { name: direction },
      type: { featType: direction },
    },
    monsters: {
      name: { name: direction },
      type: { creatureType: direction },
      cr: { challengeRating: direction },
      hd: { hitDice: direction },
    },
    classes: {
      name: { name: direction },
      hitDie: { hitDie: direction },
      skillPoints: { skillPoints: direction },
    },
    skills: {
      name: { name: direction },
      keyAbility: { keyAbility: direction },
      trainedOnly: { trainedOnly: direction },
    },
    races: {
      name: { name: direction },
      type: { creatureType: direction },
      la: { levelAdjustment: direction },
    },
    items: {
      name: { name: direction },
      type: { itemType: direction },
      price: { price: direction },
    },
    equipment: {
      name: { name: direction },
      kind: { kind: direction },
      cost: { cost: direction },
    },
    domains: {
      name: { name: direction },
      type: { domainType: direction },
    },
    deities: {
      name: { name: direction },
      alignment: { alignment: direction },
      pantheon: { pantheon: direction },
    },
    psionics: {
      name: { name: direction },
      discipline: { discipline: direction },
      powerPoints: { powerPoints: direction },
    },
    templates: {
      name: { name: direction },
      type: { templateType: direction },
      cr: { crChange: direction },
    },
    rules: {
      name: { name: direction },
      category: { category: direction },
      subcategory: { subcategory: direction },
    },
  };

  const primary = (fieldMap[category]?.[column] ?? { name: direction }) as Record<
    string,
    unknown
  >;
  return withSlug(primary);
}

export function normalizeEntitySort(
  category: CategoryKey,
  sort: TableSort | null | undefined,
): TableSort {
  if (!sort) return DEFAULT_ENTITY_SORT;
  const allowed = ENTITY_SORT_COLUMNS[category];
  if (!allowed.includes(sort.column)) return DEFAULT_ENTITY_SORT;
  return {
    column: sort.column,
    direction: sort.direction === "desc" ? "desc" : "asc",
  };
}
