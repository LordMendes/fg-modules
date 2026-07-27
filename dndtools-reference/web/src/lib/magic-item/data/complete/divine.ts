import type { WeaponAbility } from "../../types";

export const CD_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cd-sacred",
    name: "Sacred",
    scope: "both",
    source: "CD",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "Good-aligned weapon: +2d6 damage against evil targets. Evil wielder gains one negative level while wielding.",
    minCasterLevel: 7,
  },
  {
    id: "cd-profane",
    name: "Profane",
    scope: "both",
    source: "CD",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "Evil-aligned weapon: +2d6 damage against good targets. Good wielder gains one negative level while wielding.",
    minCasterLevel: 7,
  },
];
