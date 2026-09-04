import type { ClassSkillRef, SkillCatalogEntry } from "@/lib/entities";
import {
  coerceSkillRanks,
  isGenericFamilySkill,
  isSpecialtySkill,
} from "./skillSpecialty";
import type { SkillRow } from "./types";

export function skillRowKey(name: string, slug?: string | null): string {
  return slug ?? name.toLowerCase();
}

/** Build a set of class-skill keys from class skill refs. */
export function classSkillKeySet(classSkills: ClassSkillRef[]): Set<string> {
  return new Set(classSkills.map((ref) => skillRowKey(ref.name, ref.slug)));
}

function shouldIncludeCatalogSkill(
  skill: SkillCatalogEntry,
  classSkillKeys: Set<string>,
  existingKeys: Set<string>,
): boolean {
  if (isGenericFamilySkill(skill.name, skill.slug)) return false;
  if (!isSpecialtySkill(skill.name, skill.slug)) return true;
  const key = skillRowKey(skill.name, skill.slug);
  return classSkillKeys.has(key) || existingKeys.has(key);
}

function toSkillRow(ref: SkillCatalogEntry, prev?: SkillRow): SkillRow {
  return {
    name: ref.name,
    slug: ref.slug,
    ability: ref.ability ?? prev?.ability ?? null,
    ranks: coerceSkillRanks(prev?.ranks ?? 0),
    misc: prev?.misc ?? 0,
    racialMisc: prev?.racialMisc ?? 0,
    trainedOnly: ref.trainedOnly,
    armorCheckPenalty: ref.armorCheckPenalty,
  };
}

/** Merge full skill catalog with existing rank data; preserve orphan custom rows. */
export function mergeSkillsIntoRows(
  allSkills: SkillCatalogEntry[],
  existing: SkillRow[],
  classSkillKeys: Set<string> = new Set(),
): SkillRow[] {
  const existingByKey = new Map<string, SkillRow>();
  for (const row of existing) {
    existingByKey.set(skillRowKey(row.name, row.slug), row);
  }
  const existingKeys = new Set(existingByKey.keys());

  const mergedKeys = new Set<string>();
  const rows: SkillRow[] = [];
  for (const ref of allSkills) {
    if (!shouldIncludeCatalogSkill(ref, classSkillKeys, existingKeys)) continue;
    const key = skillRowKey(ref.name, ref.slug);
    mergedKeys.add(key);
    rows.push(toSkillRow(ref, existingByKey.get(key)));
  }

  for (const row of existing) {
    if (isGenericFamilySkill(row.name, row.slug)) continue;
    const key = skillRowKey(row.name, row.slug);
    if (mergedKeys.has(key)) continue;
    rows.push({
      ...row,
      ranks: coerceSkillRanks(row.ranks),
    });
  }

  return rows;
}

/**
 * @deprecated Prefer mergeSkillsIntoRows with the full catalog.
 * Kept for tests and callers that only have class skills.
 */
export function mergeClassSkillsIntoRows(
  classSkills: ClassSkillRef[],
  existing: SkillRow[],
): SkillRow[] {
  const keys = classSkillKeySet(classSkills);
  return mergeSkillsIntoRows(
    classSkills.map((ref) => ({
      name: ref.name,
      slug: ref.slug,
      ability: ref.ability,
      trainedOnly: false,
      armorCheckPenalty: false,
    })),
    existing,
    keys,
  );
}

export function classSlugsKey(classSlugs: string[]): string {
  return [...new Set(classSlugs.filter(Boolean))].sort().join("\0");
}

export function compendiumSyncKey(
  classLevels: { classSlug: string; level: number }[],
  raceSlug?: string | null,
): string {
  const classes = classLevels
    .map((cl) => `${cl.classSlug}:${cl.level}`)
    .sort()
    .join("|");
  return `${classes}\0${raceSlug ?? ""}`;
}
