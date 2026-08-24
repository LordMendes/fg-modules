export const RANDOM_SPELLBOOK_TOOLTIPS = {
  wizardSection:
    "Uses Player's Handbook wizard rules. Every cantrip from your selected sources goes in the book. At 1st level the wizard gains 3 + Intelligence modifier spells (minimum 1). Each level after that adds 2 more spells, each from a circle they can already cast.",
  sourcesSection:
    "Spell names come from the wizard class list in each source you pick. Specialization adds at least one spell of that school per castable circle. Prohibited schools are excluded from both the spellbook and the wishlist.",
  generateSection:
    "Build the spellbook from your settings. Set a seed to reproduce the same result later; leave it blank for a random seed shown in the results.",
  wizardLevel: "Wizard class level (1–20). Sets max spell level and how many free spells are gained over their career.",
  intModifier:
    "Intelligence modifier only. Starting 1st-level spells = 3 + this value, minimum 1.",
  interestPerLevel:
    "How many spells per circle appear in the wishlist. Defaults to max(3, half wizard level, rounded up) but you can override.",
  sources:
    "Which rulebooks to draw wizard spells from. Only spells on the wizard list in these sources can appear.",
  specialization:
    "Specialist wizards must have at least one spell of their chosen school for each spell level they can cast. Universal spells do not count.",
  prohibited:
    "Spells whose school matches a prohibited school are never picked for the spellbook or spells of interest.",
  seed: "Optional number for reproducible random results. Same level, Int, sources, schools, and seed always produce the same spellbook.",
  resultsEmpty: "Generated spellbook and wishlist appear here after you click Generate.",
  spellbookPages:
    "Page count uses the blank spellbook rule: 1 page per cantrip, 2 pages per spell level (e.g. a 3rd-level spell uses 6 pages).",
  totalSpells: "All spells written in the book, including every cantrip from the selected sources.",
  cantrips: "All 0-level wizard spells from your sources are included automatically.",
  preview:
    "Live estimate from PHB free-spell rules: starting 1st-level count and total non-cantrip spells written in the book at this level.",
  maxCastLevel: "Highest spell circle this wizard can cast at the chosen class level.",
  maxSpellLevel: "Highest spell circle this wizard can cast at their current level.",
  resultSeed: "The random seed used for this generation. Enter it again to recreate this exact spellbook.",
  spellbookTab: "Spells this wizard knows and has copied into their spellbook.",
  interestTab:
    "A sample of spells they do not have yet — useful for scroll purchases, a master's teaching, or loot on a shelf. Count scales with wizard level.",
  shareLink:
    "Copy a link with the current settings. If a spellbook has been generated, the link includes the seed so anyone opening it sees the same result.",
} as const;
