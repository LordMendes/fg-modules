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
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];

export function getTool(key: string) {
  return TOOLS.find((t) => t.key === key);
}
