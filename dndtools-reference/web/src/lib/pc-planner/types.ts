export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type ClassLevelEntry = {
  classSlug: string;
  className: string;
  level: number;
};

export type FeatEntry = {
  slug: string;
  name: string;
};

export type SpellEntry = {
  slug: string;
  name: string;
  level: number;
};

export type SpellClassState = {
  label: string;
  classSlug: string;
  casterLevel: number;
  dcAbility: AbilityKey;
  spells: SpellEntry[];
};

export type SkillRow = {
  name: string;
  slug?: string | null;
  ability?: string | null;
  ranks: number;
  misc: number;
  /** Automated racial skill bonus (read-only in UI). */
  racialMisc?: number;
};

export type InventoryRow = {
  name: string;
  quantity: number;
  weight: number;
};

export type CombatState = {
  sizeMod: number;
  meleeMisc: number;
  rangedMisc: number;
  grappleMisc: number;
  fortMisc: number;
  refMisc: number;
  willMisc: number;
  initMisc: number;
  armor: number;
  shield: number;
  natural: number;
  deflection: number;
  dodge: number;
  acMisc: number;
  speedBase: number;
  speedArmor: number;
  speedMisc: number;
  srBase: number;
  srMisc: number;
  attacks: string;
};

export type PcPlanState = {
  identity: {
    name: string;
    race: string;
    raceSlug?: string | null;
    alignment: string;
    classLevels: ClassLevelEntry[];
  };
  abilities: Record<AbilityKey, number>;
  /** Scores before racial adjustments — edited on Main tab. */
  abilityBase: Record<AbilityKey, number>;
  feats: FeatEntry[];
  spellClasses: SpellClassState[];
  skills: SkillRow[];
  combat: CombatState;
  inventory: InventoryRow[];
  notes: string;
};

export type PcSheetTab =
  | "main"
  | "combat"
  | "skills"
  | "abilities"
  | "inventory"
  | "notes"
  | "actions";

export const PC_SHEET_TABS: { id: PcSheetTab; label: string }[] = [
  { id: "main", label: "Main" },
  { id: "combat", label: "Combat" },
  { id: "skills", label: "Skills" },
  { id: "abilities", label: "Abilities" },
  { id: "inventory", label: "Inventory" },
  { id: "notes", label: "Notes" },
  { id: "actions", label: "Actions" },
];
