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
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];

export function getTool(key: string) {
  return TOOLS.find((t) => t.key === key);
}
