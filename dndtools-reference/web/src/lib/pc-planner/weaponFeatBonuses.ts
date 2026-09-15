import type { FeatEntry, InventoryRow } from "./types";

export type WeaponFeatBonusPart = {
  label: string;
  amount: number;
};

export type WeaponFeatBonuses = {
  attack: number;
  damage: number;
  attackParts: WeaponFeatBonusPart[];
  damageParts: WeaponFeatBonusPart[];
};

/** Feat definitions that grant a fixed attack or damage bonus with a weapon choice. */
export const WEAPON_CHOICE_FEATS = [
  {
    id: "weapon-focus",
    matchName: "weapon focus",
    slugPrefix: "weapon-focus",
    label: "Weapon Focus",
    attack: 1,
    damage: 0,
    needsChoice: true,
  },
  {
    id: "greater-weapon-focus",
    matchName: "greater weapon focus",
    slugPrefix: "greater-weapon-focus",
    label: "Greater Weapon Focus",
    attack: 1,
    damage: 0,
    needsChoice: true,
  },
  {
    id: "weapon-specialization",
    matchName: "weapon specialization",
    slugPrefix: "weapon-specialization",
    label: "Weapon Specialization",
    attack: 0,
    damage: 2,
    needsChoice: true,
  },
  {
    id: "greater-weapon-specialization",
    matchName: "greater weapon specialization",
    slugPrefix: "greater-weapon-specialization",
    label: "Greater Weapon Specialization",
    attack: 0,
    damage: 2,
    needsChoice: true,
  },
] as const;

export type WeaponChoiceFeatDef = (typeof WEAPON_CHOICE_FEATS)[number];

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip magic prefixes like "+1 flaming" for base weapon matching. */
export function stripMagicWeaponPrefix(name: string): string {
  return name
    .replace(/^\s*\+\d+\s+/i, "")
    .replace(
      /\b(flaming|frost|shock|corrosive|holy|unholy|anarchic|axiomatic|keen|ghost touch|mighty cleaving|wounding|vicious|thundering|brilliant energy)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function weaponMatchKey(raw: string): string {
  return normalizeKey(stripMagicWeaponPrefix(raw));
}

export function parseFeatWeaponChoice(feat: FeatEntry): string | null {
  if (feat.choice?.trim()) return feat.choice.trim();
  const match = feat.name.match(/\(([^)]+)\)\s*$/);
  return match?.[1]?.trim() || null;
}

export function findWeaponChoiceFeatDef(
  feat: FeatEntry,
): WeaponChoiceFeatDef | null {
  const slug = feat.slug.toLowerCase();
  const nameWithoutChoice = normalizeKey(
    feat.name.replace(/\s*\([^)]*\)\s*$/, ""),
  );
  for (const def of WEAPON_CHOICE_FEATS) {
    if (
      nameWithoutChoice === def.matchName ||
      slug === def.slugPrefix ||
      slug.startsWith(`${def.slugPrefix}-`)
    ) {
      return def;
    }
  }
  return null;
}

export function featNeedsWeaponChoice(feat: FeatEntry): boolean {
  return findWeaponChoiceFeatDef(feat) != null;
}

export function formatFeatDisplayName(feat: FeatEntry): string {
  const def = findWeaponChoiceFeatDef(feat);
  const choice = parseFeatWeaponChoice(feat);
  if (!def) return feat.name;
  const base = def.label;
  if (!choice) {
    // Keep parenthetical from catalog name if present.
    if (/\([^)]+\)\s*$/.test(feat.name)) return feat.name;
    return base;
  }
  return `${base} (${choice})`;
}

export function weaponMatchesChoice(
  item: InventoryRow,
  choice: string | null | undefined,
): boolean {
  if (!choice?.trim()) return false;
  const choiceKey = weaponMatchKey(choice);
  if (!choiceKey) return false;

  const candidates = [
    item.slug ?? "",
    item.name ?? "",
    stripMagicWeaponPrefix(item.name ?? ""),
  ];
  for (const candidate of candidates) {
    const key = weaponMatchKey(candidate);
    if (!key) continue;
    if (key === choiceKey) return true;
    // Slug "longsword" vs choice "long sword"
    if (key.replace(/\s+/g, "") === choiceKey.replace(/\s+/g, "")) return true;
  }
  return false;
}

export function emptyWeaponFeatBonuses(): WeaponFeatBonuses {
  return { attack: 0, damage: 0, attackParts: [], damageParts: [] };
}

/** Sum PHB weapon-choice feat bonuses that apply to this inventory weapon. */
export function computeWeaponFeatBonuses(
  feats: FeatEntry[] | null | undefined,
  item: InventoryRow,
): WeaponFeatBonuses {
  const result = emptyWeaponFeatBonuses();
  for (const feat of feats ?? []) {
    const def = findWeaponChoiceFeatDef(feat);
    if (!def) continue;
    const choice = parseFeatWeaponChoice(feat);
    if (!weaponMatchesChoice(item, choice)) continue;
    if (def.attack) {
      result.attack += def.attack;
      result.attackParts.push({ label: def.label, amount: def.attack });
    }
    if (def.damage) {
      result.damage += def.damage;
      result.damageParts.push({ label: def.label, amount: def.damage });
    }
  }
  return result;
}

/** Inventory weapons that can be offered as a feat choice. */
export function weaponChoiceOptions(
  inventory: InventoryRow[] | null | undefined,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const row of inventory ?? []) {
    const kind = (row.kind ?? "").toLowerCase();
    if (kind !== "weapon") continue;
    const label = stripMagicWeaponPrefix(row.name || "").trim() || row.name;
    const value = (row.slug?.trim() || label).trim();
    if (!value) continue;
    const key = weaponMatchKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ value: label, label });
  }
  return options;
}
