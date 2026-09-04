import type { AbilityKey, SpellMode } from "./types";

export type CastingProgression = "prepared" | "spontaneous" | "half";

export type ClassCastingInfo = {
  dcAbility: AbilityKey;
  progression: CastingProgression;
  /** FG class label used for slot tables */
  fgClassName: string;
};

const CASTING_BY_SLUG: Record<string, ClassCastingInfo> = {
  wizard: { dcAbility: "int", progression: "prepared", fgClassName: "Wizard" },
  sorcerer: { dcAbility: "cha", progression: "spontaneous", fgClassName: "Sorcerer" },
  cleric: { dcAbility: "wis", progression: "prepared", fgClassName: "Cleric" },
  druid: { dcAbility: "wis", progression: "prepared", fgClassName: "Druid" },
  bard: { dcAbility: "cha", progression: "spontaneous", fgClassName: "Bard" },
  ranger: { dcAbility: "wis", progression: "half", fgClassName: "Ranger" },
  paladin: { dcAbility: "wis", progression: "half", fgClassName: "Paladin" },
};

const CASTING_BY_NAME: Record<string, ClassCastingInfo> = Object.fromEntries(
  Object.values(CASTING_BY_SLUG).map((info) => [info.fgClassName.toLowerCase(), info]),
);

function matchCastingBySlug(classSlug: string): ClassCastingInfo | null {
  const slugLower = classSlug.toLowerCase();
  for (const [key, info] of Object.entries(CASTING_BY_SLUG)) {
    if (slugLower === key || slugLower.startsWith(`${key}-`)) {
      return info;
    }
  }
  return null;
}

function matchCastingByName(className: string): ClassCastingInfo | null {
  const nameLower = className.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CASTING_BY_NAME, nameLower)) {
    return CASTING_BY_NAME[nameLower];
  }
  return null;
}

export function getClassCastingInfo(classSlug: string, className?: string): ClassCastingInfo | null {
  return matchCastingBySlug(classSlug) ?? (className ? matchCastingByName(className) : null);
}

/** True when spell-class rows use the PHB slot table (not a UA-style variant slug). */
export function usesDirectClassSpellList(classSlug: string, className?: string): boolean {
  const info = getClassCastingInfo(classSlug, className);
  if (!info) return false;
  const base = info.fgClassName.toLowerCase();
  const slugLower = classSlug.toLowerCase();
  return slugLower === base || slugLower.startsWith(`${base}-`);
}

export function spellListSlugPrefix(classSlug: string, className?: string): string | null {
  const info = getClassCastingInfo(classSlug, className);
  return info ? info.fgClassName.toLowerCase() : null;
}

export function spellModeFromProgression(progression: CastingProgression): SpellMode {
  return progression === "spontaneous" ? "spontaneous" : "preparation";
}

/** Half-caster effective CL: 0 below class level 4, else classLevel − 3. */
export function halfCasterEffectiveLevel(classLevel: number): number {
  if (classLevel < 4) return 0;
  return classLevel - 3;
}

export function castingModeLabel(mode: SpellMode): string {
  return mode === "spontaneous" ? "Spontaneous" : "Prepared";
}

export function isPreparedCaster(info: ClassCastingInfo): boolean {
  return info.progression === "prepared" || info.progression === "half";
}

export function isHalfCaster(info: ClassCastingInfo | null | undefined): boolean {
  return info?.progression === "half";
}
