#!/usr/bin/env node
/**
 * Generates supplemental JSON for Warcraft: The Roleplaying Game (2003, WW17200).
 * Source of truth for WRPG supplemental records. Run:
 *   node scripts/build-warcraft-rpg-data.mjs
 *
 * Page numbers are printed book pages (PDF page ≈ book page + 3).
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

// ─── Classes ─────────────────────────────────────────────────────────────────

function cls(slug, name, opts = {}) {
  const b = base(slug, name, opts.page);
  const isPrestige = Boolean(opts.prestige);
  const descHtml = html(opts.description ?? "");
  const reqHtml = opts.requirements ? html(opts.requirements) : null;
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
    description_html: descHtml,
    description_text: text(descHtml),
    requirements_html: reqHtml,
    requirements_text: reqHtml ? text(reqHtml) : null,
    advancement_html: opts.advancement ? `<table>${opts.advancement}</table>` : null,
    advancement_text: opts.advancementText ?? null,
  };
}

const fighterBonusFeats = [
  a("/feats/butt-strike-wrpg", "Pistol Whip"),
  a("/feats/war-tongue-wrpg", "Battle Language"),
  a("/feats/point-blank-shot-no-aoo-wrpg", "Close Shot"),
  a("/feats/defender-wrpg", "Defend"),
  a("/feats/expert-rider-wrpg", "Expert Rider"),
  a("/feats/rapid-reload-wrpg", "Lightning Reload"),
  a("/feats/mounted-elite-sharpshooter-wrpg", "Mounted Sharpshooter"),
  a("/feats/storm-arrow-wrpg", "Storm Bolt"),
  a("/feats/skilled-shot-wrpg", "Trick Shot"),
].join(", ");

const classes = [
  cls("barbarian-wrpg", "Barbarian (Warcraft)", {
    page: 55,
    hitDie: "d12",
    skillPoints: "4 + Int",
    skills: [sk.climb, sk.intimidate, sk.jump, sk.listen, sk.survival, sk.swim, sk.knowMilitary],
    description: `Uses the PHB barbarian. Affiliation: any. ${a("/skills/knowledge-military-tactics", "Knowledge (military tactics)")} is a class skill. ${a("/races/orc-wrpg", "Orc")} barbarians may rage one extra time per day (stacks with racial battle rage).`,
  }),
  cls("fighter-wrpg", "Fighter (Warcraft)", {
    page: 55,
    hitDie: "d10",
    skillPoints: "2 + Int",
    skills: [sk.climb, sk.craft, sk.handleAnimal, sk.intimidate, sk.jump, sk.ride, sk.swim, sk.knowMilitary],
    description: `Uses the PHB fighter. Affiliation: any. ${a("/skills/knowledge-military-tactics", "Knowledge (military tactics)")} is a class skill. Bonus feat list expands to include: ${fighterBonusFeats}, plus Bash and Sunder Armor from the WRPG feat chapter.`,
  }),
  cls("rogue-wrpg", "Rogue (Warcraft)", {
    page: 56,
    hitDie: "d6",
    skillPoints: "8 + Int",
    description: `Uses the PHB rogue. Affiliation: any. Gains ${a("/skills/use-technological-device", "Use Technological Device")} as a class skill.`,
  }),
  cls("sorcerer-wrpg", "Sorcerer (Warcraft)", {
    page: 56,
    hitDie: "d4",
    skillPoints: "2 + Int",
    description: `Uses the PHB sorcerer with Warcraft spell bans: no summon monster I–IX or planar binding (those belong to the ${a("/classes/warlock-wrpg", "warlock")}); many necromancy spells are restricted to the Necromancer (Alliance & Horde Compendium). See ${a("/spells/warcraft-cosmology-wrpg", "Warcraft Cosmology")}. Affiliation: any. Night elves who take sorcerer levels become high elves.`,
  }),
  cls("wizard-wrpg", "Wizard (Warcraft)", {
    page: 57,
    hitDie: "d4",
    skillPoints: "2 + Int",
    description: `Uses the PHB wizard with the same summoning/necromancy bans as the ${a("/classes/sorcerer-wrpg", "Warcraft sorcerer")}. Affiliation: any. A ${a("/races/night-elf-wrpg", "night elf")} who becomes a wizard is stripped of night elf heritage and treated as a ${a("/races/high-elf-wrpg", "high elf")}.`,
  }),
  cls("healer-wrpg", "Healer", {
    page: 58,
    hitDie: "d8",
    skillPoints: "4 + Int",
    skills: [sk.bluff, sk.concentration, sk.craft, sk.diplomacy, sk.gatherInfo, sk.handleAnimal, sk.heal, sk.knowArcana, sk.knowReligion, sk.listen, sk.profession, sk.senseMotive, sk.speakLanguage, sk.spellcraft, sk.spot],
    description: `New core divine caster (Wis; prepared). Hit Die d8; 4 skill points. Proficient with simple weapons and light armor. Spontaneous cure (good) or inflict (evil); neutral chooses at creation. Gains Healing (good) or Evil (evil) domain power at +1 caster level but no extra domain slot; no turn undead. Brew Potion at 1st; bonus item-creation/metamagic/Spell Focus feats at 5/10/15/20. Spell list includes ${a("/spells/healing-rain-wrpg", "healing rain")}, ${a("/spells/death-coil-wrpg", "death coil")}, ${a("/spells/moon-glaive-spell-wrpg", "moonglaive")}, ${a("/spells/rejuvenation-wrpg", "rejuvenation")}, ${a("/spells/second-soul-wrpg", "second soul")}, and ${a("/spells/touch-of-life-wrpg", "touch of life")}.`,
  }),
  cls("scout-wrpg", "Scout", {
    page: 61,
    hitDie: "d8",
    skillPoints: "6 + Int",
    skills: [sk.climb, sk.craft, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.search, sk.spot, sk.survival, sk.swim, sk.useRope],
    description: `New core wilderness warrior (favored class of ${a("/races/night-elf-wrpg", "night elves")}). Hit Die d8; 6 skill points; good Fort/Ref. Simple and martial weapons; light and medium armor and shields. Track and nature sense at 1st; wild healing at 2nd; woodland stride, trackless step, uncanny dodge, trap sense, swift tracker, venom immunity, evasion; spell-like abilities include locate object (6th), locate creature (11th), commune with nature (13th), find the path (16th), and wind walk (20th).`,
  }),
  cls("tinker-wrpg", "Tinker", {
    page: 63,
    hitDie: "d6",
    skillPoints: "8 + Int",
    skills: [sk.appraise, sk.concentration, sk.craft, sk.decipher, sk.disableDevice, sk.forgery, sk.gatherInfo, sk.knowArchEng, sk.openLock, sk.profession, sk.search, sk.useMagic, sk.useTech],
    description: `New core technological expert (favored class of ${a("/races/goblin-wrpg", "goblins")}). Hit Die d6; 8 skill points; simple weapons. Bonus Technology feats at 1/5/10/15/20 (including ${a("/feats/create-firearms-wrpg", "Build Firearms")}, ${a("/feats/create-siege-engines-wrpg", "Build Siege Weapons")}, ${a("/feats/create-small-devices-wrpg", "Build Small Devices")}, ${a("/feats/create-vehicles-wrpg", "Build Vehicles")}). Scavenge and jury-rig devices; bomb-bouncing; coolness under fire; fire resistance progression; evasion/improved evasion.`,
  }),
  cls("beastmaster-wrpg", "Beastmaster", {
    page: 66,
    prestige: true,
    hitDie: "d12",
    skillPoints: "4 + Int",
    skills: [sk.climb, sk.craft, sk.handleAnimal, sk.heal, sk.intimidate, sk.jump, sk.knowNature, sk.spot, sk.survival, sk.swim],
    requirements: `Affiliation Horde or night elf; ${a("/skills/handle-animal", "Handle Animal")} 5 ranks; ${a("/skills/survival", "Survival")} 8 ranks; Animal Affinity; Toughness.`,
    description: `Horde or night elf animal companion prestige class. Full BAB; d12 HD. Animal companion and wild empathy; animal friendship; empathic link; natural weaponry; speak with animals; magic fang progression; scry on companion.`,
  }),
  cls("druid-of-the-wild-wrpg", "Druid of the Wild", {
    page: 69,
    prestige: true,
    hitDie: "d8",
    skillPoints: "4 + Int",
    skills: [sk.concentration, sk.craft, sk.handleAnimal, sk.heal, sk.hide, sk.knowNature, sk.profession, sk.survival, sk.swim],
    requirements: `Race night elf or tauren; non-evil; Knowledge (nature) 5 ranks; ${a("/skills/survival", "Survival")} 5 ranks; able to cast 3rd-level divine spells.`,
    description: `Night elf/tauren nature prestige class. +1 divine caster level each class level; spontaneous summon nature's ally. Wild shape (storm crow → stag → nightsaber → dire bear → treant); green sleep; woodland stride; nature sense; trackless step; venom immunity; timeless body; dreamwalking to the Emerald Dream. Spells include ${a("/spells/roar-wrpg", "roar")}, ${a("/spells/thorns-shield-wrpg", "thorn shield")}, and ${a("/spells/force-of-nature-wrpg", "force of nature")}.`,
  }),
  cls("elven-ranger-wrpg", "Elven Ranger", {
    page: 73,
    prestige: true,
    hitDie: "d8",
    skillPoints: "4 + Int",
    skills: [sk.climb, sk.concentration, sk.craft, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.spot, sk.survival, sk.swim, sk.useRope],
    requirements: `Elf (high or night); Alliance; BAB +5; Knowledge (nature) 6 ranks; ${a("/skills/survival", "Survival")} 6 ranks; Point Blank Shot; Track.`,
    description: `Alliance elven archery prestige class (high elf ranger / night elf sentinel). Own divine spell list (Wis). +10 ft. bow/crossbow range increment per level; favored enemy; Rapid Shot; woodland stride; keen arrows; Manyshot; anticipation; arrow cleave. Spell list includes ${a("/spells/sentinel-wrpg", "sentinel")}.`,
  }),
  cls("gladiator-wrpg", "Gladiator", {
    page: 77,
    prestige: true,
    hitDie: "d10",
    skillPoints: "2 + Int",
    skills: [sk.bluff, sk.climb, sk.craft, sk.intimidate, sk.jump, sk.knowMilitary, sk.perform, sk.senseMotive, sk.swim],
    requirements: `Any affiliation; BAB +5; ${a("/skills/bluff", "Bluff")} 2 ranks; ${a("/skills/intimidate", "Intimidate")} 5 ranks; Cleave; Power Attack.`,
    description: `Arena champion (Alliance gladiator / Horde blademaster). Full BAB; d10 HD. Supreme cleave; command aura; two-handed mastery; strike like the wind (invisibility); critical strike; maximum damage; mirror image; blade whirlwind.`,
  }),
  cls("horde-assassin-wrpg", "Horde Assassin", {
    page: 79,
    prestige: true,
    hitDie: "d6",
    skillPoints: "4 + Int",
    skills: [sk.balance, sk.bluff, sk.climb, sk.craft, sk.disableDevice, sk.disguise, sk.escapeArtist, sk.hide, sk.intimidate, sk.jump, sk.listen, sk.moveSilently, sk.openLock, sk.profession, sk.search, sk.senseMotive, sk.spot, sk.swim, sk.tumble, sk.useRope],
    requirements: `Non-good; Horde only; ${a("/skills/hide", "Hide")} 8 ranks; ${a("/skills/move-silently", "Move Silently")} 8 ranks.`,
    description: `Horde-only prestige class using DMG assassin mechanics (death attack, sneak attack, poison use, spells) with no further deviations listed.`,
  }),
  cls("hunter-wrpg", "Hunter", {
    page: 80,
    prestige: true,
    hitDie: "d8",
    skillPoints: "4 + Int",
    skills: [sk.climb, sk.concentration, sk.craft, sk.handleAnimal, sk.heal, sk.hide, sk.jump, sk.knowMilitary, sk.knowNature, sk.listen, sk.moveSilently, sk.profession, sk.spot, sk.survival, sk.swim],
    requirements: `Horde; BAB +5; ${a("/skills/survival", "Survival")} 8 ranks; Track; Weapon Focus (any melee or thrown).`,
    description: `Horde skirmisher prestige class with divine spells (Wis). Favored terrain; Weapon Specialization; +5 ft. thrown range increment per level; woodland stride; keen chosen weapon; Combat Reflexes; camouflage; swift tracker; improved critical multiplier.`,
  }),
  cls("infiltrator-wrpg", "Infiltrator", {
    page: 83,
    prestige: true,
    hitDie: "d6",
    skillPoints: "6 + Int",
    skills: [sk.appraise, sk.balance, sk.bluff, sk.climb, sk.craft, sk.decipher, sk.diplomacy, sk.disguise, sk.escapeArtist, sk.forgery, sk.gatherInfo, sk.hide, sk.intimidate, sk.jump, sk.listen, sk.moveSilently, sk.openLock, sk.perform, sk.profession, sk.search, sk.senseMotive, sk.sleightOfHand, sk.speakLanguage, sk.spot, sk.swim, sk.tumble, sk.useMagic, sk.useTech, sk.useRope],
    requirements: `Alliance; ${a("/skills/bluff", "Bluff")} 8 ranks; ${a("/skills/disguise", "Disguise")} 8 ranks.`,
    description: `Alliance espionage prestige class. Poor BAB; canny defense; smooth talker; connections; uncanny dodge; flawless disguise; suggestion/mass suggestion; slippery mind; hide in plain sight; dominate monster.`,
  }),
  cls("mounted-combatant-wrpg", "Mounted Warrior", {
    page: 85,
    prestige: true,
    hitDie: "d10",
    skillPoints: "2 + Int",
    skills: [sk.climb, sk.craft, sk.diplomacy, sk.handleAnimal, sk.jump, sk.knowMilitary, sk.profession, sk.ride, sk.swim],
    requirements: `Any affiliation; BAB +5; ${a("/skills/ride", "Ride")} 8 ranks (warhorse/nightsaber Alliance, or dire wolf Horde); Mounted Combat.`,
    description: `Elite cavalry prestige class (knight / huntress / raider). Full BAB; special mount; mounted expertise; bonus mount feats; improved Mounted Combat; mounted command; woodland ride; shock charge. Synergizes with ${a("/feats/expert-rider-wrpg", "Expert Rider")} and ${a("/feats/mounted-elite-sharpshooter-wrpg", "Mounted Sharpshooter")}.`,
  }),
  cls("paladin-warrior-wrpg", "Paladin Warrior", {
    page: 88,
    prestige: true,
    hitDie: "d10",
    skillPoints: "2 + Int",
    skills: [sk.climb, sk.concentration, sk.craft, sk.diplomacy, sk.handleAnimal, sk.heal, sk.jump, sk.knowMilitary, sk.knowPlanes, sk.knowReligion, sk.knowUndead, sk.profession, sk.ride, sk.swim],
    requirements: `Human or Ironforge dwarf; any good; Alliance; BAB +5; ${a("/skills/diplomacy", "Diplomacy")} 5 ranks; ${a("/skills/knowledge-religion", "Knowledge (religion)")} 3 ranks; Weapon Focus (warhammer); initiation quest.`,
    description: `Alliance Silver Hand prestige class. Full BAB; divine spells (Wis). Lay on hands; detect/turn undead and outsiders; aura of courage; smite undead/outsider; divine health/grace; banishing strike; power turning. Must uphold a code of honor.`,
  }),
  cls("priest-wrpg", "Priest", {
    page: 91,
    prestige: true,
    hitDie: "d8",
    skillPoints: "2 + Int",
    skills: [sk.concentration, sk.craft, sk.diplomacy, sk.gatherInfo, sk.heal, sk.knowArcana, sk.knowReligion, sk.profession, sk.spellcraft],
    requirements: `Non-evil; Alliance; ${a("/skills/knowledge-religion", "Knowledge (religion)")} 6 ranks; able to cast 3rd-level divine spells.`,
    description: `Alliance divine prestige class. +1 divine caster level each level; spontaneous cure; Healing and Protection domains. Divine defense vs. necromancy; turn undead; divine urge. High-level list includes ${a("/spells/falling-star-wrpg", "starfall")}.`,
  }),
  cls("shaman-wrpg", "Shaman", {
    page: 93,
    prestige: true,
    hitDie: "d8",
    skillPoints: "2 + Int",
    skills: [sk.climb, sk.concentration, sk.craft, sk.heal, sk.intimidate, sk.jump, sk.knowNature, sk.knowReligion, sk.profession, sk.spellcraft, sk.survival, sk.swim],
    requirements: `Any affiliation; BAB +4; able to cast 1st-level divine spells.`,
    description: `Elemental/spirit prestige class. +1 divine caster level each level; spontaneous cure. Weather sense; elemental companion; elemental mastery. Spell list includes ${a("/spells/stasis-trap-wrpg", "stasis trap")}, ${a("/spells/ice-armor-wrpg", "frost armor")}, ${a("/spells/bloodlust-wrpg", "bloodlust")}, ${a("/spells/immolation-wrpg", "immolation")}, ${a("/spells/healing-totem-wrpg", "healing ward")}, and ${a("/spells/serpent-totem-wrpg", "serpent ward")}.`,
  }),
  cls("warlock-wrpg", "Warlock", {
    page: 95,
    prestige: true,
    hitDie: "d4",
    skillPoints: "2 + Int",
    skills: [sk.bluff, sk.concentration, sk.craft, sk.diplomacy, sk.intimidate, sk.knowArcana, sk.profession, sk.spellcraft],
    requirements: `Any evil; any affiliation; able to cast 3rd-level arcane spells; Conjuration not a forbidden school.`,
    description: `Demon-pact prestige class. +1 arcane caster level each level. Enhanced conjuring (forbid additional schools; extra conjuration slots); demonic companion; improved planar ally; Augment Summoning; extended summoning; demon mastery. Exclusive access to summon monster I–IX and planar binding (see ${a("/spells/warcraft-cosmology-wrpg", "Warcraft Cosmology")}).`,
  }),
];

// ─── Feats (pp. 106–115) ─────────────────────────────────────────────────────

function feat(slug, name, type, description, benefit, prereq = null, page = null) {
  const b = base(slug, name, page);
  const descHtml = html(description);
  const benHtml = html(benefit);
  const preHtml = prereq ? html(prereq) : null;
  return {
    ...b,
    type,
    index: { ...b.index, type, description_snippet: description.slice(0, 120) },
    description_html: descHtml,
    description_text: text(descHtml),
    benefit_html: benHtml,
    benefit_text: text(benHtml),
    prerequisite_html: preHtml,
    prerequisite_text: preHtml ? text(preHtml) : null,
  };
}

const feats = [
  feat("mounted-elite-sharpshooter-wrpg", "Mounted Sharpshooter", "General", "You fire firearms accurately from the saddle.", "You take no penalty on ranged attacks with firearms while mounted (normally −4). You still need Ride checks to control the mount.", `Dex 13, ${a("/skills/ride", "Ride")} skill, ${a("/feats/expert-rider-wrpg", "Expert Rider")}`, 112),
  feat("expert-rider-wrpg", "Expert Rider", "General", "You are an accomplished rider.", `All ${a("/skills/ride", "Ride")} task DCs are reduced by 2. You may take 10 on Ride checks for mounted combat maneuvers even when threatened or distracted.`, `Dex 13, ${a("/skills/ride", "Ride")} skill`, 111),
  feat("bareback-riding-wrpg", "Ride Bareback", "General", "You ride without saddle or bridle.", `You take no −5 ${a("/skills/ride", "Ride")} penalty for riding without a saddle or bridle.`, `${a("/skills/ride", "Ride")} skill`, 113),
  feat("butt-strike-wrpg", "Pistol Whip", "General", "You use a firearm as a melee weapon without breaking it.", "Treat a firearm as a melee weapon without breaking it: Small as a light hammer, Medium as a club, Large as a warhammer.", null, 112),
  feat("defender-wrpg", "Defend", "General", "You share your shield's protection.", "While using a shield, allies within 5 ft. without a shield gain your shield's AC bonus. Allies within 5 ft. who also have shields gain +2 circumstance AC (does not stack with itself).", "Shield Proficiency, base attack bonus +2", 109),
  feat("war-tongue-wrpg", "Battle Language", "General", "You coordinate allies with battle signals.", `Aid another for an ally who also has this feat within 100 ft. and line of sight as a move action. DC 15 ${a("/skills/bluff", "Bluff")}: +2 circumstance to the ally's next attack or AC vs. the next attack.`, `${a("/skills/bluff", "Bluff")} 3 ranks`, 107),
  feat("rapid-reload-wrpg", "Lightning Reload", "General", "You reload firearms faster.", "A firearm reload that is a standard action becomes a move action; reloads longer than 1 round take half time.", "Dex 13, Exotic Weapon Proficiency (firearms)", 111),
  feat("storm-arrow-wrpg", "Storm Bolt", "General", "You hurl a stunning bludgeon.", `Before a full attack with a ranged bludgeoning weapon, declare Storm Bolt. A hit deals nonlethal damage; Fortitude save (DC 10 + damage rolled) or stunned 1 round. Once/round; ≤ once/level/day.`, `Str 13, Bash, Power Attack, base attack bonus +4`, 114),
  feat("point-blank-shot-no-aoo-wrpg", "Close Shot", "General", "You fire in melee without provoking.", "You can fire a ranged weapon without provoking attacks of opportunity.", "Dex 13, Dodge, Point Blank Shot, Precise Shot, base attack bonus +4", 108),
  feat("skilled-shot-wrpg", "Trick Shot", "General", "You ricochet ranged attacks.", "Bounce a ranged attack off one surface (moonglaive: up to two). Cover is measured from the final approach; range penalties use full path distance.", "Dex 13", 114),
  feat("exotic-weapon-thorium-wrpg", "Exotic Weapon Proficiency (Thorium Weapons)", "General", "You are trained with thorium weapons.", "You are proficient with a chosen thorium weapon and add half your Strength bonus to its damage (one-handed 1½× Str, two-handed 2× Str).", "Proficiency with the non-thorium version of the weapon", 110),
  feat("dedicated-leadership-wrpg", "Devoted Leadership", "General", "Your followers fight harder near you.", "Followers within (5 ft. × Cha bonus) gain +2 morale bonus to AC and +1 morale bonus on all saves for up to your character level rounds/day (max 20).", "Cha 13, Wis 13, Leadership", 110),
  feat("enduring-leadership-wrpg", "Enduring Leadership", "General", "Your followers surge into battle.", "Once/day before an encounter, as a free action, followers gain +4 morale bonus on Initiative and +10 ft. speed for that combat. If you or they rage, those who rage are not fatigued afterward.", "Endurance, Leadership", 110),
  feat("precise-leadership-wrpg", "Precision Leadership", "General", "Your followers concentrate fire.", "On a ranged attack, each follower gains +1 attack per 5 followers attacking the same target at once (same weapon kind, within 10 ft. × Cha bonus of you, target within 100 ft.). Damage from all hits is totaled before DR.", "Leadership, Point Blank Shot", 112),
  feat("totem-follower-wrpg", "Follower of the Totem", "General", "You draw strength from ancestral totems.", "Once/day as a free action, gain a +2 sacred bonus to any one ability score for 1d6+1 rounds. Tauren with this feat are treated as having Exotic Weapon Proficiency (tauren totem).", "Wis 13, orc or tauren", 111),
  feat("drums-of-courage-wrpg", "Drums of Courage", "General", "War drums inspire your tribe.", "DC 20 Perform (percussion): tribe warriors who hear the drums gain +1 morale bonus on attack, damage, and Will saves while the drums play and for 5 rounds after.", "Perform (percussion instruments) 5 ranks", 110),
  feat("block-magic-wrpg", "Block Spell", "Metamagic", "You counter spells with raw magic energy.", `When targeted by a spell, make a ${a("/skills/spellcraft", "Spellcraft")} check (DC 15 + spell level) to identify and counter it by spending a spell slot at least 1 level higher.`, `Iron Will, ${a("/feats/control-magic-energy-wrpg", "Magic Energy Control")}, caster level 5th`, 107),
  feat("control-magic-energy-wrpg", "Magic Energy Control", "Metamagic", "You prepare spells with greater efficiency.", "Daily spell preparation takes half the normal time. A high elf with this feat no longer suffers magic-addiction effects during preparation (prepares in normal time, not half).", "Iron Will", 111),
  feat("duplicate-spell-wrpg", "Mirror Spell", "Metamagic", "You cast a spell twice at once.", "When casting an arcane spell, treat it as cast twice (both resolve simultaneously). Spend an additional spell slot of the same level or higher.", `Iron Will, ${a("/feats/control-magic-energy-wrpg", "Magic Energy Control")}, caster level 3rd`, 112),
  feat("deflect-magic-wrpg", "Deflect Spell", "Metamagic", "You redirect a countered spell.", `After successfully countering a spell, deflect it to any target as if you had cast it.`, `${a("/feats/block-magic-wrpg", "Block Spell")}, Iron Will, ${a("/feats/control-magic-energy-wrpg", "Magic Energy Control")}, ${a("/feats/duplicate-spell-wrpg", "Mirror Spell")}, ${a("/feats/reflect-magic-wrpg", "Reflect Spell")}, caster level 9th`, 109),
  feat("reflect-magic-wrpg", "Reflect Spell", "Metamagic", "You bounce a spell back at its caster.", `After successfully countering a spell that targeted you, reflect it back at the caster.`, `${a("/feats/block-magic-wrpg", "Block Spell")}, Iron Will, ${a("/feats/control-magic-energy-wrpg", "Magic Energy Control")}, ${a("/feats/duplicate-spell-wrpg", "Mirror Spell")}, caster level 7th`, 113),
  feat("create-siege-engines-wrpg", "Build Siege Weapons", "Technology", "You craft and sabotage siege engines.", `+2 ${a("/skills/craft", "Craft")} (technological device) for catapults, cannons, mortars, and other siege weapons; +2 technological limit. You may sabotage Large or larger tech devices.`, null, 108),
  feat("create-firearms-wrpg", "Build Firearms", "Technology", "You craft firearms.", `+2 ${a("/skills/craft", "Craft")} (technological device) when crafting firearms; +2 technological limit for firearms. Once/week, with a firearm you built, declare an automatic critical threat (still confirm).`, null, 107),
  feat("create-small-devices-wrpg", "Build Small Devices", "Technology", "You craft Tiny and smaller devices.", `+2 ${a("/skills/craft", "Craft")} (technological device) for Tiny/Diminutive/Fine devices; +2 technological limit. You may build concealed devices (Spot and Use Technological Device DC 10 + your Craft modifier).`, "Dex 13", 108),
  feat("create-vehicles-wrpg", "Build Vehicles", "Technology", "You craft and operate vehicles.", `+2 ${a("/skills/craft", "Craft")} (technological device) and ${a("/skills/use-technological-device", "Use Technological Device")} for vehicles; +2 technological limit. Once/day, double a vehicle's speed for 1d6 minutes.`, null, 108),
  feat("emergency-repair-wrpg", "Emergency Repair", "Technology", "You force a broken device to work briefly.", `Full-round action, DC 20 ${a("/skills/craft", "Craft")} (mechanical object): a malfunctioning or broken tech device works for 1 hour, then stops until normally repaired. Natural 20 = permanent repair.`, `Wis 13, ${a("/feats/delay-malfunction-wrpg", "Delay Malfunction")}`, 110),
  feat("delay-malfunction-wrpg", "Delay Malfunction", "Technology", "You keep a failing device running a few rounds.", `On malfunction, DC 15 ${a("/skills/craft", "Craft")} (technological device): the device works normally for 1d3 rounds. Natural 20 averts the malfunction entirely.`, null, 109),
  feat("use-land-vehicles-wrpg", "Vehicle Proficiency (Land)", "Technology", "You operate land vehicles.", `You can operate land vehicles with ${a("/skills/use-technological-device", "Use Technological Device")} without the −4 nonproficiency penalty.`, null, 114),
  feat("use-water-vehicles-wrpg", "Vehicle Proficiency (Water)", "Technology", "You operate water vehicles.", `You can operate water vehicles with ${a("/skills/use-technological-device", "Use Technological Device")} without the −4 nonproficiency penalty.`, null, 114),
  feat("use-air-vehicles-wrpg", "Vehicle Proficiency (Air)", "Technology", "You operate air vehicles.", `You can operate air vehicles with ${a("/skills/use-technological-device", "Use Technological Device")} without the −4 nonproficiency penalty.`, null, 114),
  feat("vascular-materials-wrpg", "Scavenge Materials", "Technology", "You build with scavenged parts.", `Build using raw materials worth 1/10 the item's market price; ${a("/skills/craft", "Craft")} DC +10.`, "Craft 8 ranks", 113),
  feat("pulverize-wrpg", "Pulverize", "Tauren", "You slam a totem to knock foes down.", `Full attack with a tauren totem: strike the ground (roll damage for DC only); creatures within 20 ft. Reflex save (DC 10 + damage) or fall prone. Once/round; ≤ (1 + Wis bonus)/day.`, `Wis 13, Exotic Weapon Proficiency (tauren totem), ${a("/feats/totem-follower-wrpg", "Follower of the Totem")}`, 112),
];

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
  spell("sentinel-wrpg", "Sentinel", "Divination", 3, [healer(3)], "Creates a visible Diminutive bird sensor on a tree for 1 hour/level. Concentrate to see and hear through it at any distance. Bird Hide +7, AC 9, hp 1.", 166, { range: "Close", duration: "1 hour/level", save: "None", sr: "No", effect: "Magical sensor", components: "V, S, M" }),
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

console.log("Done.");
