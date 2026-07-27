import type { WeaponAbility } from "../../types";

export const CC_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cc-righteous",
    name: "Righteous",
    scope: "both",
    source: "CC",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "Good-aligned weapon: +2d6 damage against evil targets. Evil wielder gains one negative level while wielding.",
    notes: "Similar to holy but from Complete Champion.",
    minCasterLevel: 7,
  },
];
