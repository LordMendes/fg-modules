import type { AbilityKey } from "./types";

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

export function getClassCastingInfo(classSlug: string, className?: string): ClassCastingInfo | null {
  const bySlug = CASTING_BY_SLUG[classSlug.toLowerCase()];
  if (bySlug) return bySlug;
  if (className) {
    return CASTING_BY_NAME[className.toLowerCase()] ?? null;
  }
  return null;
}

export function isPreparedCaster(info: ClassCastingInfo): boolean {
  return info.progression === "prepared";
}
