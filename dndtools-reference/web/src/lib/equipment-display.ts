import type { ParsedListFilters } from "@/lib/entity-filters";

export type EquipmentView = "all" | "weapon" | "armor";

export type EquipmentListRow = {
  kind: string | null;
  category: string | null;
  cost: string | null;
  indexData: unknown;
  descriptionText: string | null;
};

export type EquipmentTableColumn = {
  key: string;
  label: string;
  sortable?: boolean;
  title?: string;
};

export const EQUIPMENT_VIEW_TABS: { value: EquipmentView; label: string; kindParam: string | null }[] = [
  { value: "weapon", label: "Weapons", kindParam: "weapon" },
  { value: "armor", label: "Armor & Shields", kindParam: "armor" },
  { value: "all", label: "All", kindParam: null },
];

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  S: "Slashing",
  P: "Piercing",
  B: "Bludgeoning",
};

function readIndexString(index: Record<string, unknown>, key: string): string | null {
  const value = index[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseEquipmentView(fields: Record<string, string[]> | undefined): EquipmentView {
  const kinds = fields?.kind ?? [];
  if (kinds.length === 1 && kinds[0] === "weapon") return "weapon";
  if (kinds.length === 1 && kinds[0] === "armor") return "armor";
  return "all";
}

/** Expand armor tab to include shields in Prisma where clauses. */
export function resolveEquipmentKindFilter(
  fields: Record<string, string[]> | undefined,
): string[] | null {
  const kinds = fields?.kind;
  if (!kinds?.length) return null;
  const expanded = new Set<string>();
  for (const kind of kinds) {
    if (kind === "armor") {
      expanded.add("armor");
      expanded.add("shield");
    } else {
      expanded.add(kind);
    }
  }
  return [...expanded];
}

export function equipmentPageTitle(view: EquipmentView): string {
  if (view === "weapon") return "Weapons";
  if (view === "armor") return "Armor & Shields";
  return "Equipment";
}

export function equipmentPageIntro(view: EquipmentView): string {
  if (view === "weapon") {
    return "Browse mundane weapons with damage, critical, and damage type.";
  }
  if (view === "armor") {
    return "Browse armor and shields with AC, max Dex, speed, and armor check penalty.";
  }
  return "Browse weapons, armor, and shields from the 3.5 rules compendium.";
}

export function formatDamageType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (DAMAGE_TYPE_LABELS[upper]) return DAMAGE_TYPE_LABELS[upper];
  return trimmed;
}

export function formatSpeedFeet(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/ft\.?$/i.test(trimmed)) return trimmed;
  return `${trimmed} ft.`;
}

export function formatKindLabel(kind: string | null | undefined): string | null {
  if (!kind) return null;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function formatCategoryLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function equipmentDescriptionSnippet(
  descriptionText: string | null | undefined,
  maxLength = 80,
): string | null {
  if (!descriptionText) return null;
  const normalized = descriptionText.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

type ParsedStats = {
  damage?: string | null;
  critical?: string | null;
  ac?: string | null;
  maxDex?: string | null;
  acp?: string | null;
};

/** Parse legacy `index.stats` strings like "1d10 · 19-20/x2" or "AC 6 · Max Dex 1 · ACP -6". */
export function parseEquipmentStats(stats: string | null | undefined): ParsedStats {
  if (!stats) return {};
  const parts = stats.split("·").map((part) => part.trim()).filter(Boolean);
  const result: ParsedStats = {};

  for (const part of parts) {
    if (part.startsWith("AC ")) {
      result.ac = part.slice(3).trim();
      continue;
    }
    if (part.startsWith("Max Dex ")) {
      result.maxDex = part.slice("Max Dex ".length).trim();
      continue;
    }
    if (part.startsWith("ACP ")) {
      result.acp = part.slice(4).trim();
      continue;
    }
    if (/^x\d/i.test(part) || /\/x/i.test(part) || part.includes("/x")) {
      result.critical = part;
      continue;
    }
    if (/^\d+d\d+/i.test(part)) {
      result.damage = part;
    }
  }

  return result;
}

function readCombatFields(index: Record<string, unknown>): Record<string, string | null> {
  return {
    damage_m: readIndexString(index, "damage_m"),
    damage_s: readIndexString(index, "damage_s"),
    critical: readIndexString(index, "critical"),
    damage_type: readIndexString(index, "damage_type"),
    ac_bonus: readIndexString(index, "ac_bonus"),
    max_dex: readIndexString(index, "max_dex"),
    armor_check_penalty: readIndexString(index, "armor_check_penalty"),
    speed_30: readIndexString(index, "speed_30"),
    speed_20: readIndexString(index, "speed_20"),
    stats: readIndexString(index, "stats"),
  };
}

export function buildEquipmentSummary(indexData: unknown): string | null {
  const index = (indexData ?? {}) as Record<string, unknown>;
  const combat = readCombatFields(index);
  if (combat.stats) return combat.stats;

  if (combat.damage_m || combat.critical) {
    return [combat.damage_m, combat.critical].filter(Boolean).join(" · ");
  }

  const armorParts: string[] = [];
  if (combat.ac_bonus) armorParts.push(`AC ${combat.ac_bonus}`);
  if (combat.max_dex) armorParts.push(`Max Dex ${combat.max_dex}`);
  if (combat.armor_check_penalty) armorParts.push(`ACP ${combat.armor_check_penalty}`);
  if (armorParts.length) return armorParts.join(" · ");

  return null;
}

function damageTooltip(damageM: string | null, damageS: string | null): string | undefined {
  if (damageM && damageS) return `Medium: ${damageM}; Small: ${damageS}`;
  return undefined;
}

function speedTooltip(speed30: string | null, speed20: string | null): string | undefined {
  const primary = formatSpeedFeet(speed30);
  const secondary = formatSpeedFeet(speed20);
  if (primary && secondary) return `30-ft base: ${primary}; 20-ft base: ${secondary}`;
  return undefined;
}

export function buildEquipmentListExtras(
  row: EquipmentListRow,
  view: EquipmentView,
): Record<string, string | null> {
  const index = (row.indexData ?? {}) as Record<string, unknown>;
  const combat = readCombatFields(index);
  const parsedStats = parseEquipmentStats(combat.stats);
  const description = equipmentDescriptionSnippet(row.descriptionText);
  const cost = row.cost;

  if (view === "weapon") {
    const damage = combat.damage_m ?? parsedStats.damage ?? null;
    const critical = combat.critical ?? parsedStats.critical ?? null;
    const damageTitle = damageTooltip(combat.damage_m, combat.damage_s);
    return {
      category: formatCategoryLabel(row.category),
      damage,
      damageTitle: damageTitle ?? null,
      critical,
      damageType: formatDamageType(combat.damage_type),
      description,
      cost,
    };
  }

  if (view === "armor") {
    const speed = formatSpeedFeet(combat.speed_30);
    const speedTitle = speedTooltip(combat.speed_30, combat.speed_20);
    return {
      kind: formatKindLabel(row.kind),
      category: formatCategoryLabel(row.category),
      ac: combat.ac_bonus ?? parsedStats.ac ?? null,
      maxDex: combat.max_dex ?? parsedStats.maxDex ?? null,
      speed,
      speedTitle: speedTitle ?? null,
      acp: combat.armor_check_penalty ?? parsedStats.acp ?? null,
      description,
      cost,
    };
  }

  return {
    kind: formatKindLabel(row.kind),
    summary: buildEquipmentSummary(row.indexData),
    description,
    cost,
  };
}

export function equipmentTableColumns(view: EquipmentView): EquipmentTableColumn[] {
  if (view === "weapon") {
    return [
      { key: "category", label: "Category", sortable: true },
      { key: "damage", label: "Damage (M)", sortable: false },
      { key: "critical", label: "Crit", sortable: false },
      { key: "damageType", label: "Type", sortable: false },
      { key: "description", label: "Description", sortable: false },
      { key: "cost", label: "Cost", sortable: true },
    ];
  }

  if (view === "armor") {
    return [
      { key: "kind", label: "Kind", sortable: false },
      { key: "category", label: "Category", sortable: true },
      { key: "ac", label: "AC", sortable: false },
      { key: "maxDex", label: "Max Dex", sortable: false },
      { key: "speed", label: "Speed", sortable: false, title: "Speed for 30-ft base land speed" },
      {
        key: "acp",
        label: "ACP",
        sortable: false,
        title: "Armor check penalty (skill restriction)",
      },
      { key: "description", label: "Description", sortable: false },
      { key: "cost", label: "Cost", sortable: true },
    ];
  }

  return [
    { key: "kind", label: "Kind", sortable: true },
    { key: "summary", label: "Summary", sortable: false },
    { key: "description", label: "Description", sortable: false },
    { key: "cost", label: "Cost", sortable: true },
  ];
}

export function applyEquipmentViewToFilters(
  filters: ParsedListFilters,
  view: EquipmentView,
): ParsedListFilters {
  const nextFields = { ...filters.fields };
  if (view === "all") {
    delete nextFields.kind;
  } else {
    nextFields.kind = [view];
  }
  return { ...filters, fields: nextFields };
}

export function equipmentViewFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): EquipmentView {
  const raw = searchParams.kind;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "weapon") return "weapon";
  if (value === "armor") return "armor";
  return "all";
}

/** Normalize URL `kind` query into filter fields for list queries. */
export function mergeEquipmentViewIntoFields(
  fields: Record<string, string[]>,
  view: EquipmentView,
): Record<string, string[]> {
  const next = { ...fields };
  if (view === "all") {
    delete next.kind;
    return next;
  }
  next.kind = [view];
  return next;
}

export function equipmentKindsForCategoryOptions(view: EquipmentView): string[] | null {
  if (view === "weapon") return ["weapon"];
  if (view === "armor") return ["armor", "shield"];
  return null;
}
