import type { ToolKey } from "@/lib/tools";

export type ToolFaq = {
  question: string;
  answer: string;
};

export const TOOL_FAQS: Partial<Record<ToolKey, ToolFaq[]>> = {
  "stronghold-builder": [
    {
      question: "What D&D 3.5 rules does the Stronghold Builder use?",
      answer:
        "It follows the Stronghold Builder's Guidebook: component costs, build time, prerequisite staff, and monthly upkeep for castles, temples, laboratories, and other stronghold parts.",
    },
    {
      question: "How is stronghold build time calculated in 3.5?",
      answer:
        "Build time depends on the total cost of selected components and the workforce you assign. The tool totals component prices and applies SBG build-time rules.",
    },
    {
      question: "Can I mix multiple stronghold components?",
      answer:
        "Yes. Add halls, walls, staff quarters, and special rooms. The calculator checks prerequisites (such as required staff roles) and sums cost and upkeep.",
    },
  ],
  "magic-item-builder": [
    {
      question: "How does D&D 3.5 magic item pricing work?",
      answer:
        "Weapon, armor, and shield prices use DMG equivalent bonus tables plus base item cost. This tool applies DMG pricing and Complete-series special abilities.",
    },
    {
      question: "What is equivalent bonus for magic items?",
      answer:
        "Enhancement bonus and special abilities are converted to a single equivalent bonus number, which determines the gold piece cost multiplier on the base item.",
    },
    {
      question: "Does the builder include Complete Mage and Complete Warrior abilities?",
      answer:
        "Yes. Many special abilities from the Complete series are included alongside core DMG options for weapons and armor.",
    },
  ],
  "leadership-calculator": [
    {
      question: "How is Leadership score calculated in D&D 3.5?",
      answer:
        "Leadership score equals character level plus Charisma modifier, with adjustments for feats such as Improved Leadership, cohort modifiers, and Epic Leadership at high level.",
    },
    {
      question: "What cohort level can I attract with Leadership?",
      answer:
        "Cohort level comes from PHB Table 2-27 based on your Leadership score. The calculator applies feat and variant modifiers that change effective cohort level.",
    },
    {
      question: "How many followers does Leadership provide?",
      answer:
        "Follower counts by level use PHB Table 2-28. Extra Followers and similar options increase the pool shown in the results table.",
    },
  ],
  "turn-undead-calculator": [
    {
      question: "How do turn undead checks work in D&D 3.5?",
      answer:
        "Clerics and paladins roll 1d20 plus class level and Charisma modifier against each undead's Hit Dice. PHB Table 8-9 defines turn, destroy, or rebuke results.",
    },
    {
      question: "What is the turn undead damage pool?",
      answer:
        "On a successful turn, you allocate turning damage equal to 2d6 per class level (plus bonuses). The tool helps assign that pool across multiple undead targets.",
    },
    {
      question: "Does this support rebuking undead?",
      answer:
        "Evil clerics rebuke instead of turn. Enter the same dice and modifiers; the calculator resolves rebuke using the same PHB table logic.",
    },
  ],
  "treasure-generator": [
    {
      question: "Which D&D 3.5 book defines random treasure?",
      answer:
        "The Dungeon Master's Guide lists treasure by encounter level: coin ranges, gems, art objects, mundane gear, and random magic item tables for minor, medium, and major items.",
    },
    {
      question: "What do minor, medium, and major magic items mean?",
      answer:
        "Those labels match DMG random treasure tiers. Minor items suit low-level hoards, medium items suit mid levels, and major items suit high-level encounters.",
    },
    {
      question: "Can I reproduce the same treasure roll?",
      answer:
        "Yes. Keep the seed and hoard settings the same. The generator uses deterministic rolls so you can share a seed and level in the URL and get the same hoard again.",
    },
  ],
  "magic-shop": [
    {
      question: "How does town size affect a D&D 3.5 magic shop?",
      answer:
        "The Dungeon Master's Guide sets how much wealth a community can support. This tool uses those gp limits as a price ceiling and rolls how many magic items are on the shelf based on settlement size.",
    },
    {
      question: "Where do shop items come from?",
      answer:
        "Stock is drawn from the site magic item compendium. Specialist shops prefer matching item types, then fill remaining slots from general trader inventory under the same gp limit.",
    },
    {
      question: "Can I reroll just the keeper or inventory?",
      answer:
        "Yes. Location, description, keeper, and items each have a Reroll control. The shop name can be rerolled separately. Other sections stay the same unless you change town size or shop type.",
    },
  ],
  "encounter-generator": [
    {
      question: "How does the Dungeon Master's Guide define random encounters?",
      answer:
        "The DMG ties wilderness and planar encounters to party level, climate, terrain, and encounter level (EL). This tool filters the monster compendium by those locale rules and adjusts group size to hit your target EL.",
    },
    {
      question: "Why did my party get zero XP from an encounter?",
      answer:
        "DMG Table 3-2 awards no XP when the party level is too high or too low relative to a creature's Challenge Rating. The generator shows total XP using your stated party level without rerolling monsters.",
    },
    {
      question: "Can I reproduce the same encounter roll?",
      answer:
        "Yes. Keep the seed and locale settings the same. Level, plane, climate, and terrain sync to the URL so you can share a link and get the same monster mix again.",
    },
  ],
  demographics: [
    {
      question: "Where do town gp limits come from in D&D 3.5?",
      answer:
        "The Dungeon Master's Guide lists community sizes from thorps through metropolises, each with a maximum item value (gp limit) and modifiers for power centers and NPC levels. This calculator applies those rows to your town population.",
    },
    {
      question: "How is kingdom population calculated?",
      answer:
        "Kingdom population is area in square miles times people per square mile (density). Settlement sizes, cultivated land, and castles follow the demographic tables in the DMG community creation guidelines.",
    },
    {
      question: "What does the seed control?",
      answer:
        "The seed sets initial kingdom area and age, kingdom settlement rolls, and the random power centers, business counts, and class level dice. Reroll changes the town random tables while keeping the same seed until you choose a new one.",
    },
  ],
  "weather-generator": [
    {
      question: "Where do D&D 3.5 weather rules come from?",
      answer:
        "The Dungeon Master's Guide gives guidance for climate, season, temperature extremes, wind, and precipitation when you need day-to-day weather during overland travel or downtime.",
    },
    {
      question: "What does supernatural weather mean here?",
      answer:
        "Optional rare events replace the normal sky with a fantastical description while keeping the day's temperature and wind. Frequency controls how often those days appear in a generated month.",
    },
    {
      question: "Can I reproduce the same month of weather?",
      answer:
        "Yes. Keep the seed, climate, season, and supernatural setting the same. Climate, season, and seed sync to the URL so you can share a link and get the same daily table again.",
    },
  ],
  "encounter-builder": [
    {
      question: "How is Encounter Level (EL) calculated in D&D 3.5?",
      answer:
        "EL combines monster Challenge Ratings using DMG encounter tables, including adjustments for multiple creatures of the same type and mixed CR groups.",
    },
    {
      question: "Can I build encounters from the monster compendium?",
      answer:
        "Yes. Add monsters from the DnD Helper compendium, set party level and desired difficulty, and see the calculated EL against your target.",
    },
    {
      question: "Are encounters saved to my account?",
      answer:
        "Saved encounter drafts are stored in your browser local storage on this device unless you copy them elsewhere.",
    },
  ],
  "npc-creator": [
    {
      question: "What does the D&D 3.5 NPC Creator produce?",
      answer:
        "It builds NPCs with archetypes and monster templates, shows a Fantasy Grounds-style preview sheet, and can export importable FG XML for your game table.",
    },
    {
      question: "Can I apply monster templates to an NPC?",
      answer:
        "Yes. Choose a base creature or archetype, add templates from the compendium, and review stat changes before export.",
    },
    {
      question: "Does spell automation come from Fantasy Grounds mods?",
      answer:
        "Many cast actions are sourced from Fantasy Grounds module data where available. Other spells still show description and save DC from the compendium.",
    },
  ],
  "pc-planner": [
    {
      question: "What is the D&D 3.5 PC Planner?",
      answer:
        "A browser character planner with a Fantasy Grounds-style sheet, compendium feat and spell search, automatic spell slot calculation, and FG XML export.",
    },
    {
      question: "How are spell slots calculated for 3.5 casters?",
      answer:
        "Spell slots follow class level, ability scores, and bonus spells from high casting ability. The planner updates slots when you change class levels or stats.",
    },
    {
      question: "Can I export a character to Fantasy Grounds?",
      answer:
        "Yes. Use Download XML on the PC sheet to get a structured 3.5E character file. Import it from the Fantasy Grounds Characters window.",
    },
    {
      question: "Can I share a PC plan with another player?",
      answer:
        "Yes. On the PC Planner sheet, use Share and turn on Public to copy a link. Anyone with the link can view the character read-only without signing in. Sign in is still required to add a copy to your own plans.",
    },
  ],
  "random-spellbook": [
    {
      question: "How does the random wizard spellbook generator work?",
      answer:
        "Pick wizard level, Intelligence modifier, and sourcebooks. The tool fills spell slots per PHB rules and adds a level-scaled wishlist of spells of interest.",
    },
    {
      question: "Can I use specialization and prohibited schools?",
      answer:
        "Yes. Choose a specialization school and prohibited schools. Specialized slots favor the chosen school and exclude prohibited schools from results.",
    },
    {
      question: "Are spellbook results reproducible?",
      answer:
        "Optional seeds let you regenerate the same spellbook and wishlist when inputs stay the same, useful for sharing NPC wizards.",
    },
  ],
  "calendar-generator": [
    {
      question: "Do day notes sync to my account?",
      answer:
        "No. Notes are stored in your browser on this device under a local key, and they can be included when you export calendar JSON. Clearing site data removes them.",
    },
    {
      question: "How do moons and weekdays change when I change year?",
      answer:
        "Weekdays continue from year 1 across every displayed year. Moon phases shift by the full year length for each year you step forward, while holidays stay on the same day of the year.",
    },
    {
      question: "Can I reuse the same calendar layout?",
      answer:
        "Yes. Keep the seed and numeric inputs the same, or export JSON and import it later. The seed syncs to the URL so you can bookmark a layout.",
    },
  ],
  "adventure-generator": [
    {
      question: "How do I reroll one adventure element?",
      answer:
        "Click the section title in the results list. That row alone rerolls from the same base seed while the other twenty-one sections stay unchanged until you click Generate all or change the seed.",
    },
    {
      question: "Does this replace a published adventure module?",
      answer:
        "No. It offers DMG-style prompts: theme, hook, villain, set pieces, and twists you can drop into your own maps, NPCs, and encounters from the compendium.",
    },
    {
      question: "Can I share the same roll with another DM?",
      answer:
        "Yes. Use the seed field and Use this seed, or share the URL with the seed query parameter. The same seed fills the same twenty-two sentences on this site.",
    },
  ],
  "treasure-map": [
    {
      question: "How many stops does a generated treasure map include?",
      answer:
        "You can fix the route at four, five, or six markers, or leave count on Random for a seed-driven roll between four and six. Each marker gets a place name and one clue in path order.",
    },
    {
      question: "Which marker is the hoard?",
      answer:
        "The seed picks which landmark name marks the cache, shown as a star or cross at the last stop on the dashed route. The final clue describes that hoard relative to the previous landmark using days, ridges, rivers, or coast travel.",
    },
    {
      question: "Can I reuse the same map in a campaign?",
      answer:
        "Yes. Keep the seed, marker count, and route direction the same, or share the URL query string. Download SVG saves the parchment map with the title line for handouts or VTT import.",
    },
  ],
  "town-generator": [
    {
      question: "How does town size affect the map?",
      answer:
        "Size sets how many numbered districts appear, from a single block in a thorp up to fourteen in a metropolis. Small towns and larger also leave a central market square empty of buildings when there are four or more districts.",
    },
    {
      question: "What do walls mean for a thorp or hamlet?",
      answer:
        "When walls are on, thorps and hamlets draw a wooden palisade with a dashed outline rather than a stone curtain. Larger settlements use a solid wall and a gate where the main road leaves town.",
    },
    {
      question: "Can I reproduce the same town layout?",
      answer:
        "Yes. Keep the seed and options the same, or share the URL with the seed query parameter. The same seed rebuilds the same districts, buildings, and gazetteer rows on this site.",
    },
  ],
  "dungeon-generator": [
    {
      question: "How does dungeon level affect stocking in D&D 3.5?",
      answer:
        "Dungeon level sets Challenge Rating hints for monsters, scales trap Search and Disable Device DCs, and rolls one standard DMG treasure hoard summary when a room rolls treasure. Party size is stored for future encounter math but does not change the map tiles.",
    },
    {
      question: "Can I reproduce the same map and room key?",
      answer:
        "Yes. Keep the seed and every option the same, or share the URL with the seed query parameter. The generator uses a deterministic random sequence so the SVG and keyed rooms match on reload.",
    },
    {
      question: "What do secret or trapped doors mean on the key?",
      answer:
        "Door mode follows your Doors setting: standard rolls secret doors on about ten percent of closed doors, and deathtrap adds trapped doors on about twenty percent. The map legend shows archway, portcullis, door, locked, trapped, secret, and stairs up or down. The room key lists the same kinds beside each room when a corridor meets that room.",
    },
    {
      question: "What does Polymorph rooms change on the map?",
      answer:
        "It turns the larger chambers into circles or five-sided rooms on the map, with a matching line in the key. Yes reshapes about half of rooms that are at least five squares on a side, and always at least three when they fit. Many reshapes most of those rooms. Smaller rooms stay rectangular.",
    },
  ],
  "five-room-dungeon": [
    {
      question: "What is a five-room dungeon in D&D 3.5 prep?",
      answer:
        "It is a DM planning pattern: entrance and guardian, puzzle or roleplay, setback, climax, and reward with a reveal. The Dungeon Master's Guide does not define the label, but the beats match classic dungeon pacing for a single session delve.",
    },
    {
      question: "How do level and party size affect the generator?",
      answer:
        "Dungeon level sets Challenge Rating hints for guardian and climax rooms and rolls one DMG hoard summary for the reward room. Party size is passed to encounter math when compendium monsters are available.",
    },
    {
      question: "Can I reproduce the same five rooms?",
      answer:
        "Yes. Keep the seed, motif, and level the same. The map and the five room texts come from that seed. Motif, level, and seed sync to the URL. Reroll room changes only that room's text. The map stays with the base seed.",
    },
  ],
  "name-generator": [
    {
      question: "Can I reuse the same name batch in a session?",
      answer:
        "Yes. Enter a numeric seed and click Use this seed. The same seed, catalog, count, last-name choice, and Markov settings reproduce the same list on this site.",
    },
    {
      question: "What are the built-in name lists?",
      answer:
        "They are original syllable tables for common ancestries, monstrous peoples, outsiders, and place-style labels. Personal names combine start, optional middle, and end chunks; With last name rolls a second name from the same list as a surname. Some place catalogs already add a second word from a small noun list, so the surname choice is off for those.",
    },
    {
      question: "How does From a list mode work?",
      answer:
        "Paste at least five names, one per line. The tool trains a letter Markov chain at order 2 or 3, then generates new names that follow the same character patterns without copying your list verbatim when the list is large enough.",
    },
  ],
  "fractal-world": [
    {
      question: "How is land and sea chosen on the fractal globe?",
      answer:
        "The tool samples seeded 3D value noise on a sphere. A sea threshold marks about the water percent you set as ocean. Ice is taken from the highest remaining land until roughly the ice percent of land is frozen, then highland fills the tallest dry terrain.",
    },
    {
      question: "Can I match the same world after changing projection?",
      answer:
        "Yes. Keep the numeric seed and the same water, ice, rotation, and octave settings. The underlying globe is the same; only the flat projection and palette change how it is drawn.",
    },
    {
      question: "What rules does this map follow for D&D 3.5?",
      answer:
        "It is a visual aid for world building, not a simulation from the Player's Handbook or Dungeon Master's Guide. Use it for continent shapes and climate flavor, then place nations and adventures in your campaign as you normally would.",
    },
  ],
  "world-generator": [
    {
      question: "How do sea level and ice work on this map?",
      answer:
        "Height comes from seeded value noise on a fixed hex grid. A sea threshold marks about the water percent you choose as ocean. Ice is taken from the highest remaining land until roughly the ice percent of land is frozen.",
    },
    {
      question: "Can I reproduce the same world for my campaign?",
      answer:
        "Yes. Keep the numeric seed and the same options, then click Generate or Use this seed. The seed and main controls sync to the URL so you can bookmark or share a link.",
    },
    {
      question: "What do rivers and cities use from the rules?",
      answer:
        "They are map flavor only, not DMG simulation. Rivers flow downhill from mountains toward the sea. Cities and ruins sit on lowland hexes with spacing for readable labels, and one city becomes the capital by land neighbors.",
    },
  ],
  "inn-generator": [
    {
      question: "How does inn quality affect the menu in D&D 3.5?",
      answer:
        "The tool does not roll official room rates from a rulebook. Quality sets flavor in the description and scales food and drink prices in copper or silver pieces so a poor taproom stays cheap and a good inn charges sp for supper.",
    },
    {
      question: "Can I reroll just the rumors or patrons?",
      answer:
        "Yes. Each section has its own Reroll control with a salted seed, so you can keep the keeper and menu while swapping gossip or who sits at the tables.",
    },
    {
      question: "What does Unreliable mean on a rumor?",
      answer:
        "Each generation marks one of three rumors as Unreliable. The label does not tell you which rumors are true; it only flags one line as shaky tavern talk for the DM to use at the table.",
    },
  ],
  "power-attack": [
    {
      question: "How does Power Attack work in D&D 3.5?",
      answer:
        "On a melee attack, you may take a penalty on attack rolls up to your base attack bonus to gain the same amount as a bonus on damage. Two-handed weapons (or a one-handed weapon wielded in two hands) add twice the penalty to damage instead.",
    },
    {
      question: "What does expected damage mean here?",
      answer:
        "The table averages damage over a d20 attack roll, treating natural 1 as an automatic miss and natural 20 as a hit. Threatened rolls use confirm chance against target AC before applying the critical multiplier.",
    },
    {
      question: "Which penalty should I use?",
      answer:
        "For each target AC column, the highlighted cell is the penalty with the highest expected damage. When two penalties tie, the smaller penalty is preferred.",
    },
  ],
  "random-tables": [
    {
      question: "How are trap Search DCs set in D&D 3.5?",
      answer:
        "Each trap uses Search DC 15 plus the listed CR, plus up to 4 points from the seed. Magic traps add 2 to the Disable Device DC. Attack traps use a bonus equal to CR; save traps use Reflex DC 10 + CR + 2 for the sample line.",
    },
    {
      question: "Do magic item rolls use the same tables as the Treasure Generator?",
      answer:
        "Yes. Magic item rows call the Dungeon Master's Guide treasure tables already used on the Treasure Generator page, including minor, medium, and major ranks and item type filters.",
    },
    {
      question: "How is a random spellbook different from Random Spellbook?",
      answer:
        "This table builds a compact wizard book by rank (mundane through major) with fixed spell counts per level from the compendium. The Random Spellbook tool is a separate planner with sources, specialization, and wishlists.",
    },
  ],
  "damage-statistic": [
    {
      question: "How is expected damage calculated?",
      answer:
        "Hit chance uses a d20 with natural 1 always missing and natural 20 always hitting. Expected damage blends normal hits and confirmed criticals using average dice results.",
    },
    {
      question: "Can I compare two weapons?",
      answer:
        "Yes. Turn on Compare weapons to add Weapon B. Both weapons share the same attacker and target. The table shows expected damage for both plus the difference (B minus A) for one round.",
    },
    {
      question: "Does the table include iterative attacks?",
      answer:
        "Yes. The full attack columns sum expected damage for every iterative attack bonus from your BAB, using the same attacker stats for each weapon.",
    },
    {
      question: "How does damage reduction work here?",
      answer:
        "DR reduces the physical portion of weapon damage only. Energy extras such as flaming still apply. Magic weapons bypass DR/magic when the enhancement bonus is at least +1.",
    },
    {
      question: "Can I load a saved PC Planner character?",
      answer:
        "When signed in, pick one of your saved PC plans to fill BAB, ability scores, feats, and equipped weapons. You can still edit any field after loading.",
    },
  ],
};

export const TOOLS_PAGE_FAQS: ToolFaq[] = [
  {
    question: "Is the Campaign table available without an account?",
    answer:
      "The Campaign tool requires a free account. Sign in to create a campaign table, invite players, and share live dice rolls.",
  },
  {
    question: "How do I find a tool on this page?",
    answer:
      "Tools are grouped by job: table, combat, building, loot, places, adventures, and names. Use Search tools to filter by name, source, or group. Groups with no matches hide until you clear the search.",
  },
];

export function getToolFaqs(key: ToolKey): ToolFaq[] {
  return TOOL_FAQS[key] ?? [];
}
