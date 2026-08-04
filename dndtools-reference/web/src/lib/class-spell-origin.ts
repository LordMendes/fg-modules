import {
  getClassCastingInfo,
  usesDirectClassSpellList,
} from "@/lib/pc-planner/classCasting";

/** Parse the compendium class a variant inherits its spell list from. */
export function parseClassSpellOriginSlug(
  descriptionHtml: string | null | undefined,
  className?: string,
  classSlug?: string,
): string | null {
  if (!descriptionHtml) return null;

  const baseClassMatch = descriptionHtml.match(/base class,\s*<a href="\/classes\/([^"]+)">/i);
  if (baseClassMatch?.[1]) return baseClassMatch[1];

  const castMatch = descriptionHtml.match(/cast[\s\S]{0,160}?href="\/classes\/([^"]+)"/i);
  if (castMatch?.[1]) return castMatch[1];

  if (className && classSlug) {
    const info = getClassCastingInfo(classSlug, className);
    if (info && !usesDirectClassSpellList(classSlug, className)) {
      const baseLower = info.fgClassName.toLowerCase();
      const baseLink = new RegExp(
        `<a href="/classes/([^"]+)">\\s*${escapeRegExp(baseLower)}\\s*<`,
        "i",
      );
      const linked = descriptionHtml.match(baseLink);
      if (linked?.[1]) return linked[1];
    }
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the class slug/name identifies a UA-style caster variant, not the base list slug. */
export function isCastingClassVariant(classSlug: string, className?: string): boolean {
  const info = getClassCastingInfo(classSlug, className);
  if (!info) return false;
  return !usesDirectClassSpellList(classSlug, className);
}

export function readStoredSpellListOriginSlug(indexData: unknown): string | null {
  const index = indexData as Record<string, unknown> | null;
  const slug = index?.spellListOriginSlug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

/** Pick the base-class slug with the largest known spell list for a casting type. */
export function pickLargestSpellListSlug(
  rows: Iterable<{ classSlug: string }>,
  originPrefix: string,
): string | null {
  const prefix = `${originPrefix.toLowerCase()}-`;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const slugLower = row.classSlug.toLowerCase();
    if (!slugLower.startsWith(prefix)) continue;
    counts.set(row.classSlug, (counts.get(row.classSlug) ?? 0) + 1);
  }

  let bestSlug: string | null = null;
  let bestCount = 0;
  for (const [slug, count] of counts) {
    if (count > bestCount) {
      bestSlug = slug;
      bestCount = count;
    }
  }
  return bestSlug;
}

export function resolveClassSpellOriginSlug(input: {
  classSlug: string;
  className?: string;
  descriptionHtml?: string | null;
  indexData?: unknown;
  directSpellLinkCount: number;
  fallbackOriginSlug?: string | null;
}): string {
  if (input.directSpellLinkCount > 0) {
    return input.classSlug;
  }

  const stored = readStoredSpellListOriginSlug(input.indexData);
  const parsed =
    stored ??
    parseClassSpellOriginSlug(input.descriptionHtml, input.className, input.classSlug);

  if (parsed && parsed !== input.classSlug) {
    return parsed;
  }

  if (
    input.fallbackOriginSlug &&
    input.fallbackOriginSlug !== input.classSlug &&
    isCastingClassVariant(input.classSlug, input.className)
  ) {
    return input.fallbackOriginSlug;
  }

  return input.classSlug;
}
