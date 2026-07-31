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
    key: "npc-creator",
    label: "NPC Creator",
    icon: "🗡️",
    href: "/tools/npc-creator",
    description:
      "Build D&D 3.5 NPCs with archetypes and monster templates, preview a Fantasy Grounds–style sheet, and download importable FG XML.",
    source: "SRD 3.5 / Fantasy Grounds",
  },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];

export function getTool(key: string) {
  return TOOLS.find((t) => t.key === key);
}
