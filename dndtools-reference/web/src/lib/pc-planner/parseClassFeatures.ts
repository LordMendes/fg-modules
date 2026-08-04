export type ClassAbilityEntry = {
  className: string;
  classSlug: string;
  level: number;
  name: string;
};

type AdvancementRow = {
  level?: number;
  special?: string;
};

function parseAdvancementLevel(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    if (match) return Number.parseInt(match[0], 10);
  }
  return null;
}

function splitSpecialNames(special: string): string[] {
  return special
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== "—" && part !== "-");
}

/** Class special abilities gained at or below the character's level in that class. */
export function parseClassAbilities(
  advancement: unknown,
  classSlug: string,
  className: string,
  classLevel: number,
): ClassAbilityEntry[] {
  if (!Array.isArray(advancement) || classLevel <= 0) return [];

  const entries: ClassAbilityEntry[] = [];
  for (const row of advancement as AdvancementRow[]) {
    const level = parseAdvancementLevel(row.level);
    if (level == null || level > classLevel) continue;
    const special = typeof row.special === "string" ? row.special : "";
    for (const name of splitSpecialNames(special)) {
      entries.push({ className, classSlug, level, name });
    }
  }
  return entries;
}

function normalizeProficiencyDescription(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*:\s*/g, ": ")
    .replace(/:\s*\n\s*(?=[A-Za-z(])/g, ": ");
}

function cleanProficiencyText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\.$/, "").trim();
}

/** Extract weapon/armor proficiency prose from class description text. */
export function parseClassProficiencies(descriptionText: string | null | undefined): string[] {
  if (!descriptionText) return [];

  const normalized = normalizeProficiencyDescription(descriptionText);
  const results: string[] = [];
  const pattern =
    /(?:Weapon and Armor Proficiency|Weapon Proficiency|Armor Proficiency):\s*([\s\S]*?)(?=\n(?:[A-Z][^\n:]{0,80}:|\s*$))/gi;

  for (const match of normalized.matchAll(pattern)) {
    const text = cleanProficiencyText(match[1]);
    if (text) results.push(text);
  }

  return results;
}

export function parseRacialProficiencies(descriptionText: string | null | undefined): string[] {
  if (!descriptionText) return [];

  const results: string[] = [];
  const seen = new Set<string>();

  function add(text: string): void {
    const cleaned = cleanProficiencyText(text);
    if (!cleaned || seen.has(cleaned.toLowerCase())) return;
    seen.add(cleaned.toLowerCase());
    results.push(cleaned);
  }

  const normalized = normalizeProficiencyDescription(descriptionText);
  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const labeled =
      trimmed.match(/^Weapon Proficiency:\s*(.+)/i) ??
      trimmed.match(/^Armor Proficiency:\s*(.+)/i) ??
      trimmed.match(/^Weapon Familiarity:\s*(.+)/i);
    if (labeled) {
      add(labeled[1]);
      continue;
    }

    const proficientWith = trimmed.match(/^Proficient with\s+(.+)/i);
    if (proficientWith) add(proficientWith[0]);
  }

  return results;
}
