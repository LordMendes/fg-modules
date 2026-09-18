export type HomeSourcePickable = {
  id: string;
  name: string;
  abbrev: string | null;
  edition: string;
  counts: number;
};

/** Core 3.5 books to surface first in the home sources dialog. */
export const FEATURED_SOURCE_ABBREVS = [
  "PH",
  "DMG",
  "MM",
  "Sc",
  "CAd",
  "CAr",
  "CD",
  "CW",
  "UA",
  "XPH",
  "PH2",
  "MIC",
] as const;

export function flattenSourcesByEdition<T>(
  sourcesByEdition: Record<string, T[]>,
): T[] {
  return Object.values(sourcesByEdition).flat();
}

function preferFeaturedSource(
  a: HomeSourcePickable,
  b: HomeSourcePickable,
): number {
  const a35 = a.edition.includes("3.5") ? 1 : 0;
  const b35 = b.edition.includes("3.5") ? 1 : 0;
  if (a35 !== b35) return b35 - a35;
  return b.counts - a.counts;
}

export function pickFeaturedSources(
  sources: readonly HomeSourcePickable[],
): HomeSourcePickable[] {
  const byAbbrev = new Map<string, HomeSourcePickable[]>();
  for (const source of sources) {
    if (!source.abbrev) continue;
    const list = byAbbrev.get(source.abbrev) ?? [];
    list.push(source);
    byAbbrev.set(source.abbrev, list);
  }

  const featured: HomeSourcePickable[] = [];
  for (const abbrev of FEATURED_SOURCE_ABBREVS) {
    const matches = byAbbrev.get(abbrev);
    if (!matches?.length) continue;
    const best = [...matches].sort(preferFeaturedSource)[0];
    if (best) featured.push(best);
  }
  return featured;
}

export function remainingSourceCount(
  total: number,
  featuredCount: number,
): number {
  return Math.max(0, total - featuredCount);
}

export function sourceDisplayName(source: { name: string }): string {
  return source.name;
}
