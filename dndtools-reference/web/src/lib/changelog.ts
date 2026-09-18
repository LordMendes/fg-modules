export type ChangelogEntry = {
  date: string;
  title: string;
  summary: string;
};

/** Site feature releases (not per-scrape data imports). */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-18",
    title: "SEO and AI discovery",
    summary:
      "Added crawlable A-Z catalog indexes, llms.txt, About and Changelog pages, generated entity leads, and tool FAQ sections for search engines and AI crawlers.",
  },
  {
    date: "2026-03-01",
    title: "Random Spellbook tool",
    summary:
      "Generate wizard spellbooks and level-scaled wishlists from selected compendium sources with optional specialization.",
  },
  {
    date: "2026-02-15",
    title: "Campaign table and live dice",
    summary:
      "Shared campaign tables with player invites, character sheets, and synchronized 3D dice rolls.",
  },
  {
    date: "2026-01-20",
    title: "PC Planner and NPC Creator",
    summary:
      "Fantasy Grounds-style character planning with compendium search, spell slots, and exportable NPC sheets.",
  },
  {
    date: "2025-12-01",
    title: "DnD Helper launch",
    summary:
      "Initial D&D 3.5 Edition reference: spells, feats, monsters, classes, and sourcebook browsing.",
  },
];
