import { createBlankInventoryRow } from "@/lib/pc-planner/inventoryItem";
import type { AttackerInput, DamageStatisticInput, TargetInput } from "./types";

export const DEFAULT_ATTACKER: AttackerInput = {
  bab: 6,
  str: 16,
  dex: 12,
  sizeMod: 0,
  powerAttack: 0,
  meleeMisc: 0,
  rangedMisc: 0,
  feats: [],
};

export const DEFAULT_TARGET: TargetInput = {
  acMin: 10,
  acMax: 40,
  dr: [],
};

export const DEFAULT_WEAPON = (): DamageStatisticInput["weapon"] => ({
  ...createBlankInventoryRow(),
  name: "Longsword",
  kind: "weapon",
  damageM: "1d8",
  damageS: "1d6",
  critical: "19-20/x2",
  damageType: "S",
  handed: "one",
  weaponHand: "main",
  equipped: true,
});

export const DEFAULT_WEAPON_B = (): DamageStatisticInput["weapon"] => ({
  ...createBlankInventoryRow(),
  name: "Greatsword",
  kind: "weapon",
  damageM: "2d6",
  damageS: "1d10",
  critical: "19-20/x2",
  damageType: "S",
  handed: "two",
  weaponHand: "main",
  equipped: true,
});

export const DEFAULT_DAMAGE_STATISTIC_INPUT: DamageStatisticInput = {
  attacker: DEFAULT_ATTACKER,
  weapon: DEFAULT_WEAPON(),
  target: DEFAULT_TARGET,
};

export const SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: "Fine (−4)", value: -4 },
  { label: "Diminutive (−3)", value: -3 },
  { label: "Tiny (−2)", value: -2 },
  { label: "Small (−1)", value: -1 },
  { label: "Medium (0)", value: 0 },
  { label: "Large (+1)", value: 1 },
  { label: "Huge (+2)", value: 2 },
  { label: "Gargantuan (+3)", value: 3 },
  { label: "Colossal (+4)", value: 4 },
];

export const DR_BYPASS_OPTIONS: { value: import("./types").DrBypassOption; label: string }[] =
  [
    { value: "-", label: "None (−)" },
    { value: "magic", label: "Magic" },
    { value: "adamantine", label: "Adamantine" },
    { value: "silver", label: "Silver" },
    { value: "cold iron", label: "Cold iron" },
    { value: "slashing", label: "Slashing" },
    { value: "piercing", label: "Piercing" },
    { value: "bludgeoning", label: "Bludgeoning" },
    { value: "good", label: "Good" },
    { value: "evil", label: "Evil" },
    { value: "lawful", label: "Lawful" },
    { value: "chaotic", label: "Chaotic" },
  ];
