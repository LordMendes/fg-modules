import type { Ability, BonusType, ConditionKey, DamageType } from "../types";

/** Tags that accept a numeric or dice value plus optional descriptors. */
export const VALUE_TAGS = [
  "ATK",
  "AC",
  "SAVE",
  "FORT",
  "REF",
  "WILL",
  "INIT",
  "CL",
  "DC",
  "SKILL",
  "SPEED",
  "DMG",
  "DMGO",
  "DR",
  "RESIST",
  "REGEN",
  "FHEAL",
] as const;

export type ValueTag = (typeof VALUE_TAGS)[number];

/** Ability shorthand tags mapped to ABIL components. */
export const ABILITY_TAGS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

export type AbilityTag = (typeof ABILITY_TAGS)[number];

/** Tags with no value that may appear without a colon (e.g. `Cover; COVER`). */
export const BARE_FLAG_TAGS = ["CONC", "TCONC", "COVER", "SCOVER"] as const;

export type BareFlagTag = (typeof BARE_FLAG_TAGS)[number];

/** Tags with no numeric value; IMMUNE/VULN use trailing descriptors instead. */
export const DESCRIPTOR_FLAG_TAGS = ["IMMUNE", "VULN"] as const;

export type DescriptorFlagTag = (typeof DESCRIPTOR_FLAG_TAGS)[number];

export const ALL_KNOWN_TAGS = [
  ...VALUE_TAGS,
  ...ABILITY_TAGS,
  ...DESCRIPTOR_FLAG_TAGS,
  ...BARE_FLAG_TAGS,
] as const;

export type KnownTag = (typeof ALL_KNOWN_TAGS)[number];

export const BONUS_TYPES: readonly BonusType[] = [
  "alchemical",
  "armor",
  "circumstance",
  "competence",
  "deflection",
  "dodge",
  "enhancement",
  "insight",
  "luck",
  "morale",
  "natural",
  "profane",
  "racial",
  "resistance",
  "sacred",
  "shield",
  "size",
];

export const DAMAGE_TYPES: readonly DamageType[] = [
  "slashing",
  "piercing",
  "bludgeoning",
  "fire",
  "cold",
  "acid",
  "electricity",
  "sonic",
  "force",
  "positive",
  "negative",
  "magic",
  "epic",
  "adamantine",
  "silver",
  "coldiron",
  "good",
  "evil",
  "lawful",
  "chaotic",
  "nonlethal",
  "precision",
  "spell",
];

/** Case-insensitive alias -> canonical damage type. */
export const DAMAGE_TYPE_ALIASES: Record<string, DamageType> = {
  elec: "electricity",
  electricity: "electricity",
  "cold iron": "coldiron",
  coldiron: "coldiron",
  holy: "good",
  good: "good",
  unholy: "evil",
  evil: "evil",
  axiomatic: "lawful",
  lawful: "lawful",
  anarchic: "chaotic",
  chaotic: "chaotic",
  bludgeon: "bludgeoning",
  bludgeoning: "bludgeoning",
  pierce: "piercing",
  piercing: "piercing",
  slash: "slashing",
  slashing: "slashing",
  fire: "fire",
  cold: "cold",
  acid: "acid",
  sonic: "sonic",
  force: "force",
  positive: "positive",
  negative: "negative",
  magic: "magic",
  epic: "epic",
  adamantine: "adamantine",
  silver: "silver",
  nonlethal: "nonlethal",
  precision: "precision",
  spell: "spell",
  crit: "untyped",
};

export const ATTACK_DESCRIPTORS = [
  "melee",
  "ranged",
  "grapple",
  "touch",
  "opportunity",
  "crit",
  "range",
  "flatfooted",
] as const;

export type AttackDescriptor = (typeof ATTACK_DESCRIPTORS)[number];

/** Common save-vs descriptors; unknown text after "vs" is kept as a descriptor. */
export const SAVE_VS_DESCRIPTORS = [
  "fear",
  "poison",
  "spell",
  "enchantment",
  "death",
  "disease",
  "mind-affecting",
  "paralysis",
  "petrification",
  "polymorph",
  "sleep",
  "stun",
] as const;

const ABILITY_TAG_TO_ABILITY: Record<AbilityTag, Ability> = {
  STR: "str",
  DEX: "dex",
  CON: "con",
  INT: "int",
  WIS: "wis",
  CHA: "cha",
};

/** Display names for conditions (canonical formatting). */
export const CONDITION_DISPLAY: Record<ConditionKey, string> = {
  blinded: "Blinded",
  cowering: "Cowering",
  dazed: "Dazed",
  dazzled: "Dazzled",
  deafened: "Deafened",
  disabled: "Disabled",
  dying: "Dying",
  dead: "Dead",
  entangled: "Entangled",
  exhausted: "Exhausted",
  fascinated: "Fascinated",
  fatigued: "Fatigued",
  flatFooted: "Flat-footed",
  frightened: "Frightened",
  grappled: "Grappled",
  helpless: "Helpless",
  incorporeal: "Incorporeal",
  invisible: "Invisible",
  nauseated: "Nauseated",
  panicked: "Panicked",
  paralyzed: "Paralyzed",
  petrified: "Petrified",
  pinned: "Pinned",
  prone: "Prone",
  shaken: "Shaken",
  sickened: "Sickened",
  stable: "Stable",
  staggered: "Staggered",
  stunned: "Stunned",
  turned: "Turned",
  unconscious: "Unconscious",
};

/** Normalize user text to a condition key, if recognized. */
export function normalizeCondition(text: string): ConditionKey | null {
  const key = text.trim().toLowerCase().replace(/['']/g, "").replace(/[-\s]+/g, "");
  return CONDITION_LOOKUP[key] ?? null;
}

const CONDITION_LOOKUP: Record<string, ConditionKey> = {
  blinded: "blinded",
  cowering: "cowering",
  dazed: "dazed",
  dazzled: "dazzled",
  deafened: "deafened",
  disabled: "disabled",
  dying: "dying",
  dead: "dead",
  entangled: "entangled",
  exhausted: "exhausted",
  fascinated: "fascinated",
  fatigued: "fatigued",
  flatfooted: "flatFooted",
  frightened: "frightened",
  grappled: "grappled",
  helpless: "helpless",
  incorporeal: "incorporeal",
  invisible: "invisible",
  nauseated: "nauseated",
  panicked: "panicked",
  paralyzed: "paralyzed",
  petrified: "petrified",
  pinned: "pinned",
  prone: "prone",
  shaken: "shaken",
  sickened: "sickened",
  stable: "stable",
  staggered: "staggered",
  stunned: "stunned",
  turned: "turned",
  unconscious: "unconscious",
};

export function isKnownTag(tag: string): tag is KnownTag {
  return (ALL_KNOWN_TAGS as readonly string[]).includes(tag.toUpperCase());
}

/** Bare flag clauses must use the exact tag token (e.g. `COVER`, not `Cover`). */
export function isBareFlagTag(tag: string): tag is BareFlagTag {
  return (BARE_FLAG_TAGS as readonly string[]).includes(tag);
}

export function abilityFromTag(tag: string): Ability | null {
  const upper = tag.toUpperCase();
  if ((ABILITY_TAGS as readonly string[]).includes(upper)) {
    return ABILITY_TAG_TO_ABILITY[upper as AbilityTag];
  }
  return null;
}

export function parseBonusType(token: string): BonusType | null {
  const lower = token.toLowerCase();
  return (BONUS_TYPES as readonly string[]).includes(lower)
    ? (lower as BonusType)
    : null;
}

export function parseDamageType(token: string): DamageType | null {
  const lower = token.toLowerCase();
  return DAMAGE_TYPE_ALIASES[lower] ?? null;
}

/** Match signed integer or dice notation (e.g. 1d6, 2d6+2). */
export function parseNumericOrDice(text: string): {
  value: number;
  dice: string;
} | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const diceMatch = /^([+-]?\d+d\d+(?:[+-]\d+)?)$/i.exec(trimmed);
  if (diceMatch) {
    return { value: 0, dice: diceMatch[1]!.toLowerCase() };
  }

  const intMatch = /^([+-]?\d+)$/.exec(trimmed);
  if (intMatch) {
    return { value: Number.parseInt(intMatch[1]!, 10), dice: "" };
  }

  return null;
}

export function isAttackDescriptor(token: string): token is AttackDescriptor {
  const lower = token.toLowerCase();
  return (ATTACK_DESCRIPTORS as readonly string[]).includes(lower);
}
