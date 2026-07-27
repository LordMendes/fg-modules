import type { WeaponAbility } from "../../types";

export const CM_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cm-potent",
    name: "Potent",
    scope: "both",
    source: "CM",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "When casting a spell through the weapon (such as with spell storing), the save DC increases by +1.",
    minCasterLevel: 9,
  },
];
