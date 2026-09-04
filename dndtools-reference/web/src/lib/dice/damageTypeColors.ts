/** Hex tints for 3D dice and UI chips by 3.5 damage type. */
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  s: "#A8B4C0",
  slashing: "#A8B4C0",
  p: "#8FA8B8",
  piercing: "#8FA8B8",
  b: "#C4A574",
  bludgeoning: "#C4A574",
  fire: "#E85D04",
  cold: "#4CC9F0",
  electricity: "#FFD60A",
  electric: "#FFD60A",
  lightning: "#FFD60A",
  acid: "#80B918",
  sonic: "#C77DFF",
  force: "#9B5DE5",
  nonlethal: "#ADB5BD",
  positive: "#F8F9FA",
  negative: "#5C4D7A",
};

const DEFAULT_WEAPON_COLOR = "#C9A227";

function normalizeDamageTypeKey(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
}

/** Return a hex color for a damage type, or null when unknown / empty. */
export function damageTypeColor(raw: string | null | undefined): string | null {
  const key = normalizeDamageTypeKey(raw);
  if (!key) return null;
  if (DAMAGE_TYPE_COLORS[key]) return DAMAGE_TYPE_COLORS[key];
  const compact = key.replace(/\s+/g, "");
  if (DAMAGE_TYPE_COLORS[compact]) return DAMAGE_TYPE_COLORS[compact];
  return null;
}

/** Color for weapon dice when type is missing (matches default tray gold). */
export function weaponDamageColor(raw: string | null | undefined): string {
  return damageTypeColor(raw) ?? DEFAULT_WEAPON_COLOR;
}

/** CSS custom-property friendly token for class-based chips. */
export function damageTypeTone(raw: string | null | undefined): string {
  const key = normalizeDamageTypeKey(raw);
  if (!key) return "default";
  if (key === "s" || key === "slashing") return "slashing";
  if (key === "p" || key === "piercing") return "piercing";
  if (key === "b" || key === "bludgeoning") return "bludgeoning";
  if (key === "electric" || key === "lightning") return "electricity";
  if (
    key === "fire" ||
    key === "cold" ||
    key === "electricity" ||
    key === "acid" ||
    key === "sonic" ||
    key === "force" ||
    key === "nonlethal" ||
    key === "positive" ||
    key === "negative"
  ) {
    return key;
  }
  return "other";
}
