export const TOOL_GROUPS = [
  { id: "table", label: "Table" },
  { id: "combat", label: "Combat" },
  { id: "building", label: "Building and costs" },
  { id: "loot", label: "Loot" },
  { id: "places", label: "Places" },
  { id: "adventures", label: "Adventures" },
  { id: "names", label: "Names and tables" },
] as const;

export type ToolGroupId = (typeof TOOL_GROUPS)[number]["id"];

export const TOOLS = [
  {
    key: "campaign",
    label: "Campaign",
    icon: "🎲",
    href: "/tools/campaign",
    description:
      "Create a campaign table, invite players, attach characters, and share 3D dice rolls (including DM-only hidden rolls).",
    source: "Table tools",
    badge: "Beta",
    group: "table",
  },
  {
    key: "pc-planner",
    label: "PC Planner",
    icon: "🧙",
    href: "/tools/pc-planner",
    description:
      "Plan player characters with a Fantasy Grounds character sheet, compendium feat and spell search, and automatic spell slot calculation.",
    source: "SRD 3.5 / Fantasy Grounds",
    group: "table",
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
    group: "table",
  },
  {
    key: "encounter-builder",
    label: "Encounter Builder",
    icon: "🐉",
    href: "/tools/encounter-builder",
    description:
      "Build encounters from the monster compendium, calculate EL, and save encounters for later.",
    source: "DMG",
    group: "combat",
  },
  {
    key: "damage-statistic",
    label: "Damage Statistic",
    icon: "📊",
    href: "/tools/damage-statistic",
    description:
      "Compare expected damage for two weapons by target AC. Pick catalog weapons, edit them like the PC Planner, enter BAB and ability scores or load a saved PC.",
    source: "PHB / SRD",
    group: "combat",
  },
  {
    key: "turn-undead-calculator",
    label: "Turn Undead Calculator",
    icon: "✝️",
    href: "/tools/turn-undead-calculator",
    description:
      "Resolve turn undead checks and damage pool allocation for clerics and paladins using PHB Table 8-9.",
    source: "PHB / SRD",
    group: "combat",
  },
  {
    key: "power-attack",
    label: "Power Attack Calculator",
    icon: "⚔",
    href: "/tools/power-attack",
    description:
      "Find the Power Attack penalty that deals the most expected damage against a target AC.",
    source: "PHB",
    group: "combat",
  },
  {
    key: "stronghold-builder",
    label: "Stronghold Builder",
    icon: "🏰",
    href: "/tools/stronghold-builder",
    description:
      "Calculate stronghold cost, build time, and staff upkeep using the Stronghold Builder's Guidebook rules.",
    source: "Stronghold Builder's Guidebook",
    group: "building",
  },
  {
    key: "magic-item-builder",
    label: "Magic Item Builder",
    icon: "⚔️",
    href: "/tools/magic-item-builder",
    description:
      "Price magic weapons, armor, and shields with DMG rules plus Complete-series special abilities. Shows base item cost and total equivalent bonus.",
    source: "DMG + Complete Series",
    group: "building",
  },
  {
    key: "leadership-calculator",
    label: "Leadership Calculator",
    icon: "👑",
    href: "/tools/leadership-calculator",
    description:
      "Calculate Leadership score, cohort level, and followers by level using PHB and Epic Leadership rules.",
    source: "PHB / DMG",
    group: "building",
  },
  {
    key: "random-spellbook",
    label: "Random Spellbook",
    icon: "📖",
    href: "/tools/random-spellbook",
    description:
      "Generate a wizard spellbook and level-scaled wishlist from selected compendium sources, with optional specialization and reproducible seeds.",
    source: "PHB / SRD + selected sources",
    group: "building",
  },
  {
    key: "treasure-generator",
    label: "Treasure Generator",
    icon: "💎",
    href: "/tools/treasure-generator",
    description:
      "Roll Dungeon Master's Guide treasure by level: coins, gems, art, mundane gear, and magic items.",
    source: "DMG",
    group: "loot",
  },
  {
    key: "magic-shop",
    label: "Magic Shop",
    icon: "🏪",
    href: "/tools/magic-shop",
    description:
      "Stock a magic shop from town size, with a keeper and items priced from the compendium.",
    source: "DMG",
    group: "loot",
  },
  {
    key: "world-generator",
    label: "World Generator",
    icon: "🌍",
    href: "/tools/world-generator",
    description:
      "Generate a world map with seas, ice, rivers, and cities on a hex or square grid.",
    source: "Site tables",
    group: "places",
  },
  {
    key: "fractal-world",
    label: "Fractal World",
    icon: "🗺",
    href: "/tools/fractal-world",
    description:
      "Render a seeded world in several map projections and color palettes.",
    source: "Site tables",
    group: "places",
  },
  {
    key: "town-generator",
    label: "Town Generator",
    icon: "🏘",
    href: "/tools/town-generator",
    description:
      "Generate a town map with districts, roads, walls, and a labeled gazetteer.",
    source: "Site tables",
    group: "places",
  },
  {
    key: "demographics",
    label: "Demographics Calculator",
    icon: "🏘",
    href: "/tools/demographics",
    description:
      "Population, settlements, businesses, and NPC classes for a kingdom and a town, using DMG community wealth.",
    source: "DMG",
    group: "places",
  },
  {
    key: "calendar-generator",
    label: "Calendar Generator",
    icon: "📅",
    href: "/tools/calendar-generator",
    description:
      "Build a fantasy year with months, a week, moons, and holidays, then page through it.",
    source: "Site tables",
    group: "places",
  },
  {
    key: "inn-generator",
    label: "Inn Generator",
    icon: "🍺",
    href: "/tools/inn-generator",
    description:
      "Generate an inn or tavern with a keeper, a menu, patrons, and rumors.",
    source: "Site tables",
    group: "places",
  },
  {
    key: "adventure-generator",
    label: "Adventure Generator",
    icon: "🗺",
    href: "/tools/adventure-generator",
    description:
      "Roll adventure elements one section at a time, from theme and hook through villain, set piece, and twist.",
    source: "Site tables",
    group: "adventures",
  },
  {
    key: "five-room-dungeon",
    label: "Five Room Dungeon",
    icon: "🚪",
    href: "/tools/five-room-dungeon",
    description:
      "Build a five-room dungeon: entrance, puzzle, setback, climax, and reward.",
    source: "Site tables",
    group: "adventures",
  },
  {
    key: "dungeon-generator",
    label: "Dungeon Generator",
    icon: "🧱",
    href: "/tools/dungeon-generator",
    description:
      "Generate a keyed dungeon map with rooms, corridors, doors, stairs, and level-appropriate contents.",
    source: "DMG",
    group: "adventures",
  },
  {
    key: "treasure-map",
    label: "Treasure Map",
    icon: "🧭",
    href: "/tools/treasure-map",
    description:
      "Draw a treasure map with a path of labeled markers and a clue for each one.",
    source: "Site tables",
    group: "adventures",
  },
  {
    key: "encounter-generator",
    label: "Encounter Generator",
    icon: "🌲",
    href: "/tools/encounter-generator",
    description:
      "Pick a wilderness or planar encounter by level, climate, and terrain, then see its EL and XP.",
    source: "DMG",
    group: "adventures",
  },
  {
    key: "weather-generator",
    label: "Weather Generator",
    icon: "🌦",
    href: "/tools/weather-generator",
    description:
      "Generate a month of weather for a climate and season, including wind, precipitation, and rare supernatural skies.",
    source: "DMG",
    group: "adventures",
  },
  {
    key: "name-generator",
    label: "Name Generator",
    icon: "🏷",
    href: "/tools/name-generator",
    description:
      "Generate fantasy names from built-in lists, or from a list you paste in.",
    source: "Site tables",
    group: "names",
  },
  {
    key: "random-tables",
    label: "Random Tables",
    icon: "📋",
    href: "/tools/random-tables",
    description:
      "Roll traps, NPC sketches, pocket loot, magic items, and spellbooks from the compendium.",
    source: "DMG",
    group: "names",
  },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];
export type Tool = (typeof TOOLS)[number];

export function getTool(key: string) {
  return TOOLS.find((t) => t.key === key);
}

export function toolGroupLabel(groupId: ToolGroupId): string {
  return TOOL_GROUPS.find((group) => group.id === groupId)?.label ?? groupId;
}

export function filterTools(query: string, tools: readonly Tool[] = TOOLS): Tool[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...tools];
  return tools.filter((tool) => {
    const group = toolGroupLabel(tool.group);
    return (
      tool.label.toLowerCase().includes(needle) ||
      tool.description.toLowerCase().includes(needle) ||
      tool.source.toLowerCase().includes(needle) ||
      group.toLowerCase().includes(needle)
    );
  });
}

export function groupTools(tools: readonly Tool[] = TOOLS) {
  return TOOL_GROUPS.map((group) => ({
    ...group,
    tools: tools.filter((tool) => tool.group === group.id),
  })).filter((group) => group.tools.length > 0);
}
