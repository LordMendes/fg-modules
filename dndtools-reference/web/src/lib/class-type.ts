export type ClassType = "base" | "prestige";

export type ClassTypeInput = {
  index?: { prestige_level?: string | null } | null;
  requirements_html?: string | null;
  requirements_text?: string | null;
  min_bab_req?: string | null;
  advancement?: Array<{ level?: number | string | null }> | null;
};

function parseAdvancementLevel(level: unknown): number | null {
  if (typeof level === "number" && Number.isFinite(level)) return level;
  if (typeof level === "string" && /^\d+$/.test(level.trim())) return parseInt(level, 10);
  return null;
}

function maxAdvancementLevel(record: ClassTypeInput): number | null {
  const advancement = record.advancement ?? [];
  if (advancement.length === 0) return null;

  let maxLevel = 0;
  for (const row of advancement) {
    const level = parseAdvancementLevel(row.level);
    if (level != null && level > maxLevel) maxLevel = level;
  }
  return maxLevel > 0 ? maxLevel : null;
}

/** Classify a scraped class record as base or prestige. */
export function classifyClassType(record: ClassTypeInput): ClassType {
  const index = record.index ?? {};
  const prestigeLevel = String(index.prestige_level ?? "").trim();
  if (prestigeLevel) return "prestige";

  const hasRequirements =
    String(record.requirements_html ?? "").trim().length > 0 ||
    String(record.requirements_text ?? "").trim().length > 0 ||
    String(record.min_bab_req ?? "").trim().length > 0;
  if (hasRequirements) return "prestige";

  const maxLevel = maxAdvancementLevel(record);
  if (maxLevel != null && maxLevel < 20) return "prestige";

  return "base";
}

export function buildClassTypeMap(
  records: Array<{ slug: string } & ClassTypeInput>,
): Record<string, ClassType> {
  const map: Record<string, ClassType> = {};
  for (const record of records) {
    map[record.slug] = classifyClassType(record);
  }
  return map;
}

/** Stable JSON serialization for the checked-in class type catalog. */
export function serializeClassTypeMap(map: Record<string, ClassType>): string {
  const sortedEntries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  return `${JSON.stringify(Object.fromEntries(sortedEntries), null, 2)}\n`;
}
