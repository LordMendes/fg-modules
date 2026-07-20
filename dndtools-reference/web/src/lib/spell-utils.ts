export const SPELL_COMPONENT_KEYS = ["V", "S", "M", "F", "DF", "XP"] as const;

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
