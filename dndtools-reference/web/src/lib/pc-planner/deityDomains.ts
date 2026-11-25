/**
 * Cleric domains granted by a deity.
 *
 * The compendium does not store domains on deity records. This list is the
 * Player's Handbook cleric deity table (also in the cleric class description).
 * Ehlonna's Sun domain is restored: the scraped table splits "Sun" into the
 * worshipers cell ("Sun Elves...").
 */

const DEITY_DOMAINS: Record<string, readonly string[]> = {
  heironeous: ["Good", "Law", "War"],
  moradin: ["Earth", "Good", "Law", "Protection"],
  yondalla: ["Good", "Law", "Protection"],
  ehlonna: ["Animal", "Good", "Plant", "Sun"],
  "garl-glittergold": ["Good", "Protection", "Trickery"],
  pelor: ["Good", "Healing", "Strength", "Sun"],
  "corellon-larethian": ["Chaos", "Good", "Protection", "War"],
  kord: ["Chaos", "Good", "Luck", "Strength"],
  "wee-jas": ["Death", "Law", "Magic"],
  "st-cuthbert": ["Destruction", "Law", "Protection", "Strength"],
  boccob: ["Knowledge", "Magic", "Trickery"],
  fharlanghn: ["Luck", "Protection", "Travel"],
  "obad-hai": ["Air", "Animal", "Earth", "Fire", "Plant", "Water"],
  olidammara: ["Chaos", "Luck", "Trickery"],
  hextor: ["Destruction", "Evil", "Law", "War"],
  nerull: ["Death", "Evil", "Trickery"],
  vecna: ["Evil", "Knowledge", "Magic"],
  erythnul: ["Chaos", "Evil", "Trickery", "War"],
  gruumsh: ["Chaos", "Evil", "Strength", "War"],
};

export function normalizeDeityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Domains for the selected deity.
 * `null` when no deity is selected (any domain may be chosen).
 * An empty array when the deity is set but has no recorded domains.
 */
export function deityDomainNames(
  slug: string | null | undefined,
  name?: string | null,
): readonly string[] | null {
  const slugKey = slug?.trim() ? normalizeDeityKey(slug) : "";
  const nameKey = name?.trim() ? normalizeDeityKey(name) : "";
  if (!slugKey && !nameKey) return null;
  return DEITY_DOMAINS[slugKey] ?? (nameKey ? DEITY_DOMAINS[nameKey] : undefined) ?? [];
}

export function domainNameAllowed(
  domainName: string,
  allowed: readonly string[] | null,
): boolean {
  if (allowed == null) return true;
  const key = domainName.trim().toLowerCase();
  return allowed.some((name) => name.toLowerCase() === key);
}
