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
  paladin: { dcAbility: "cha", progression: "half", fgClassName: "Paladin" },
};

const CASTING_BY_NAME: Record<string, ClassCastingInfo> = Object.fromEntries(
  Object.values(CASTING_BY_SLUG).map((info) => [info.fgClassName.toLowerCase(), info]),
);

function matchCastingBySlug(classSlug: string): ClassCastingInfo | null {
  const slugLower = classSlug.toLowerCase();
  for (const [key, info] of Object.entries(CASTING_BY_SLUG)) {
    if (slugLower === key || slugLower.startsWith(`${key}-`)) return info;
  }
  return null;
}

function matchCastingByName(className: string): ClassCastingInfo | null {
  const nameLower = className.toLowerCase();
  const exact = CASTING_BY_NAME[nameLower];
  if (exact) return exact;
  for (const [key, info] of Object.entries(CASTING_BY_SLUG)) {
    if (nameLower.includes(key)) return info;
  }
  return null;
}

export function getClassCastingInfo(classSlug: string, className?: string): ClassCastingInfo | null {
  return matchCastingBySlug(classSlug) ?? (className ? matchCastingByName(className) : null);
}

export function spellModeFromProgression(progression: CastingProgression): SpellMode {
  return progression === "spontaneous" ? "spontaneous" : "preparation";
}

export function castingModeLabel(mode: SpellMode): string {
  return mode === "spontaneous" ? "Spontaneous" : "Prepared";
}

export function isPreparedCaster(info: ClassCastingInfo): boolean {
  return info.progression === "prepared";
}
