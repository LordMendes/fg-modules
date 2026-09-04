import { isArmorKind, isShieldKind, isWeaponKind } from "./equippedGear";
import type {
  AbilityKey,
  CombatBonusStat,
  InventoryRow,
  ItemBonusType,
  ItemStatBonus,
} from "./types";

export type BonusSource = {
  label: string;
  amount: number;
  bonusType: ItemBonusType;
};

export type StackedBonus = {
  total: number;
  sources: BonusSource[];
};

export type EquippedBonuses = {
  abilities: Record<AbilityKey, StackedBonus>;
  skills: Record<string, StackedBonus>;
  combat: Record<CombatBonusStat, StackedBonus>;
};

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const COMBAT_STATS: CombatBonusStat[] = [
  "naturalArmor",
  "deflection",
  "armor",
  "dodge",
  "fort",
  "ref",
  "will",
  "saves",
  "melee",
  "ranged",
  "initiative",
];

const EMPTY_STACKED: StackedBonus = { total: 0, sources: [] };

function emptyAbilityMap(): Record<AbilityKey, StackedBonus> {
  return {
    str: { ...EMPTY_STACKED, sources: [] },
    dex: { ...EMPTY_STACKED, sources: [] },
    con: { ...EMPTY_STACKED, sources: [] },
    int: { ...EMPTY_STACKED, sources: [] },
    wis: { ...EMPTY_STACKED, sources: [] },
    cha: { ...EMPTY_STACKED, sources: [] },
  };
}

function emptyCombatMap(): Record<CombatBonusStat, StackedBonus> {
  const out = {} as Record<CombatBonusStat, StackedBonus>;
  for (const key of COMBAT_STATS) {
    out[key] = { total: 0, sources: [] };
  }
  return out;
}

export function emptyEquippedBonuses(): EquippedBonuses {
  return {
    abilities: emptyAbilityMap(),
    skills: {},
    combat: emptyCombatMap(),
  };
}

/** True when the row counts as worn for wondrous/magic item bonuses. */
export function isItemWorn(row: InventoryRow): boolean {
  if (isWeaponKind(row.kind)) return Boolean(row.weaponHand);
  return Boolean(row.equipped);
}

/** Rows that can use a simple Equip toggle (not weapons/armor/shields). */
export function canEquipAsWornItem(row: InventoryRow): boolean {
  if (isWeaponKind(row.kind) || isArmorKind(row.kind) || isShieldKind(row.kind)) {
    return false;
  }
  if (row.source === "item") return true;
  if ((row.kind ?? "").toLowerCase() === "item") return true;
  if ((row.statBonuses?.length ?? 0) > 0) return true;
  return false;
}

function normalizeSkillKey(skill: string): string {
  return skill.trim().toLowerCase();
}

type Candidate = {
  key: string;
  amount: number;
  bonusType: ItemBonusType;
  label: string;
};

/**
 * Sum every equipped bonus for a target. Tooltip sources list each contributor.
 */
export function stackBonuses(candidates: Candidate[]): StackedBonus {
  if (candidates.length === 0) return { total: 0, sources: [] };

  const sources: BonusSource[] = [];
  let total = 0;
  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.amount) || candidate.amount === 0) continue;
    total += candidate.amount;
    sources.push({
      label: candidate.label,
      amount: candidate.amount,
      bonusType: candidate.bonusType,
    });
  }
  sources.sort((a, b) => a.label.localeCompare(b.label));
  return { total, sources };
}

function abilityFromName(fragment: string): AbilityKey | null {
  const lower = fragment.toLowerCase();
  if (lower.includes("strength") || /\bstr\b/.test(lower)) return "str";
  if (lower.includes("dexterity") || /\bdex\b/.test(lower)) return "dex";
  if (lower.includes("constitution") || /\bcon\b/.test(lower) || lower.includes("health")) {
    return "con";
  }
  if (lower.includes("intellect") || lower.includes("intelligence") || /\bint\b/.test(lower)) {
    return "int";
  }
  if (lower.includes("wisdom") || /\bwis\b/.test(lower)) return "wis";
  if (lower.includes("charisma") || /\bcha\b/.test(lower)) return "cha";
  return null;
}

type ParsedPlusN = { baseName: string; amount: number };

function parseTrailingPlusN(name: string): ParsedPlusN | null {
  const match = name.trim().match(/^(.*?)\s*\+(\d+)\s*$/i);
  if (!match) return null;
  const amount = Number.parseInt(match[2], 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { baseName: match[1].trim(), amount };
}

function abilityBonus(
  ability: AbilityKey,
  amount: number,
  bonusType: ItemBonusType = "enhancement",
): ItemStatBonus {
  return { kind: "ability", ability, amount, bonusType };
}

function skillBonus(
  skill: string,
  amount: number,
  bonusType: ItemBonusType = "competence",
): ItemStatBonus {
  return { kind: "skill", skill: normalizeSkillKey(skill), amount, bonusType };
}

function combatBonus(
  stat: CombatBonusStat,
  amount: number,
  bonusType: ItemBonusType,
): ItemStatBonus {
  return { kind: "combat", stat, amount, bonusType };
}

/** Known items whose effects are not encoded as "Name +N". */
const KNOWN_ITEMS: Record<string, ItemStatBonus[]> = {
  "gauntlets of ogre power": [abilityBonus("str", 2)],
  "cloak of elvenkind": [skillBonus("hide", 5)],
  "boots of elvenkind": [skillBonus("move silently", 5)],
  "circlet of persuasion": [
    skillBonus("bluff", 3),
    skillBonus("diplomacy", 3),
    skillBonus("disguise", 3),
    skillBonus("gather information", 3),
    skillBonus("handle animal", 3),
    skillBonus("intimidate", 3),
    skillBonus("perform", 3),
    skillBonus("use magic device", 3),
  ],
  "gloves of dexterity": [abilityBonus("dex", 2)],
  "headband of intellect": [abilityBonus("int", 2)],
  "periapt of wisdom": [abilityBonus("wis", 2)],
  "cloak of charisma": [abilityBonus("cha", 2)],
  "amulet of health": [abilityBonus("con", 2)],
};

function inferFromPlusNName(baseName: string, amount: number): ItemStatBonus[] {
  const lower = baseName.toLowerCase();

  if (lower.includes("resistance")) {
    return [combatBonus("saves", amount, "resistance")];
  }
  if (lower.includes("natural armor")) {
    return [combatBonus("naturalArmor", amount, "natural")];
  }
  if (lower.includes("protection") || lower.includes("deflection")) {
    return [combatBonus("deflection", amount, "deflection")];
  }
  if (lower.includes("bracers of armor") || /^bracers of armor$/i.test(lower)) {
    return [combatBonus("armor", amount, "armor")];
  }
  if (lower.includes("armor") && lower.startsWith("bracers")) {
    return [combatBonus("armor", amount, "armor")];
  }

  const ability = abilityFromName(lower);
  if (ability) {
    return [abilityBonus(ability, amount)];
  }

  return [];
}

/**
 * Infer structured bonuses from a catalog item name.
 * Prefer "Name +N" parsing; fall back to a small known-item table.
 */
export function inferItemBonuses(name: string): ItemStatBonus[] {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const plusN = parseTrailingPlusN(trimmed);
  if (plusN) {
    const fromPattern = inferFromPlusNName(plusN.baseName, plusN.amount);
    if (fromPattern.length > 0) return fromPattern;
  }

  const key = trimmed.toLowerCase();
  if (KNOWN_ITEMS[key]) return KNOWN_ITEMS[key].map((b) => ({ ...b }));

  // Bare ability-item names without +N (defaults to +2).
  if (!plusN) {
    for (const [known, bonuses] of Object.entries(KNOWN_ITEMS)) {
      if (key === known || key.startsWith(`${known} `)) {
        return bonuses.map((b) => ({ ...b }));
      }
    }
  }

  return [];
}

function pushCandidate(
  buckets: Map<string, Candidate[]>,
  key: string,
  amount: number,
  bonusType: ItemBonusType,
  label: string,
): void {
  const list = buckets.get(key) ?? [];
  list.push({ key, amount, bonusType, label });
  buckets.set(key, list);
}

/**
 * Aggregate equipped inventory bonuses (all sources add; tooltip lists each).
 * Weapons contribute when weaponHand is set; other items when equipped.
 */
export function computeEquippedBonuses(
  inventory: InventoryRow[] | null | undefined,
): EquippedBonuses {
  const abilityBuckets = new Map<string, Candidate[]>();
  const skillBuckets = new Map<string, Candidate[]>();
  const combatBuckets = new Map<string, Candidate[]>();

  for (const row of inventory ?? []) {
    if (!isItemWorn(row)) continue;
    const bonuses = row.statBonuses;
    if (!bonuses?.length) continue;
    const label = row.name.trim() || "Item";

    for (const bonus of bonuses) {
      if (!Number.isFinite(bonus.amount) || bonus.amount === 0) continue;
      if (bonus.kind === "ability") {
        pushCandidate(abilityBuckets, bonus.ability, bonus.amount, bonus.bonusType, label);
      } else if (bonus.kind === "skill") {
        pushCandidate(
          skillBuckets,
          normalizeSkillKey(bonus.skill),
          bonus.amount,
          bonus.bonusType,
          label,
        );
      } else {
        pushCandidate(combatBuckets, bonus.stat, bonus.amount, bonus.bonusType, label);
        if (bonus.stat === "saves") {
          for (const save of ["fort", "ref", "will"] as const) {
            pushCandidate(combatBuckets, save, bonus.amount, bonus.bonusType, label);
          }
        }
      }
    }
  }

  const result = emptyEquippedBonuses();
  for (const key of ABILITY_KEYS) {
    result.abilities[key] = stackBonuses(abilityBuckets.get(key) ?? []);
  }
  for (const [key, candidates] of skillBuckets) {
    result.skills[key] = stackBonuses(candidates);
  }
  for (const key of COMBAT_STATS) {
    result.combat[key] = stackBonuses(combatBuckets.get(key) ?? []);
  }
  return result;
}

export function abilityItemBonusTotal(
  bonuses: EquippedBonuses,
  key: AbilityKey,
): number {
  return bonuses.abilities[key]?.total ?? 0;
}

export function skillItemBonus(
  bonuses: EquippedBonuses,
  row: { name: string; slug?: string | null },
): StackedBonus {
  const bySlug = row.slug ? bonuses.skills[normalizeSkillKey(row.slug)] : undefined;
  if (bySlug && bySlug.total !== 0) return bySlug;
  const byName = bonuses.skills[normalizeSkillKey(row.name)];
  if (byName) return byName;
  // Partial match for compound skills (e.g. "Perform (sing)" vs "perform").
  const nameKey = normalizeSkillKey(row.name);
  for (const [key, stacked] of Object.entries(bonuses.skills)) {
    if (stacked.total === 0) continue;
    if (nameKey === key || nameKey.startsWith(`${key} `) || nameKey.startsWith(`${key}(`)) {
      return stacked;
    }
  }
  return EMPTY_STACKED;
}

/** Max of two armor-bonus sources (worn armor vs Bracers of Armor, etc.). */
export function stackArmorBonus(armorFromGear: number, armorFromItems: number): number {
  return Math.max(armorFromGear, armorFromItems);
}

export function formatBonusSources(sources: BonusSource[]): string[] {
  return sources.map((source) => {
    const signed = source.amount >= 0 ? `+${source.amount}` : `${source.amount}`;
    return `${source.label} ${signed}`;
  });
}
