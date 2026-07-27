import type { ArmorAbility, Weapon, WeaponAbility } from "../../types";

export const CAD_WEAPONS: Weapon[] = [
  {
    id: "barbed-dagger",
    name: "Barbed dagger",
    costGp: 35,
    category: "exotic",
    kind: "melee",
    source: "CAd",
  },
];

export const CAD_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cad-linked",
    name: "Linked",
    scope: "both",
    source: "CAd",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "When you draw this weapon, you can also draw a linked weapon as a free action (if it is available).",
    minCasterLevel: 6,
  },
  {
    id: "cad-transforming",
    name: "Transforming",
    scope: "both",
    source: "CAd",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "As a move action, the weapon transforms into another weapon of the same size category that the wielder is proficient with.",
    minCasterLevel: 6,
  },
];

export const CAD_ARMOR_ABILITIES: ArmorAbility[] = [
  {
    id: "cad-guerrilla",
    name: "Guerrilla",
    source: "CAd",
    pricing: { kind: "flat", gp: 500 },
    description:
      "Reduces the armor check penalty by 1 in natural terrain (forest, hills, mountains, etc.).",
    notes: "Light armor only.",
    minCasterLevel: 5,
  },
];
