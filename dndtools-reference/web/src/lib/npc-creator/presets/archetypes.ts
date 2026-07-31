import type { ArchetypePreset } from "../types";

/**
 * Role / concept kits without class level.
 * Pair with a Level template for HD, BAB, saves, and CR.
 */
export const ARCHETYPE_PRESETS: ArchetypePreset[] = [
  {
    id: "commoner",
    name: "Commoner",
    description: "Civilian baseline — average abilities, simple gear.",
    patch: {
      identity: {
        name: "Commoner",
        alignment: "Neutral",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      defense: { ac: "10" },
      offense: {
        atk: "Club +0 melee (1d6)",
        fullatk: "Club +0 melee (1d6)",
        speed: "30 ft. (6 squares)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "—",
      },
      feats: "",
      skills: "Profession (any) +4",
      languages: "Common",
      spellcasting: { enabled: false },
    },
  },
  {
    id: "guard",
    name: "Guard",
    description: "Town watch kit — scale mail, shield, longsword focus.",
    patch: {
      identity: {
        name: "Guard",
        alignment: "Lawful Neutral",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 13, dex: 12, con: 13, int: 10, wis: 11, cha: 8 },
      defense: { ac: "16 (scale mail + shield + Dex)" },
      offense: {
        atk: "Longsword melee (1d8+1/19-20) or light crossbow ranged (1d8/19-20)",
        fullatk:
          "Longsword melee (1d8+1/19-20) or light crossbow ranged (1d8/19-20)",
        speed: "20 ft. in scale mail (base 30 ft.)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "—",
      },
      feats: "Weapon Focus (longsword)",
      skills: "Climb +1, Intimidate +2, Spot +2",
      languages: "Common",
      spellcasting: { enabled: false },
    },
  },
  {
    id: "bandit",
    name: "Bandit",
    description: "Skirmisher kit — finesse, stealth skills, light armor.",
    patch: {
      identity: {
        name: "Bandit",
        alignment: "Chaotic Neutral",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 12, dex: 16, con: 12, int: 13, wis: 10, cha: 8 },
      defense: { ac: "15 (studded leather + Dex)" },
      offense: {
        atk: "Short sword melee (1d6+1/19-20) or shortbow ranged (1d6/×3)",
        fullatk:
          "Short sword melee (1d6+1/19-20) or shortbow ranged (1d6/×3)",
        speed: "30 ft. (6 squares)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "Sneak attack (see class level)",
      },
      feats: "Weapon Finesse",
      skills:
        "Disable Device, Hide, Move Silently, Open Lock, Sleight of Hand, Tumble",
      languages: "Common",
      senses: "Listen, Spot",
      spellcasting: { enabled: false },
    },
  },
  {
    id: "mage",
    name: "Mage",
    description: "Arcane scholar kit — Int focus; pair with Wizard level.",
    patch: {
      identity: {
        name: "Mage",
        alignment: "Neutral",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
      defense: { ac: "12 (Dex)" },
      offense: {
        atk: "Quarterstaff melee (1d6-1) or light crossbow ranged (1d8/19-20)",
        fullatk:
          "Quarterstaff melee (1d6-1) or light crossbow ranged (1d8/19-20)",
        speed: "30 ft. (6 squares)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "Spells",
      },
      feats: "Scribe Scroll, Spell Focus (evocation), Combat Casting",
      skills: "Concentration, Knowledge (arcana), Spellcraft",
      languages: "Common, Draconic, Elven",
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Wizard",
        dcAbility: "intelligence",
        dcMisc: 0,
        spellsetXmlOverride: "",
      },
    },
  },
  {
    id: "cleric",
    name: "Cleric",
    description: "Divine servant kit — Wis focus, breastplate; pair with Cleric level.",
    patch: {
      identity: {
        name: "Cleric",
        alignment: "Lawful Good",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 12, dex: 12, con: 14, int: 10, wis: 16, cha: 13 },
      defense: { ac: "18 (breastplate + shield + Dex)" },
      offense: {
        atk: "Morningstar melee (1d8+1) or light crossbow ranged (1d8/19-20)",
        fullatk:
          "Morningstar melee (1d8+1) or light crossbow ranged (1d8/19-20)",
        speed: "20 ft. in breastplate (base 30 ft.)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "Turn undead, spells",
      },
      feats: "Combat Casting, Weapon Focus (morningstar)",
      skills: "Concentration, Heal, Knowledge (religion)",
      languages: "Common",
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Cleric",
        dcAbility: "wisdom",
        dcMisc: 0,
        spellsetXmlOverride: "",
      },
    },
  },
  {
    id: "fighter",
    name: "Fighter",
    description: "Martial veteran kit — Str focus, breastplate; pair with Fighter level.",
    patch: {
      identity: {
        name: "Fighter",
        alignment: "Lawful Neutral",
        creatureTypeTag: "Medium humanoid (human)",
      },
      abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
      defense: { ac: "18 (breastplate + Dex + Dodge)" },
      offense: {
        atk: "Longsword melee (1d8+3/19-20) or composite longbow ranged (1d8+3/×3)",
        fullatk:
          "Longsword melee (1d8+3/19-20) or composite longbow ranged (1d8+3/×3)",
        speed: "20 ft. in breastplate (base 30 ft.)",
        spaceReach: "5 ft./5 ft.",
        specialattacks: "—",
      },
      feats:
        "Weapon Focus (longsword), Weapon Specialization (longsword), Power Attack, Cleave, Dodge",
      skills: "Climb, Jump, Intimidate",
      languages: "Common",
      spellcasting: { enabled: false },
    },
  },
];

export function getArchetypeById(id: string): ArchetypePreset | undefined {
  return ARCHETYPE_PRESETS.find((a) => a.id === id);
}
