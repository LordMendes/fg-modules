#!/usr/bin/env node
/**
 * Generates supplemental JSON data for Warcraft - Roleplaying Game (WRPG).
 * Run: node scripts/build-warcraft-rpg-data.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../data/dndtools/supplemental");
const NOW = "2026-08-24T00:00:00Z";

const SRC = {
  name: "Warcraft - Roleplaying Game",
  abbrev: "WRPG",
  edition: "Warcraft (3.5)",
  page: null,
  url: null,
};

function base(slug, name, page = null) {
  return {
    slug,
    name,
    source_url: null,
    scraped_at: NOW,
    source: { ...SRC, page },
    index: { source_abbrev: "WRPG", edition: "Warcraft (3.5)" },
  };
}

function html(text) {
  return `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
}

function text(htmlStr) {
  return htmlStr.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ─── Races ───────────────────────────────────────────────────────────────────

const races = [
  {
    ...base("human-wrpg", "Human", 12),
    size: "Medium",
    type: "Humanoid",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common",
    languages_text: "Common",
    description_html: html(
      "Humans of the Alliance dominate much of Azeroth. They use the standard human racial traits from the Player's Handbook: +2 to any one ability score, Medium size, 30 ft. base speed, 1 extra feat at 1st level, 4 extra skill points at 1st level and 1 extra skill point per level thereafter, and any favored class. Bonus languages include regional tongues and any non-secret language."
    ),
    index: { ...base("human-wrpg", "Human").index, level_adjustment: "" },
  },
  {
    ...base("ironforge-dwarf-wrpg", "Ironforge Dwarf", 14),
    size: "Medium",
    type: "Humanoid (dwarf)",
    speed: "Land 20 ft.",
    level_adjustment: null,
    languages_html: "Common, Dwarven",
    languages_text: "Common, Dwarven",
    description_html: html(
      "Ironforge dwarves use PHB dwarf traits with these changes: +2 Constitution, −2 Charisma; darkvision 60 ft.; stonecunning; +2 racial bonus on Appraise and Craft checks related to stone or metal; +2 on saves vs. poison and spells; +1 attack vs. orcs and goblinoids; +4 dodge bonus vs. giants; +2 racial bonus on Listen checks; stability (+4 vs. bull rush/trip); +2 racial bonus on Craft (technological device) checks; proficiency with gunpowder weapons (blunderbuss, flintlock musket, long rifle treated as martial); Favored Class: Fighter. Racial trait — Stone Sense (Ex): +2 bonus on Search checks to notice unusual stonework and on Survival checks underground."
    ),
    index: { ...base("ironforge-dwarf-wrpg", "Ironforge Dwarf").index, level_adjustment: "" },
  },
  {
    ...base("high-elf-wrpg", "High Elf", 16),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Elven",
    languages_text: "Common, Elven",
    description_html: html(
      "High elves of the Alliance retain arcane tradition. +2 Dexterity, −2 Constitution; Medium; 30 ft.; immunity to magic sleep; +2 vs. enchantments; low-light vision; +2 Listen, Search, Spot; automatic weapon proficiencies (longsword, rapier, longbow, shortbow); +2 racial bonus on Spellcraft and Knowledge (arcana); arcane cantrips (choose 0-level arcane spell, usable 1/day, caster level 1); +1 caster level with arcane spells; Magic Addiction (must cast arcane spells daily or suffer −1 penalty to ability checks, saves, and attack rolls, cumulative); Favored Class: Sorcerer or Wizard. Level Adjustment +1."
    ),
    index: { ...base("high-elf-wrpg", "High Elf").index, level_adjustment: "1" },
  },
  {
    ...base("night-elf-wrpg", "Night Elf", 18),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Darnassian",
    languages_text: "Common, Darnassian",
    description_html: html(
      "Night elves shun arcane magic. +2 Dexterity, −2 Intelligence; immunity to magic sleep; +2 vs. enchantments; low-light vision; +2 Hide, Listen, Search, Spot; weapon proficiencies (longsword, scimitar, longbow, shortbow); +2 Move Silently; Shadowmeld (Ex): +4 Hide in shadowy areas; Weapon Focus (longbow) at 1st level; no arcane spellcasting — a night elf who takes levels in an arcane class becomes a high elf racially; Favored Class: Scout. Level Adjustment +1."
    ),
    index: { ...base("night-elf-wrpg", "Night Elf").index, level_adjustment: "1" },
  },
  {
    ...base("goblin-wrpg", "Goblin", 20),
    size: "Small",
    type: "Humanoid (goblinoid)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Goblin",
    languages_text: "Common, Goblin",
    description_html: html(
      "Small goblins excel at technology and craft. −2 Strength, +2 Dexterity, −2 Charisma; Small size (+1 AC, +1 attack, −4 Grapple, +4 Hide); 30 ft.; darkvision 60 ft.; +4 Move Silently; +2 Craft (technological device) and Use Technological Device; +2 Appraise (technological items); Favored Class: Tinker."
    ),
    index: { ...base("goblin-wrpg", "Goblin").index, level_adjustment: "" },
  },
  {
    ...base("half-elf-wrpg", "Half-Elf", 22),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Elven",
    languages_text: "Common, Elven",
    description_html: html(
      "Half-elves bridge human and elven cultures. +2 to any one ability score; immunity to magic sleep; +2 vs. enchantments; low-light vision; +1 Listen, Search, Spot; any favored class. Standard PHB half-elf traits adapted for the Alliance."
    ),
    index: { ...base("half-elf-wrpg", "Half-Elf").index, level_adjustment: "" },
  },
  {
    ...base("half-orc-wrpg", "Half-Orc", 24),
    size: "Medium",
    type: "Humanoid (orc)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Orc",
    languages_text: "Common, Orc",
    description_html: html(
      "+2 Strength, −2 Intelligence, −2 Charisma; darkvision 60 ft.; treated as orc for all racial effects, prerequisites, and favored enemies; Favored Class: Barbarian. Standard PHB half-orc traits."
    ),
    index: { ...base("half-orc-wrpg", "Half-Orc").index, level_adjustment: "" },
  },
  {
    ...base("orc-wrpg", "Orc", 26),
    size: "Medium",
    type: "Humanoid (orc)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Orc",
    languages_text: "Common, Orc",
    description_html: html(
      "Horde orcs are fierce warriors. +4 Strength, −2 Intelligence, −2 Wisdom, −2 Charisma; Medium; 30 ft.; darkvision 60 ft.; Battle Fury (Ex): once per day when reduced below half hit points, gain +2 Strength and +1 morale bonus on saves vs. fear for 1 minute; proficiency with orc attack claws; Favored Class: Fighter."
    ),
    index: { ...base("orc-wrpg", "Orc").index, level_adjustment: "" },
  },
  {
    ...base("tauren-wrpg", "Tauren", 28),
    size: "Large",
    type: "Humanoid (tauren)",
    speed: "Land 40 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Taur-ahe",
    languages_text: "Common, Taur-ahe",
    description_html: html(
      "Large tauren warriors of the Horde. +2 Strength, +2 Constitution, −2 Dexterity; Large (−1 AC, −1 attack, +4 Grapple, −4 Hide); 40 ft.; +2 natural armor; Powerful Charge (Ex): deal 2d6 + 1½ Str gore on charge; +2 Handle Animal and Survival; weapon proficiencies (tauren polearm, tauren totem); Favored Class: Fighter. Level Adjustment +1."
    ),
    index: { ...base("tauren-wrpg", "Tauren").index, level_adjustment: "1" },
  },
].map((r) => ({
  ...r,
  description_text: text(r.description_html),
}));

// ─── Classes ─────────────────────────────────────────────────────────────────

function cls(slug, name, opts = {}) {
  const b = base(slug, name, opts.page);
  const isPrestige = Boolean(opts.prestige);
  return {
    ...b,
    hit_die: opts.hitDie ?? "d8",
    skill_points: opts.skillPoints ?? "4 + Int",
    index: {
      ...b.index,
      hit_die: (opts.hitDie ?? "d8").replace("d", ""),
      skill_points: (opts.skillPoints ?? "4 + Int").split(" ")[0],
      prestige_level: isPrestige ? "10" : "",
    },
    class_skills: opts.skills ?? [],
    description_html: html(opts.description ?? ""),
    description_text: text(html(opts.description ?? "")),
    advancement_html: opts.advancement ? `<table>${opts.advancement}</table>` : null,
    advancement_text: opts.advancementText ?? null,
  };
}

const skill = (name, slug) => ({ name, slug, url: `/skills/${slug}`, id: null });

const classes = [
  cls("barbarian-wrpg", "Barbarian (Warcraft)", {
    page: 30,
    hitDie: "d12",
    skillPoints: "4 + Int",
    skills: [skill("Climb", "climb"), skill("Intimidate", "intimidate"), skill("Jump", "jump"), skill("Listen", "listen"), skill("Survival", "survival"), skill("Swim", "swim"), skill("Knowledge (military tactics)", "knowledge-military-tactics")],
    description:
      "Uses the Player's Handbook barbarian with these changes: Knowledge (military tactics) is a class skill. Orc barbarians may rage one additional time per day.",
  }),
  cls("fighter-wrpg", "Fighter (Warcraft)", {
    page: 32,
    hitDie: "d10",
    skillPoints: "2 + Int",
    skills: [skill("Climb", "climb"), skill("Craft", "craft"), skill("Handle Animal", "handle-animal"), skill("Intimidate", "intimidate"), skill("Jump", "jump"), skill("Ride", "ride"), skill("Swim", "swim"), skill("Knowledge (military tactics)", "knowledge-military-tactics")],
    description:
      "Uses the PHB fighter with Knowledge (military tactics) as a class skill and expanded bonus feat options: Mounted Elite Sharpshooter, Expert Rider, Butt Strike, Defender, War Tongue, Rapid Reload, Storm Arrow, Point-Blank Shot (no AoO), Skilled Shot.",
  }),
  cls("rogue-wrpg", "Rogue (Warcraft)", {
    page: 34,
    hitDie: "d6",
    skillPoints: "8 + Int",
    description: "Uses the PHB rogue with Use Technological Device as a class skill.",
  }),
  cls("sorcerer-wrpg", "Sorcerer (Warcraft)", {
    page: 36,
    hitDie: "d4",
    skillPoints: "2 + Int",
    description:
      "Uses the PHB sorcerer except: summon monster I–IX, planar anchor, and necromancy spells are not on the sorcerer list (summoning is Warlock-only; necromancy is Necromancer-only in supplements). Night elves who become sorcerers become high elves.",
  }),
  cls("wizard-wrpg", "Wizard (Warcraft)", {
    page: 36,
    hitDie: "d4",
    skillPoints: "2 + Int",
    description:
      "Uses the PHB wizard with the same spell list restrictions as the Warcraft sorcerer. Night elves who become wizards become high elves.",
  }),
  cls("scout-wrpg", "Scout", {
    page: 38,
    hitDie: "d8",
    skillPoints: "6 + Int",
    skills: [skill("Hide", "hide"), skill("Listen", "listen"), skill("Move Silently", "move-silently"), skill("Spot", "spot"), skill("Survival", "survival"), skill("Search", "search")],
    description:
      "Wilderness warrior and tracker. Base attack bonus as fighter; good Ref and Will saves; favored class of night elves. Class features include wilderness stride, track, favored enemy, and combat style progression similar to a non-druidic ranger.",
  }),
  cls("healer-wrpg", "Healer", {
    page: 42,
    hitDie: "d8",
    skillPoints: "4 + Int",
    description:
      "Divine spellcaster drawing power from the Light, Elune, or ancestral spirits. Has a dedicated spell list including Healing Rain, Moon Glaive, Entangling Roots, Rejuvenation, Death Coil, Second Soul, and Touch of Life. Does not use domains or turn undead.",
  }),
  cls("tinker-wrpg", "Tinker", {
    page: 46,
    hitDie: "d6",
    skillPoints: "6 + Int",
    skills: [skill("Craft", "craft"), skill("Disable Device", "disable-device"), skill("Knowledge (architecture and engineering)", "knowledge-architecture-and-engineering"), skill("Use Technological Device", "use-technological-device")],
    description:
      "Goblin technological expert. Gains bonus technological feats (Create Firearms, Create Siege Engines, Create Small Devices, Create Vehicles, Emergency Repair, etc.) and can craft steam-tech devices using Craft (technological device).",
  }),
  cls("horde-assassin-wrpg", "Horde Assassin", { page: 50, prestige: true, hitDie: "d6", skillPoints: "6 + Int", description: "Horde-only prestige class. Master of stealth, poison, and assassination strikes." }),
  cls("warlock-wrpg", "Warlock", { page: 52, prestige: true, hitDie: "d4", skillPoints: "2 + Int", description: "Demon-pact conjurer. Gains summon monster I–IX and planar anchor spells; specializes in summoning demons from the Twisting Nether." }),
  cls("hunter-wrpg", "Hunter", { page: 54, prestige: true, hitDie: "d8", skillPoints: "4 + Int", description: "Horde-only skirmisher with divine spellcasting from shamanistic traditions." }),
  cls("mounted-combatant-wrpg", "Mounted Combatant", { page: 56, prestige: true, description: "Elite cavalry specialist with mounted combat feats and charge tactics." }),
  cls("druid-of-the-wild-wrpg", "Druid of the Wild", { page: 58, prestige: true, hitDie: "d8", skillPoints: "4 + Int", description: "Night elf druidism. Wild shape, nature spells including Roar, Thorns Shield, Force of Nature, and standard druid-style progression." }),
  cls("gladiator-wrpg", "Gladiator", { page: 60, prestige: true, hitDie: "d10", skillPoints: "2 + Int", description: "Arena champion. Known as Sword Master among the Horde." }),
  cls("paladin-warrior-wrpg", "Paladin Warrior", { page: 62, prestige: true, hitDie: "d10", skillPoints: "2 + Int", description: "Alliance Silver Hand paladin. Requires human or Ironforge dwarf. Divine warrior with smite evil and auras." }),
  cls("infiltrator-wrpg", "Infiltrator", { page: 64, prestige: true, hitDie: "d6", skillPoints: "8 + Int", description: "Stealth and infiltration specialist." }),
  cls("beastmaster-wrpg", "Beastmaster", { page: 66, prestige: true, hitDie: "d8", skillPoints: "4 + Int", description: "Animal companion and natural weapon master." }),
  cls("elven-ranger-wrpg", "Elven Ranger", { page: 68, prestige: true, hitDie: "d8", skillPoints: "4 + Int", description: "Alliance elves only. Archery elite with Sentinel spell and woodland combat abilities." }),
  cls("priest-wrpg", "Priest", { page: 70, prestige: true, hitDie: "d6", skillPoints: "4 + Int", description: "Divine caster of the Light, Elune, or shamanistic faiths. Dedicated spell list; no domains." }),
  cls("shaman-wrpg", "Shaman", { page: 72, prestige: true, hitDie: "d8", skillPoints: "4 + Int", description: "Horde elemental and totem magic. Spell list includes Stasis Trap, Ice Armor, Bloodlust, Immolation, Shockwave, Healing Totem, and Serpent Totem." }),
];

// ─── Feats ───────────────────────────────────────────────────────────────────

function feat(slug, name, type, description, benefit, prereq = null, page = null) {
  const b = base(slug, name, page);
  return {
    ...b,
    type,
    index: { ...b.index, type, description_snippet: description.slice(0, 120) },
    description_html: html(description),
    description_text: description,
    benefit_html: html(benefit),
    benefit_text: benefit,
    prerequisite_html: prereq ? html(prereq) : null,
    prerequisite_text: prereq,
  };
}

const feats = [
  feat("mounted-elite-sharpshooter-wrpg", "Mounted Elite Sharpshooter", "General", "You can fire firearms accurately while mounted.", "You take no penalty on ranged attacks with firearms while mounted.", "Base attack bonus +1, Ride 1 rank", 74),
  feat("expert-rider-wrpg", "Expert Rider", "General", "You are skilled at riding tricks.", "Reduce Ride check DCs by 2; gain additional mounted maneuver options.", "Ride 1 rank", 74),
  feat("bareback-riding-wrpg", "Bareback Riding", "General", "You can ride without saddle or reins.", "You can ride without saddle or reins at no penalty.", "Ride 1 rank", 75),
  feat("butt-strike-wrpg", "Butt Strike", "General", "Use a firearm as a melee weapon without breaking it.", "You may use a loaded firearm as a bludgeoning melee weapon without damaging it.", "Base attack bonus +1", 75),
  feat("defender-wrpg", "Defender", "General", "Share your shield's protection with an ally.", "As a immediate action, grant an adjacent ally your shield bonus to AC until your next turn.", "Shield Proficiency", 76),
  feat("war-tongue-wrpg", "War Tongue", "General", "Coordinate allies with ranged signals.", "You can use a standard action to grant allies within 30 ft. the aid another bonus on their next attack.", "Base attack bonus +1", 76),
  feat("rapid-reload-wrpg", "Rapid Reload", "General", "Reload firearms faster.", "Reduce reload time for firearms by one step (full-round to move, etc.).", "Exotic Weapon Proficiency (firearm)", 77),
  feat("storm-arrow-wrpg", "Storm Arrow", "General", "Stunning thrown bludgeon attack.", "Once per day, make a thrown bludgeoning attack that forces a Fort save or stuns the target.", "Base attack bonus +4", 77),
  feat("point-blank-shot-no-aoo-wrpg", "Point-Blank Shot (No Attack of Opportunity)", "General", "Fire at point-blank range without provoking.", "You do not provoke attacks of opportunity when making ranged attacks within 30 ft.", "Point-Blank Shot", 78),
  feat("skilled-shot-wrpg", "Skilled Shot", "General", "Ricochet shots off surfaces.", "Once per round, ignore cover from one obstacle by ricocheting (moon glaive: up to 2 surfaces).", "Base attack bonus +6", 78),
  feat("exotic-weapon-thorium-wrpg", "Exotic Weapon Proficiency (Thorium Weapons)", "General", "Proficiency with thorium weapons.", "You are proficient with thorium weapons.", null, 79),
  feat("dedicated-leadership-wrpg", "Dedicated Leadership", "General", "Your followers are exceptionally loyal.", "Followers gain +2 morale bonus on saves vs. fear.", "Leadership", 79),
  feat("enduring-leadership-wrpg", "Enduring Leadership", "General", "Followers resist fatigue.", "Followers gain +4 on saves vs. fatigue and exhaustion.", "Leadership", 80),
  feat("precise-leadership-wrpg", "Precise Leadership", "General", "Followers fight more accurately.", "Followers gain +1 on attack rolls.", "Leadership", 80),
  feat("totem-follower-wrpg", "Totem Follower", "General", "Bond with a shaman totem spirit.", "Gain a +2 bonus on saves when within 10 ft. of your bonded totem.", "Tauren or orc", 81),
  feat("drums-of-courage-wrpg", "Drums of Courage", "General", "Orc war drums inspire the tribe.", "Allies within 60 ft. gain +1 morale bonus on attack rolls and saves vs. fear for 1 minute.", "Perform (drums) 3 ranks", 81),
  feat("block-magic-wrpg", "Block Magic", "Metamagic", "Block a spell as it is cast.", "Ready an action to counter a spell; if successful, the spell is negated. +1 spell level.", "Spellcraft 5 ranks", 82),
  feat("control-magic-energy-wrpg", "Control Magic Energy", "Metamagic", "Half preparation time for spells.", "Reduce preparation time by half. High elves who use this feat break their magic addiction for that day. +1 spell level.", "Able to prepare arcane spells", 82),
  feat("duplicate-spell-wrpg", "Duplicate Spell", "Metamagic", "Cast two copies of a spell.", "Cast two copies of a spell that affects a single target. +4 spell levels.", null, 83),
  feat("deflect-magic-wrpg", "Deflect Magic", "Metamagic", "Deflect a spell away from you.", "When targeted by a spell, make a Spellcraft check to redirect it to another target within range. +3 spell levels.", "Spellcraft 10 ranks", 83),
  feat("reflect-magic-wrpg", "Reflect Magic", "Metamagic", "Reflect a spell back at the caster.", "When targeted by a spell, make a Spellcraft check to reflect it at the caster. +5 spell levels.", "Spellcraft 15 ranks", 84),
  feat("create-siege-engines-wrpg", "Create Siege Engines", "Technological", "Craft siege engines.", "You can craft siege engines using Craft (technological device).", "Craft (technological device) 5 ranks", 85),
  feat("create-firearms-wrpg", "Create Firearms", "Technological", "Craft firearms.", "You can craft firearms and ammunition.", "Craft (technological device) 3 ranks", 85),
  feat("create-small-devices-wrpg", "Create Small Devices", "Technological", "Craft small technological devices.", "You can craft small devices (goblin knife, grappling launcher, etc.).", "Craft (technological device) 1 rank", 86),
  feat("create-vehicles-wrpg", "Create Vehicles", "Technological", "Craft vehicles.", "You can craft land, water, and air vehicles.", "Craft (technological device) 8 ranks", 86),
  feat("emergency-repair-wrpg", "Emergency Repair", "Technological", "Quick field repairs.", "Repair a broken technological device with a Craft check as a full-round action.", "Craft (technological device) 3 ranks", 87),
  feat("delay-malfunction-wrpg", "Delay Malfunction", "Technological", "Reduce malfunction risk.", "When a device would malfunction, make a Craft check to delay it by 1d4 rounds.", "Craft (technological device) 5 ranks", 87),
  feat("use-land-vehicles-wrpg", "Use Land Vehicles", "Technological", "Operate land vehicles.", "You can operate land vehicles without penalty.", null, 88),
  feat("use-water-vehicles-wrpg", "Use Water Vehicles", "Technological", "Operate water vehicles.", "You can operate water vehicles without penalty.", null, 88),
  feat("use-air-vehicles-wrpg", "Use Air Vehicles", "Technological", "Operate air vehicles.", "You can operate air vehicles without penalty.", null, 89),
  feat("vascular-materials-wrpg", "Vascular Materials", "Technological", "Craft at reduced cost.", "Craft technological items at 1/10 cost but increase Craft DC by 10.", "Craft (technological device) 10 ranks", 89),
  feat("pulverize-wrpg", "Pulverize", "Tauren", "Totem slam shakes the ground.", "When wielding a tauren totem, as a full-round action deal damage and force all creatures within 10 ft. to make a Reflex save or fall prone.", "Tauren, Str 15, Power Attack", 90),
];

// ─── Equipment ───────────────────────────────────────────────────────────────

function weapon(slug, name, category, stats, page = null) {
  const b = base(slug, name, page);
  const { cost, weight, damage_m, damage_s, critical, range_increment, damage_type, handed } = stats;
  const statsStr = [damage_m, critical].filter(Boolean).join(" · ");
  return {
    ...b,
    kind: "weapon",
    category,
    cost,
    weight,
    damage_m,
    damage_s: damage_s ?? null,
    critical,
    range_increment: range_increment ?? "-",
    damage_type,
    handed: handed ?? null,
    index: {
      ...b.index,
      kind: "weapon",
      category,
      stats: statsStr,
      cost,
      weight,
    },
  };
}

function good(slug, name, cost, weight, description, page = null) {
  const b = base(slug, name, page);
  return {
    ...b,
    kind: "good",
    category: "adventuring gear",
    cost,
    weight,
    description_html: html(description),
    description_text: description,
    index: { ...b.index, kind: "good", category: "adventuring gear", cost, weight },
  };
}

function material(slug, name, description, page = null) {
  const b = base(slug, name, page);
  return {
    ...b,
    kind: "good",
    category: "special material",
    cost: "—",
    weight: "—",
    description_html: html(description),
    description_text: description,
    index: { ...b.index, kind: "good", category: "special material", cost: "—", weight: "—" },
  };
}

const equipment = [
  material("gunpowder-wrpg", "Gunpowder", "Used by dwarves for firearms and explosives. Normal, refined (+1 damage), and loaded (+1 equivalent magical weapon, waterproof) varieties exist.", 92),
  material("dragonhide-wrpg", "Dragonhide", "Favored by high elves. Dragonhide leather armor has 0% arcane spell failure.", 92),
  material("blackwood-wrpg", "Blackwood", "Night elf epic wood. Follows standard epic wood material rules.", 93),
  material("thorium-wrpg", "Thorium", "+½ Strength damage on weapons. Thorium armor grants DR 5/+1 but is very heavy.", 93),
  material("arcanite-wrpg", "Arcanite", "+1 attack and damage on weapons; improved critical range. Arcanite armor reduces critical hit effects.", 94),
  weapon("war-blade-wrpg", "War Blade", "martial", { cost: "15 gp", weight: "4 lb.", damage_m: "1d8", critical: "19–20/x2", damage_type: "S", handed: "1H" }, 95),
  weapon("orc-attack-claws-wrpg", "Orc Attack Claws", "exotic", { cost: "5 gp", weight: "2 lb.", damage_m: "1d6", critical: "x2", damage_type: "S/P", handed: "1H" }, 95),
  weapon("moon-glaive-wrpg", "Moon Glaive", "exotic", { cost: "50 gp", weight: "8 lb.", damage_m: "1d10", critical: "x3", damage_type: "S", handed: "2H" }, 96),
  weapon("dwarven-throwing-hammer-wrpg", "Dwarven Throwing Hammer", "exotic", { cost: "25 gp", weight: "5 lb.", damage_m: "1d8", critical: "x2", damage_type: "B", range_increment: "20 ft.", handed: "1H" }, 96),
  weapon("tauren-polearm-wrpg", "Tauren Polearm", "exotic", { cost: "30 gp", weight: "15 lb.", damage_m: "1d12", critical: "x3", damage_type: "P/S", handed: "2H" }, 97),
  weapon("tauren-totem-wrpg", "Tauren Totem", "exotic", { cost: "20 gp", weight: "20 lb.", damage_m: "2d6", critical: "x2", damage_type: "B", handed: "2H" }, 97),
  weapon("flintlock-musket-wrpg", "Flintlock Musket", "exotic", { cost: "500 gp", weight: "10 lb.", damage_m: "1d12", critical: "x3", damage_type: "P", range_increment: "80 ft.", handed: "2H" }, 98),
  weapon("blunderbuss-wrpg", "Blunderbuss", "exotic", { cost: "750 gp", weight: "12 lb.", damage_m: "1d8", critical: "x2", damage_type: "P", range_increment: "15 ft.", handed: "2H" }, 98),
  weapon("long-rifle-wrpg", "Long Rifle", "exotic", { cost: "1,000 gp", weight: "8 lb.", damage_m: "1d10", critical: "x3", damage_type: "P", range_increment: "90 ft.", handed: "2H" }, 99),
  weapon("mortar-wrpg", "Mortar", "exotic", { cost: "5,000 gp", weight: "200 lb.", damage_m: "—", critical: "—", damage_type: "—", range_increment: "300 ft.", handed: "2H" }, 99),
  good("mortar-shell-wrpg", "Mortar Shell", "50 gp", "20 lb.", "Explosive shell for mortar. Area damage on impact.", 100),
  good("catapult-bomb-wrpg", "Catapult Bomb", "100 gp", "50 lb.", "Explosive ammunition for catapults.", 100),
  good("buried-bomb-wrpg", "Buried Bomb", "75 gp", "10 lb.", "Buried explosive triggered by pressure.", 100),
  good("grenade-wrpg", "Grenade", "25 gp", "1 lb.", "Hand-thrown explosive.", 101),
  good("goblin-knife-wrpg", "Goblin Knife", "50 gp", "1 lb.", "Multi-tool combining knife, lockpick, and small tools.", 102),
  good("gyro-umbrella-wrpg", "Gyro Umbrella", "200 gp", "3 lb.", "Slows fall as feather fall when deployed.", 102),
  good("goblin-mine-shoes-wrpg", "Goblin Mine Shoes", "150 gp", "2 lb.", "Grant +4 on saves vs. mine and trap triggers.", 103),
  good("grappling-launcher-wrpg", "Grappling Launcher", "300 gp", "5 lb.", "Ranged grappling hook launcher.", 103),
  good("spider-silk-rope-wrpg", "Spider Silk Rope", "100 gp", "3 lb.", "50 ft. rope with +2 bonus on Use Rope checks.", 104),
  good("steam-hammer-wrpg", "Steam Hammer", "2,000 gp", "30 lb.", "Portable siege hammer powered by steam.", 104),
  good("phlogiston-elixir-wrpg", "Phlogiston Elixir", "500 gp", "—", "Trade one ability score bonus for another penalty for 1 hour.", 105),
];

// ─── Magic Items ─────────────────────────────────────────────────────────────

function item(slug, name, type, price, description, page = null, extra = {}) {
  const b = base(slug, name, page);
  return {
    ...b,
    price,
    caster_level: extra.casterLevel ?? null,
    aura: extra.aura ?? null,
    activation: extra.activation ?? null,
    weight: extra.weight ?? null,
    description_html: html(description),
    description_text: description,
    index: { ...b.index, type, price },
  };
}

const items = [
  item("goblin-land-mine-wrpg", "Goblin Land Mine", "Magic Item", "3,000 gp", "Invisible glyph of warding combined with an explosive. 8d6 fire damage in a 15-ft. radius when triggered.", 106, { casterLevel: "9", aura: "StrongAbjuration", activation: "—", weight: "5 lb." }),
  item("stormhammer-wrpg", "Stormhammer", "Magic Item", "+1 warhammer", "+1 warhammer that deals an extra 1d6 electricity damage on a hit. Shocks any non-dwarf who wields it for 1d6 electricity.", 107, { casterLevel: "7", aura: "ModerateEvocation", activation: "—", weight: "5 lb." }),
  item("vampiric-rune-blade-wrpg", "Vampiric Rune Blade", "Magic Item", "+1 longsword", "+1 longsword dealing +2d6 negative energy damage and draining hit points to the wielder. Intelligent evil blade.", 108, { casterLevel: "12", aura: "StrongNecromancy", activation: "—", weight: "4 lb." }),
  item("potion-of-invulnerability-wrpg", "Potion of Invulnerability", "Potion", "1,500 gp", "Grants DR 20/adamantine for 10 rounds. You take 1d4 damage each round while the effect lasts.", 109, { casterLevel: "15", aura: "StrongAbjuration", activation: "Standard (drink)", weight: "—" }),
  item("potion-of-mana-wrpg", "Potion of Mana", "Potion", "300 gp", "Recover the last 1st-, 2nd-, or 3rd-level spell you cast within the previous 2 rounds.", 110, { casterLevel: "5", aura: "ModerateTransmutation", activation: "Standard (drink)", weight: "—" }),
  item("potion-of-greater-mana-wrpg", "Potion of Greater Mana", "Potion", "900 gp", "Recover the last spell of any level you cast within the previous 2 rounds. Headache deals damage equal to the spell's level.", 110, { casterLevel: "11", aura: "StrongTransmutation", activation: "Standard (drink)", weight: "—" }),
  item("cloak-of-flames-wrpg", "Cloak of Flames", "Wondrous Item", "90,000 gp", "Deals 2d6 fire damage per round to all enemies within 5 ft. while worn.", 111, { casterLevel: "15", aura: "StrongEvocation", activation: "Standard (command)", weight: "1 lb." }),
  item("gloves-of-swiftness-wrpg", "Gloves of Swiftness", "Wondrous Item", "4,000 gp", "+2 bonus on initiative checks and Reflex saves.", 112, { casterLevel: "7", aura: "ModerateTransmutation", activation: "—", weight: "—" }),
];

// ─── Spells ──────────────────────────────────────────────────────────────────

function spellClass(name, slug, level) {
  return { name, slug, level, url: `/classes/${slug}`, id: null };
}

function spell(slug, name, school, level, classRefs, description, page = null, extra = {}) {
  const b = base(slug, name, page);
  return {
    ...b,
    school,
    casting_time: extra.castingTime ?? "1 standard action",
    components: extra.components ?? "V, S",
    range: extra.range ?? "Touch",
    target: extra.target ?? null,
    duration: extra.duration ?? "Instantaneous",
    saving_throw: extra.save ?? "None",
    spell_resistance: extra.sr ?? "No",
    classes: classRefs,
    description_html: html(description),
    description_text: description,
    index: { ...b.index, school, components: { V: true, S: true, M: false, F: false, DF: false, XP: false }, description_snippet: description.slice(0, 120) },
    descriptors: extra.descriptors ?? [],
    domains: null,
    area: extra.area ?? null,
    effect: extra.effect ?? null,
  };
}

const wiz = (lv) => spellClass("Wizard (Warcraft)", "wizard-wrpg", lv);
const sor = (lv) => spellClass("Sorcerer (Warcraft)", "sorcerer-wrpg", lv);
const wizSor = (lv) => [wiz(lv), sor(lv)];
const healer = (lv) => spellClass("Healer", "healer-wrpg", lv);
const shaman = (lv) => spellClass("Shaman", "shaman-wrpg", lv);
const druidWild = (lv) => spellClass("Druid of the Wild", "druid-of-the-wild-wrpg", lv);
const priest = (lv) => spellClass("Priest", "priest-wrpg", lv);
const elvenRanger = (lv) => spellClass("Elven Ranger", "elven-ranger-wrpg", lv);

const spells = [
  spell("cripple-wrpg", "Cripple", "Transmutation", 2, wizSor(2), "Target's legs become weakened; speed halved and −2 on attack rolls, saves, and checks involving movement.", 114, { save: "Fortitude partial", range: "Close (25 ft. + 5 ft./2 levels)" }),
  spell("stasis-trap-wrpg", "Stasis Trap", "Abjuration", 1, [shaman(1)], "Creates a magical trap that freezes the first creature entering the area for 1 round per level.", 115, { range: "Close", duration: "1 hour/level (D)" }),
  spell("ice-armor-wrpg", "Ice Armor", "Abjuration", 2, [shaman(2), ...wizSor(2)], "Covers the subject in ice granting +4 armor bonus and 5 cold resistance.", 115, { duration: "1 hour/level" }),
  spell("banish-wrpg", "Banish", "Abjuration", 8, wizSor(8), "Banishes extraplanar creatures to the Twisting Nether. Replaces planar banishment in the Warcraft cosmology.", 116, { range: "Medium", save: "Will negates", sr: "Yes" }),
  spell("healing-rain-wrpg", "Healing Rain", "Conjuration (Healing)", 5, [healer(5)], "Healing rain restores 1d8 hit points per caster level (max 10d8) to all allies in the area.", 117, { range: "Medium", area: "20-ft. radius burst", save: "Will half (harmless)" }),
  spell("fire-rain-wrpg", "Fire Rain", "Evocation [Fire]", 4, wizSor(4), "Flaming droplets deal 1d6 fire damage per level (max 10d6) in a 20-ft. radius.", 118, { range: "Long", area: "20-ft. radius cylinder", save: "Reflex half", sr: "Yes" }),
  spell("bloodlust-wrpg", "Bloodlust", "Enchantment (Compulsion)", 3, [shaman(3), ...wizSor(8)], "Allies gain +2 morale bonus on attack and damage rolls.", 119, { range: "Medium", duration: "1 round/level", save: "Will negates (harmless)" }),
  spell("mana-burn-wrpg", "Mana Burn", "Evocation", 2, wizSor(2), "Deals 1d4 damage per spell level of the highest-level spell the target can cast.", 120, { range: "Medium", save: "Will half", sr: "Yes" }),
  spell("carrion-swarm-wrpg", "Carrion Swarm", "Conjuration (Summoning)", 5, wizSor(5), "Summons a swarm of carrion insects that deals damage and may cause nausea.", 121, { range: "Close", duration: "Concentration + 2 rounds", sr: "No" }),
  spell("thorns-shield-wrpg", "Thorns Shield", "Abjuration", 3, [druidWild(3), ...wizSor(3)], "Shield of thorns deals 1d6 damage to melee attackers.", 122, { duration: "1 round/level" }),
  spell("lightning-shield-wrpg", "Lightning Shield", "Evocation [Electricity]", 4, wizSor(4), "Creatures striking you in melee take 1d6 electricity damage + 1 per caster level.", 123, { duration: "1 round/level", sr: "Yes" }),
  spell("death-coil-wrpg", "Death Coil", "Necromancy", 3, [healer(3)], "Ranged touch attack deals 1d8 damage per two caster levels (max 5d8) to undead or heals the same amount on a living ally.", 124, { range: "Close", save: "Will half (undead only)" }),
  spell("lesser-death-coil-wrpg", "Lesser Death Coil", "Necromancy", 1, [healer(1)], "Lesser version dealing 1d8 damage or healing.", 124, { range: "Close" }),
  spell("greater-death-coil-wrpg", "Greater Death Coil", "Necromancy", 5, [healer(5)], "Greater version dealing 1d8 per level (max 10d8).", 125, { range: "Close" }),
  spell("falling-star-wrpg", "Falling Star", "Evocation", 9, [priest(9), ...wizSor(9)], "Calls down a falling star dealing 20d6 fire damage in a 40-ft. radius.", 126, { range: "Long", area: "40-ft. radius", save: "Reflex half", sr: "Yes" }),
  spell("force-of-nature-wrpg", "Force of Nature", "Transmutation", 6, [druidWild(6)], "Animates plants and natural terrain to hinder enemies.", 127, { range: "Medium", duration: "1 round/level" }),
  spell("greater-force-of-nature-wrpg", "Greater Force of Nature", "Transmutation", 8, [druidWild(8)], "As force of nature but affects a larger area and deals 2d6 bludgeoning damage per round.", 128, { range: "Long", duration: "1 round/level" }),
  spell("moon-glaive-spell-wrpg", "Moon Glaive", "Evocation", 1, [healer(2), ...wizSor(1)], "Creates a magical moon glaive that attacks as a ranged touch for 1d8 + level damage.", 129, { range: "Medium", duration: "1 round/level" }),
  spell("immolation-wrpg", "Immolation", "Evocation [Fire]", 4, [shaman(4), ...wizSor(4)], "Target bursts into flames taking 1d6 fire damage per round.", 130, { range: "Medium", duration: "1 round/level", save: "Reflex negates", sr: "Yes" }),
  spell("glacial-burst-wrpg", "Glacial Burst", "Evocation [Cold]", 3, [shaman(3), ...wizSor(3)], "Burst of ice deals 1d6 cold damage per level (max 10d6) in a 10-ft. radius.", 131, { range: "Medium", save: "Reflex half", sr: "Yes" }),
  spell("stormhammer-spell-wrpg", "Stormhammer", "Evocation [Electricity]", 2, wizSor(2), "Creates a hammer of lightning dealing 1d8 electricity damage per two levels on a melee touch attack.", 132, { range: "Touch", duration: "1 round/level" }),
  spell("blend-with-shadows-wrpg", "Blend with Shadows", "Illusion (Shadow)", 1, wizSor(1), "Grants hide in plain sight in shadowy illumination.", 133, { duration: "10 min./level" }),
  spell("razor-blizzard-wrpg", "Razor Blizzard", "Evocation [Cold]", 3, wizSor(3), "Blizzard of ice shards deals 1d6 slashing and 1d6 cold damage per two levels.", 134, { range: "Medium", area: "20-ft. radius", save: "Reflex half", sr: "Yes" }),
  spell("shockwave-wrpg", "Shockwave", "Evocation", 3, [shaman(3), ...wizSor(3)], "Ground tremor knocks creatures prone in a 30-ft. line.", 135, { range: "30 ft.", save: "Reflex negates", sr: "Yes" }),
  spell("entangling-roots-wrpg", "Entangling Roots", "Transmutation", 3, [healer(3)], "Roots entangle creatures in a 20-ft. radius, reducing speed and preventing movement.", 136, { range: "Medium", duration: "1 min./level", save: "Reflex partial", sr: "Yes" }),
  spell("rejuvenation-wrpg", "Rejuvenation", "Conjuration (Healing)", 5, [healer(5)], "Restores 4d8 + caster level hit points and removes one of fatigue, shaken, or sickened.", 137, { range: "Touch" }),
  spell("roar-wrpg", "Roar", "Evocation [Sonic]", 1, [druidWild(1)], "Mighty roar deals 1d8 sonic damage and forces a Fort save or dazes for 1 round.", 138, { range: "15 ft.", save: "Fortitude partial", sr: "Yes" }),
  spell("second-soul-wrpg", "Second Soul", "Abjuration", 9, [healer(9)], "If you would die, your soul transfers to a prepared vessel within 1 mile.", 139, { duration: "24 hours" }),
  spell("sentinel-wrpg", "Sentinel", "Divination", 3, [elvenRanger(3)], "Creates an invisible watcher that alerts you to intruders within 60 ft.", 140, { range: "Touch", duration: "24 hours" }),
  spell("blade-storm-wrpg", "Blade Storm", "Evocation", 3, wizSor(3), "Whirling blades deal 1d6 damage per two caster levels (max 5d6) to all creatures within 10 ft.", 141, { range: "Personal", area: "10-ft. radius", sr: "Yes" }),
  spell("touch-of-life-wrpg", "Touch of Life", "Conjuration (Healing)", 9, [healer(9)], "Touch restores a dead creature to life as raise dead without level loss.", 142, { range: "Touch", save: "Will negates (harmless)" }),
  spell("healing-totem-wrpg", "Healing Totem", "Conjuration (Healing)", 3, [shaman(3)], "Summons a totem that heals 1d8 + caster level to allies within 10 ft. each round.", 143, { range: "Medium", duration: "1 round/level" }),
  spell("serpent-totem-wrpg", "Serpent Totem", "Conjuration (Summoning)", 3, [shaman(3)], "Summons a spirit serpent that attacks your enemies.", 144, { range: "Medium", duration: "1 round/level", sr: "No" }),
  spell("warcraft-cosmology-wrpg", "Warcraft Cosmology (Spell Changes)", "Universal", 0, [], "Setting reference: No Ethereal Plane (ethereal jaunt = intangible on Material Plane). No Astral Plane (astral projection travels to the Twisting Nether). Summon monster and planar anchor are Warlock-only and summon demons. Necromancy spells restricted to Necromancer (supplement). Lesser and greater planar ally summon elementals only. Divine casters draw power from philosophy and spirits, not domains.", 113),
];

// ─── Write files ─────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

const files = {
  "warcraft_rpg_races.json": races,
  "warcraft_rpg_classes.json": classes,
  "warcraft_rpg_feats.json": feats,
  "warcraft_rpg_equipment.json": equipment,
  "warcraft_rpg_items.json": items,
  "warcraft_rpg_spells.json": spells,
};

for (const [name, data] of Object.entries(files)) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${data.length} records to ${name}`);
}

console.log("Done.");
