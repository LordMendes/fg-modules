import type { ArmorAbility, WeaponAbility } from "../../types";

export const CAR_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "car-spellblade",
    name: "Spellblade",
    scope: "melee",
    source: "CAr",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "Allows the wielder to apply a touch spell through the weapon on a successful melee attack.",
    minCasterLevel: 8,
    dndtoolsSlug: "spellblade-506",
  },
  {
    id: "car-spellstrike",
    name: "Spellstrike",
    scope: "melee",
    source: "CAr",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "Allows the wielder to channel a touch spell through the weapon as a free action when making a melee attack.",
    minCasterLevel: 8,
  },
  {
    id: "car-skillful",
    name: "Skillful",
    scope: "melee",
    source: "CAr",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "Can be wielded without penalty by a character not proficient with it. Wielder's BAB improves to at least 3/4 level when attacking with this weapon.",
    minCasterLevel: 11,
    dndtoolsSlug: "skillful-506",
  },
];

export const CAR_ARMOR_ABILITIES: ArmorAbility[] = [
  {
    id: "car-arcane-spell-power",
    name: "Arcane spell power",
    source: "CAr",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "Increases the effective caster level of the wearer's arcane spells by +1 (maximum +5 total from all sources).",
    notes: "Armor and shields only.",
    minCasterLevel: 9,
  },
];
