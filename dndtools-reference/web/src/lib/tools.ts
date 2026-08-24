export const TOOLS = [
  {
    key: "stronghold-builder",
    label: "Stronghold Builder",
    icon: "🏰",
    href: "/tools/stronghold-builder",
    description:
      "Calculate stronghold cost, build time, and staff upkeep using the Stronghold Builder's Guidebook rules.",
    source: "Stronghold Builder's Guidebook",
  },
  {
    key: "magic-item-builder",
    label: "Magic Item Builder",
    icon: "⚔️",
    href: "/tools/magic-item-builder",
    description:
      "Price magic weapons, armor, and shields with DMG rules plus Complete-series special abilities. Shows base item cost and total equivalent bonus.",
    source: "DMG + Complete Series",
  },
  {
    key: "leadership-calculator",
    label: "Leadership Calculator",
    icon: "👑",
    href: "/tools/leadership-calculator",
    description:
      "Calculate Leadership score, cohort level, and followers by level using PHB and Epic Leadership rules.",
    source: "PHB / DMG",
  },
  {
    key: "turn-undead-calculator",
    label: "Turn Undead Calculator",
    icon: "✝️",
    href: "/tools/turn-undead-calculator",
    description:
      "Resolve turn undead checks and damage pool allocation for clerics and paladins using PHB Table 8-9.",
    source: "PHB / SRD",
  },
  {
    key: "encounter-builder",
    label: "Encounter Builder",
    icon: "🐉",
    href: "/tools/encounter-builder",
    description:
      "Build encounters from the monster compendium, calculate EL, and save encounters for later.",
    source: "DMG",
  },
  {
    key: "npc-creator",
    label: "NPC Creator",
    icon: "🗡️",
    href: "/tools/npc-creator",
    description:
      "Build D&D 3.5 NPCs with archetypes and monster templates, preview a Fantasy Grounds–style sheet, and download importable FG XML.",
    source: "SRD 3.5 / Fantasy Grounds",
    badge: "Beta",
  },
  {
    key: "pc-planner",
    label: "PC Planner",
    icon: "🧙",
    href: "/tools/pc-planner",
    description:
      "Plan player characters with a Fantasy Grounds character sheet, compendium feat and spell search, and automatic spell slot calculation.",
    source: "SRD 3.5 / Fantasy Grounds",
    badge: "Beta",
  },
  {
    key: "random-spellbook",
    label: "Random Spellbook",
    icon: "📖",
    href: "/tools/random-spellbook",
    description:
      "Generate a wizard spellbook and level-scaled wishlist from selected compendium sources, with optional specialization and reproducible seeds.",
    source: "PHB / SRD + selected sources",
  },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];

export function getTool(key: string) {
  return TOOLS.find((t) => t.key === key);
}
