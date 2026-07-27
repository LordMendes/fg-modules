export type SourceAbbrev =
  | "DMG"
  | "PHB"
  | "CW"
  | "CAr"
  | "CAd"
  | "CD"
  | "CS"
  | "CM"
  | "CC";

export const SOURCE_LABELS: Record<SourceAbbrev, string> = {
  DMG: "DMG / SRD",
  PHB: "Player's Handbook",
  CW: "Complete Warrior",
  CAr: "Complete Arcane",
  CAd: "Complete Adventurer",
  CD: "Complete Divine",
  CS: "Complete Scoundrel",
  CM: "Complete Mage",
  CC: "Complete Champion",
};

export type WeaponCategory = "simple" | "martial" | "exotic";
export type WeaponKind = "melee" | "ranged";

export type Weapon = {
  id: string;
  name: string;
  costGp: number;
  category: WeaponCategory;
  kind: WeaponKind;
  source?: SourceAbbrev;
};

export type ArmorGearKind = "armor" | "shield";

export type GearType = {
  id: string;
  name: string;
  costGp: number;
  kind: ArmorGearKind;
  source?: SourceAbbrev;
};

export type AbilityPricing =
  | { kind: "equivalent"; bonus: number }
  | { kind: "flat"; gp: number };

export type WeaponAbility = {
  id: string;
  name: string;
  scope: "melee" | "ranged" | "both";
  pricing: AbilityPricing;
  description: string;
  source: SourceAbbrev;
  subtype?: { label: string; options: string[] };
  notes?: string;
  minCasterLevel?: number;
  dndtoolsSlug?: string;
};

export type ArmorAbility = {
  id: string;
  name: string;
  pricing: AbilityPricing;
  description: string;
  source: SourceAbbrev;
  notes?: string;
  minCasterLevel?: number;
  dndtoolsSlug?: string;
};

export type SelectedWeaponAbility = {
  abilityId: string;
  subtype?: string;
};

export type SelectedArmorAbility = {
  abilityId: string;
};

export type WeaponBuildState = {
  weaponId: string;
  enhancementBonus: number;
  abilities: SelectedWeaponAbility[];
};

export type ArmorBuildState = {
  gearId: string;
  enhancementBonus: number;
  abilities: SelectedArmorAbility[];
};

export type PriceLine = {
  label: string;
  gp: number;
};

export type PriceBreakdown = {
  lines: PriceLine[];
  totalGp: number;
  equivalentTotal: number;
  warnings: string[];
  itemName: string;
};

export type CraftBreakdown = {
  materialsGp: number;
  xp: number;
  days: number;
  minCasterLevel: number;
};

export const MASTERWORK_COST_GP = 300;
export const MAX_ENHANCEMENT_EQUIVALENT = 10;
