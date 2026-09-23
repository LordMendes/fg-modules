import type { ClassSkillRef, PcCompendiumBundle, SkillCatalogEntry } from "@/lib/entities";
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

export type MergeSkillsOptions = {
  /** When true, show skills from all sourcebooks (still one row per display name). */
  allSources?: boolean;
};

function catalogDisplayKey(name: string): string {
  return name.trim().toLowerCase();
}

function isVariantSlug(slug?: string | null): boolean {
  return Boolean(slug?.includes("variant"));
}

/** Lower rank = preferred canonical catalog entry for a display name. */
function catalogEntryRank(entry: SkillCatalogEntry): number {
  const slug = entry.slug ?? "";
  const isPh = entry.sourceAbbrev === "PH";
  if (!isVariantSlug(slug) && isPh) return 0;
  if (!isVariantSlug(slug)) return 1;
  return 2;
}

/** One catalog row per display name; prefer PH core over splatbook variant pages. */
export function collapseCatalogByName(allSkills: SkillCatalogEntry[]): SkillCatalogEntry[] {
  const byName = new Map<string, SkillCatalogEntry>();
  for (const skill of allSkills) {
    const key = catalogDisplayKey(skill.name);
    const prev = byName.get(key);
    if (!prev || catalogEntryRank(skill) < catalogEntryRank(prev)) {
      byName.set(key, skill);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
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

function shouldIncludeInScope(
  skill: SkillCatalogEntry,
  allSources: boolean,
  classSkillKeys: Set<string>,
  existingKeys: Set<string>,
): boolean {
  if (!shouldIncludeCatalogSkill(skill, classSkillKeys, existingKeys)) return false;
  if (allSources) return true;
  if (skill.sourceAbbrev === "PH") return true;
  const key = skillRowKey(skill.name, skill.slug);
  if (classSkillKeys.has(key)) return true;
  if (existingKeys.has(key)) return true;
  return false;
}

function mergeRowOntoCanonical(row: SkillRow, canonical?: SkillCatalogEntry): SkillRow {
  if (!canonical) {
    return { ...row, ranks: coerceSkillRanks(row.ranks) };
  }
  return {
    name: canonical.name,
    slug: canonical.slug,
    ability: canonical.ability ?? row.ability ?? null,
    ranks: coerceSkillRanks(row.ranks),
    misc: row.misc ?? 0,
    racialMisc: row.racialMisc ?? 0,
    trainedOnly: canonical.trainedOnly,
    armorCheckPenalty: canonical.armorCheckPenalty,
  };
}

function combineExistingSkillRows(
  a: SkillRow,
  b: SkillRow,
  canonical?: SkillCatalogEntry,
): SkillRow {
  const ranks = Math.max(coerceSkillRanks(a.ranks), coerceSkillRanks(b.ranks));
  const misc = ranks === coerceSkillRanks(a.ranks) ? (a.misc ?? 0) : (b.misc ?? 0);
  const racialMisc =
    ranks === coerceSkillRanks(a.ranks) ? (a.racialMisc ?? 0) : (b.racialMisc ?? 0);
  return mergeRowOntoCanonical({ ...a, ranks, misc, racialMisc }, canonical);
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

/** Merge skill catalog with existing rank data; preserve orphan custom rows. */
export function mergeSkillsIntoRows(
  allSkills: SkillCatalogEntry[],
  existing: SkillRow[],
  classSkillKeys: Set<string> = new Set(),
  options: MergeSkillsOptions = {},
): SkillRow[] {
  const allSources = Boolean(options.allSources);
  const collapsed = collapseCatalogByName(allSkills);
  const canonicalByDisplay = new Map<string, SkillCatalogEntry>();
  for (const skill of collapsed) {
    canonicalByDisplay.set(catalogDisplayKey(skill.name), skill);
  }

  const existingByCanonical = new Map<string, SkillRow>();
  for (const row of existing) {
    if (isGenericFamilySkill(row.name, row.slug)) continue;
    const canonical = canonicalByDisplay.get(catalogDisplayKey(row.name));
    const key = canonical
      ? skillRowKey(canonical.name, canonical.slug)
      : skillRowKey(row.name, row.slug);
    const merged = mergeRowOntoCanonical(row, canonical);
    const prev = existingByCanonical.get(key);
    existingByCanonical.set(
      key,
      prev ? combineExistingSkillRows(prev, merged, canonical) : merged,
    );
  }
  const existingKeys = new Set(existingByCanonical.keys());

  const mergedKeys = new Set<string>();
  const rows: SkillRow[] = [];
  for (const ref of collapsed) {
    if (!shouldIncludeInScope(ref, allSources, classSkillKeys, existingKeys)) continue;
    const key = skillRowKey(ref.name, ref.slug);
    mergedKeys.add(key);
    rows.push(toSkillRow(ref, existingByCanonical.get(key)));
  }

  for (const [key, row] of existingByCanonical) {
    if (mergedKeys.has(key)) continue;
    rows.push(row);
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

/** Merge compendium catalog + class skills into sheet rows. */
export function mergeCompendiumSkills(
  bundle: Pick<PcCompendiumBundle, "allSkills" | "skills">,
  existing: SkillRow[],
  options: MergeSkillsOptions = {},
): SkillRow[] {
  const catalog =
    bundle.allSkills.length > 0
      ? bundle.allSkills
      : bundle.skills.map((ref) => ({
          name: ref.name,
          slug: ref.slug,
          ability: ref.ability,
          trainedOnly: false,
          armorCheckPenalty: false,
        }));
  return mergeSkillsIntoRows(
    catalog,
    existing,
    classSkillKeySet(bundle.skills),
    options,
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
