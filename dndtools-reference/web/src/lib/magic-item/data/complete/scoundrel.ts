import type { ArmorAbility, WeaponAbility } from "../../types";

export const CS_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cs-lucky",
    name: "Lucky",
    scope: "both",
    source: "CS",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "Once per day, the wielder can reroll a failed attack roll as a free action.",
    minCasterLevel: 8,
  },
];

export const CS_ARMOR_ABILITIES: ArmorAbility[] = [
  {
    id: "cs-lucky",
    name: "Lucky",
    source: "CS",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "Once per day, the wearer can reroll a failed saving throw as a free action.",
    minCasterLevel: 8,
  },
];
