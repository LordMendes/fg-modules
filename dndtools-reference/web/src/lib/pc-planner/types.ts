import type {
  SelectedArmorAbility,
  SelectedWeaponAbility,
} from "@/lib/magic-item/types";

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

export type InventorySpellEffect = {
  slug: string;
  name: string;
  notes?: string;
};

export type InventoryDamageLine = {
  id: string;
  dice: string;
  type: string;
  /** Small-size dice for the primary weapon line. */
  diceS?: string | null;
  /** Default true on the first line, false on extra energy dice. */
  multiplyOnCrit?: boolean;
  /** Burst extras that apply only on a confirmed critical. */
  critOnly?: boolean;
  /** Auto line created from a Magic Item Builder ability. */
  fromAbilityId?: string;
};

/** Bonus types on equipped items (informational; all sources add). */
export type ItemBonusType =
  | "enhancement"
  | "resistance"
  | "competence"
  | "deflection"
  | "natural"
  | "armor"
  | "luck"
  | "insight"
  | "morale"
  | "untyped";

export type CombatBonusStat =
  | "naturalArmor"
  | "deflection"
  | "armor"
  | "dodge"
  | "fort"
  | "ref"
  | "will"
  | "saves"
  | "melee"
  | "ranged"
  | "initiative";

export type ItemStatBonus =
  | {
      kind: "ability";
      ability: AbilityKey;
      amount: number;
      bonusType: ItemBonusType;
    }
  | {
      kind: "skill";
      /** Skill slug or lowercase name. */
      skill: string;
      amount: number;
      bonusType: ItemBonusType;
    }
  | {
      kind: "combat";
      stat: CombatBonusStat;
      amount: number;
      bonusType: ItemBonusType;
    };

export type InventoryRow = {
  /** Stable sheet-only instance id. */
  id?: string;
  /** True after the player customizes this copy. */
  customized?: boolean;
  name: string;
  quantity: number;
  weight: number;
  slug?: string | null;
  source?: "equipment" | "item" | null;
  equipped?: boolean;
  /**
   * Weapon hand slot when equipped as a weapon.
   * Synced with equipped for weapons: equipped === Boolean(weaponHand).
   */
  weaponHand?: "main" | "off" | null;
  kind?: string | null;
  /** Display type from the Item catalog (e.g. "Wondrous Item"). */
  itemType?: string | null;
  /** Armor category: light | medium | heavy (from equipment). */
  category?: string | null;
  masterwork?: boolean;
  enhancementBonus?: number;
  weaponAbilities?: SelectedWeaponAbility[];
  armorAbilities?: SelectedArmorAbility[];
  damageLines?: InventoryDamageLine[];
  spellEffects?: InventorySpellEffect[];
  /** Structured bonuses applied when this row is equipped/worn. */
  statBonuses?: ItemStatBonus[];
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

export type TreasureBuiltin = "pp" | "gp" | "sp" | "cp";

export type TreasureRow = {
  id: string;
  name: string;
  amount: number;
  /** Seeded coin; always restored if missing from an older save. */
  builtin?: TreasureBuiltin;
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
  treasure: TreasureRow[];
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
