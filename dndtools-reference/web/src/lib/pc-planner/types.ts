import type {
  SelectedArmorAbility,
  SelectedWeaponAbility,
} from "@/lib/magic-item/types";
import type { DerivedListField, DerivedStringField } from "./derivedField";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Ability used for weapon attack/damage, or none. Unset = auto (Str/Dex rules). */
export type WeaponAbilityChoice = AbilityKey | "none";

/** Str multiplier on weapon damage ability bonus (1 or 1.5). Unset = auto. */
export type DamageAbilityMult = 1 | 1.5;

export type ClassLevelEntry = {
  classSlug: string;
  className: string;
  level: number;
};

export type FeatEntry = {
  slug: string;
  name: string;
  /**
   * Chosen weapon type for Weapon Focus / Specialization style feats
   * (e.g. "longsword"). Matched against inventory weapon names/slugs.
   */
  choice?: string;
  /** Chosen skill for Skill Focus and similar feats. */
  skillChoice?: string;
  /** When false, auto-derived feat effects are not applied. Default: apply. */
  suppressed?: boolean;
  /** Flaw feats do not count against general feat budget when flagged. */
  isFlaw?: boolean;
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
  /** Manual CL bypass; when set, sync must not overwrite casterLevel. */
  casterLevelOverride?: number | null;
  /** Class slugs whose PrC levels stack into this spell class. */
  casterProgressionFrom?: string[];
  dcAbility: AbilityKey;
  mode: SpellMode;
  spells: SpellEntry[];
  /** Spontaneous slots used per level (0–9). */
  slotsUsed?: number[];
};

export type SkillRow = {
  name: string;
  slug?: string | null;
  ability?: string | null;
  ranks: number;
  misc: number;
  /** Automated racial skill bonus (read-only in UI). */
  racialMisc?: number;
  /** Automated synergy bonus (read-only in UI). */
  synergyMisc?: number;
  trainedOnly?: boolean;
  armorCheckPenalty?: boolean;
};

export type InventorySpellEffect = {
  slug: string;
  name: string;
  notes?: string;
  /** Spell level used for item CL defaults and save DC (0–9). */
  spellLevel?: number;
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

/** Bonus types on equipped items (3.5e stacking rules apply unless bypassed). */
export type ItemBonusType =
  | "enhancement"
  | "resistance"
  | "competence"
  | "deflection"
  | "natural"
  | "armor"
  | "dodge"
  | "circumstance"
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
  /**
   * Ability score for attack rolls. Unset = Dex (ranged/finesse) or Str.
   * "none" = no ability mod to attack.
   */
  attackAbility?: WeaponAbilityChoice;
  /**
   * Extra attack bonus on this weapon (feats / class abilities the sheet
   * does not auto-apply). Stacks with enhancement / masterwork.
   */
  attackMisc?: number;
  /**
   * Ability score for damage. Unset = Str (melee) or none (ranged).
   * "none" = no ability mod to damage.
   */
  damageAbility?: WeaponAbilityChoice;
  /**
   * Multiplier on positive damage ability mod (1 or 1.5). Unset = 1.5 if two-handed.
   */
  damageAbilityMult?: DamageAbilityMult;
  /**
   * Extra damage bonus on this weapon (feats / class abilities).
   * Stacks with enhancement.
   */
  damageMisc?: number;
  /**
   * Extra AC bonus on this armor/shield (feats / class abilities).
   * Stacks with base armor and enhancement.
   */
  armorMisc?: number;
  weaponAbilities?: SelectedWeaponAbility[];
  armorAbilities?: SelectedArmorAbility[];
  damageLines?: InventoryDamageLine[];
  spellEffects?: InventorySpellEffect[];
  /** Structured bonuses applied when this row is equipped/worn. */
  statBonuses?: ItemStatBonus[];
  /** Charges remaining on a wand, scroll, or other charged item. */
  chargesCurrent?: number | null;
  /** Maximum charges (e.g. 50 for a full wand, 1 for a scroll). */
  chargesMax?: number | null;
  /** Caster level of spells cast from this item. */
  itemCasterLevel?: number | null;
  /** Cached armor/shield stats from the equipment record. */
  armorBonus?: number | null;
  /** Arcane spell failure percent from equipment (0–100). */
  arcaneSpellFailure?: number | null;
  maxDex?: number | null;
  acp?: number | null;
  /** Body slot for duplicate warnings (ring, belt, amulet, etc.). */
  bodySlot?: string | null;
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
  /** Temporary HP pool (separate from current). */
  temporary?: number;
};

export type PcSensesState = {
  darkvisionFeet: number;
  lowLight: boolean;
  scent: boolean;
  extra: string;
};

export type PcDefensesState = {
  dr: string;
  resistances: string;
  immunities: string;
  vulnerabilities: string;
  extra: string;
};

export type PcCombatModes = {
  powerAttack?: number;
  combatExpertise?: number;
  fightingDefensively?: boolean;
  charge?: boolean;
  rapidShot?: boolean;
  flurry?: boolean;
  rage?: boolean;
};

export type PcConditionEntry = {
  id: string;
  name: string;
  /** Known preset id (prone, stunned, etc.) or custom. */
  preset?: string | null;
};

export type PcResourceEntry = {
  id: string;
  name: string;
  current: number;
  max: number;
  /** Auto-seeded rows can be removed by the player. */
  auto?: boolean;
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
  /** Manual ASF bypass (0–100); null = auto from gear. */
  asfOverride?: number | null;
  /** When true, item bonuses of the same type all stack (house rule). */
  addAllBonusTypes?: boolean;
  /** Suppress auto skill synergy bonuses. */
  suppressSynergies?: boolean;
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
    /** Wizard opposed schools (hint only; picker does not enforce). */
    opposedSchools?: string[];
    /** R2 object key for square profile image. */
    profileImageKey?: string | null;
    /** R2 object key for square token image. */
    tokenImageKey?: string | null;
    senses?: DerivedListField;
    languages?: DerivedListField;
    defenses?: PcDefensesState;
    defensesCustomized?: boolean;
    xp?: number;
    /** XP required for next level (gauge target). */
    xpNecessary?: number;
    age?: string;
    height?: string;
    weight?: string;
    gender?: string;
  };
  abilities: Record<AbilityKey, number>;
  /** Scores before racial adjustments — edited on Main tab. */
  abilityBase: Record<AbilityKey, number>;
  /** Temporary ability damage (poison, etc.). Subtracted from the current score. */
  abilityDamage: Record<AbilityKey, number>;
  /** Permanent ability drain. Subtracted after damage. */
  abilityDrain?: Record<AbilityKey, number>;
  feats: FeatEntry[];
  spellClasses: SpellClassState[];
  skills: SkillRow[];
  /** Skill row keys (slug or lowercase name) pinned on the Main tab. */
  skillShortcuts?: string[];
  combat: CombatState;
  combatModes?: PcCombatModes;
  conditions?: PcConditionEntry[];
  resources?: PcResourceEntry[];
  /** Class ability effect keys the player chose not to auto-apply. */
  suppressedClassEffects?: string[];
  hitPoints: HitPointsState;
  inventory: InventoryRow[];
  treasure: TreasureRow[];
  notes: string;
};

export type PcSheetTab =
  | "main"
  | "combat"
  | "status"
  | "skills"
  | "abilities"
  | "inventory"
  | "notes"
  | "actions";

export const PC_SHEET_TABS: { id: PcSheetTab; label: string }[] = [
  { id: "main", label: "Main" },
  { id: "combat", label: "Combat" },
  { id: "status", label: "Status" },
  { id: "skills", label: "Skills" },
  { id: "abilities", label: "Abilities" },
  { id: "inventory", label: "Inventory" },
  { id: "notes", label: "Notes" },
  { id: "actions", label: "Actions" },
];
