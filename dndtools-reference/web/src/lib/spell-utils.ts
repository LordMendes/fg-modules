export const SPELL_COMPONENT_KEYS = ["V", "S", "M", "F", "DF", "XP"] as const;

export const ARCANE_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
  "Universal",
] as const;

export const MARTIAL_DISCIPLINES = [
  "Iron Heart",
  "Diamond Mind",
  "Stone Dragon",
  "Devoted Spirit",
  "Setting Sun",
  "Shadow Hand",
  "Desert Wind",
  "Tiger Claw",
  "White Raven",
] as const;

export type ArcaneSchool = (typeof ARCANE_SCHOOLS)[number];
export type MartialDiscipline = (typeof MARTIAL_DISCIPLINES)[number];

const ARCANE_SCHOOL_SET = new Set<string>(ARCANE_SCHOOLS);
const MARTIAL_DISCIPLINE_SET = new Set<string>(MARTIAL_DISCIPLINES);

export type ParsedSpellSchool = {
  schools: string[];
  disciplines: string[];
  subschool: string | null;
};

export function parseSpellSchool(raw: string | null | undefined): ParsedSpellSchool {
  if (!raw?.trim()) {
    return { schools: [], disciplines: [], subschool: null };
  }

  const subschoolMatch = raw.match(/\(([^)]+)\)$/);
  const subschool = subschoolMatch?.[1]?.trim() ?? null;
  const withoutSubschool = subschoolMatch
    ? raw.slice(0, subschoolMatch.index).trim()
    : raw.trim();

  const schools: string[] = [];
  const disciplines: string[] = [];

  for (const token of withoutSubschool.split("/").map((part) => part.trim()).filter(Boolean)) {
    if (ARCANE_SCHOOL_SET.has(token)) {
      schools.push(token);
    } else if (MARTIAL_DISCIPLINE_SET.has(token)) {
      disciplines.push(token);
    }
  }

  return { schools, disciplines, subschool };
}

export function formatSpellSchool(parsed: ParsedSpellSchool): string | null {
  const { schools, disciplines, subschool } = parsed;
  const parts = [...schools, ...disciplines];
  if (parts.length === 0) return null;
  const base = parts.join("/");
  return subschool ? `${base} (${subschool})` : base;
}

export type SpellComponentKey = (typeof SPELL_COMPONENT_KEYS)[number];

export type SpellComponentFlags = Record<SpellComponentKey, boolean>;

export function parseSpellComponents(
  componentsText: string | null | undefined,
  indexData: unknown,
): SpellComponentFlags {
  const index = indexData as Record<string, unknown> | null;
  const fromIndex = index?.components as Partial<Record<SpellComponentKey, boolean>> | undefined;

  if (fromIndex && typeof fromIndex === "object") {
    return {
      V: Boolean(fromIndex.V),
      S: Boolean(fromIndex.S),
      M: Boolean(fromIndex.M),
      F: Boolean(fromIndex.F),
      DF: Boolean(fromIndex.DF),
      XP: Boolean(fromIndex.XP),
    };
  }

  const text = (componentsText ?? "").toUpperCase();
  return {
    V: /\bV\b/.test(text),
    S: /\bS\b/.test(text),
    M: /\bM\b/.test(text),
    F: /\bF\b/.test(text),
    DF: /\bDF\b/.test(text),
    XP: /\bXP\b/.test(text),
  };
}

export function spellDescriptionSnippet(
  indexData: unknown,
  descriptionText: string | null | undefined,
  maxLength = 72,
): string | null {
  const index = indexData as Record<string, unknown> | null;
  const snippet =
    (typeof index?.description_snippet === "string" ? index.description_snippet : null) ??
    descriptionText ??
    null;

  if (!snippet) return null;
  if (snippet.length <= maxLength) return snippet;
  return `${snippet.slice(0, maxLength).trimEnd()}…`;
}
