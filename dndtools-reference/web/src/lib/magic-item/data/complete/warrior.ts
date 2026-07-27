import type { Weapon, WeaponAbility } from "../../types";

export const CW_WEAPONS: Weapon[] = [
  {
    id: "maul",
    name: "Maul",
    costGp: 15,
    category: "exotic",
    kind: "melee",
    source: "CW",
  },
  {
    id: "scourge",
    name: "Scourge",
    costGp: 20,
    category: "exotic",
    kind: "melee",
    source: "CW",
  },
];

export const CW_WEAPON_ABILITIES: WeaponAbility[] = [
  {
    id: "cw-collision",
    name: "Collision",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 5 },
    description:
      "On a successful hit, deals an extra 5 points of damage in addition to the weapon's enhancement bonus.",
    notes: "Bows, crossbows, and slings bestow the extra damage upon their ammunition.",
    minCasterLevel: 12,
  },
  {
    id: "cw-corrosive",
    name: "Corrosive",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 1 },
    description: "On command, deals +1d6 acid damage on each successful hit.",
    minCasterLevel: 10,
  },
  {
    id: "cw-corrosive-burst",
    name: "Corrosive burst",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "+1d6 acid on a hit; on a critical hit or when damage exceeds the target's HP by 10+, adds +1d10 acid.",
    minCasterLevel: 12,
  },
  {
    id: "cw-dread",
    name: "Dread",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 3 },
    description:
      "On a critical hit, the target must make a Will save (DC 10 + weapon enhancement + wielder's Cha mod) or become shaken for 1 minute.",
    minCasterLevel: 12,
  },
  {
    id: "cw-furious",
    name: "Furious",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "When the wielder is raging, the weapon's enhancement bonus increases by +2 (does not stack with other enhancement increases).",
    minCasterLevel: 8,
  },
  {
    id: "cw-screaming",
    name: "Screaming",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 1 },
    description: "On a successful hit, deals +1d6 sonic damage.",
    minCasterLevel: 10,
  },
  {
    id: "cw-screaming-burst",
    name: "Screaming burst",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 2 },
    description:
      "+1d6 sonic on a hit; on a critical hit or when damage exceeds the target's HP by 10+, adds +1d10 sonic.",
    minCasterLevel: 12,
  },
  {
    id: "cw-sundering",
    name: "Sundering",
    scope: "both",
    source: "CW",
    pricing: { kind: "equivalent", bonus: 1 },
    description:
      "The wielder gains a +4 bonus on attack rolls made to sunder and on opposed attack rolls to avoid being disarmed.",
    minCasterLevel: 8,
  },
];
