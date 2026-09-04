export type BabProgression = "full" | "threeQuarter" | "half";
export type SaveProgression = "good" | "poor";

export type ClassCombatInfo = {
  bab: BabProgression;
  fort: SaveProgression;
  ref: SaveProgression;
  will: SaveProgression;
};

/** PHB base classes and common alternates — keyed by slug prefix. */
const COMBAT_BY_SLUG: Record<string, ClassCombatInfo> = {
  barbarian: { bab: "full", fort: "good", ref: "poor", will: "poor" },
  bard: { bab: "threeQuarter", fort: "poor", ref: "good", will: "good" },
  cleric: { bab: "threeQuarter", fort: "good", ref: "poor", will: "good" },
  druid: { bab: "threeQuarter", fort: "good", ref: "poor", will: "good" },
  fighter: { bab: "full", fort: "good", ref: "poor", will: "poor" },
  monk: { bab: "threeQuarter", fort: "good", ref: "good", will: "good" },
  paladin: { bab: "full", fort: "good", ref: "poor", will: "good" },
  ranger: { bab: "full", fort: "good", ref: "good", will: "poor" },
  rogue: { bab: "threeQuarter", fort: "poor", ref: "good", will: "poor" },
  sorcerer: { bab: "half", fort: "poor", ref: "poor", will: "good" },
  wizard: { bab: "half", fort: "poor", ref: "poor", will: "good" },
};

const COMBAT_BY_NAME: Record<string, ClassCombatInfo> = Object.fromEntries(
  Object.entries(COMBAT_BY_SLUG).map(([slug, info]) => [
    slug.charAt(0).toUpperCase() + slug.slice(1),
    info,
  ]),
);

const DEFAULT_COMBAT: ClassCombatInfo = {
  bab: "threeQuarter",
  fort: "poor",
  ref: "poor",
  will: "poor",
};

function matchCombatBySlug(classSlug: string): ClassCombatInfo | null {
  const slugLower = classSlug.toLowerCase();
  for (const [key, info] of Object.entries(COMBAT_BY_SLUG)) {
    if (slugLower === key || slugLower.startsWith(`${key}-`)) {
      return info;
    }
  }
  return null;
}

export function getClassCombatInfo(classSlug: string, className?: string): ClassCombatInfo {
  const bySlug = matchCombatBySlug(classSlug);
  if (bySlug) return bySlug;
  if (className) {
    const byName = COMBAT_BY_NAME[className];
    if (byName) return byName;
  }
  return DEFAULT_COMBAT;
}

export function babFromClassLevel(level: number, progression: BabProgression): number {
  if (level <= 0) return 0;
  switch (progression) {
    case "full":
      return level;
    case "threeQuarter":
      return Math.floor((level * 3) / 4);
    case "half":
      return Math.floor(level / 2);
  }
}

export function saveFromClassLevel(level: number, progression: SaveProgression): number {
  if (level <= 0) return 0;
  if (progression === "good") return 2 + Math.floor((level - 1) / 2);
  return Math.floor(level / 3);
}
