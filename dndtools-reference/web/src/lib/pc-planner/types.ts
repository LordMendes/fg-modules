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

export type SpellMode = "preparation" | "spontaneous";

export type SpellEntry = {
  slug: string;
  name: string;
  level: number;
  /** Times prepared per day (preparation casters only). */
  prepared?: number;
  /** Prepared in a cleric domain slot. */
  domain?: boolean;
};

export type DomainEntry = {
  slug: string;
  name: string;
};

export type SpellClassState = {
  label: string;
  classSlug: string;
  casterLevel: number;
  dcAbility: AbilityKey;
  mode: SpellMode;
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
  trainedOnly?: boolean;
  armorCheckPenalty?: boolean;
};

export type InventoryRow = {
  name: string;
  quantity: number;
  weight: number;
  slug?: string | null;
  source?: "equipment" | "item" | null;
  equipped?: boolean;
  kind?: string | null;
  /** Cached armor/shield stats from the equipment record. */
  armorBonus?: number | null;
  maxDex?: number | null;
  acp?: number | null;
  speed30?: number | null;
  speed20?: number | null;
  /** Cached weapon stats from the equipment record. */
  damageM?: string | null;
  damageS?: string | null;
  critical?: string | null;
  damageType?: string | null;
  /** light | one | two | ranged */
  handed?: string | null;
  rangeIncrement?: string | null;
};

/** One hit die for a specific class level. */
export type HitDieRoll = {
  classSlug: string;
  classLevel: number;
  rolled: number;
};

export type HitPointsState = {
  /** One entry per HD; preserved across class-level edits. */
  rolls: HitDieRoll[];
  /** Optional current HP tracker for play. */
  current?: number;
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
    /** Class slug that receives ×4 skill points at 1st character level. */
    firstClassSlug?: string | null;
    deity?: string;
    deitySlug?: string | null;
    /** Cleric domains (max 2). */
    domains?: DomainEntry[];
    /** Wizard specialist school name, if any. */
    specialistSchool?: string | null;
  };
  abilities: Record<AbilityKey, number>;
  /** Scores before racial adjustments — edited on Main tab. */
  abilityBase: Record<AbilityKey, number>;
  feats: FeatEntry[];
  spellClasses: SpellClassState[];
  skills: SkillRow[];
  combat: CombatState;
  hitPoints: HitPointsState;
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
