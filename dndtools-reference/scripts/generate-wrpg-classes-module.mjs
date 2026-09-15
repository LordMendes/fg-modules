/**
 * Generates scripts/warcraft-rpg-classes-data.mjs with book-complete WRPG classes.
 * Run: node scripts/generate-wrpg-classes-module.mjs
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "warcraft-rpg-classes-data.mjs");

const SUMMON_BANS = JSON.stringify([
  "summon-monster-i-2441",
  "summon-monster-ii-2442",
  "summon-monster-iii-2443",
  "summon-monster-iv-2444",
  "summon-monster-v-2445",
  "summon-monster-vi-2446",
  "summon-monster-vii-2447",
  "summon-monster-viii-2448",
  "summon-monster-ix-2449",
]);

const healerRows = [
  ["1st", "+0", "+2", "+0", "+2", "Brew Potion", "3", "1", "-", "-", "-", "-", "-", "-", "-", "-"],
  ["2nd", "+1", "+3", "+0", "+3", "-", "4", "2", "-", "-", "-", "-", "-", "-", "-", "-"],
  ["3rd", "+2", "+3", "+1", "+3", "-", "4", "2", "1", "-", "-", "-", "-", "-", "-", "-"],
  ["4th", "+3", "+4", "+1", "+4", "-", "5", "3", "2", "-", "-", "-", "-", "-", "-", "-"],
  ["5th", "+3", "+4", "+1", "+4", "Bonus feat", "5", "3", "2", "1", "-", "-", "-", "-", "-", "-"],
  ["6th", "+4", "+5", "+2", "+5", "-", "5", "3", "3", "2", "-", "-", "-", "-", "-", "-"],
  ["7th", "+5", "+5", "+2", "+5", "-", "6", "4", "3", "2", "1", "-", "-", "-", "-", "-"],
  ["8th", "+6/+1", "+6", "+2", "+6", "-", "6", "4", "3", "3", "2", "-", "-", "-", "-", "-"],
  ["9th", "+6/+1", "+6", "+3", "+6", "-", "6", "4", "4", "3", "2", "1", "-", "-", "-", "-"],
  ["10th", "+7/+2", "+7", "+3", "+7", "Bonus feat", "6", "4", "4", "3", "3", "2", "-", "-", "-", "-"],
  ["11th", "+8/+3", "+7", "+3", "+7", "-", "6", "5", "4", "4", "3", "2", "1", "-", "-", "-"],
  ["12th", "+9/+4", "+8", "+4", "+8", "-", "6", "5", "4", "4", "3", "3", "2", "-", "-", "-"],
  ["13th", "+9/+4", "+8", "+4", "+8", "-", "6", "5", "5", "4", "4", "3", "2", "1", "-", "-"],
  ["14th", "+10/+5", "+9", "+4", "+9", "-", "6", "5", "5", "4", "4", "3", "3", "2", "-", "-"],
  ["15th", "+11/+6/+1", "+9", "+5", "+9", "Bonus feat", "6", "5", "5", "5", "4", "4", "3", "2", "1", "-"],
  ["16th", "+12/+7/+2", "+10", "+5", "+10", "-", "6", "5", "5", "5", "4", "4", "3", "3", "2", "-"],
  ["17th", "+12/+7/+2", "+10", "+5", "+10", "-", "6", "5", "5", "5", "5", "4", "4", "3", "2", "1"],
  ["18th", "+13/+8/+3", "+11", "+6", "+11", "-", "6", "5", "5", "5", "5", "4", "4", "3", "3", "2"],
  ["19th", "+14/+9/+4", "+11", "+6", "+11", "-", "6", "5", "5", "5", "5", "5", "4", "4", "3", "3"],
  ["20th", "+15/+10/+5", "+12", "+6", "+12", "Bonus feat", "6", "5", "5", "5", "5", "5", "4", "4", "4", "4"],
];

const scoutRows = [
  ["1st", "+0", "+2", "+2", "+0", "Track, nature sense"],
  ["2nd", "+1", "+3", "+3", "+0", "Wild healing"],
  ["3rd", "+2", "+3", "+3", "+1", "Woodland stride"],
  ["4th", "+3", "+4", "+4", "+1", "Trackless step, uncanny dodge"],
  ["5th", "+3", "+4", "+4", "+1", "Trap sense +1"],
  ["6th", "+4", "+5", "+5", "+2", "Locate object 1/day, wild healing +5"],
  ["7th", "+5", "+5", "+5", "+2", "Improved uncanny dodge"],
  ["8th", "+6/+1", "+6", "+6", "+2", "Swift tracker, trap sense +2"],
  ["9th", "+6/+1", "+6", "+6", "+3", "Venom immunity"],
  ["10th", "+7/+2", "+7", "+7", "+3", "Wild healing +10"],
  ["11th", "+8/+3", "+7", "+7", "+3", "Locate creature 1/day, trap sense +3"],
  ["12th", "+9/+4", "+8", "+8", "+4", "Evasion"],
  ["13th", "+9/+4", "+8", "+8", "+4", "Commune with nature 1/day"],
  ["14th", "+10/+5", "+9", "+9", "+4", "Wild healing +15, trap sense +4"],
  ["15th", "+11/+6/+1", "+9", "+9", "+5", "-"],
  ["16th", "+12/+7/+2", "+10", "+10", "+5", "Find the path 1/day"],
  ["17th", "+12/+7/+2", "+10", "+10", "+5", "Trap sense +5"],
  ["18th", "+13/+8/+3", "+11", "+11", "+6", "Wild healing +20"],
  ["19th", "+14/+9/+4", "+11", "+11", "+6", "-"],
  ["20th", "+15/+10/+5", "+12", "+12", "+6", "Wind walk 1/day, trap sense +6"],
];

const tinkerRows = [
  ["1st", "+0", "+0", "+2", "+2", "Bonus technology feat, scavenge"],
  ["2nd", "+1", "+0", "+3", "+3", "Bomb-bouncing, evasion"],
  ["3rd", "+2", "+1", "+3", "+3", "Coolness under fire 1/day"],
  ["4th", "+3", "+1", "+4", "+4", "Fire resistance 5, scavenge +2"],
  ["5th", "+3", "+1", "+4", "+4", "Bonus technology feat"],
  ["6th", "+4", "+2", "+5", "+5", "Coolness under fire 2/day"],
  ["7th", "+5", "+2", "+5", "+5", "-"],
  ["8th", "+6/+1", "+2", "+6", "+6", "Scavenge +4"],
  ["9th", "+6/+1", "+3", "+6", "+6", "Coolness under fire 3/day, fire resistance 10"],
  ["10th", "+7/+2", "+3", "+7", "+7", "Bonus technology feat"],
  ["11th", "+8/+3", "+3", "+7", "+7", "Improved evasion"],
  ["12th", "+9/+4", "+4", "+8", "+8", "Coolness under fire 4/day, scavenge +6"],
  ["13th", "+9/+4", "+4", "+8", "+8", "-"],
  ["14th", "+10/+5", "+4", "+9", "+9", "Fire resistance 15"],
  ["15th", "+11/+6/+1", "+5", "+9", "+9", "Coolness under fire 5/day, bonus technology feat"],
  ["16th", "+12/+7/+2", "+5", "+10", "+10", "Scavenge +8"],
  ["17th", "+12/+7/+2", "+5", "+10", "+10", "-"],
  ["18th", "+13/+8/+3", "+6", "+11", "+11", "Coolness under fire 6/day"],
  ["19th", "+14/+9/+4", "+6", "+11", "+11", "Fire resistance 20"],
  ["20th", "+15/+10/+5", "+6", "+12", "+12", "Bonus technology feat, scavenge +10"],
];

function j(v) {
  return JSON.stringify(v);
}

const src = `/** Auto-generated book-complete WRPG class records. Do not hand-edit; regenerate via generate-wrpg-classes-module.mjs */
export function buildWarcraftClasses({ base, html, text, a, sk }) {
  function feat(name, body) {
    return \`<p><strong>\${name}:</strong> \${body}</p>\`;
  }
  function sections(parts) {
    return parts.join("");
  }
  function advTable(headers, rows) {
    const th = headers.map((h) => \`<th>\${h}</th>\`).join("");
    const body = rows
      .map((r) => \`<tr>\${r.map((c) => \`<td>\${c}</td>\`).join("")}</tr>\`)
      .join("");
    return \`<table><thead><tr>\${th}</tr></thead><tbody>\${body}</tbody></table>\`;
  }
  function cls(slug, name, opts = {}) {
    const b = base(slug, name, opts.page);
    const isPrestige = Boolean(opts.prestige);
    const descHtml = html(opts.description ?? "");
    const reqHtml = opts.requirements ? html(opts.requirements) : null;
    const advHtml =
      opts.advancementHtml ??
      (opts.advancement ? \`<table>\${opts.advancement}</table>\` : null);
    return {
      ...b,
      hit_die: opts.hitDie ?? "d8",
      skill_points: opts.skillPoints ?? "4 + Int",
      index: {
        ...b.index,
        hit_die: (opts.hitDie ?? "d8").replace("d", ""),
        skill_points: (opts.skillPoints ?? "4 + Int").split(" ")[0],
        prestige_level: isPrestige ? "10" : "",
        ...(opts.spellListOriginSlug
          ? { spellListOriginSlug: opts.spellListOriginSlug }
          : {}),
        ...(opts.spellListBannedSlugs
          ? { spellListBannedSlugs: opts.spellListBannedSlugs }
          : {}),
      },
      class_skills: opts.skills ?? [],
      description_html: descHtml,
      description_text: text(descHtml),
      requirements_html: reqHtml,
      requirements_text: reqHtml ? text(reqHtml) : null,
      advancement_html: advHtml,
      advancement_text: opts.advancementText ?? (advHtml ? text(advHtml) : null),
    };
  }

  const SUMMON_BANS = ${SUMMON_BANS};
  const healerRows = ${j(healerRows)};
  const scoutRows = ${j(scoutRows)};
  const tinkerRows = ${j(tinkerRows)};

  return [
    cls("barbarian-wrpg", "Barbarian (Warcraft)", {
      page: 55,
      hitDie: "d12",
      skillPoints: "4 + Int",
      skills: [sk.climb, sk.intimidate, sk.jump, sk.listen, sk.survival, sk.swim, sk.knowMilitary],
      description: sections([
        "<p>Uses the Player's Handbook barbarian with the following Warcraft changes. Affiliation: any.</p>",
        feat("Class Skills", \`\${a("/skills/knowledge-military-tactics", "Knowledge (military tactics)")} is a class skill in addition to the PHB barbarian class skills.\`),
        feat("Orc Battle Rage", \`\${a("/races/orc-wrpg", "Orc")} barbarians may rage one extra time per day (stacks with racial battle rage).\`),
      ]),
      advancementHtml: "<p>Uses the Player's Handbook barbarian advancement table.</p>",
    }),
    cls("fighter-wrpg", "Fighter (Warcraft)", {
      page: 55,
      hitDie: "d10",
      skillPoints: "2 + Int",
      skills: [sk.climb, sk.craft, sk.handleAnimal, sk.intimidate, sk.jump, sk.ride, sk.swim, sk.knowMilitary],
      description: sections([
        "<p>Uses the Player's Handbook fighter with the following Warcraft changes. Affiliation: any.</p>",
        feat("Class Skills", \`\${a("/skills/knowledge-military-tactics", "Knowledge (military tactics)")} is a class skill.\`),
        feat("Bonus Feats", \`The fighter bonus feat list expands to include WRPG feats such as \${a("/feats/butt-strike-wrpg", "Pistol Whip")}, \${a("/feats/defender-wrpg", "Defend")}, \${a("/feats/expert-rider-wrpg", "Expert Rider")}, \${a("/feats/rapid-reload-wrpg", "Lightning Reload")}, \${a("/feats/mounted-elite-sharpshooter-wrpg", "Mounted Sharpshooter")}, \${a("/feats/bash-wrpg", "Bash")}, and \${a("/feats/sunder-armor-wrpg", "Sunder Armor")}.\`),
      ]),
      advancementHtml: "<p>Uses the Player's Handbook fighter advancement table.</p>",
    }),
    cls("rogue-wrpg", "Rogue (Warcraft)", {
      page: 56,
      hitDie: "d6",
      skillPoints: "8 + Int",
      skills: [sk.appraise, sk.balance, sk.bluff, sk.climb, sk.craft, sk.decipher, sk.diplomacy, sk.disableDevice, sk.disguise, sk.escapeArtist, sk.forgery, sk.gatherInfo, sk.hide, sk.intimidate, sk.jump, sk.listen, sk.moveSilently, sk.openLock, sk.perform, sk.profession, sk.search, sk.senseMotive, sk.sleightOfHand, sk.spot, sk.swim, sk.tumble, sk.useMagic, sk.useRope, sk.useTech],
      description: sections([
        "<p>Uses the Player's Handbook rogue with the following Warcraft changes. Affiliation: any.</p>",
        feat("Class Skills", \`Gains \${a("/skills/use-technological-device", "Use Technological Device")} as a class skill in addition to the PHB rogue class skills.\`),
      ]),
      advancementHtml: "<p>Uses the Player's Handbook rogue advancement table.</p>",
    }),
    cls("sorcerer-wrpg", "Sorcerer (Warcraft)", {
      page: 56,
      hitDie: "d4",
      skillPoints: "2 + Int",
      skills: [sk.bluff, sk.concentration, sk.craft, sk.knowArcana, sk.profession, sk.spellcraft],
      spellListOriginSlug: "sorcerer-98",
      spellListBannedSlugs: SUMMON_BANS,
      description: sections([
        \`<p>Uses the Player's Handbook \${a("/classes/sorcerer-98", "sorcerer")} with Warcraft spell restrictions. Affiliation: any.</p>\`,
        feat("Spell Restrictions", \`No summon monster I–IX or planar binding (those belong to the \${a("/classes/warlock-wrpg", "warlock")}). Many necromancy spells are restricted to the Necromancer (Alliance &amp; Horde Compendium). See \${a("/spells/warcraft-cosmology-wrpg", "Warcraft Cosmology")}.\`),
        feat("Night Elf Restriction", "A night elf who takes sorcerer levels becomes a high elf."),
        feat("Spell List", "Inherits the PHB sorcerer list (minus banned conjurations) and adds WRPG arcane spells."),
      ]),
      advancementHtml: "<p>Uses the Player's Handbook sorcerer advancement table.</p>",
    }),
    cls("wizard-wrpg", "Wizard (Warcraft)", {
      page: 57,
      hitDie: "d4",
      skillPoints: "2 + Int",
      skills: [sk.concentration, sk.craft, sk.decipher, sk.knowArcana, sk.knowPlanes, sk.profession, sk.spellcraft],
      spellListOriginSlug: "wizard-99",
      spellListBannedSlugs: SUMMON_BANS,
      description: sections([
        \`<p>Uses the Player's Handbook \${a("/classes/wizard-99", "wizard")} with the same summoning/necromancy bans as the \${a("/classes/sorcerer-wrpg", "Warcraft sorcerer")}. Affiliation: any.</p>\`,
        feat("Night Elf Restriction", \`A \${a("/races/night-elf-wrpg", "night elf")} who becomes a wizard is stripped of night elf heritage and treated as a \${a("/races/high-elf-wrpg", "high elf")}.\`),
        feat("Spell List", "Inherits the PHB wizard list (minus banned conjurations) and adds WRPG arcane spells."),
      ]),
      advancementHtml: "<p>Uses the Player's Handbook wizard advancement table.</p>",
    }),
    cls("healer-wrpg", "Healer", {
      page: 58,
      hitDie: "d8",
      skillPoints: "4 + Int",
      skills: [sk.bluff, sk.concentration, sk.craft, sk.diplomacy, sk.gatherInfo, sk.handleAnimal, sk.heal, sk.knowArcana, sk.knowReligion, sk.listen, sk.profession, sk.senseMotive, sk.speakLanguage, sk.spellcraft, sk.spot],
      description: sections([
        "<p>New core divine caster (Wis; prepared). Affiliation: any. Hit Die d8; 4 skill points. Proficient with all simple weapons and light armor.</p>",
        feat("Spells", "Prepares divine spells from the healer list. Needs Wisdom 10 + spell level. Save DC = 10 + spell level + Wis modifier. Spends 1 hour/day in quiet contemplation to prepare spells. Does not gain bonus domain slots beyond normal spells/day."),
        feat("Spontaneous Casting", "Good healers can convert prepared spells into cure spells of equal or lower level. Evil healers convert into inflict spells. Neutral healers choose cure or inflict at creation (permanent)."),
        feat("Healing Touch or Evil Touch", "Good: Healing domain granted power (+1 caster level with Healing-domain spells). Evil: Evil domain granted power. Neutral chooses one at creation. No extra domain slot."),
        feat("Brew Potion", "Bonus feat at 1st level."),
        feat("Bonus Feats", "At 5th, 10th, 15th, and 20th: item creation, metamagic, or Spell Focus (must meet prerequisites)."),
        feat("Spell List", \`Includes PHB cleric-style spells plus WRPG spells such as \${a("/spells/healing-rain-wrpg", "healing rain")}, \${a("/spells/death-coil-wrpg", "death coil")}, \${a("/spells/moon-glaive-spell-wrpg", "moonglaive")}, \${a("/spells/rejuvenation-wrpg", "rejuvenation")}, \${a("/spells/second-soul-wrpg", "second soul")}, and \${a("/spells/touch-of-life-wrpg", "touch of life")}. Full list membership is applied via spell-class links.\`),
      ]),
      advancementHtml: advTable(
        ["Level", "BAB", "Fort", "Ref", "Will", "Special", "0", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"],
        healerRows,
      ),
    }),
    cls("scout-wrpg", "Scout", {
      page: 61,
      hitDie: "d8",
      skillPoints: "6 + Int",
      skills: [sk.climb, sk.craft, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.search, sk.spot, sk.survival, sk.swim, sk.useRope],
      description: sections([
        \`<p>New core wilderness warrior (favored class of \${a("/races/night-elf-wrpg", "night elves")}). Affiliation: any. Hit Die d8; 6 skill points; good Fort/Ref. Proficient with all simple and martial weapons, light and medium armor, and shields.</p>\`,
        feat("Track", "Bonus Track feat at 1st level."),
        feat("Nature Sense (Ex)", "At 1st: +2 on Knowledge (nature) and Survival."),
        feat("Wild Healing (Ex)", "At 2nd: with 5 ranks Survival, spend 1 hour and make a DC 15 Survival check to prepare a wilderness poultice. Then make a Heal check (DC 10); subject recovers 1 hp per point over 10. Once/subject/day. Competence bonus to that Heal check +5 at 6th, +10 at 10th, +15 at 14th, +20 at 18th."),
        feat("Woodland Stride (Ex)", "At 3rd: move through natural undergrowth at normal speed without damage or impairment."),
        feat("Trackless Step (Ex)", "At 4th: leave no trail in natural surroundings unless desired."),
        feat("Uncanny Dodge (Ex)", "At 4th: retain Dex bonus to AC when flat-footed or struck by an invisible attacker."),
        feat("Trap Sense (Ex)", "At 5th: +1 Reflex vs traps and +1 dodge AC vs traps; +1 every three levels thereafter (max +6 at 20th)."),
        feat("Spell-Like Abilities", "Locate object 1/day (6th), locate creature 1/day (11th), commune with nature 1/day (13th), find the path 1/day (16th), wind walk 1/day (20th). Caster level = scout level."),
        feat("Improved Uncanny Dodge (Ex)", "At 7th: cannot be flanked (except by a rogue with 4+ more rogue levels than scout levels)."),
        feat("Swift Tracker (Ex)", "At 8th: track at normal speed without the -5 penalty."),
        feat("Venom Immunity (Su)", "At 9th: immune to organic poisons."),
        feat("Evasion (Ex)", "At 12th: no damage on a successful Reflex save for half (light or no armor)."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], scoutRows),
    }),
    cls("tinker-wrpg", "Tinker", {
      page: 63,
      hitDie: "d6",
      skillPoints: "8 + Int",
      skills: [sk.appraise, sk.concentration, sk.craft, sk.decipher, sk.disableDevice, sk.forgery, sk.gatherInfo, sk.knowArchEng, sk.openLock, sk.profession, sk.search, sk.useMagic, sk.useTech],
      description: sections([
        \`<p>New core technological expert (favored class of \${a("/races/goblin-wrpg", "goblins")}). Affiliation: any. Hit Die d6; 8 skill points. Proficient with all simple weapons (no armor proficiency).</p>\`,
        feat("Bonus Technology Feats", \`At 1st, 5th, 10th, 15th, and 20th: bonus Technology feat (must meet prerequisites), including \${a("/feats/create-firearms-wrpg", "Build Firearms")}, \${a("/feats/create-siege-engines-wrpg", "Build Siege Weapons")}, \${a("/feats/create-small-devices-wrpg", "Build Small Devices")}, and \${a("/feats/create-vehicles-wrpg", "Build Vehicles")}.\`),
        feat("Scavenge (Ex)", "At 1st: jury-rig devices on the fly (+10 Craft DC) using scavenged parts in 1/10 normal time. Bonus +2 at 4th and every 4 levels thereafter (max +10 at 20th). Duration of a scavenged device equals tinker level in uses or hours."),
        feat("Bomb-Bouncing (Ex)", "At 2nd: grenade-like weapons have double range increment when thrown with spin."),
        feat("Evasion (Ex)", "At 2nd: no damage on a successful Reflex save for half (light or no armor)."),
        feat("Coolness Under Fire (Ex)", "At 3rd: take 10 on checks to operate or build mechanical devices even when stressed, 1/day; +1/day every 3 levels (max 6/day at 18th)."),
        feat("Fire Resistance (Ex)", "At 4th: fire resistance 5; +5 every 5 levels thereafter (10/15/20 at 9th/14th/19th)."),
        feat("Improved Evasion (Ex)", "At 11th: no damage on successful Reflex save for half, half damage on a failed save."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], tinkerRows),
    }),
    cls("beastmaster-wrpg", "Beastmaster", {
      page: 66, prestige: true, hitDie: "d12", skillPoints: "4 + Int",
      skills: [sk.climb, sk.craft, sk.handleAnimal, sk.heal, sk.intimidate, sk.jump, sk.knowNature, sk.spot, sk.survival, sk.swim],
      requirements: \`Affiliation Horde or night elf; \${a("/skills/handle-animal", "Handle Animal")} 5 ranks; \${a("/skills/survival", "Survival")} 8 ranks; Animal Affinity; Toughness.\`,
      description: sections([
        "<p>Horde or night elf animal companion prestige class. Full BAB; d12 HD. Proficient with simple and martial weapons and light and medium armor.</p>",
        feat("Animal Companion (Ex)", "At 1st: as PHB druid animal companion, using beastmaster level."),
        feat("Wild Empathy (Ex)", "At 1st: improve animal attitude as Diplomacy; 1d20 + class level + Cha."),
        feat("Animal Friendship (Sp)", "At 2nd: befriend additional animals whose total HD do not exceed class level, 1/day."),
        feat("Empathic Link (Su)", "At 3rd: empathic link with companion out to 1 mile."),
        feat("Natural Weaponry (Su)", "At 4th: grow claws and bite/gore (size-based damage); improved at 7th."),
        feat("Speak with Animals (Su)", "At 5th: as speak with animals at will with animals and magical beasts."),
        feat("Magic Fang (Sp)", "At 6th: magic fang on companion 1/day (2/day at 8th; greater magic fang 3/day at 10th)."),
        feat("Scry on Companion (Sp)", "At 9th: scry on companion 1/day."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], [
        ["1st", "+1", "+2", "+0", "+0", "Animal companion, wild empathy"],
        ["2nd", "+2", "+3", "+0", "+0", "Animal friendship 1/day"],
        ["3rd", "+3", "+3", "+1", "+1", "Empathic link"],
        ["4th", "+4", "+4", "+1", "+1", "Natural weaponry"],
        ["5th", "+5", "+4", "+1", "+1", "Speak with animals"],
        ["6th", "+6", "+5", "+2", "+2", "Magic fang 1/day"],
        ["7th", "+7", "+5", "+2", "+2", "Improved natural weaponry"],
        ["8th", "+8", "+6", "+2", "+2", "Magic fang 2/day"],
        ["9th", "+9", "+6", "+3", "+3", "Scry on companion"],
        ["10th", "+10", "+7", "+3", "+3", "Greater magic fang 3/day"],
      ]),
    }),
    cls("druid-of-the-wild-wrpg", "Druid of the Wild", {
      page: 69, prestige: true, hitDie: "d8", skillPoints: "4 + Int",
      skills: [sk.concentration, sk.craft, sk.handleAnimal, sk.heal, sk.hide, sk.knowNature, sk.profession, sk.survival, sk.swim],
      spellListOriginSlug: "healer-wrpg",
      requirements: \`Race night elf or tauren; non-evil; Knowledge (nature) 5 ranks; \${a("/skills/survival", "Survival")} 5 ranks; able to cast 3rd-level divine spells.\`,
      description: sections([
        \`<p>Night elf/tauren nature prestige class. +1 divine caster level each class level. Casts from the Druid of the Wild list and the \${a("/classes/healer-wrpg", "healer")} list. May spontaneously cast summon nature's ally. No metal armor.</p>\`,
        feat("Green Sleep (Ex)", "At 1st: hibernate into the Emerald Dream at will; body needs no food, water, or air."),
        feat("Wild Shape (Su)", "At 1st: storm crow 1/day; additional uses and forms (stag, nightsaber, dire bear, treant) as levels advance."),
        feat("Woodland Stride / Nature Sense / Trackless Step", "As listed on the advancement table."),
        feat("Venom Immunity / Timeless Body / Dreamwalking", "At 5th / 7th / 10th respectively."),
        feat("Spell List", \`Adds WRPG spells such as \${a("/spells/roar-wrpg", "roar")}, \${a("/spells/thorns-shield-wrpg", "thorn shield")}, and \${a("/spells/force-of-nature-wrpg", "force of nature")}, plus a printed nature list.\`),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "Spells"], [
        ["1st", "+0", "+2", "+0", "+2", "Wild shape 1/day, green sleep, woodland stride", "+1 divine"],
        ["2nd", "+1", "+3", "+0", "+3", "Nature sense", "+1 divine"],
        ["3rd", "+2", "+3", "+1", "+3", "Trackless step, wild shape 2/day", "+1 divine"],
        ["4th", "+3", "+4", "+1", "+4", "-", "+1 divine"],
        ["5th", "+3", "+4", "+1", "+4", "Venom immunity, wild shape 3/day", "+1 divine"],
        ["6th", "+4", "+5", "+2", "+5", "-", "+1 divine"],
        ["7th", "+5", "+5", "+2", "+5", "Timeless body, wild shape 4/day", "+1 divine"],
        ["8th", "+6", "+6", "+2", "+6", "-", "+1 divine"],
        ["9th", "+6", "+6", "+3", "+6", "Wild shape 5/day", "+1 divine"],
        ["10th", "+7", "+7", "+3", "+7", "Dreamwalking", "+1 divine"],
      ]),
    }),
    cls("elven-ranger-wrpg", "Elven Ranger", {
      page: 73, prestige: true, hitDie: "d8", skillPoints: "4 + Int",
      skills: [sk.climb, sk.concentration, sk.craft, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.spot, sk.survival, sk.swim, sk.useRope],
      requirements: \`Elf (high or night); Alliance; BAB +5; Knowledge (nature) 6 ranks; \${a("/skills/survival", "Survival")} 6 ranks; Point Blank Shot; Track.\`,
      description: sections([
        "<p>Alliance elven archery prestige class (high elf ranger / night elf sentinel). Own divine spell list (Wis). Full BAB.</p>",
        feat("Extended Range (Ex)", "Each level adds +10 ft. to bow/crossbow range increment."),
        feat("Favored Enemy (Ex)", "At 1st and odd levels thereafter, as PHB ranger (Warcraft creature options)."),
        feat("Archery Combat Style", "Rapid Shot (1st), Manyshot (6th), Improved Precise Shot (10th) without prerequisites while in light or no armor."),
        feat("Other Features", "Heightened perception, woodland stride, keen arrows, swift tracker, bow strike, anticipation, arrow cleave."),
        feat("Spell List", \`Own 1st–4th list including \${a("/spells/sentinel-wrpg", "sentinel")}.\`),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "1st", "2nd", "3rd", "4th"], [
        ["1st", "+1", "+2", "+2", "+0", "Spells, favored enemy, archery style, extended range", "0", "-", "-", "-"],
        ["2nd", "+2", "+3", "+3", "+0", "Heightened perception, woodland stride", "1", "-", "-", "-"],
        ["3rd", "+3", "+3", "+3", "+1", "2nd favored enemy", "1", "0", "-", "-"],
        ["4th", "+4", "+4", "+4", "+1", "Keen arrows, swift tracker", "1", "1", "-", "-"],
        ["5th", "+5", "+4", "+4", "+1", "3rd favored enemy", "1", "1", "0", "-"],
        ["6th", "+6", "+5", "+5", "+2", "Bow strike, improved archery style", "1", "1", "1", "-"],
        ["7th", "+7", "+5", "+5", "+2", "4th favored enemy", "2", "1", "1", "0"],
        ["8th", "+8", "+6", "+6", "+2", "Anticipation", "2", "1", "1", "1"],
        ["9th", "+9", "+6", "+6", "+3", "5th favored enemy", "2", "2", "1", "1"],
        ["10th", "+10", "+7", "+7", "+3", "Arrow cleave, archery mastery", "2", "2", "2", "1"],
      ]),
    }),
    cls("gladiator-wrpg", "Gladiator", {
      page: 77, prestige: true, hitDie: "d10", skillPoints: "2 + Int",
      skills: [sk.bluff, sk.climb, sk.craft, sk.intimidate, sk.jump, sk.knowMilitary, sk.perform, sk.senseMotive, sk.swim],
      requirements: \`Any affiliation; BAB +5; \${a("/skills/bluff", "Bluff")} 2 ranks; \${a("/skills/intimidate", "Intimidate")} 5 ranks; Cleave; Power Attack.\`,
      description: sections([
        "<p>Arena champion (Alliance gladiator / Horde blademaster). Full BAB; d10 HD. Proficient with simple and martial weapons and light and medium armor.</p>",
        feat("Supreme Cleave (Ex)", "At 1st: may take a 5-ft. step between Cleave/Great Cleave attacks once/round."),
        feat("Command (Ex)", "At 2nd: rally allies within 20 ft. for a morale bonus on attacks (+1 to +5 by level), 1/day."),
        feat("Two-Handed Mastery (Ex)", "At 3rd: ×2 Strength bonus to damage with two-handed weapons."),
        feat("Strike Like the Wind (Su)", "At 4th: become invisible as a move action (free at 8th); total rounds/day = class level."),
        feat("Critical Strike / Maximum Damage / Mirror Image / Blade Whirlwind", "As listed on the advancement table."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], [
        ["1st", "+1", "+2", "+0", "+0", "Supreme Cleave"],
        ["2nd", "+2", "+3", "+0", "+0", "Command"],
        ["3rd", "+3", "+3", "+1", "+1", "Two-handed mastery"],
        ["4th", "+4", "+4", "+1", "+1", "Strike like the wind"],
        ["5th", "+5", "+4", "+1", "+1", "Critical strike 1/day"],
        ["6th", "+6", "+5", "+2", "+2", "Maximum damage 1/day"],
        ["7th", "+7", "+5", "+2", "+2", "Critical strike 2/day, mirror image"],
        ["8th", "+8", "+6", "+2", "+2", "Improved strike like the wind, maximum damage 2/day"],
        ["9th", "+9", "+6", "+3", "+3", "Critical strike 3/day"],
        ["10th", "+10", "+7", "+3", "+3", "Blade whirlwind, improved mirror image, maximum damage 3/day"],
      ]),
    }),
    cls("horde-assassin-wrpg", "Horde Assassin", {
      page: 79, prestige: true, hitDie: "d6", skillPoints: "4 + Int",
      skills: [sk.balance, sk.bluff, sk.climb, sk.craft, sk.disableDevice, sk.disguise, sk.escapeArtist, sk.hide, sk.intimidate, sk.jump, sk.listen, sk.moveSilently, sk.openLock, sk.profession, sk.search, sk.senseMotive, sk.spot, sk.swim, sk.tumble, sk.useRope],
      spellListOriginSlug: "assassin-381",
      requirements: \`Non-good; Horde only; \${a("/skills/hide", "Hide")} 8 ranks; \${a("/skills/move-silently", "Move Silently")} 8 ranks.\`,
      description: sections([
        \`<p>Horde-only prestige class. Aside from the Warcraft requirements and class skills listed here, functions as the DMG \${a("/classes/assassin-381", "assassin")} (death attack, sneak attack, poison use, spells).</p>\`,
      ]),
      advancementHtml: "<p>Uses the Dungeon Master's Guide assassin advancement table and spell list.</p>",
    }),
    cls("hunter-wrpg", "Hunter", {
      page: 80, prestige: true, hitDie: "d8", skillPoints: "4 + Int",
      skills: [sk.climb, sk.concentration, sk.craft, sk.handleAnimal, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.spot, sk.survival, sk.swim],
      requirements: \`Horde; BAB +5; \${a("/skills/survival", "Survival")} 8 ranks; Track; Weapon Focus (any melee or thrown).\`,
      description: sections([
        "<p>Horde skirmisher prestige class with divine spells (Wis). Full BAB.</p>",
        feat("Favored Terrain (Ex)", "At 1st and odd levels: +2 circumstance bonuses in a chosen terrain; improve one prior terrain by +2 when selecting a new one."),
        feat("Weapon Combat Style", "Weapon Specialization (1st), Greater Weapon Focus (6th), Greater Weapon Specialization (10th) without prerequisites in light/no armor."),
        feat("Extended Throwing Range", "Each level +5 ft. to thrown weapon range increment."),
        feat("Other Features", "Heightened stealth, woodland stride, keen weapon, Combat Reflexes, camouflage, swift tracker, greater critical."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "1st", "2nd", "3rd", "4th"], [
        ["1st", "+1", "+2", "+0", "+0", "Spells, favored terrain, combat style, extended throwing range", "0", "-", "-", "-"],
        ["2nd", "+2", "+3", "+0", "+0", "Heightened stealth, woodland stride", "1", "-", "-", "-"],
        ["3rd", "+3", "+3", "+1", "+1", "2nd favored terrain", "1", "0", "-", "-"],
        ["4th", "+4", "+4", "+1", "+1", "Keen weapon", "1", "1", "-", "-"],
        ["5th", "+5", "+4", "+1", "+1", "3rd favored terrain", "1", "1", "0", "-"],
        ["6th", "+6", "+5", "+2", "+2", "Combat Reflexes, improved combat style", "1", "1", "1", "-"],
        ["7th", "+7", "+5", "+2", "+2", "Camouflage, 4th favored terrain", "2", "1", "1", "0"],
        ["8th", "+8", "+6", "+2", "+2", "Swift tracker", "2", "1", "1", "1"],
        ["9th", "+9", "+6", "+3", "+3", "5th favored terrain", "2", "2", "1", "1"],
        ["10th", "+10", "+7", "+3", "+3", "Greater critical, combat mastery", "2", "2", "2", "1"],
      ]),
    }),
    cls("infiltrator-wrpg", "Infiltrator", {
      page: 83, prestige: true, hitDie: "d6", skillPoints: "6 + Int",
      skills: [sk.appraise, sk.balance, sk.bluff, sk.climb, sk.craft, sk.decipher, sk.diplomacy, sk.disguise, sk.escapeArtist, sk.forgery, sk.gatherInfo, sk.hide, sk.intimidate, sk.jump, sk.listen, sk.moveSilently, sk.openLock, sk.perform, sk.profession, sk.search, sk.senseMotive, sk.sleightOfHand, sk.speakLanguage, sk.spot, sk.swim, sk.tumble, sk.useMagic, sk.useTech, sk.useRope],
      requirements: \`Alliance; \${a("/skills/bluff", "Bluff")} 8 ranks; \${a("/skills/disguise", "Disguise")} 8 ranks.\`,
      description: sections([
        "<p>Alliance espionage prestige class. Poor BAB. Proficient with simple weapons and light armor.</p>",
        feat("Canny Defense (Ex)", "While unarmored and wielding a melee weapon, add Int bonus to AC (max = infiltrator level)."),
        feat("Smooth Talker (Ex)", "At 1st: +2 Bluff and Sense Motive."),
        feat("Connections (Ex)", "At 1st: 1/day seek a contact (1d20 + level + Cha vs DC by importance)."),
        feat("Other Features", "Uncanny dodge, flawless disguise, suggestion/mass suggestion, improved uncanny dodge, slippery mind, hide in plain sight, dominate monster."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], [
        ["1st", "+0", "+0", "+2", "+0", "Canny defense, smooth talker, connections"],
        ["2nd", "+1", "+0", "+3", "+0", "Uncanny dodge"],
        ["3rd", "+2", "+1", "+3", "+1", "Flawless disguise"],
        ["4th", "+3", "+1", "+4", "+1", "Suggestion 1/day"],
        ["5th", "+3", "+1", "+4", "+1", "Improved uncanny dodge"],
        ["6th", "+4", "+2", "+5", "+2", "Suggestion 2/day"],
        ["7th", "+5", "+2", "+5", "+2", "Slippery mind"],
        ["8th", "+6", "+2", "+6", "+2", "Mass suggestion 1/day"],
        ["9th", "+6", "+3", "+6", "+3", "Hide in plain sight"],
        ["10th", "+7", "+3", "+7", "+3", "Dominate 1/day"],
      ]),
    }),
    cls("mounted-combatant-wrpg", "Mounted Warrior", {
      page: 85, prestige: true, hitDie: "d10", skillPoints: "2 + Int",
      skills: [sk.climb, sk.craft, sk.diplomacy, sk.handleAnimal, sk.jump, sk.knowMilitary, sk.profession, sk.ride, sk.swim],
      requirements: \`Any affiliation; BAB +5; \${a("/skills/ride", "Ride")} 8 ranks (warhorse/nightsaber Alliance, or dire wolf Horde); Mounted Combat.\`,
      description: sections([
        \`<p>Elite cavalry prestige class (knight / huntress / raider). Full BAB. Synergizes with \${a("/feats/expert-rider-wrpg", "Expert Rider")} and \${a("/feats/mounted-elite-sharpshooter-wrpg", "Mounted Sharpshooter")}.</p>\`,
        feat("Special Mount", "At 1st: call an intelligent loyal mount that advances with class level."),
        feat("Mounted Expertise", "At 2nd: shift attack and AC bonuses while mounted."),
        feat("Bonus Feats / Improved Mounted Combat / Mounted Command / Woodland Ride / Shock Charge", "As listed on the advancement table."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special"], [
        ["1st", "+1", "+2", "+0", "+0", "Special mount"],
        ["2nd", "+2", "+3", "+0", "+0", "Mounted expertise"],
        ["3rd", "+3", "+3", "+1", "+1", "Bonus feat"],
        ["4th", "+4", "+4", "+1", "+1", "Improved Mounted Combat 2/round"],
        ["5th", "+5", "+4", "+1", "+1", "Mounted command"],
        ["6th", "+6", "+5", "+2", "+2", "Bonus feat"],
        ["7th", "+7", "+5", "+2", "+2", "Woodland ride"],
        ["8th", "+8", "+6", "+2", "+2", "Improved Mounted Combat 3/round"],
        ["9th", "+9", "+6", "+3", "+3", "Bonus feat"],
        ["10th", "+10", "+7", "+3", "+3", "Shock charge"],
      ]),
    }),
    cls("paladin-warrior-wrpg", "Paladin Warrior", {
      page: 88, prestige: true, hitDie: "d10", skillPoints: "2 + Int",
      skills: [sk.climb, sk.concentration, sk.craft, sk.diplomacy, sk.handleAnimal, sk.heal, sk.jump, sk.knowMilitary, sk.knowPlanes, sk.knowReligion, sk.knowUndead, sk.profession, sk.ride, sk.swim],
      requirements: \`Human or Ironforge dwarf; any good; Alliance; BAB +5; \${a("/skills/diplomacy", "Diplomacy")} 5 ranks; \${a("/skills/knowledge-religion", "Knowledge (religion)")} 3 ranks; Weapon Focus (warhammer); initiation quest.\`,
      description: sections([
        "<p>Alliance Silver Hand prestige class. Full BAB; divine spells (Wis). Must uphold a code of honor.</p>",
        feat("Lay on Hands / Detect / Turn", "At 1st: lay on hands; detect outsiders and undead at will; turn undead and outsiders."),
        feat("Aura of Courage / Smite / Divine Health / Divine Grace", "As listed on the advancement table."),
        feat("Greater / Power Turning / Banishing Strike", "High-level turning options and 1/day banishing strike."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "1st", "2nd", "3rd", "4th"], [
        ["1st", "+1", "+2", "+0", "+0", "Lay on hands, detect, turn", "0", "-", "-", "-"],
        ["2nd", "+2", "+3", "+0", "+0", "Aura of courage", "1", "-", "-", "-"],
        ["3rd", "+3", "+3", "+1", "+1", "Smite undead/outsider", "1", "0", "-", "-"],
        ["4th", "+4", "+4", "+1", "+1", "Divine health, remove disease 1/day", "1", "1", "-", "-"],
        ["5th", "+5", "+4", "+1", "+1", "Divine grace", "1", "1", "0", "-"],
        ["6th", "+6", "+5", "+2", "+2", "Greater turning, smite 2/day", "1", "1", "1", "-"],
        ["7th", "+7", "+5", "+2", "+2", "Extra Turning", "2", "1", "1", "0"],
        ["8th", "+8", "+6", "+2", "+2", "Banishing strike 1/day", "2", "1", "1", "1"],
        ["9th", "+9", "+6", "+3", "+3", "Smite 3/day", "2", "2", "1", "1"],
        ["10th", "+10", "+7", "+3", "+3", "Power turning", "2", "2", "2", "1"],
      ]),
    }),
    cls("priest-wrpg", "Priest", {
      page: 91, prestige: true, hitDie: "d8", skillPoints: "2 + Int",
      skills: [sk.concentration, sk.craft, sk.diplomacy, sk.gatherInfo, sk.heal, sk.knowArcana, sk.knowReligion, sk.profession, sk.spellcraft],
      spellListOriginSlug: "healer-wrpg",
      requirements: \`Non-evil; Alliance; \${a("/skills/knowledge-religion", "Knowledge (religion)")} 6 ranks; able to cast 3rd-level divine spells.\`,
      description: sections([
        \`<p>Alliance divine prestige class. +1 divine caster level each level; spontaneous cure; Healing and Protection domains. Inherits the \${a("/classes/healer-wrpg", "healer")} spell list plus priest additives (including \${a("/spells/falling-star-wrpg", "starfall")}).</p>\`,
        feat("Divine Defense", "+1 sacred vs necromancy at 1st; +2/+3/+4 at 4th/7th/10th."),
        feat("Turn Undead", "At 1st: turn as cleric using stacked divine levels."),
        feat("Divine Urge", "Suggestion 1/day at 3rd (2/day at 6th); mass suggestion 1/day at 9th."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "Spells"], [
        ["1st", "+0", "+2", "+0", "+2", "Divine defense +1, turn undead, domains", "+1 divine"],
        ["2nd", "+1", "+3", "+0", "+3", "-", "+1 divine"],
        ["3rd", "+2", "+3", "+1", "+3", "Divine urge 1/day", "+1 divine"],
        ["4th", "+3", "+4", "+1", "+4", "Divine defense +2", "+1 divine"],
        ["5th", "+3", "+4", "+1", "+4", "-", "+1 divine"],
        ["6th", "+4", "+5", "+2", "+5", "Divine urge 2/day", "+1 divine"],
        ["7th", "+5", "+5", "+2", "+5", "Divine defense +3", "+1 divine"],
        ["8th", "+6", "+6", "+2", "+6", "-", "+1 divine"],
        ["9th", "+6", "+6", "+3", "+6", "Mass divine urge 1/day", "+1 divine"],
        ["10th", "+7", "+7", "+3", "+7", "Divine defense +4", "+1 divine"],
      ]),
    }),
    cls("shaman-wrpg", "Shaman", {
      page: 93, prestige: true, hitDie: "d8", skillPoints: "2 + Int",
      skills: [sk.climb, sk.concentration, sk.craft, sk.heal, sk.intimidate, sk.jump, sk.knowNature, sk.knowReligion, sk.profession, sk.spellcraft, sk.survival, sk.swim],
      spellListOriginSlug: "healer-wrpg",
      requirements: "Any affiliation; BAB +4; able to cast 1st-level divine spells.",
      description: sections([
        \`<p>Elemental/spirit prestige class. +1 divine caster level each level; spontaneous cure. Inherits the \${a("/classes/healer-wrpg", "healer")} list plus shaman additives such as \${a("/spells/stasis-trap-wrpg", "stasis trap")}, \${a("/spells/ice-armor-wrpg", "frost armor")}, \${a("/spells/bloodlust-wrpg", "bloodlust")}, \${a("/spells/immolation-wrpg", "immolation")}, \${a("/spells/healing-totem-wrpg", "healing ward")}, and \${a("/spells/serpent-totem-wrpg", "serpent ward")}.</p>\`,
        feat("Weather Sense (Su)", "At 1st: bonus on Survival checks to predict weather (+2, improving every other level to +10 at 9th)."),
        feat("Elemental Companion (Su)", "At 3rd: Small elemental companion; HD improve at 6th and 9th."),
        feat("Elemental Mastery (Su)", "At 10th: rebuke/control elementals as an evil cleric rebukes undead."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "Spells"], [
        ["1st", "+0", "+2", "+0", "+2", "Weather sense +2", "+1 divine"],
        ["2nd", "+1", "+3", "+0", "+3", "-", "+1 divine"],
        ["3rd", "+2", "+3", "+1", "+3", "Elemental companion, weather sense +4", "+1 divine"],
        ["4th", "+3", "+4", "+1", "+4", "-", "+1 divine"],
        ["5th", "+3", "+4", "+1", "+4", "Weather sense +6", "+1 divine"],
        ["6th", "+4", "+5", "+2", "+5", "Elemental companion +2 HD", "+1 divine"],
        ["7th", "+5", "+5", "+2", "+5", "Weather sense +8", "+1 divine"],
        ["8th", "+6", "+6", "+2", "+6", "-", "+1 divine"],
        ["9th", "+6", "+6", "+3", "+6", "Elemental companion +4 HD, weather sense +10", "+1 divine"],
        ["10th", "+7", "+7", "+3", "+7", "Elemental mastery", "+1 divine"],
      ]),
    }),
    cls("warlock-wrpg", "Warlock", {
      page: 95, prestige: true, hitDie: "d4", skillPoints: "2 + Int",
      skills: [sk.bluff, sk.concentration, sk.craft, sk.diplomacy, sk.intimidate, sk.knowArcana, sk.profession, sk.spellcraft],
      requirements: "Any evil; any affiliation; able to cast 3rd-level arcane spells; Conjuration not a forbidden school.",
      description: sections([
        \`<p>Demon-pact prestige class. +1 arcane caster level each level. Exclusive access to summon monster I–IX and planar binding (see \${a("/spells/warcraft-cosmology-wrpg", "Warcraft Cosmology")}).</p>\`,
        feat("Enhanced Conjuring", "On entry, forbid two schools as a conjuration specialist (or two more if already a conjurer) and gain extra conjuration slots."),
        feat("Demonic Companion (Su)", "At 1st: imp companion (improved familiar)."),
        feat("Improved Ally / Demonic Lore / Augment Summoning / Extended Summoning / Planar Cohort / Demon Mastery", "As listed on the advancement table."),
      ]),
      advancementHtml: advTable(["Level", "BAB", "Fort", "Ref", "Will", "Special", "Spells"], [
        ["1st", "+0", "+0", "+0", "+2", "Enhanced conjuring, demonic companion", "+1 arcane"],
        ["2nd", "+1", "+0", "+0", "+3", "Improved ally", "+1 arcane"],
        ["3rd", "+1", "+1", "+1", "+3", "Demonic lore", "+1 arcane"],
        ["4th", "+2", "+1", "+1", "+4", "Augment Summoning", "+1 arcane"],
        ["5th", "+2", "+1", "+1", "+4", "-", "+1 arcane"],
        ["6th", "+3", "+2", "+2", "+5", "Extended summoning", "+1 arcane"],
        ["7th", "+3", "+2", "+2", "+5", "-", "+1 arcane"],
        ["8th", "+4", "+2", "+2", "+6", "Planar cohort", "+1 arcane"],
        ["9th", "+4", "+3", "+3", "+6", "-", "+1 arcane"],
        ["10th", "+5", "+3", "+3", "+7", "Demon mastery", "+1 arcane"],
      ]),
    }),
  ];
}
`;

writeFileSync(OUT, src, "utf8");
console.log("Wrote", OUT, "bytes", src.length);
