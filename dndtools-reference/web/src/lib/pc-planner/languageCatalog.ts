export type LanguageGroup = {
  id: string;
  label: string;
  languages: readonly string[];
};

/** PHB core plus common Greyhawk and Forgotten Realms setting languages. */
export const LANGUAGE_GROUPS: readonly LanguageGroup[] = [
  {
    id: "phb",
    label: "Player's Handbook",
    languages: [
      "Common",
      "Dwarven",
      "Elven",
      "Gnome",
      "Halfling",
      "Orc",
      "Goblin",
      "Giant",
      "Draconic",
      "Infernal",
      "Celestial",
      "Abyssal",
      "Sylvan",
      "Undercommon",
      "Terran",
      "Ignan",
      "Aquan",
      "Auran",
    ],
  },
  {
    id: "greyhawk",
    label: "Greyhawk",
    languages: [
      "Ancient Baklunish",
      "Baklunish",
      "Flan",
      "Keoish",
      "Nerese",
      "Old Oeridian",
      "Rihan",
      "Suloise",
      "Tongue of the Rovers",
      "Ugritic",
    ],
  },
  {
    id: "forgotten-realms",
    label: "Forgotten Realms",
    languages: [
      "Alzhedo",
      "Chondathan",
      "Chessentan",
      "Damaran",
      "Illuskan",
      "Midani",
      "Mulhorandi",
      "Rashemi",
      "Roushoum",
      "Shou",
      "Thayan",
      "Turmic",
      "Tuigan",
      "Untheric",
    ],
  },
] as const;

export function allCatalogLanguages(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of LANGUAGE_GROUPS) {
    for (const language of group.languages) {
      if (seen.has(language)) continue;
      seen.add(language);
      out.push(language);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export type LanguageOption = {
  name: string;
  groupLabel: string;
};

export function filterLanguageOptions(
  query: string,
  selected: ReadonlySet<string>,
): LanguageOption[] {
  const needle = query.trim().toLowerCase();
  const out: LanguageOption[] = [];
  for (const group of LANGUAGE_GROUPS) {
    for (const language of group.languages) {
      if (selected.has(language)) continue;
      if (needle && !language.toLowerCase().includes(needle)) continue;
      out.push({ name: language, groupLabel: group.label });
    }
  }
  return out;
}

export function normalizeLanguageName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
