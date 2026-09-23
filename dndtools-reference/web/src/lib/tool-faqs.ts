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
        "Yes. Use the export action to download FG-compatible XML after filling race, class, feats, skills, and equipment.",
    },
    {
      question: "Can I share a PC plan with another player?",
      answer:
        "Yes. On the PC Planner sheet, use Share to copy a link. Anyone signed in can view the character read-only and add a copy to their own plans.",
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
  "damage-statistic": [
    {
      question: "How is expected damage calculated?",
      answer:
        "Hit chance uses a d20 with natural 1 always missing and natural 20 always hitting. Expected damage blends normal hits and confirmed criticals using average dice results.",
    },
    {
      question: "Can I compare two weapons?",
      answer:
        "Yes. Weapon A and Weapon B share the same attacker and target. The table shows expected damage for both plus the difference (B minus A) for one round.",
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
];

export function getToolFaqs(key: ToolKey): ToolFaq[] {
  return TOOL_FAQS[key] ?? [];
}
