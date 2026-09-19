export type SenseGroup = {
  id: string;
  label: string;
  senses: readonly string[];
};

export const SENSE_GROUPS: readonly SenseGroup[] = [
  {
    id: "vision",
    label: "Vision",
    senses: [
      "Low-light vision",
      "Darkvision 30 ft.",
      "Darkvision 60 ft.",
      "Darkvision 90 ft.",
      "Darkvision 120 ft.",
      "Blindsense 30 ft.",
      "Blindsight 60 ft.",
      "Tremorsense 60 ft.",
    ],
  },
  {
    id: "other",
    label: "Other",
    senses: ["Scent", "Keen scent", "All-around vision"],
  },
] as const;

export type SenseOption = {
  name: string;
  groupLabel: string;
};

export function filterSenseOptions(
  query: string,
  selected: ReadonlySet<string>,
): SenseOption[] {
  const needle = query.trim().toLowerCase();
  const out: SenseOption[] = [];
  for (const group of SENSE_GROUPS) {
    for (const sense of group.senses) {
      if (selected.has(sense)) continue;
      if (needle && !sense.toLowerCase().includes(needle)) continue;
      out.push({ name: sense, groupLabel: group.label });
    }
  }
  return out;
}

export function normalizeSenseName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
