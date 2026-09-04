import type { ClassAbilityEntry } from "./parseClassFeatures";
import type { AbilityKey } from "./types";

export type ClassDerivedFeatures = {
  saveBonus: { fort: number; ref: number; will: number };
  /** Ability modifiers added to saves from class features (e.g. Divine Grace → Cha). */
  saveAbilityBonus: { fort: AbilityKey[]; ref: AbilityKey[]; will: AbilityKey[] };
  /** Conditional +10 land speed (barbarian Fast Movement, etc.). */
  fastMovementBonus: number;
};

const SAVE_KEYS = ["fort", "ref", "will"] as const;
type SaveKey = (typeof SAVE_KEYS)[number];

const ABILITY_WORDS: Record<string, AbilityKey> = {
  strength: "str",
  str: "str",
  dexterity: "dex",
  dex: "dex",
  constitution: "con",
  con: "con",
  intelligence: "int",
  int: "int",
  wisdom: "wis",
  wis: "wis",
  charisma: "cha",
  cha: "cha",
};

export function emptyClassDerivedFeatures(): ClassDerivedFeatures {
  return {
    saveBonus: { fort: 0, ref: 0, will: 0 },
    saveAbilityBonus: { fort: [], ref: [], will: [] },
    fastMovementBonus: 0,
  };
}

export function normalizeClassAbilityName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function appendUniqueKeys(target: AbilityKey[], keys: AbilityKey[]): void {
  for (const key of keys) {
    if (!target.includes(key)) target.push(key);
  }
}

function mergeSaveAbilityBonus(
  base: ClassDerivedFeatures["saveAbilityBonus"],
  add: Partial<ClassDerivedFeatures["saveAbilityBonus"]>,
): ClassDerivedFeatures["saveAbilityBonus"] {
  const next = {
    fort: [...base.fort],
    ref: [...base.ref],
    will: [...base.will],
  };
  for (const save of SAVE_KEYS) {
    appendUniqueKeys(next[save], add[save] ?? []);
  }
  return next;
}

export function mergeClassDerivedFeatures(
  base: ClassDerivedFeatures,
  add: Partial<ClassDerivedFeatures>,
): ClassDerivedFeatures {
  return {
    saveBonus: {
      fort: base.saveBonus.fort + (add.saveBonus?.fort ?? 0),
      ref: base.saveBonus.ref + (add.saveBonus?.ref ?? 0),
      will: base.saveBonus.will + (add.saveBonus?.will ?? 0),
    },
    saveAbilityBonus: mergeSaveAbilityBonus(base.saveAbilityBonus, add.saveAbilityBonus ?? {}),
    fastMovementBonus: Math.max(base.fastMovementBonus, add.fastMovementBonus ?? 0),
  };
}

function allSavesAbilityBonus(ability: AbilityKey): ClassDerivedFeatures["saveAbilityBonus"] {
  return { fort: [ability], ref: [ability], will: [ability] };
}

type AbilityEffectRule = {
  match: (normalizedName: string) => boolean;
  apply: () => Partial<ClassDerivedFeatures>;
};

const ABILITY_EFFECT_RULES: AbilityEffectRule[] = [
  {
    match: (name) => name === "divine grace" || name.startsWith("divine grace "),
    apply: () => ({ saveAbilityBonus: allSavesAbilityBonus("cha") }),
  },
  {
    match: (name) => name === "fast movement" || name.startsWith("fast movement "),
    apply: () => ({ fastMovementBonus: 10 }),
  },
];

export function parseSaveAbilityBonusFromText(text: string): AbilityKey[] | null {
  if (!/on all saving throws/i.test(text)) return null;

  const match = text.match(
    /(\w+) bonus(?:\s*\([^)]*\))?\s*(?:\(if any\)\s*)?on all saving throws/i,
  );
  if (!match) return null;

  const ability = ABILITY_WORDS[match[1].toLowerCase()];
  return ability ? [ability] : null;
}

/** Pull the rules text for a named class feature from a class description block. */
export function extractClassAbilityDescription(
  classDescription: string,
  abilityName: string,
): string | null {
  const target = normalizeClassAbilityName(abilityName);
  const lines = classDescription.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const header = normalizeClassAbilityName(line.replace(/\([^)]*\)/g, "").trim());
    if (header !== target && !header.startsWith(`${target} `)) continue;

    let text = "";
    if (line.includes(":")) {
      text = line.slice(line.indexOf(":") + 1).trim();
    }

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (/^[A-Z][A-Za-z' /-]+(\([^)]+\))?\s*$/.test(next) && !next.startsWith(":")) break;
      if (next.startsWith(":")) text += ` ${next.slice(1).trim()}`;
      else text += ` ${next}`;
    }

    return text.trim() || null;
  }

  return null;
}

function effectFromRegistry(normalizedName: string): Partial<ClassDerivedFeatures> | null {
  for (const rule of ABILITY_EFFECT_RULES) {
    if (rule.match(normalizedName)) return rule.apply();
  }
  return null;
}

function effectFromDescription(
  ability: ClassAbilityEntry,
  classDescriptions: ReadonlyMap<string, string>,
): Partial<ClassDerivedFeatures> | null {
  const classText = classDescriptions.get(ability.classSlug);
  if (!classText) return null;

  const section = extractClassAbilityDescription(classText, ability.name);
  if (!section) return null;

  const abilities = parseSaveAbilityBonusFromText(section);
  if (!abilities) return null;

  return { saveAbilityBonus: { fort: abilities, ref: abilities, will: abilities } };
}

export function deriveClassFeatures(
  classAbilities: ClassAbilityEntry[],
  classDescriptions: ReadonlyMap<string, string> = new Map(),
): ClassDerivedFeatures {
  let result = emptyClassDerivedFeatures();

  for (const ability of classAbilities) {
    const normalized = normalizeClassAbilityName(ability.name);
    const fromRegistry = effectFromRegistry(normalized);
    const effect = fromRegistry ?? effectFromDescription(ability, classDescriptions);
    if (effect) result = mergeClassDerivedFeatures(result, effect);
  }

  return result;
}

export function saveAbilityModFromClassFeatures(
  save: SaveKey,
  abilities: Record<AbilityKey, number>,
  classFeatures: ClassDerivedFeatures | null,
  abilityModifier: (score: number) => number,
): number {
  if (!classFeatures) return 0;

  let total = 0;
  for (const key of classFeatures.saveAbilityBonus[save]) {
    total += abilityModifier(abilities[key] ?? 10);
  }
  return total;
}
