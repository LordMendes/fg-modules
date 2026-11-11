/** Placeholder name used when scraped records lack a publication title. */
export const PLACEHOLDER_SOURCE_NAME = "Core";

/** Pick the best human-readable title from duplicate source rows sharing an abbrev. */
export function pickSourceDisplayName(names: Iterable<string>): string | null {
  let best: string | null = null;
  for (const name of names) {
    if (!name) continue;
    if (name === PLACEHOLDER_SOURCE_NAME) {
      if (!best) best = name;
      continue;
    }
    if (!best || best === PLACEHOLDER_SOURCE_NAME || name.length > best.length) {
      best = name;
    }
  }
  return best;
}

export function buildSourceDisplayNameMap(
  rows: readonly { name: string; abbrev: string | null }[],
): Map<string, string> {
  const namesByAbbrev = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.abbrev) continue;
    let names = namesByAbbrev.get(row.abbrev);
    if (!names) {
      names = new Set();
      namesByAbbrev.set(row.abbrev, names);
    }
    names.add(row.name);
  }

  const out = new Map<string, string>();
  for (const [abbrev, names] of namesByAbbrev) {
    const label = pickSourceDisplayName(names);
    if (!label) continue;
    out.set(abbrev, label === PLACEHOLDER_SOURCE_NAME ? abbrev : label);
  }
  return out;
}

/** Label for a search hit: book title, with the abbreviation when it adds information. */
export function formatSourceResultLabel(
  name: string | null | undefined,
  abbrev: string | null | undefined,
): string | null {
  const title = name && name !== PLACEHOLDER_SOURCE_NAME ? name.trim() : "";
  const short = abbrev?.trim() ?? "";
  if (title && short && title.toLowerCase() !== short.toLowerCase()) {
    return `${title} (${short})`;
  }
  return title || short || null;
}
