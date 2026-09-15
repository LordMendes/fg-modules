#!/usr/bin/env node
/**
 * Generates supplemental JSON for Warcraft: The Roleplaying Game (2003, WW17200).
 * Source of truth for WRPG supplemental records. Run:
 *   node scripts/build-warcraft-rpg-data.mjs
 *
 * Page numbers are printed book pages (PDF page ≈ book page + 3).
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildWarcraftClasses } from "./warcraft-rpg-classes-data.mjs";
import { buildWarcraftFeats } from "./warcraft-rpg-feats-data.mjs";

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

/** Plain paragraphs; pass already-built HTML through as-is when it contains tags. */
function html(text) {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return `<p>${text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
}

function text(htmlStr) {
  return htmlStr
    .replace(/<\/(p|li|div|h\d|tr|br\s*\/?)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function a(href, label) {
  return `<a href="${href}">${label}</a>`;
}

function ul(items) {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

function skill(name, slug) {
  return { name, slug, url: `/skills/${slug}`, id: null };
}

const sk = {
  climb: skill("Climb", "climb"),
  craft: skill("Craft", "craft"),
  handleAnimal: skill("Handle Animal", "handle-animal"),
  hide: skill("Hide", "hide"),
  intimidate: skill("Intimidate", "intimidate"),
  jump: skill("Jump", "jump"),
  listen: skill("Listen", "listen"),
  moveSilently: skill("Move Silently", "move-silently"),
  ride: skill("Ride", "ride"),
  search: skill("Search", "search"),
  spot: skill("Spot", "spot"),
  survival: skill("Survival", "survival"),
  swim: skill("Swim", "swim"),
  bluff: skill("Bluff", "bluff"),
  concentration: skill("Concentration", "concentration"),
  diplomacy: skill("Diplomacy", "diplomacy"),
  gatherInfo: skill("Gather Information", "gather-information"),
  heal: skill("Heal", "heal"),
  knowArcana: skill("Knowledge (arcana)", "knowledge-arcana"),
  knowNature: skill("Knowledge (nature)", "knowledge-nature"),
  knowReligion: skill("Knowledge (religion)", "knowledge-religion"),
  knowMilitary: skill("Knowledge (military tactics)", "knowledge-military-tactics"),
  knowArchEng: skill("Knowledge (architecture and engineering)", "knowledge-architecture-and-engineering"),
  profession: skill("Profession", "profession"),
  senseMotive: skill("Sense Motive", "sense-motive"),
  spellcraft: skill("Spellcraft", "spellcraft"),
  speakLanguage: skill("Speak Language", "speak-language"),
  useRope: skill("Use Rope", "use-rope"),
  disableDevice: skill("Disable Device", "disable-device"),
  useTech: skill("Use Technological Device", "use-technological-device"),
  appraise: skill("Appraise", "appraise"),
  decipher: skill("Decipher Script", "decipher-script"),
  forgery: skill("Forgery", "forgery"),
  openLock: skill("Open Lock", "open-lock"),
  useMagic: skill("Use Magic Device", "use-magic-device"),
  balance: skill("Balance", "balance"),
  disguise: skill("Disguise", "disguise"),
  escapeArtist: skill("Escape Artist", "escape-artist"),
  perform: skill("Perform", "perform"),
  sleightOfHand: skill("Sleight of Hand", "sleight-of-hand"),
  tumble: skill("Tumble", "tumble"),
  knowPlanes: skill("Knowledge (the planes)", "knowledge-the-planes"),
  knowUndead: skill("Knowledge (undead)", "knowledge-undead"),
};

// ─── Races (Ch. 2, pp. 38–54) ────────────────────────────────────────────────

const races = [
  {
    ...base("human-wrpg", "Human", 38),
    size: "Medium",
    type: "Humanoid (human)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common",
    languages_text: "Common",
    description_html: ul([
      "Medium; base land speed 30 ft.",
      "1 extra feat at 1st level.",
      "4 extra skill points at 1st level and 1 extra skill point per level thereafter.",
      "+2 racial bonus on saves vs. fear.",
      `+2 racial bonus on ${a("/skills/diplomacy", "Diplomacy")}, ${a("/skills/gather-information", "Gather Information")}, and Knowledge (nobility and royalty); these are class skills for all humans.`,
      "+1 racial bonus on attack rolls against orcs.",
      "Automatic Language: Common. Bonus: any unrestricted.",
      "Favored Class: Any.",
    ]),
    index: { ...base("human-wrpg", "Human").index, level_adjustment: "" },
  },
  {
    ...base("ironforge-dwarf-wrpg", "Ironforge Dwarf", 40),
    size: "Medium",
    type: "Humanoid (dwarf)",
    speed: "Land 20 ft.",
    level_adjustment: null,
    languages_html: "Common, Dwarven",
    languages_text: "Common, Dwarven",
    description_html: ul([
      "+2 Constitution, −2 Charisma.",
      "Medium; base land speed 20 ft.; darkvision 60 ft.",
      "+4 stability vs. bull rush or trip when standing on the ground.",
      "Stonecunning: +2 to notice unusual stonework; automatic Search within 10 ft.; can find stonework traps as a rogue; sense depth underground.",
      `Stone Flesh (Su): 1/day as a free action, +2 natural armor for (Con modifier + character level) rounds; bonus increases by +1 at 6th level and every 6 levels thereafter.`,
      "Weapon familiarity: treat blunderbuss, long rifle, flintlock pistol, dwarven urgrosh, and dwarven waraxe as martial weapons.",
      "+2 racial bonus on saves vs. poison; +1 attack vs. giants.",
      `+2 racial bonus on ${a("/skills/appraise", "Appraise")} and ${a("/skills/craft", "Craft")} checks related to stone or metal, and on Craft checks related to gunsmithing (class skills for all Ironforge dwarves).`,
      "Automatic Languages: Common, Dwarven. Bonus: Gnome, Goblin, Orc, Thalassian.",
      `Favored Class: ${a("/classes/fighter-wrpg", "Fighter")}.`,
    ]),
    index: { ...base("ironforge-dwarf-wrpg", "Ironforge Dwarf").index, level_adjustment: "" },
  },
  {
    ...base("high-elf-wrpg", "High Elf", 42),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Thalassian",
    languages_text: "Common, Thalassian",
    description_html: ul([
      "+2 Dexterity, +2 Intelligence, −2 Constitution.",
      "Medium; base land speed 30 ft.; low-light vision.",
      "+2 racial bonus on saves vs. mind-affecting spells or effects.",
      "Arcane Ability: with Int 10+, cast four 0-level sorcerer/wizard cantrips/day as a 1st-level sorcerer (any combination; subject to ASF).",
      "+1 effective caster level with all arcane spellcasting classes (affects spell effects, not spells known/slots).",
      "Empowered Magic: 1/day apply Empower Spell to a spell without raising the slot (declare before casting).",
      "Magic Addiction: each morning must spend preparation-time resisting addiction or take −1 caster level and −2 on saves vs. spells; unnecessary within 50 ft. of a moon well (lingers Wis modifier days after leaving).",
      "−2 circumstance penalty on Charisma-based checks vs. night elves and tauren.",
      "Martial Weapon Proficiency: longbow, composite longbow, and either short sword or rapier.",
      `+2 racial bonus on ${a("/skills/concentration", "Concentration")}, Knowledge (arcana), and ${a("/skills/spellcraft", "Spellcraft")} (class skills for all high elves).`,
      "Automatic Languages: Common, Thalassian. Bonus: Darnassian, Dwarven, Goblin, Kalimdoran, Orc.",
      `Favored Class: ${a("/classes/sorcerer-wrpg", "Sorcerer")} or ${a("/classes/wizard-wrpg", "Wizard")} (choose at creation). Level Adjustment +1.`,
    ]),
    index: { ...base("high-elf-wrpg", "High Elf").index, level_adjustment: "1" },
  },
  {
    ...base("night-elf-wrpg", "Night Elf", 44),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Darnassian",
    languages_text: "Common, Darnassian",
    description_html: ul([
      "+2 Wisdom, −2 Intelligence.",
      "Medium; base land speed 30 ft.",
      "Superior low-light vision (3× human distance in poor light).",
      "Cold resistance 1 and fire resistance 1.",
      "Shadowmeld (Ex): +10 circumstance bonus on Hide when motionless in night or low-light conditions.",
      "Spell resistance 5 + character level.",
      "Weapon familiarity: treat moonglaive as a martial weapon.",
      `+2 racial bonus on Knowledge (nature) and ${a("/skills/survival", "Survival")} (class skills for all night elves).`,
      "Automatic Languages: Common, Darnassian. Bonus: Goblin, Low Common, Orc, Thalassian.",
      `Favored Class: ${a("/classes/scout-wrpg", "Scout")}.`,
      `Arcane prohibition: gaining a level in an arcane spellcasting class irreversibly transforms the character into a ${a("/races/high-elf-wrpg", "high elf")} over one week (lose night elf traits). Level Adjustment +1.`,
    ]),
    index: { ...base("night-elf-wrpg", "Night Elf").index, level_adjustment: "1" },
  },
  {
    ...base("goblin-wrpg", "Goblin", 46),
    size: "Small",
    type: "Humanoid (goblinoid)",
    speed: "Land 20 ft.",
    level_adjustment: null,
    languages_html: "Common, Goblin",
    languages_text: "Common, Goblin",
    description_html: ul([
      "+2 Dexterity, −2 Strength.",
      "Small: +1 AC, +1 attack, +4 Hide; use smaller weapons; carry 3/4 of Medium limits.",
      "Base land speed 20 ft.; low-light vision.",
      `+2 racial bonus on ${a("/skills/appraise", "Appraise")}, Craft (alchemy), ${a("/skills/diplomacy", "Diplomacy")}, and ${a("/skills/listen", "Listen")} (class skills for all goblins).`,
      "+4 racial bonus on Craft (mechanical devices).",
      "Weapon familiarity: treat blunderbuss, flintlock pistol, and long rifle as martial weapons.",
      "Automatic Languages: Common, Goblin. Bonus: any unrestricted.",
      `Favored Class: ${a("/classes/tinker-wrpg", "Tinker")}.`,
    ]),
    index: { ...base("goblin-wrpg", "Goblin").index, level_adjustment: "" },
  },
  {
    ...base("half-elf-wrpg", "Half-Elf", 48),
    size: "Medium",
    type: "Humanoid (elf)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Thalassian",
    languages_text: "Common, Thalassian",
    description_html: ul([
      "Medium; base land speed 30 ft.; low-light vision.",
      "Elven Blood: counted as a high elf for effects and prerequisites (no high-elf arcane ability or addiction).",
      "+1 racial bonus on saves vs. spells and spell-like effects.",
      `+2 racial bonus on ${a("/skills/gather-information", "Gather Information")} and ${a("/skills/sense-motive", "Sense Motive")} (class skills for all half-elves).`,
      "Automatic Languages: Common, Thalassian. Bonus: any unrestricted.",
      "Favored Class: Any.",
      "Optional half-night elf: treated as night elf for special abilities; automatic language Darnassian instead of Thalassian.",
    ]),
    index: { ...base("half-elf-wrpg", "Half-Elf").index, level_adjustment: "" },
  },
  {
    ...base("half-orc-wrpg", "Half-Orc", 49),
    size: "Medium",
    type: "Humanoid (orc)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Orc",
    languages_text: "Common, Orc",
    description_html: ul([
      "+2 Constitution, −2 Wisdom.",
      "Medium; base land speed 30 ft.; low-light vision.",
      "Orc Blood: counted as an orc for effects and prerequisites.",
      "+1 racial bonus on saves vs. fear.",
      `+2 racial bonus on ${a("/skills/intimidate", "Intimidate")} and ${a("/skills/sense-motive", "Sense Motive")} (class skills for all half-orcs).`,
      "Automatic Languages: Common, Orc. Bonus: any unrestricted.",
      `Favored Class: ${a("/classes/barbarian-wrpg", "Barbarian")}.`,
    ]),
    index: { ...base("half-orc-wrpg", "Half-Orc").index, level_adjustment: "" },
  },
  {
    ...base("orc-wrpg", "Orc", 50),
    size: "Medium",
    type: "Humanoid (orc)",
    speed: "Land 30 ft.",
    level_adjustment: null,
    languages_html: "Common, Orc",
    languages_text: "Common, Orc",
    description_html: ul([
      "+2 Constitution, −2 Intelligence.",
      "Medium; base land speed 30 ft.; low-light vision.",
      "Battle Rage (Ex): rage 1/day as a barbarian (PHB); if the character already has rage, this grants one extra rage/day; still limited to once per encounter.",
      "Weapon familiarity: treat orcish claws of attack as martial weapons; Martial Weapon Proficiency (battleaxe).",
      "+2 racial bonus on Handle Animal checks involving wolves and on Intimidate (class skills for all orcs).",
      "+1 racial bonus on attack rolls against humans.",
      "Automatic Languages: Common, Orc. Bonus: Goblin, Low Common, Taur-ahe.",
      `Favored Class: ${a("/classes/fighter-wrpg", "Fighter")}.`,
    ]),
    index: { ...base("orc-wrpg", "Orc").index, level_adjustment: "" },
  },
  {
    ...base("tauren-wrpg", "Tauren", 52),
    size: "Large",
    type: "Humanoid (tauren)",
    speed: "Land 30 ft.",
    level_adjustment: "+1",
    languages_html: "Common, Taur-ahe",
    languages_text: "Common, Taur-ahe",
    description_html: ul([
      "+4 Strength, +2 Constitution, −2 Dexterity.",
      "Large (tall): −1 AC, −1 attack, −4 Hide; 10-ft. space and reach; double Medium carrying capacity.",
      "Base land speed 30 ft.",
      "Tauren Charge: on a charge, gore for 1d8 + 1½ Str; may ready horns vs. a charge for the same damage.",
      "Weapon familiarity: treat tauren halberd and tauren totem as martial weapons; Martial Weapon Proficiency (longspear, shortspear).",
      `+2 racial bonus on ${a("/skills/handle-animal", "Handle Animal")} and ${a("/skills/survival", "Survival")} (class skills for all tauren).`,
      "+1 racial bonus on attack rolls with longspears and shortspears.",
      "Automatic Languages: Common, Taur-ahe. Bonus: Goblin, Low Common, Orc.",
      `Favored Class: ${a("/classes/fighter-wrpg", "Fighter")}. Level Adjustment +1.`,
    ]),
    index: { ...base("tauren-wrpg", "Tauren").index, level_adjustment: "1" },
  },
].map((r) => ({ ...r, description_text: text(r.description_html) }));

// ─── Classes (Ch. 2, pp. 55–97) ───────────────────────────────────────────────

const classes = buildWarcraftClasses({ base, html, text, a, sk, ul });

// ─── Feats (pp. 106–115) ─────────────────────────────────────────────────────

const feats = buildWarcraftFeats({ base, html, text, a });

// ─── Equipment (pp. 130–139) ─────────────────────────────────────────────────

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
    index: { ...b.index, kind: "weapon", category, stats: statsStr, cost, weight },
  };
}

function good(slug, name, cost, weight, description, page = null) {
  const b = base(slug, name, page);
  const descHtml = html(description);
  return {
    ...b,
    kind: "good",
    category: "adventuring gear",
    cost,
    weight,
    description_html: descHtml,
    description_text: text(descHtml),
    index: { ...b.index, kind: "good", category: "adventuring gear", cost, weight },
  };
}

function material(slug, name, description, page = null) {
  const b = base(slug, name, page);
  const descHtml = html(description);
  return {
    ...b,
    kind: "good",
    category: "special material",
    cost: "-",
    weight: "-",
    description_html: descHtml,
    description_text: text(descHtml),
    index: { ...b.index, kind: "good", category: "special material", cost: "-", weight: "-" },
  };
}

const equipment = [
  material("gunpowder-wrpg", "Gunpowder", `Favored material of Ironforge dwarves (p. 130). 1 oz. per firearm shot. Wet powder is ruined. Malfunction Rating 1: explosion in a 5-ft. radius for 2d6 fire (Ref DC 18; Ironforge dwarves +4). Refined (+1 damage, 50 gp/lb) and imbued (water-resistant; ammo as +1 magic, 650 gp/lb) varieties exist. Keg 250 gp / powder horn 35 gp.`, 132),
  material("dragonhide-wrpg", "Dragonhide", `Favored material of high elves. Counts as masterwork for enchanting. Hide, leather, and studded leather only; 0% arcane spell failure. Cost ×20. Hardness 10; 30 hp/inch.`, 131),
  material("blackwood-wrpg", "Darkwood", `Night elves' favored material (listed as darkwood in Table 3–2). Uses the standard darkwood rules from the core books for lighter wooden items and weapons.`, 130),
  material("thorium-wrpg", "Thorium", `Favored with arcanite by orcs. Weapons require ${a("/feats/exotic-weapon-thorium-wrpg", "Exotic Weapon Proficiency (thorium weapons)")} and deal extra damage equal to half the wielder's Strength bonus. Armor: DR 5/+1, one category heavier, max Dex −2, ACP and ASF doubled; cost +20,000 gp; weight ×2.`, 131),
  material("arcanite-wrpg", "Arcanite", `Grayish flexible metal. Weapons: +1 enhancement to attack and damage and +1 critical threat range (after Improved Critical); cost +9,000 gp; masterwork. Armor: miss chance vs. confirmed criticals (100 gp per %, min 10%, max 50%). Hardness 15; 30 hp/inch.`, 130),
  weapon("war-blade-wrpg", "Warblade", "martial", { cost: "20 gp", weight: "3 lb.", damage_m: "1d8", damage_s: "1d6", critical: "×2", damage_type: "S", handed: "1H" }, 135),
  weapon("orc-attack-claws-wrpg", "Orcish Claws of Attack", "exotic", { cost: "25 gp", weight: "2 lb.", damage_m: "1d6", damage_s: "1d4", critical: "19–20/×2", damage_type: "S", handed: "1H" }, 135),
  weapon("moon-glaive-wrpg", "Moonglaive", "exotic", { cost: "20 gp", weight: "1 lb.", damage_m: "1d6", damage_s: "1d4", critical: "×3", damage_type: "S", range_increment: "10 ft.", handed: "1H" }, 135),
  weapon("dwarven-throwing-hammer-wrpg", "Dwarven Tossing Hammer", "exotic", { cost: "15 gp", weight: "7 lb.", damage_m: "1d6", damage_s: "1d4", critical: "×3", damage_type: "B", range_increment: "10 ft.", handed: "1H" }, 135),
  weapon("tauren-polearm-wrpg", "Tauren Halberd", "exotic", { cost: "50 gp", weight: "25 lb.", damage_m: "2d6", damage_s: "1d8", critical: "×3", damage_type: "P and S", handed: "2H" }, 135),
  weapon("tauren-totem-wrpg", "Tauren Totem", "exotic", { cost: "20 gp", weight: "50 lb.", damage_m: "2d8", damage_s: "1d10", critical: "×2", damage_type: "B", handed: "2H" }, 135),
  weapon("flintlock-musket-wrpg", "Flintlock Pistol", "exotic", { cost: "400 gp", weight: "5 lb.", damage_m: "3d6", damage_s: "2d6", critical: "×3", damage_type: "P", range_increment: "5 ft.", handed: "1H" }, 135),
  weapon("blunderbuss-wrpg", "Blunderbuss", "exotic", { cost: "250 gp", weight: "10 lb.", damage_m: "Special", damage_s: "Special", critical: "×3", damage_type: "P", range_increment: "10 ft.", handed: "2H" }, 135),
  weapon("long-rifle-wrpg", "Long Rifle", "exotic", { cost: "800 gp", weight: "20 lb.", damage_m: "3d6", damage_s: "2d6", critical: "×3", damage_type: "P", range_increment: "300 ft.", handed: "2H" }, 135),
  weapon("mortar-wrpg", "Mortar", "exotic", { cost: "75 gp", weight: "20 lb.", damage_m: "Special", damage_s: "Special", critical: "×2", damage_type: "P", range_increment: "40 ft.", handed: "2H" }, 135),
  good("mortar-shell-wrpg", "Mortar Shell", "25 gp", "1 lb.", "Explosive mortar ammunition: MR 1, 3d6 fire, 5-ft. blast. Casing hardness 0, 2 hp.", 135),
  good("catapult-bomb-wrpg", "Catapult Bomb", "150 gp", "20 lb.", "Bomb for catapults: MR 1, 8d6 fire, 20-ft. blast. No weapon proficiency required.", 135),
  good("buried-bomb-wrpg", "Emplaced Bomb", "80 gp", "10 lb.", "Buried/emplaced bomb: MR 1, 4d6 fire, 10-ft. blast. DC 12 Use Technological Device to prime.", 135),
  good("grenade-wrpg", "Grenade Bomb", "40 gp", "1 lb.", "Thrown bomb: MR 1, 2d6 fire, 5-ft. blast, range increment 10 ft. Hit target may Ref DC 20 to catch/deflect.", 135),
  good("goblin-knife-wrpg", "Goblin Army Knife", "50 gp", "4 lb.", "Multi-tool (trench tool, saw, hammer, firestarter, sewing kit, 25 ft. spidersilk, fishing rod, 1-person tent). 3 rounds to switch function. Hardness 1, hp 5.", 136),
  good("gyro-umbrella-wrpg", "Gyroparasol", "150 gp", "2 lb.", "Move action to open; slows falls of up to 600 lb. and prevents the first 3d6 falling damage (DC 10 Use Technological Device to hold). MR 1. Hardness 3, hp 15.", 136),
  good("goblin-mine-shoes-wrpg", "Goblin Mine Shoes", "400 gp", "10 lb.", "Spread weight vs. pressure plates and pit traps; cannot run while worn. MR 1: lock when a trap triggers (no Ref save). Hardness 2, hp 10.", 137),
  good("grappling-launcher-wrpg", "Pulley Gun", "225 gp", "8 lb.", "Steam spike up to 50 ft. into hardness ≤8, then pulley and spidersilk (100 ft., 800 lb.; upgrade 1,600 lb.). As a weapon: exotic ranged, 50-ft. increment, 3d6 P. Reset 4 minutes. DC 20 Use Technological Device.", 138),
  good("spider-silk-rope-wrpg", "Spidersilk Rope", "25 gp", "3 lb.", "50 ft. spidersilk rope: +4 circumstance on Use Rope; 5 hp; burst Str DC 25.", 138),
  good("steam-hammer-wrpg", "Steam Hammer", "500 gp", "35 lb.", "Portable steam hammer: +15 Strength (replaces user's) to break doors/objects as a full-round action; rebuild steam 1 minute. As a weapon: exotic melee 5d6 B. Deafens user and those within 100 ft. for 1d10 rounds.", 138),
  good("phlogiston-elixir-wrpg", "Phlogiston Elixir", "25 gp", "-", "Choose one ability score to raise and one to lower by 1d4+1 (enhancement/penalty) for 1 day. Craft (alchemy) DC 12. MR/breakdown: ingested poison Fort DC 13 (1 Con / 1d4 Con).", 138),
];

// ─── Magic Items (pp. 144–145) ────────────────────────────────────────────────

function item(slug, name, type, price, description, page = null, extra = {}) {
  const b = base(slug, name, page);
  const descHtml = html(description);
  return {
    ...b,
    price,
    caster_level: extra.casterLevel ?? null,
    aura: extra.aura ?? null,
    activation: extra.activation ?? null,
    weight: extra.weight ?? null,
    description_html: descHtml,
    description_text: text(descHtml),
    index: { ...b.index, type, price },
  };
}

const items = [
  item("goblin-land-mine-wrpg", "Goblin Land Mine", "Wondrous Item", "850 gp", "Invisible emplaced bomb tied to a glyph of warding: 8d6 fire in a 15-ft. radius (Ref DC 15 half). Search/Disable Device DC 20. CR 5.", 144, { casterLevel: "5th", aura: "Faint abjuration", activation: "-", weight: "2 lb." }),
  item("stormhammer-wrpg", "Storm Hammer", "Magic Weapon", "8,500 gp", `+1 shock warhammer dealing +1d6 electricity on a hit. A non-owner who wields it takes 1d6 electricity damage each round (Ref DC 20 to drop). Distinct from the ${a("/spells/stormhammer-spell-wrpg", "storm hammer")} spell.`, 144, { casterLevel: "8th", aura: "Moderate evocation", activation: "-", weight: "8 lb." }),
  item("vampiric-rune-blade-wrpg", "Vampiric Runeblade", "Magic Weapon", "200,000 gp", "+1 longsword dealing +2d6 negative energy vs. living creatures; wielder gains temporary hit points equal to the bonus damage (max = current hp + 10) for 1 hour. Intelligent CE blade (Int 10, Wis 12, Cha 16, Ego 9) with charm person 1/day (DC 16).", 144, { casterLevel: "7th", aura: "Moderate necromancy", activation: "-", weight: "4 lb." }),
  item("potion-of-invulnerability-wrpg", "Potion of Invulnerability", "Potion", "2,000 gp", "Grants DR 20/adamantine for 10 rounds. The drinker takes 1d4 damage each round (unreducible).", 145, { casterLevel: "5th", aura: "Faint abjuration", activation: "Standard (drink)", weight: "-" }),
  item("potion-of-mana-wrpg", "Potion of Mana", "Potion", "900 gp", "Recover the last 1st-, 2nd-, or 3rd-level spell cast if drunk within 2 rounds.", 145, { casterLevel: "4th", aura: "Faint transmutation", activation: "Standard (drink)", weight: "-" }),
  item("potion-of-greater-mana-wrpg", "Potion of Greater Mana", "Potion", "9,000 gp", "Recover the last spell of any level cast if drunk within 2 rounds; take damage equal to the spell's level.", 145, { casterLevel: "7th", aura: "Moderate transmutation", activation: "Standard (drink)", weight: "-" }),
  item("cloak-of-flames-wrpg", "Cloak of Flames", "Wondrous Item", "90,000 gp", "Holocaust cloak: 2d6 fire/round to creatures within 5 ft. (Will DC 20 to push the aura to 10 ft.); no harm to wearer or designated allies (Ref DC 17 half). Free action on/off; 10 rounds/day.", 145, { casterLevel: "5th", aura: "Faint evocation", activation: "Free (command)", weight: "4 lb." }),
  item("gloves-of-swiftness-wrpg", "Gloves of Celerity", "Wondrous Item", "2,000 gp", "+2 luck bonus on initiative checks and Reflex saves.", 145, { casterLevel: "5th", aura: "Faint transmutation", activation: "-", weight: "-" }),
];

// ─── Spells (pp. 156–171) ────────────────────────────────────────────────────

function spellClass(name, slug, level) {
  return { name, slug, level, url: `/classes/${slug}`, id: null };
}

function spell(slug, name, school, level, classRefs, description, page = null, extra = {}) {
  const b = base(slug, name, page);
  const descHtml = html(description);
  return {
    ...b,
    school,
    casting_time: extra.castingTime ?? "1 standard action",
    components: extra.components ?? "V, S",
    range: extra.range ?? "Close (25 ft. + 5 ft./2 levels)",
    target: extra.target ?? null,
    duration: extra.duration ?? "Instantaneous",
    saving_throw: extra.save ?? "None",
    spell_resistance: extra.sr ?? "Yes",
    classes: classRefs,
    description_html: descHtml,
    description_text: text(descHtml),
    index: {
      ...b.index,
      school,
      components: { V: true, S: true, M: false, F: false, DF: false, XP: false },
      description_snippet: text(descHtml).slice(0, 120),
    },
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
  spell("cripple-wrpg", "Cripple", "Transmutation", 2, wizSor(2), "Living target may take only a partial action; −2 AC, melee attack, melee damage, and Reflex; half jump distance; −1d6 Strength and an additional −1 per 2 caster levels (max −5 extra; Str minimum 1). Countered/dispelled by haste.", 160, { save: "Will negates", duration: "1 round/level" }),
  spell("stasis-trap-wrpg", "Stasis Trap", "Conjuration [Sonic]", 1, [shaman(1)], "Creates a totem (visible 1d4 rounds, then invisible). When an enemy comes within 10 ft. within 1 round/level, it explodes: enemies in a 20-ft. radius Will save or are dazed 1d4 rounds. Totem AC 7, hardness 5, hp 5.", 168, { range: "0 ft.", duration: "See text", area: "20-ft. radius burst", save: "Will negates", sr: "Yes" }),
  spell("ice-armor-wrpg", "Frost Armor", "Conjuration (Creation) [Force]", 2, [shaman(2), ...wizSor(2)], "Touched creature gains +4 armor bonus (force; no ACP/ASF/speed penalty). Creatures that strike the subject with natural or handheld melee weapons become chilled for 1 round (−2 AC/melee attack/melee damage/Reflex; partial actions only).", 162, { range: "Touch", duration: "1 hour/level (D)", save: "Will negates (harmless)", target: "Creature touched" }),
  spell("banish-wrpg", "Banish", "Transmutation", 8, wizSor(8), "Target becomes ethereal (invisible and intangible) for 1 round/level under Warcraft ethereal rules. Replaces planar banishment tropes; see " + a("/spells/warcraft-cosmology-wrpg", "Warcraft Cosmology") + ".", 158, { save: "Will negates", duration: "1 round/level", range: "Close (25 ft. + 5 ft./2 levels)" }),
  spell("healing-rain-wrpg", "Healing Rain", "Conjuration (Healing)", 5, [healer(5)], "Living allies in a 20-ft. radius centered on the caster regain 1d4 hp/round; undead in the area take the same as damage.", 163, { range: "20 ft.", duration: "Concentration, up to 1 round/level", area: "20-ft. radius", save: "Fortitude half (harmless)", sr: "Yes (harmless)" }),
  spell("fire-rain-wrpg", "Rain of Fire", "Evocation [Fire]", 4, wizSor(4), "Cylinder of flame deals 3d6 impact + 2d6 fire damage; ignites combustibles.", 165, { range: "Medium", area: "Cylinder 20-ft. radius, 40 ft. high", save: "None", components: "V, S, M", descriptors: ["Fire"] }),
  spell("bloodlust-wrpg", "Bloodlust", "Transmutation", 3, [shaman(3), ...wizSor(4)], "Subject gains one extra attack/round and a +4 enhancement bonus to Strength. Countered/dispelled by slow.", 159, { range: "Close", duration: "1 round/level", save: "Fortitude negates (harmless)", sr: "Yes (harmless)", target: "One creature" }),
  spell("mana-burn-wrpg", "Mana Burn", "Transmutation", 2, wizSor(2), "Ranged touch ray; target loses 1d4+1 spell levels/slots (highest first).", 164, { range: "Close", effect: "Ray", save: "Will negates" }),
  spell("carrion-swarm-wrpg", "Carrion Swarm", "Conjuration (Summoning)", 5, wizSor(5), "Cone of insects deals 1d6 damage/level (max 15d6), nonmagical. Poison-immune creatures take half (¼ on save). DR or incorporeal: immune.", 160, { range: "Close", area: "Cone", save: "Reflex half", components: "V, S, M" }),
  spell("thorns-shield-wrpg", "Thorn Shield", "Transmutation", 3, [druidWild(3), ...wizSor(3)], "Melee attackers striking the subject take 1d6 +1/level damage. Reach weapons exempt.", 170, { range: "Touch", duration: "1 round/level (D)", save: "None", target: "Creature touched" }),
  spell("lightning-shield-wrpg", "Lightning Shield", "Evocation [Electricity]", 4, wizSor(4), "Creatures within 5 ft. take 1d6 electricity +1 per 5 caster levels each round. Sheds light as a torch.", 164, { range: "Personal", duration: "1 round/level (D)", save: "None", components: "V, S, M", descriptors: ["Electricity"] }),
  spell("death-coil-wrpg", "Death Coil", "Necromancy", 3, [healer(3)], "One creature: living takes 2d8 +1/level (max +10) negative energy (Will half); undead are healed the same amount.", 160, { save: "Will half", target: "One creature" }),
  spell("lesser-death-coil-wrpg", "Lesser Death Coil", "Necromancy", 2, [healer(2)], "As death coil, but 1d8 +1/level (max +5).", 161, { save: "Will half", target: "One creature" }),
  spell("greater-death-coil-wrpg", "Greater Death Coil", "Necromancy", 4, [healer(4)], "As death coil, but 3d8 +1/level (max +15).", 161, { save: "Will half", target: "One creature" }),
  spell("falling-star-wrpg", "Starfall", "Evocation [Force]", 9, [priest(9), ...wizSor(9)], "Each round of concentration (up to 1 round/level), two force missiles each deal 1d6/level (max 10d6); both missiles cannot hit the same subject in one round.", 168, { range: "Close", duration: "Concentration, up to 1 round/level", save: "Reflex half", descriptors: ["Force"] }),
  spell("force-of-nature-wrpg", "Force of Nature", "Transmutation", 6, [druidWild(6)], "Touched healthy living tree becomes a treant (MM) that fights for you for 1 round/level.", 161, { castingTime: "1 round", range: "Touch", duration: "1 round/level (D)", save: "None", sr: "No", target: "One living healthy tree" }),
  spell("greater-force-of-nature-wrpg", "Greater Force of Nature", "Transmutation", 8, [druidWild(8)], "As force of nature, but creates 1d4+1 treants.", 162, { castingTime: "1 round", range: "Touch", duration: "1 round/level (D)", save: "None", sr: "No" }),
  spell("moon-glaive-spell-wrpg", "Moonglaive", "Conjuration (Creation) [Force]", 1, [healer(2), ...wizSor(1)], "Force moonglaive: ranged attack that can bounce to a second (−2) and third (−4) target within 15 ft. of each other; stops on a miss or after three hits. Caster is proficient for the spell.", 165, { range: "See text", save: "None", target: "Up to 3 creatures" }),
  spell("immolation-wrpg", "Immolation", "Evocation [Fire]", 4, [shaman(4), ...wizSor(4)], "Aura deals 1d6 fire/round to creatures within 5 ft.; light as a sunrod. Caster takes half cold damage (none on a successful Reflex half).", 164, { range: "Personal", duration: "1 round/level (D)", save: "None", descriptors: ["Fire"] }),
  spell("glacial-burst-wrpg", "Frost Nova", "Evocation [Cold]", 3, [shaman(3), ...wizSor(3)], "10-ft. radius burst deals 1d6 cold/level (max 10d6). Damaged creatures Fortitude save or are chilled 1d4 rounds.", 163, { range: "Close", area: "10-ft. radius spread", save: "Reflex half (damage); Fortitude negates chill", descriptors: ["Cold"] }),
  spell("stormhammer-spell-wrpg", "Storm Hammer", "Conjuration (Creation) [Force]", 2, wizSor(2), "Force hammer: ranged touch dealing 2d4 force +1d4 per 3 levels (max 7d4 at 18th); Fortitude save or dazed 1 round.", 169, { save: "Fortitude negates daze", components: "V, S, M, F", effect: "One force hammer", descriptors: ["Force"] }),
  spell("blend-with-shadows-wrpg", "Shadow Meld", "Illusion (Glamer)", 1, wizSor(1), "After casting, remain motionless for 1 round to become invisible in light no brighter than a torch (including to darkvision). Attacking or taking a standard action reveals you; sunlight ruins the effect while you are in it.", 167, { range: "Personal", duration: "10 minutes/level (D)", save: "None", sr: "No" }),
  spell("razor-blizzard-wrpg", "Blizzard", "Evocation [Cold]", 3, wizSor(3), "Cylinder of ice deals 1d6 impact + 1d6 cold per round while you concentrate (up to 1 round/2 levels, max 5 rounds).", 159, { range: "Long", area: "Cylinder 20-ft. radius, 40 ft. high", duration: "Concentration, up to 1 round/2 levels", save: "None", descriptors: ["Cold"] }),
  spell("shockwave-wrpg", "Shockwave", "Evocation [Force]", 3, [shaman(3), ...wizSor(3)], "10-ft.-wide ground line to close range deals 1d6 force/level (max 10d6). Airborne creatures unaffected.", 168, { range: "Close", area: "10 ft. wide to close range", save: "Reflex negates", descriptors: ["Force"] }),
  spell("entangling-roots-wrpg", "Entangling Roots", "Transmutation", 3, [healer(3)], "Roots pin one creature: cannot move; −2 attacks, −4 effective Dex; Concentration DC 15 to cast; escape DC 25 Str or DC 22 Escape Artist; roots AC 10, 22 hp; 1d4 constriction/round.", 161, { range: "Medium", duration: "1 round/level (D)", save: "Reflex negates", sr: "No", target: "One creature" }),
  spell("rejuvenation-wrpg", "Rejuvenation", "Conjuration (Healing)", 5, [healer(5)], "Living touched creature regains 2d8 hp/round for 1 round/level (to maximum).", 165, { range: "Touch", duration: "1 round/level", save: "Fortitude negates (harmless)", sr: "Yes (harmless)", target: "Living creature touched" }),
  spell("roar-wrpg", "Roar", "Enchantment (Compulsion) [Mind-Affecting]", 1, [druidWild(1)], "Allies within 50 ft. gain +1 morale bonus on attack and damage rolls. Usable in dire bear form.", 166, { range: "50 ft.", duration: "1 round/level", area: "Allies within 50 ft.", save: "None", components: "V", descriptors: ["Mind-Affecting"] }),
  spell("second-soul-wrpg", "Second Soul", "Conjuration (Healing)", 9, [healer(9)], "If the subject dies, they return to life 2d4 rounds later at full hp (level loss, or −1 Con at 1st). Material component: holy water and diamonds worth at least 20,000 gp.", 166, { castingTime: "10 minutes", range: "Touch", duration: "Permanent", save: "None", components: "V, S, M, DF", target: "Living creature touched" }),
  spell("sentinel-wrpg", "Sentinel", "Divination", 3, [elvenRanger(3)], "Creates a visible Diminutive bird sensor on a tree for 1 hour/level. Concentrate to see and hear through it at any distance. Bird Hide +7, AC 9, hp 1.", 166, { range: "Close", duration: "1 hour/level", save: "None", sr: "No", effect: "Magical sensor", components: "V, S, M" }),
  spell("blade-storm-wrpg", "Bladestorm", "Transmutation", 3, wizSor(3), "Creates two longswords (+1 enhancement per 3 CL, max +5). From the next round, each full attack is one melee attack at full BAB vs. each foe within 5 ft.; ends if you skip a full attack. Material: two knives.", 158, { range: "Personal", duration: "1 round/level (D)", save: "None", sr: "No", components: "V, S, M" }),
  spell("touch-of-life-wrpg", "Touch of Life", "Conjuration (Healing)", 9, [healer(9)], "Temporarily raise a creature dead no longer than 1 round/level: full hp, no level/Con loss, for 1 round/level; then dies again. Body must be whole. Diamonds ≥ 5,000 gp.", 170, { castingTime: "1 round", range: "Touch", duration: "1 round/level", save: "None (willing)", components: "V, S, M, DF", target: "Dead creature touched" }),
  spell("healing-totem-wrpg", "Healing Ward", "Conjuration (Healing)", 3, [shaman(3)], "Totem cures 1 hp/round to living allies within 20 ft. (damages undead). Totem AC 7, hardness 5, hp 5.", 163, { range: "0 ft.", duration: "1 round/level", area: "20-ft. radius", save: "Fortitude half (harmless)", sr: "Yes (harmless)" }),
  spell("serpent-totem-wrpg", "Serpent Ward", "Conjuration [Fire]", 3, [shaman(3)], "Totem makes one ranged touch attack/round vs. enemies within 30 ft. (BAB + Wis; Precise Shot) for 1d6 fire per 3 CL (max 5d6). Totem AC 7, hardness 5, hp 5.", 167, { range: "0 ft.", duration: "1 round/level", save: "Reflex half", descriptors: ["Fire"] }),
  spell("warcraft-cosmology-wrpg", "Warcraft Cosmology (Spell Changes)", "Universal", 0, [], ul([
    "No Astral Plane: astral projection travels the Twisting Nether.",
    "No Ethereal Plane: ethereal jaunt/etherealness leave the caster invisible and intangible on the Material Plane.",
    `Summon monster I–IX and planar binding are ${a("/classes/warlock-wrpg", "warlock")}-only and summon fiends/Twisting Nether natives.`,
    "Many necromancy spells (animate dead, create undead, energy drain, etc.) are restricted to the Necromancer (supplement).",
    "Planar ally spells summon elementals only.",
    "Divine casters draw power from philosophy, the Holy Light, Elune, or spirits, not PHB deities/domains (except as class features).",
  ]), 156, { castingTime: "-", components: "-", range: "-", duration: "-", save: "-", sr: "-" }),
];

// ─── Spell-class overlay (PHB/DMG spells linked to WRPG class lists) ───────────

function normalizeSpellName(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadSpellNameIndex() {
  const spellsPath = join(__dirname, "../data/dndtools/spells.json");
  if (!existsSync(spellsPath)) {
    console.warn("spells.json not found; skipping PHB spell-class overlay");
    return new Map();
  }
  const all = JSON.parse(readFileSync(spellsPath, "utf8"));
  const byName = new Map();
  for (const s of all) {
    const key = normalizeSpellName(s.name);
    if (!byName.has(key)) byName.set(key, s.slug);
  }
  return byName;
}

/** Healer spell list (WRPG p.60). Names marked * are WRPG-native (already on spell records). */
const HEALER_LIST = {
  0: [
    "create water", "cure minor wounds", "detect magic", "detect poison", "guidance",
    "inflict minor wounds", "light", "mending", "purify food and drink", "read magic",
    "resistance", "virtue",
  ],
  1: [
    "bane", "bless", "bless water", "cause fear", "command", "comprehend languages",
    "cure light wounds", "curse water", "deathwatch", "divine favor", "doom",
    "entropic shield", "inflict light wounds", "remove fear", "sanctuary", "shield of faith",
  ],
  2: [
    "aid", "augury", "bears endurance", "bulls strength", "calm emotions", "consecrate",
    "cure moderate wounds", "darkness", "delay poison", "enthrall", "find traps",
    "gentle repose", "hold person", "inflict moderate wounds", "lesser restoration",
    "make whole", "remove paralysis", "shatter", "shield other", "silence", "sound burst",
    "spiritual weapon", "zone of truth",
  ],
  3: [
    "bestow curse", "blindness deafness", "contagion", "continual flame", "create food and water",
    "cure serious wounds", "daylight", "deeper darkness", "dispel magic", "glyph of warding",
    "helping hand", "inflict serious wounds", "invisibility purge", "locate object",
    "magic vestment", "obscure object", "prayer", "remove blindness deafness", "remove curse",
    "remove disease",
  ],
  4: [
    "cure critical wounds", "death ward", "dimensional anchor", "discern lies", "divination",
    "divine power", "freedom of movement", "greater magic weapon", "imbue with spell ability",
    "inflict critical wounds", "neutralize poison", "poison", "repel vermin", "restoration",
    "sending", "spell immunity", "status", "tongues",
  ],
  5: [
    "flame strike", "greater command", "hallow", "lesser planar ally", "mass cure light wounds",
    "mass inflict light wounds", "raise dead", "righteous might", "scrying", "slay living",
    "spell resistance", "true seeing", "unhallow",
  ],
  6: [
    "blade barrier", "find the path", "geas quest", "greater dispel magic", "greater glyph of warding",
    "harm", "heal", "heroes feast", "mass bears endurance", "mass bulls strength",
    "mass cure moderate wounds", "mass inflict moderate wounds", "word of recall",
  ],
  7: [
    "destruction", "greater restoration", "greater scrying", "mass cure serious wounds",
    "mass inflict serious wounds", "planar ally", "refuge", "regenerate", "repulsion", "resurrection",
  ],
  8: [
    "antimagic field", "discern location", "greater spell immunity", "holy aura",
    "mass cure critical wounds", "mass inflict critical wounds", "unholy aura",
  ],
  9: [
    "greater planar ally", "implosion", "mass heal", "miracle", "soul bind", "true resurrection",
  ],
};

const PRIEST_ADD = {
  1: ["detect undead", "hide from undead", "magic weapon", "protection from evil"],
  2: ["align weapon", "consecrate", "lesser restoration", "undetectable alignment"],
  3: ["magic circle against evil", "searing light"],
  4: ["dismissal", "restoration"],
  5: ["flame strike", "mark of justice", "plane shift"],
  6: ["forbiddance", "undeath to death"],
  7: ["ethereal jaunt", "holy word"],
  8: ["dimensional lock", "holy aura"],
  9: ["astral projection", "etherealness", "gate"],
};

const SHAMAN_ADD = {
  1: ["burning hands", "magic stone", "obscuring mist"],
  2: ["fog cloud", "produce flame", "soften earth and stone", "wind wall"],
  3: ["gaseous form", "resist energy", "stone shape", "water breathing"],
  4: ["air walk", "control water", "spike stones", "wall of fire"],
  5: ["control winds", "fire shield", "ice storm", "wall of stone"],
  6: ["chain lightning", "cone of cold", "fire seeds", "stoneskin"],
  7: ["acid fog", "control weather", "fire storm", "earthquake"],
  8: ["horrid wilting", "incendiary cloud", "iron body", "whirlwind"],
  9: ["elemental swarm"],
};

const DRUID_ADD = {
  0: ["flare", "know direction"],
  1: [
    "calm animals", "charm animal", "detect animals or plants", "detect snares and pits",
    "entangle", "faerie fire", "goodberry", "hide from animals", "magic fang", "obscuring mist",
    "pass without trace", "shillelagh", "speak with animals", "summon natures ally i",
  ],
  2: [
    "animal messenger", "animal trance", "barkskin", "delay poison", "hold animal",
    "reduce animal", "spider climb", "summon natures ally ii", "summon swarm", "tree shape",
    "warp wood", "wood shape",
  ],
  3: [
    "diminish plants", "dominate animal", "greater magic fang", "neutralize poison",
    "plant growth", "poison", "remove disease", "snare", "speak with plants", "spike growth",
    "summon natures ally iii",
  ],
  4: [
    "antiplant shell", "blight", "command plants", "flame strike", "freedom of movement",
    "giant vermin", "repel vermin", "summon natures ally iv",
  ],
  5: [
    "animal growth", "awaken", "baleful polymorph", "commune with nature", "insect plague",
    "summon natures ally v", "tree stride", "wall of thorns",
  ],
  6: [
    "antilife shell", "find the path", "ironwood", "liveoak", "repel wood", "spellstaff",
    "summon natures ally vi", "transport via plants",
  ],
  7: [
    "animate plants", "changestaff", "creeping doom", "summon natures ally vii", "sunbeam",
    "transmute metal to wood",
  ],
  8: ["animal shapes", "control plants", "summon natures ally viii", "whirlwind"],
  9: ["shambler", "shapechange", "summon natures ally ix"],
};

const PALADIN_LIST = {
  1: [
    "bane", "bless", "bless weapon", "command", "cure light wounds", "detect poison",
    "detect undead", "divine favor", "endure elements", "magic weapon", "protection from chaos",
    "shield of faith",
  ],
  2: [
    "aid", "bulls strength", "cure moderate wounds", "delay poison", "eagles splendor",
    "bears endurance", "owls wisdom", "remove paralysis", "resist energy", "shield other",
    "spiritual weapon", "undetectable alignment",
  ],
  3: [
    "cure serious wounds", "discern lies", "dispel magic", "greater magic weapon",
    "magic circle against chaos", "prayer", "remove blindness deafness", "searing light",
  ],
  4: [
    "break enchantment", "cure critical wounds", "death ward", "dispel chaos", "dispel evil",
    "freedom of movement", "holy sword", "neutralize poison", "restoration",
  ],
};

const ELVEN_RANGER_LIST = {
  1: [
    "alarm", "delay poison", "detect poison", "detect snares and pits", "detect undead",
    "entangle", "faerie fire", "hide from animals", "jump", "longstrider", "magic fang",
    "magic weapon", "pass without trace", "read magic", "resist energy", "speak with animals",
    "summon natures ally i",
  ],
  2: [
    "barkskin", "bears endurance", "cats grace", "cure light wounds", "detect chaos",
    "detect evil", "detect good", "detect law", "hold animal", "owls wisdom", "produce flame",
    "protection from energy", "sleep", "snare", "speak with plants", "spike growth",
    "summon natures ally ii", "wood shape",
  ],
  3: [
    "command plants", "cure moderate wounds", "darkvision", "diminish plants",
    "greater magic fang", "invisibility", "neutralize poison", "plant growth", "poison",
    "remove disease", "remove paralysis", "see invisibility", "summon natures ally iii",
    "tree shape", "water walk", "water breathing",
  ],
  4: [
    "animal growth", "commune with nature", "cure serious wounds", "freedom of movement",
    "greater magic weapon", "invisibility purge", "invisibility sphere", "nondetection",
    "tree stride",
  ],
};

const HUNTER_LIST = {
  1: [
    "alarm", "delay poison", "detect animals or plants", "detect poison", "detect snares and pits",
    "endure elements", "jump", "longstrider", "magic stone", "obscuring mist", "read magic",
    "resist energy",
  ],
  2: [
    "bears endurance", "cats grace", "cure light wounds", "fog cloud", "owls wisdom",
    "protection from energy", "snare", "soften earth and stone", "wind wall",
  ],
  3: [
    "cure moderate wounds", "darkvision", "neutralize poison", "remove disease", "resist energy",
    "stone shape", "water breathing", "water walk",
  ],
  4: [
    "air walk", "commune with nature", "control water", "cure serious wounds",
    "freedom of movement", "nondetection",
  ],
};

function buildSpellClassOverlay(byName) {
  const links = [];
  const unresolved = [];
  const aliases = {
    "bears endurance": "bear s endurance",
    "bulls strength": "bull s strength",
    "eagles splendor": "eagle s splendor",
    "owls wisdom": "owl s wisdom",
    "cats grace": "cat s grace",
    "heroes feast": "heroes feast",
    "geas quest": "geas quest",
    "blindness deafness": "blindness deafness",
    "remove blindness deafness": "remove blindness deafness",
    "summon natures ally i": "summon nature s ally i",
    "summon natures ally ii": "summon nature s ally ii",
    "summon natures ally iii": "summon nature s ally iii",
    "summon natures ally iv": "summon nature s ally iv",
    "summon natures ally v": "summon nature s ally v",
    "summon natures ally vi": "summon nature s ally vi",
    "summon natures ally vii": "summon nature s ally vii",
    "summon natures ally viii": "summon nature s ally viii",
    "summon natures ally ix": "summon nature s ally ix",
    "mass bears endurance": "mass bear s endurance",
    "mass bulls strength": "mass bull s strength",
  };

  function resolve(name) {
    const norm = normalizeSpellName(name);
    const aliased = aliases[norm] ?? norm;
    const candidates = [aliased, norm];
    // Corpus often stores "X, Greater/Lesser/Mass" rather than "greater/lesser/mass X".
    for (const key of [aliased, norm]) {
      for (const prefix of ["greater", "lesser", "mass"]) {
        if (key.startsWith(`${prefix} `)) {
          candidates.push(`${key.slice(prefix.length + 1)} ${prefix}`);
        }
      }
    }
    for (const key of candidates) {
      const slug = byName.get(key);
      if (slug) return slug;
    }
    return null;
  }

  function addList(classSlug, listByLevel) {
    for (const [levelStr, names] of Object.entries(listByLevel)) {
      const level = Number(levelStr);
      for (const name of names) {
        const slug = resolve(name);
        if (!slug) {
          unresolved.push(`${classSlug}:${level}:${name}`);
          continue;
        }
        links.push({ spell_slug: slug, class_slug: classSlug, level });
      }
    }
  }

  addList("healer-wrpg", HEALER_LIST);
  addList("priest-wrpg", PRIEST_ADD);
  addList("shaman-wrpg", SHAMAN_ADD);
  addList("druid-of-the-wild-wrpg", DRUID_ADD);
  addList("paladin-warrior-wrpg", PALADIN_LIST);
  addList("elven-ranger-wrpg", ELVEN_RANGER_LIST);
  addList("hunter-wrpg", HUNTER_LIST);

  // Warlock exclusive summon monster links
  for (let i = 1; i <= 9; i++) {
    const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"][i - 1];
    const slug = resolve(`summon monster ${roman}`);
    if (slug) links.push({ spell_slug: slug, class_slug: "warlock-wrpg", level: i });
    else unresolved.push(`warlock-wrpg:${i}:summon monster ${roman}`);
  }

  return { links, unresolved };
}

// ─── Write ───────────────────────────────────────────────────────────────────

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
  writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${data.length} records to ${name}`);
}

const byName = loadSpellNameIndex();
const { links, unresolved } = buildSpellClassOverlay(byName);
writeFileSync(
  join(OUT_DIR, "warcraft_rpg_spell_class_links.json"),
  JSON.stringify(links, null, 2) + "\n",
  "utf-8",
);
console.log(`Wrote ${links.length} spell-class overlay links`);
if (unresolved.length) {
  console.warn(`Unresolved spell names (${unresolved.length}):`);
  for (const u of unresolved.slice(0, 40)) console.warn(" ", u);
  if (unresolved.length > 40) console.warn(`  ... and ${unresolved.length - 40} more`);
}

console.log("Done.");
