import type { ArchetypePreset } from "../types";

/**
 * Class level templates — set HD, BAB, saves, CR, and attack bonuses.
 * Stack with an archetype (role kit) and optional monster templates.
 */
export const LEVEL_PRESETS: ArchetypePreset[] = [
  {
    id: "warrior-1",
    name: "Warrior 1",
    description: "NPC class — full BAB, good Fort.",
    patch: {
      identity: { cr: 1 / 2 },
      defense: { hp: 8, hd: "1d8", fort: 2, ref: 0, will: 0, init: 0 },
      offense: {
        babgrp: "+1",
        atk: "Weapon +1 melee",
        fullatk: "Weapon +1 melee",
      },
      spellcasting: { enabled: false, casterLevel: 1 },
    },
  },
  {
    id: "warrior-2",
    name: "Warrior 2",
    description: "NPC class — town guard tier.",
    patch: {
      identity: { cr: 1 },
      defense: { hp: 15, hd: "2d8+2", fort: 3, ref: 0, will: 0 },
      offense: {
        babgrp: "+2",
        atk: "Weapon +3 melee",
        fullatk: "Weapon +3 melee",
      },
      spellcasting: { enabled: false, casterLevel: 2 },
    },
  },
  {
    id: "warrior-3",
    name: "Warrior 3",
    description: "NPC class — experienced soldier.",
    patch: {
      identity: { cr: 2 },
      defense: { hp: 22, hd: "3d8+3", fort: 3, ref: 1, will: 1 },
      offense: {
        babgrp: "+3",
        atk: "Weapon +4 melee",
        fullatk: "Weapon +4 melee",
      },
      spellcasting: { enabled: false, casterLevel: 3 },
    },
  },
  {
    id: "fighter-1",
    name: "Fighter 1",
    description: "d10 HD, full BAB, bonus feat.",
    patch: {
      identity: { cr: 1 },
      defense: { hp: 12, hd: "1d10+2", fort: 4, ref: 1, will: 0 },
      offense: {
        babgrp: "+1",
        atk: "Weapon +3 melee",
        fullatk: "Weapon +3 melee",
      },
      spellcasting: { enabled: false, casterLevel: 1 },
    },
  },
  {
    id: "fighter-3",
    name: "Fighter 3",
    description: "Mid low-tier martial.",
    patch: {
      identity: { cr: 3 },
      defense: { hp: 28, hd: "3d10+6", fort: 5, ref: 2, will: 1 },
      offense: {
        babgrp: "+3",
        atk: "Weapon +6 melee",
        fullatk: "Weapon +6 melee",
      },
      spellcasting: { enabled: false, casterLevel: 3 },
    },
  },
  {
    id: "fighter-5",
    name: "Fighter 5",
    description: "Veteran martial — Weapon Spec tier.",
    patch: {
      identity: { cr: 5 },
      defense: { hp: 42, hd: "5d10+10", fort: 7, ref: 3, will: 2, init: 2 },
      offense: {
        babgrp: "+5",
        atk: "Longsword +9 melee (1d8+5/19-20)",
        fullatk: "Longsword +9 melee (1d8+5/19-20)",
      },
      spellcasting: { enabled: false, casterLevel: 5 },
    },
  },
  {
    id: "rogue-1",
    name: "Rogue 1",
    description: "d6 HD, 3/4 BAB, sneak attack +1d6.",
    patch: {
      identity: { cr: 1 },
      defense: { hp: 7, hd: "1d6+1", fort: 0, ref: 4, will: 0, init: 3 },
      offense: {
        babgrp: "+0",
        atk: "Weapon +3 melee (finesse)",
        fullatk: "Weapon +3 melee (finesse)",
        specialattacks: "Sneak attack +1d6",
      },
      specialqualitiesExtra: "Trapfinding",
      spellcasting: { enabled: false, casterLevel: 1 },
    },
  },
  {
    id: "rogue-2",
    name: "Rogue 2",
    description: "Evasion; sneak +1d6.",
    patch: {
      identity: { cr: 2 },
      defense: { hp: 12, hd: "2d6+2", fort: 1, ref: 6, will: 0, init: 3 },
      offense: {
        babgrp: "+1",
        atk: "Short sword +4 melee (1d6+1/19-20)",
        fullatk: "Short sword +4 melee (1d6+1/19-20)",
        specialattacks: "Sneak attack +1d6",
      },
      specialqualitiesExtra: "Evasion, trapfinding",
      spellcasting: { enabled: false, casterLevel: 2 },
    },
  },
  {
    id: "rogue-5",
    name: "Rogue 5",
    description: "Sneak +3d6; uncanny dodge.",
    patch: {
      identity: { cr: 5 },
      defense: { hp: 27, hd: "5d6+5", fort: 2, ref: 7, will: 1, init: 3 },
      offense: {
        babgrp: "+3",
        atk: "Short sword +6 melee (1d6+1/19-20)",
        fullatk: "Short sword +6 melee (1d6+1/19-20)",
        specialattacks: "Sneak attack +3d6",
      },
      specialqualitiesExtra: "Evasion, trapfinding, uncanny dodge",
      spellcasting: { enabled: false, casterLevel: 5 },
    },
  },
  {
    id: "wizard-1",
    name: "Wizard 1",
    description: "d4 HD, 1/2 BAB; slots 3/1.",
    patch: {
      identity: { cr: 1 },
      defense: { hp: 5, hd: "1d4+1", fort: 0, ref: 0, will: 2 },
      offense: {
        babgrp: "+0",
        atk: "Staff +0 melee or crossbow +2 ranged",
        fullatk: "Staff +0 melee or crossbow +2 ranged",
        specialattacks: "Spells",
      },
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Wizard",
        casterLevel: 1,
        dcAbility: "intelligence",
        slots: [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        spells: [
          { level: 0, spells: ["detect magic", "light", "read magic"] },
          { level: 1, spells: ["mage armor", "magic missile"] },
        ],
        spellsetXmlOverride: "",
      },
    },
  },
  {
    id: "wizard-5",
    name: "Wizard 5",
    description: "CL 5; slots through 3rd.",
    patch: {
      identity: { cr: 5 },
      defense: { hp: 22, hd: "5d4+5", fort: 2, ref: 2, will: 6, init: 2 },
      offense: {
        babgrp: "+2",
        atk: "Quarterstaff +1 melee (1d6-1) or light crossbow +4 ranged (1d8/19-20)",
        fullatk:
          "Quarterstaff +1 melee (1d6-1) or light crossbow +4 ranged (1d8/19-20)",
        specialattacks: "Spells",
      },
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Wizard",
        casterLevel: 5,
        dcAbility: "intelligence",
        slots: [4, 4, 3, 2, 0, 0, 0, 0, 0, 0],
        spells: [
          {
            level: 0,
            spells: ["detect magic", "light", "mage hand", "read magic"],
          },
          { level: 1, spells: ["mage armor", "magic missile", "shield"] },
          { level: 2, spells: ["invisibility", "scorching ray"] },
          { level: 3, spells: ["fireball"] },
        ],
        spellsetXmlOverride: "",
      },
    },
  },
  {
    id: "cleric-1",
    name: "Cleric 1",
    description: "d8 HD, 3/4 BAB; orisons + 1st.",
    patch: {
      identity: { cr: 1 },
      defense: { hp: 10, hd: "1d8+2", fort: 4, ref: 0, will: 4 },
      offense: {
        babgrp: "+0",
        atk: "Morningstar +1 melee",
        fullatk: "Morningstar +1 melee",
        specialattacks: "Turn undead, spells",
      },
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Cleric",
        casterLevel: 1,
        dcAbility: "wisdom",
        slots: [3, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        spells: [
          { level: 0, spells: ["detect magic", "guidance", "resistance"] },
          { level: 1, spells: ["bless", "cure light wounds"] },
        ],
        spellsetXmlOverride: "",
      },
    },
  },
  {
    id: "cleric-5",
    name: "Cleric 5",
    description: "CL 5; slots through 3rd.",
    patch: {
      identity: { cr: 5 },
      defense: { hp: 35, hd: "5d8+10", fort: 6, ref: 2, will: 7, init: 1 },
      offense: {
        babgrp: "+3",
        atk: "Morningstar +4 melee (1d8+1)",
        fullatk: "Morningstar +4 melee (1d8+1)",
        specialattacks: "Turn undead, spells",
      },
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Cleric",
        casterLevel: 5,
        dcAbility: "wisdom",
        slots: [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
        spells: [
          {
            level: 0,
            spells: [
              "detect magic",
              "guidance",
              "light",
              "read magic",
              "resistance",
            ],
          },
          {
            level: 1,
            spells: ["bless", "command", "divine favor", "shield of faith"],
          },
          { level: 2, spells: ["hold person", "silence", "spiritual weapon"] },
          { level: 3, spells: ["dispel magic", "searing light"] },
        ],
        spellsetXmlOverride: "",
      },
    },
  },
];

export function getLevelPresetById(id: string): ArchetypePreset | undefined {
  return LEVEL_PRESETS.find((a) => a.id === id);
}
