import type { SkillCatalogEntry } from "@/lib/entities";
import type { SkillRow } from "./types";

export const SPECIALTY_FAMILIES = ["craft", "knowledge", "profession", "perform"] as const;
export type SpecialtyFamily = (typeof SPECIALTY_FAMILIES)[number];

export const SPECIALTY_FAMILY_LABELS: Record<SpecialtyFamily, string> = {
  craft: "Craft",
  knowledge: "Knowledge",
  profession: "Profession",
  perform: "Perform",
};

const SPECIALTY_NAME_RE = /^(Craft|Knowledge|Profession|Perform)\s*\((.+)\)$/i;

export const CRAFT_VARIANT_PRESETS = [
  "alchemy",
  "armorsmithing",
  "blacksmithing",
  "bowmaking",
  "carpentry",
  "leatherworking",
  "pottery",
  "sculpting",
  "stonemasonry",
  "trapmaking",
  "weaponsmithing",
  "weaving",
] as const;

export const PROFESSION_VARIANT_PRESETS = [
  "apothecary",
  "boater",
  "bookkeeper",
  "brewer",
  "cook",
  "driver",
  "farmer",
  "fisher",
  "guide",
  "herbalist",
  "herder",
  "hunter",
  "innkeeper",
  "lumberjack",
  "miller",
  "miner",
  "porter",
  "rancher",
  "sailor",
  "scribe",
  "siege engineer",
  "stablehand",
  "tanner",
  "teamster",
  "woodcutter",
] as const;

export const PERFORM_VARIANT_PRESETS = [
  "act",
  "comedy",
  "dance",
  "keyboard instruments",
  "oratory",
  "percussion instruments",
  "sing",
  "string instruments",
  "wind instruments",
] as const;

export function coerceSkillRanks(ranks: number): number {
  if (!Number.isFinite(ranks) || ranks <= 0) return 0;
  return Math.max(0, Math.trunc(ranks));
}

export function parseSpecialtySkill(
  name: string,
  slug?: string | null,
): { family: SpecialtyFamily; variant: string } | null {
  const match = name.trim().match(SPECIALTY_NAME_RE);
  if (match) {
    return {
      family: match[1].toLowerCase() as SpecialtyFamily,
      variant: match[2].trim(),
    };
  }
  if (!slug) return null;
  for (const family of SPECIALTY_FAMILIES) {
    if (slug === family) return null;
    if (slug.includes("variant")) continue;
    if (slug.startsWith(`${family}-`)) {
      const rest = slug.slice(family.length + 1).replace(/-/g, " ").trim();
      if (!rest) return null;
      return { family, variant: rest };
    }
  }
  return null;
}

export function isGenericFamilySkill(name: string, slug?: string | null): boolean {
  if (SPECIALTY_NAME_RE.test(name.trim())) return false;
  const lower = name.trim().toLowerCase();
  if ((SPECIALTY_FAMILIES as readonly string[]).includes(lower)) return true;
  if (slug && (SPECIALTY_FAMILIES as readonly string[]).includes(slug)) return true;
  if (slug) {
    for (const family of SPECIALTY_FAMILIES) {
      if (slug.startsWith(`${family}-`) && slug.includes("variant")) return true;
    }
  }
  return false;
}

export function isSpecialtySkill(name: string, slug?: string | null): boolean {
  return parseSpecialtySkill(name, slug) != null;
}

/** Family slug (`craft`) when this row is a Craft/Knowledge/Profession/Perform variant. */
export function specialtyFamilyKey(name: string, slug?: string | null): SpecialtyFamily | null {
  return parseSpecialtySkill(name, slug)?.family ?? null;
}

export function formatSpecialtySkillName(family: SpecialtyFamily, variant: string): string {
  return `${SPECIALTY_FAMILY_LABELS[family]} (${normalizeVariant(variant)})`;
}

export function normalizeVariant(variant: string): string {
  return variant.trim().replace(/\s+/g, " ");
}

export function slugifySpecialtyVariant(variant: string): string {
  return normalizeVariant(variant)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function specialtyDuplicateKey(name: string, slug?: string | null): string {
  const parsed = parseSpecialtySkill(name, slug);
  if (parsed) return `${parsed.family}:${normalizeVariant(parsed.variant).toLowerCase()}`;
  return (slug ?? name).toLowerCase();
}

export function findFamilyCatalogEntry(
  family: SpecialtyFamily,
  catalog: SkillCatalogEntry[],
): SkillCatalogEntry | undefined {
  const bySlug = catalog.find((entry) => entry.slug === family);
  if (bySlug) return bySlug;
  return catalog.find(
    (entry) =>
      entry.name.toLowerCase() === family && isGenericFamilySkill(entry.name, entry.slug),
  );
}

export function findCatalogSpecialty(
  family: SpecialtyFamily,
  variant: string,
  catalog: SkillCatalogEntry[],
): SkillCatalogEntry | undefined {
  const name = formatSpecialtySkillName(family, variant).toLowerCase();
  return catalog.find(
    (entry) =>
      entry.name.toLowerCase() === name && !isGenericFamilySkill(entry.name, entry.slug),
  );
}

export function specialtyPreviewSlug(
  row: Pick<SkillRow, "name" | "slug">,
  catalog: SkillCatalogEntry[],
): string | null {
  if (row.slug && catalog.some((entry) => entry.slug === row.slug)) return row.slug;
  const family = specialtyFamilyKey(row.name, row.slug);
  if (family) {
    return findFamilyCatalogEntry(family, catalog)?.slug ?? family;
  }
  return row.slug ?? null;
}

export function specialtyVariantOptions(
  family: SpecialtyFamily,
  catalog: SkillCatalogEntry[],
): string[] {
  const fromCatalog = catalog
    .map((entry) => parseSpecialtySkill(entry.name, entry.slug))
    .filter((parsed): parsed is NonNullable<typeof parsed> => parsed?.family === family)
    .map((parsed) => parsed.variant);
  const presets =
    family === "craft"
      ? CRAFT_VARIANT_PRESETS
      : family === "profession"
        ? PROFESSION_VARIANT_PRESETS
        : family === "perform"
          ? PERFORM_VARIANT_PRESETS
          : [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const variant of [...presets, ...fromCatalog]) {
    const key = normalizeVariant(variant).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push(normalizeVariant(variant));
  }
  return options.sort((a, b) => a.localeCompare(b));
}

export function canRemoveSpecialtyRow(
  row: Pick<SkillRow, "name" | "slug">,
  classSkillKeys: Set<string>,
): boolean {
  if (!isSpecialtySkill(row.name, row.slug)) return false;
  const key = row.slug ?? row.name.toLowerCase();
  return !classSkillKeys.has(key);
}

export function createSpecialtySkillRow(
  family: SpecialtyFamily,
  variant: string,
  catalog: SkillCatalogEntry[],
  existing: SkillRow[],
): SkillRow | null {
  const trimmed = normalizeVariant(variant);
  if (!trimmed) return null;
  const name = formatSpecialtySkillName(family, trimmed);
  const dupKey = specialtyDuplicateKey(name);
  const already = existing.some(
    (row) => specialtyDuplicateKey(row.name, row.slug) === dupKey,
  );
  if (already) return null;

  const catalogMatch = findCatalogSpecialty(family, trimmed, catalog);
  const familyEntry = findFamilyCatalogEntry(family, catalog);
  const slug =
    catalogMatch?.slug ?? `${family}-${slugifySpecialtyVariant(trimmed) || "custom"}`;

  return {
    name,
    slug,
    ability: catalogMatch?.ability ?? familyEntry?.ability ?? null,
    ranks: 0,
    misc: 0,
    racialMisc: 0,
    trainedOnly: catalogMatch?.trainedOnly ?? familyEntry?.trainedOnly ?? false,
    armorCheckPenalty: catalogMatch?.armorCheckPenalty ?? familyEntry?.armorCheckPenalty ?? false,
  };
}
