import type { ClassSkillRef } from "@/lib/entities";
import type { SkillRow } from "./types";

function skillKey(name: string, slug?: string | null): string {
  return slug ?? name.toLowerCase();
}

/** Merge compendium class skills with existing rank data (multiclass = union). */
export function mergeClassSkillsIntoRows(
  classSkills: ClassSkillRef[],
  existing: SkillRow[],
): SkillRow[] {
  const existingByKey = new Map<string, SkillRow>();
  for (const row of existing) {
    existingByKey.set(skillKey(row.name, row.slug), row);
  }

  return classSkills.map((ref) => {
    const key = skillKey(ref.name, ref.slug);
    const prev = existingByKey.get(key);
    return {
      name: ref.name,
      slug: ref.slug,
      ability: ref.ability,
      ranks: prev?.ranks ?? 0,
      misc: prev?.misc ?? 0,
      racialMisc: prev?.racialMisc ?? 0,
    };
  });
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
