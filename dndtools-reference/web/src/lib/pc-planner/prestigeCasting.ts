import { getClassCastingInfo } from "./classCasting";
import type { ClassLevelEntry, SpellClassState } from "./types";

/** Known PrC slug/name → base casting class slug prefixes they advance. */
const PRESTIGE_CASTER_STACK: Record<string, string[]> = {
  "eldritch-knight": ["wizard", "sorcerer", "bard"],
  "loremaster": ["wizard", "sorcerer", "bard"],
  "archmage": ["wizard"],
  "hierophant": ["cleric", "druid"],
  "thaumaturgist": ["wizard", "sorcerer"],
};

export type PrestigeCasterContribution = {
  prestigeSlug: string;
  prestigeName: string;
  prestigeLevel: number;
  /** Base class slug prefixes this PrC advances. */
  targets: string[];
};

function slugBase(slug: string): string {
  const lower = slug.toLowerCase();
  const dash = lower.indexOf("-");
  return dash > 0 ? lower.slice(0, dash) : lower;
}

export function prestigeCasterTargets(classSlug: string, className: string): string[] {
  const slugLower = classSlug.toLowerCase();
  for (const [key, targets] of Object.entries(PRESTIGE_CASTER_STACK)) {
    if (slugLower === key || slugLower.startsWith(`${key}-`)) return targets;
  }
  const nameLower = className.toLowerCase();
  for (const [key, targets] of Object.entries(PRESTIGE_CASTER_STACK)) {
    if (nameLower.includes(key.replace(/-/g, " "))) return targets;
  }
  return [];
}

/** Parse "+1 level of existing spellcasting class" from class description. */
export function parsePrestigeCasterTargetsFromText(text: string): string[] {
  if (!/\+1 level of (?:an )?existing spellcasting class/i.test(text)) return [];
  const targets: string[] = [];
  if (/wizard/i.test(text)) targets.push("wizard");
  if (/sorcerer/i.test(text)) targets.push("sorcerer");
  if (/cleric/i.test(text)) targets.push("cleric");
  if (/druid/i.test(text)) targets.push("druid");
  if (/bard/i.test(text)) targets.push("bard");
  if (/paladin/i.test(text)) targets.push("paladin");
  if (/ranger/i.test(text)) targets.push("ranger");
  if (targets.length === 0) {
    return ["wizard", "sorcerer", "cleric", "druid", "bard"];
  }
  return targets;
}

export function collectPrestigeCasterContributions(
  classLevels: ClassLevelEntry[],
  classDescriptions: ReadonlyMap<string, string> = new Map(),
): PrestigeCasterContribution[] {
  const out: PrestigeCasterContribution[] = [];
  for (const cl of classLevels) {
    const info = getClassCastingInfo(cl.classSlug, cl.className);
    if (info) continue;
    let targets = prestigeCasterTargets(cl.classSlug, cl.className);
    const desc = classDescriptions.get(cl.classSlug);
    if (desc) {
      const fromText = parsePrestigeCasterTargetsFromText(desc);
      if (fromText.length > 0) targets = fromText;
    }
    if (targets.length === 0) continue;
    out.push({
      prestigeSlug: cl.classSlug,
      prestigeName: cl.className,
      prestigeLevel: cl.level,
      targets,
    });
  }
  return out;
}

export function stackedCasterLevel(
  spellClass: SpellClassState,
  classLevels: ClassLevelEntry[],
  contributions: PrestigeCasterContribution[],
): number {
  const base = classLevels.find((cl) => cl.classSlug === spellClass.classSlug);
  const baseLevel = base?.level ?? spellClass.casterLevel;
  const basePrefix = slugBase(spellClass.classSlug);
  let bonus = 0;
  for (const contrib of contributions) {
    const matches =
      contrib.targets.some((t) => slugBase(t) === basePrefix) ||
      (spellClass.casterProgressionFrom ?? []).includes(contrib.prestigeSlug);
    if (matches) bonus += contrib.prestigeLevel;
  }
  return baseLevel + bonus;
}

export function isPrestigeOnlyCasterClass(
  classSlug: string,
  className: string,
  classDescriptions: ReadonlyMap<string, string>,
): boolean {
  if (getClassCastingInfo(classSlug, className)) return false;
  const targets =
    prestigeCasterTargets(classSlug, className).length > 0 ||
    parsePrestigeCasterTargetsFromText(classDescriptions.get(classSlug) ?? "").length > 0;
  return targets;
}
