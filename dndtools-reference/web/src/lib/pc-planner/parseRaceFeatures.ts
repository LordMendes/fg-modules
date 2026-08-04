import type { AbilityKey } from "./types";

const ABILITY_NAMES: Record<string, AbilityKey> = {
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

export type RacialSkillPointBonus = {
  /** Flat bonus at 1st character level (not multiplied by ×4). */
  firstLevel: number;
  /** Bonus per character level after the first. */
  perAdditionalLevel: number;
};

export type RaceDerivedFeatures = {
  traits: string[];
  abilityMods: Partial<Record<AbilityKey, number>>;
  skillBonuses: Record<string, number>;
  skillPointBonus: RacialSkillPointBonus | null;
  saveBonus: { fort: number; ref: number; will: number };
  naturalArmor: number;
  sizeMod: number;
  speed: number;
};

function parseSignedInt(raw: string): number {
  const normalized = raw.replace(/[−–—]/g, "-").trim();
  if (!normalized || normalized === "+") return 0;
  const n = Number.parseInt(normalized, 10);
  return Number.isFinite(n) ? n : 0;
}

export function sizeModFromLabel(size: string | null | undefined): number {
  switch ((size ?? "").toLowerCase()) {
    case "fine":
      return 8;
    case "diminutive":
      return 4;
    case "tiny":
      return 2;
    case "small":
      return 1;
    case "large":
      return -1;
    case "huge":
      return -2;
    case "gargantuan":
      return -4;
    case "colossal":
      return -8;
    default:
      return 0;
  }
}

export function parseSpeedFromText(text: string): number | null {
  const land = text.match(/(?:land|base land)\s*speed[^0-9]*(\d+)\s*ft/i);
  if (land) return Number.parseInt(land[1], 10);
  const generic = text.match(/(\d+)\s*feet/i);
  return generic ? Number.parseInt(generic[1], 10) : null;
}

export function parseSpeedFromField(speed: string | null | undefined): number | null {
  if (!speed) return null;
  const match = speed.match(/(\d+)\s*ft/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function splitTraitLines(text: string): string[] {
  const withoutHeader = text.replace(/^Racial Traits\s*/i, "").trim();
  return withoutHeader
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0 && !/^racial traits:?$/i.test(line));
}

export function parseAbilityMods(text: string): Partial<Record<AbilityKey, number>> {
  const normalizedText = text.replace(/[−–—]/g, "-");
  const mods: Partial<Record<AbilityKey, number>> = {};
  const pattern =
    /([+-]?\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|Str|Dex|Con|Int|Wis|Cha)\b/gi;
  for (const match of normalizedText.matchAll(pattern)) {
    const key = ABILITY_NAMES[match[2].toLowerCase()];
    if (key) mods[key] = parseSignedInt(match[1]);
  }
  return mods;
}

export function parseSkillBonuses(text: string): Record<string, number> {
  const bonuses: Record<string, number> = {};
  const pattern =
    /([+-−–]?\d+)\s*racial bonus (?:on|to)\s+([^.+\n]+?)\s*(?:checks|check)/gi;
  for (const match of text.matchAll(pattern)) {
    const amount = parseSignedInt(match[1]);
    const skillsPart = match[2]
      .replace(/\band\b/gi, ",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const skill of skillsPart) {
      bonuses[skill.toLowerCase()] = amount;
    }
  }
  return bonuses;
}

/** e.g. human: 4 extra at 1st level + 1 per additional level. */
export function parseRacialSkillPointBonus(text: string): RacialSkillPointBonus | null {
  const match = text.match(
    /(\d+)\s+extra skill points?\s+at\s+(?:1st|first)\s+level.*?(\d+)\s+extra skill points?\s+at\s+each\s+additional\s+level/is,
  );
  if (!match) return null;
  return {
    firstLevel: Number.parseInt(match[1], 10),
    perAdditionalLevel: Number.parseInt(match[2], 10),
  };
}

export function parseSaveBonuses(text: string): { fort: number; ref: number; will: number } {
  const bonus = { fort: 0, ref: 0, will: 0 };
  const general = text.match(
    /([+-−–]?\d+)\s*racial(?: saving throw)? bonus on\s+(Fortitude|Reflex|Will)/i,
  );
  if (general) {
    const amount = parseSignedInt(general[1]);
    const save = general[2].toLowerCase();
    if (save.startsWith("fort")) bonus.fort += amount;
    if (save.startsWith("ref")) bonus.ref += amount;
    if (save.startsWith("will")) bonus.will += amount;
  }

  const allSaves = text.match(
    /([+-−–]?\d+)\s*racial saving throw bonus against/i,
  );
  if (allSaves && !general) {
    const amount = parseSignedInt(allSaves[1]);
    if (/enchantment/i.test(text)) bonus.will += amount;
  }

  return bonus;
}

export function parseNaturalArmor(text: string): number {
  const match = text.match(
    /\+(\d+)\s*(?:natural armor bonus|natural armor|to AC)/i,
  );
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function parseRaceFeatures(input: {
  descriptionText?: string | null;
  size?: string | null;
  speed?: string | null;
}): RaceDerivedFeatures {
  const text = input.descriptionText ?? "";
  const traits = splitTraitLines(text);
  const abilityMods = parseAbilityMods(text);
  const skillBonuses = parseSkillBonuses(text);
  const skillPointBonus = parseRacialSkillPointBonus(text);
  const saveBonus = parseSaveBonuses(text);
  const naturalArmor = parseNaturalArmor(text);
  const sizeMod = sizeModFromLabel(input.size);
  const speed =
    parseSpeedFromField(input.speed) ??
    parseSpeedFromText(text) ??
    30;

  return {
    traits,
    abilityMods,
    skillBonuses,
    skillPointBonus,
    saveBonus,
    naturalArmor,
    sizeMod,
    speed,
  };
}
