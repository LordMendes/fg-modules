import type { AbilityKey, PcDefensesState, PcSensesState } from "./types";

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
  /** Dwarf-style: speed not reduced by medium/heavy armor or load. */
  speedUnhinderedByEncumbrance: boolean;
  senses: PcSensesState;
  languages: string[];
  defenses: PcDefensesState;
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
    /(\d+)\s+extra skill points?\s+at\s+(?:1st|first)\s+level\s+and\s+(\d+)\s+extra skill points?\s+at\s+each\s+additional\s+level/i,
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

/** Dwarf / duergar / etc.: speed not reduced by medium/heavy armor or load. */
export function parseSpeedUnhinderedByEncumbrance(text: string): boolean {
  return /move at this speed even when wearing medium or heavy armor/i.test(text);
}

export function parseDarkvisionFeet(text: string): number {
  const match = text.match(/darkvision\s*(?:out to\s*)?(\d+)\s*ft/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

export function parseLowLightVision(text: string): boolean {
  return /low-light vision/i.test(text);
}

export function parseScent(text: string): boolean {
  return /\bscent\b/i.test(text);
}

export function parseRacialLanguages(text: string): string[] {
  const langs: string[] = [];
  const automatic = text.match(/automatic languages?:?\s*([^.+\n]+)/i);
  if (automatic) {
    langs.push(
      ...automatic[1]
        .replace(/\band\b/gi, ",")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  const bonus = text.match(/bonus languages?:?\s*([^.+\n]+)/i);
  if (bonus && langs.length === 0) {
    langs.push("Common");
  }
  if (langs.length === 0 && /\bcommon\b/i.test(text)) langs.push("Common");
  return [...new Set(langs.map((l) => l.replace(/\.$/, "").trim()).filter(Boolean))];
}

export function parseDamageReduction(text: string): string {
  const match = text.match(/damage reduction\s*(\d+\s*\/\s*[\w-]+)/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

export function parseEnergyResistance(text: string): string {
  const parts: string[] = [];
  const pattern =
    /resistance to\s+(acid|cold|electricity|fire|sonic)(?:\s*(\d+))?/gi;
  for (const match of text.matchAll(pattern)) {
    const type = match[1].toLowerCase();
    const amount = match[2] ? Number.parseInt(match[2], 10) : null;
    parts.push(amount != null ? `${type} ${amount}` : type);
  }
  return parts.join(", ");
}

export function parseImmunities(text: string): string {
  const parts: string[] = [];
  const sleep = /immunity to sleep/i.test(text) ? "sleep" : null;
  const para = /immunity to paralysis/i.test(text) ? "paralysis" : null;
  if (sleep) parts.push(sleep);
  if (para) parts.push(para);
  const generic = text.match(/immunity to\s+([^.+\n,;]+)/gi);
  if (generic) {
    for (const m of generic) {
      const inner = m.replace(/^immunity to\s+/i, "").trim();
      if (inner && !parts.includes(inner.toLowerCase())) parts.push(inner);
    }
  }
  return parts.join(", ");
}

export function parseSensesFromText(text: string): PcSensesState {
  return {
    darkvisionFeet: parseDarkvisionFeet(text),
    lowLight: parseLowLightVision(text),
    scent: parseScent(text),
    extra: "",
  };
}

export function formatSensesLine(senses: PcSensesState, override?: string | null): string {
  if (override?.trim()) return override.trim();
  const parts: string[] = [];
  if (senses.darkvisionFeet > 0) parts.push(`Darkvision ${senses.darkvisionFeet} ft.`);
  if (senses.lowLight) parts.push("Low-light vision");
  if (senses.scent) parts.push("Scent");
  if (senses.extra.trim()) parts.push(senses.extra.trim());
  return parts.join(", ");
}

export function formatDefensesLine(defenses: PcDefensesState): string {
  const parts: string[] = [];
  if (defenses.dr.trim()) parts.push(`DR ${defenses.dr.trim()}`);
  if (defenses.resistances.trim()) parts.push(`Resist ${defenses.resistances.trim()}`);
  if (defenses.immunities.trim()) parts.push(`Immune ${defenses.immunities.trim()}`);
  if (defenses.vulnerabilities.trim()) parts.push(`Vulnerable ${defenses.vulnerabilities.trim()}`);
  if (defenses.extra.trim()) parts.push(defenses.extra.trim());
  return parts.join("; ");
}

/** Vision range in grid squares from senses (default 12 when normal vision). */
export function visionRangeSquaresFromSenses(
  senses: PcSensesState,
  scaleFeet = 5,
): number {
  const scale = scaleFeet > 0 ? scaleFeet : 5;
  if (senses.darkvisionFeet > 0) return Math.max(1, Math.round(senses.darkvisionFeet / scale));
  if (senses.lowLight) return 12;
  return 12;
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
  const speedUnhinderedByEncumbrance = parseSpeedUnhinderedByEncumbrance(text);
  const senses = parseSensesFromText(text);
  const languages = parseRacialLanguages(text);
  const defenses: PcDefensesState = {
    dr: parseDamageReduction(text),
    resistances: parseEnergyResistance(text),
    immunities: parseImmunities(text),
    vulnerabilities: "",
    extra: "",
  };

  return {
    traits,
    abilityMods,
    skillBonuses,
    skillPointBonus,
    saveBonus,
    naturalArmor,
    sizeMod,
    speed,
    speedUnhinderedByEncumbrance,
    senses,
    languages,
    defenses,
  };
}
