export {
  DEFAULT_ATTACKER,
  DEFAULT_DAMAGE_STATISTIC_INPUT,
  DEFAULT_TARGET,
  DEFAULT_WEAPON,
  DEFAULT_WEAPON_B,
  DR_BYPASS_OPTIONS,
  SIZE_OPTIONS,
} from "./defaults";
export {
  buildSyntheticPcPlanState,
  extractAttackerFromPcPlan,
  extractMainHandWeapons,
  inventoryRowToAnalyzedWeapon,
} from "./attacker-state";
export {
  compareDamageStatistics,
  computeDamageStatistic,
  expectedDamageForAttack,
  formatExpectedDelta,
  formatExpectedDamage,
  formatHitChance,
  hitChanceVsAc,
  parseDrEntries,
  threatChance,
} from "./expected-damage";
export type {
  AcCompareRow,
  AcDamageRow,
  AttackerInput,
  CatalogWeaponSummary,
  DamageStatisticComparison,
  DamageStatisticInput,
  DamageStatisticResult,
  DrBypassOption,
  DrEntry,
  ParsedDrEntry,
  TargetInput,
} from "./types";
