import type { FeatEntry, InventoryRow, PcPlanState } from "@/lib/pc-planner/types";
import type { DamageType } from "@/lib/combat/types";

export type CatalogWeaponSummary = {
  slug: string;
  name: string;
  category: string | null;
  handed: string | null;
};

export type DrBypassOption =
  | "-"
  | "magic"
  | "adamantine"
  | "silver"
  | "cold iron"
  | "slashing"
  | "piercing"
  | "bludgeoning"
  | "good"
  | "evil"
  | "lawful"
  | "chaotic";

export type DrEntry = {
  id: string;
  amount: number;
  bypass: DrBypassOption;
};

export type AttackerInput = {
  bab: number;
  str: number;
  dex: number;
  sizeMod: number;
  powerAttack: number;
  meleeMisc: number;
  rangedMisc: number;
  feats: FeatEntry[];
};

export type TargetInput = {
  acMin: number;
  acMax: number;
  dr: DrEntry[];
};

export type DamageStatisticInput = {
  attacker: AttackerInput;
  weapon: InventoryRow;
  target: TargetInput;
  /** Full PC state when loaded from PC Planner (for item bonuses and feats). */
  pcSource?: PcPlanState | null;
};

export type AcDamageRow = {
  ac: number;
  hitChance: number;
  standardDamage: number;
  fullAttackDamage: number;
};

export type DamageStatisticResult = {
  weaponSummary: string;
  rows: AcDamageRow[];
};

export type AcCompareRow = {
  ac: number;
  a: AcDamageRow;
  b: AcDamageRow;
  standardDelta: number;
  fullAttackDelta: number;
};

export type DamageStatisticComparison = {
  a: DamageStatisticResult;
  b: DamageStatisticResult;
  rows: AcCompareRow[];
};

export type ParsedDrEntry = {
  amount: number;
  bypass: DamageType[];
};
