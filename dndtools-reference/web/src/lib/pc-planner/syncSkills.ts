import type { ClassSkillRef, SkillCatalogEntry } from "@/lib/entities";
import type { SkillRow } from "./types";

export function skillRowKey(name: string, slug?: string | null): string {
  return slug ?? name.toLowerCase();
}

/** Build a set of class-skill keys from class skill refs. */
export function classSkillKeySet(classSkills: ClassSkillRef[]): Set<string> {
  return new Set(classSkills.map((ref) => skillRowKey(ref.name, ref.slug)));
}

/** Merge full skill catalog with existing rank data; preserve orphan custom rows. */
export function mergeSkillsIntoRows(
  allSkills: SkillCatalogEntry[],
  existing: SkillRow[],
): SkillRow[] {
  const existingByKey = new Map<string, SkillRow>();
  for (const row of existing) {
    existingByKey.set(skillRowKey(row.name, row.slug), row);
  }

  const mergedKeys = new Set<string>();
  const rows: SkillRow[] = allSkills.map((ref) => {
    const key = skillRowKey(ref.name, ref.slug);
    mergedKeys.add(key);
    const prev = existingByKey.get(key);
    return {
      name: ref.name,
      slug: ref.slug,
      ability: ref.ability ?? prev?.ability ?? null,
      ranks: prev?.ranks ?? 0,
      misc: prev?.misc ?? 0,
      racialMisc: prev?.racialMisc ?? 0,
      trainedOnly: ref.trainedOnly,
      armorCheckPenalty: ref.armorCheckPenalty,
    };
  });

  for (const row of existing) {
    const key = skillRowKey(row.name, row.slug);
    if (mergedKeys.has(key)) continue;
    rows.push({ ...row });
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
  return mergeSkillsIntoRows(
    classSkills.map((ref) => ({
      name: ref.name,
      slug: ref.slug,
      ability: ref.ability,
      trainedOnly: false,
      armorCheckPenalty: false,
    })),
    existing,
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
