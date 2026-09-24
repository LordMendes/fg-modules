export type ChangelogEntry = {
  date: string;
  title: string;
  summary: string;
};

/** Site feature releases (not per-scrape data imports). */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-23",
    title: "PC Planner Fantasy Grounds export",
    summary:
      "Download a structured 3.5E character sheet XML from the PC Planner toolbar for import into Fantasy Grounds.",
  },
  {
    date: "2026-09-23",
    title: "PC Planner Skills tab defaults",
    summary:
      "Skills tab now defaults to Player's Handbook skills plus class skills and ranked skills, with duplicate variant pages collapsed. Use the Skills settings toggle to show all sourcebooks.",
  },
  {
    date: "2026-09-23",
    title: "Public PC shares and optional weapon compare",
    summary:
      "PC Planner share links can be made public so viewers do not need an account. Damage Statistic compare mode is now optional via a Compare weapons toggle.",
  },
  {
    date: "2026-09-22",
    title: "Damage Statistic tool",
    summary:
      "Compare expected damage for two weapons by target AC, with catalog search, PC Planner-style weapon editing, optional saved PC loading, and DR.",
  },
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
