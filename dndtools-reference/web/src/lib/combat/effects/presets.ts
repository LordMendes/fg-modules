import type { ConditionKey } from "../types";

/** PC sheet aggregate fields; combat engine uses full condition expansion separately. */
export type ConditionEffect = {
  acMisc?: number;
  loseDexToAc?: boolean;
  loseDodge?: boolean;
  meleeMisc?: number;
  rangedMisc?: number;
  speedMult?: number;
};

export type ConditionPreset = {
  label: string;
  /** Effect string inserted by the condition picker. */
  preset: string;
  /** lucide-react icon name for UI chips. */
  icon: string;
  /** Optional PC sheet modifiers; omitted for display-only or system conditions. */
  effect?: ConditionEffect;
};

/**
 * Single source of truth for condition presets (05-effects-dsl.md table).
 * PC sheet and combat tracker both import from here.
 */
export const CONDITION_PRESETS: Record<ConditionKey, ConditionPreset> = {
  blinded: { label: "Blinded", preset: "Blinded", icon: "EyeOff" },
  cowering: { label: "Cowering", preset: "Cowering", icon: "ShieldOff" },
  dazed: { label: "Dazed", preset: "Dazed", icon: "CircleDashed" },
  dazzled: { label: "Dazzled", preset: "Dazzled", icon: "Sun" },
  deafened: { label: "Deafened", preset: "Deafened", icon: "EarOff" },
  disabled: { label: "Disabled", preset: "Disabled", icon: "Activity" },
  dying: { label: "Dying", preset: "Dying", icon: "HeartCrack" },
  dead: { label: "Dead", preset: "Dead", icon: "Skull" },
  entangled: { label: "Entangled", preset: "Entangled", icon: "Link" },
  exhausted: { label: "Exhausted", preset: "Exhausted", icon: "BatteryLow" },
  fascinated: { label: "Fascinated", preset: "Fascinated", icon: "Star" },
  fatigued: { label: "Fatigued", preset: "Fatigued", icon: "Moon" },
  flatFooted: {
    label: "Flat-footed",
    preset: "Flat-footed",
    icon: "Footprints",
    effect: { loseDexToAc: true, loseDodge: true },
  },
  frightened: { label: "Frightened", preset: "Frightened", icon: "AlertTriangle" },
  grappled: {
    label: "Grappled",
    preset: "Grappled",
    icon: "Hand",
    effect: { loseDexToAc: true, loseDodge: true },
  },
  helpless: { label: "Helpless", preset: "Helpless", icon: "Ban" },
  incorporeal: { label: "Incorporeal", preset: "Incorporeal", icon: "Ghost" },
  invisible: {
    label: "Invisible",
    preset: "Invisible",
    icon: "EyeOff",
    effect: { meleeMisc: 2, rangedMisc: 2 },
  },
  nauseated: { label: "Nauseated", preset: "Nauseated", icon: "Frown" },
  panicked: { label: "Panicked", preset: "Panicked", icon: "Zap" },
  paralyzed: { label: "Paralyzed", preset: "Paralyzed", icon: "Lock" },
  petrified: { label: "Petrified", preset: "Petrified", icon: "Gem" },
  pinned: { label: "Pinned", preset: "Pinned", icon: "Pin" },
  prone: {
    label: "Prone",
    preset: "Prone",
    icon: "ArrowDown",
    effect: { meleeMisc: 4, rangedMisc: -4, acMisc: -4 },
  },
  shaken: { label: "Shaken", preset: "Shaken", icon: "Wind" },
  sickened: { label: "Sickened", preset: "Sickened", icon: "Thermometer" },
  stable: { label: "Stable", preset: "Stable", icon: "Heart" },
  staggered: { label: "Staggered", preset: "Staggered", icon: "Pause" },
  stunned: {
    label: "Stunned",
    preset: "Stunned",
    icon: "CircleSlash",
    effect: { loseDexToAc: true, loseDodge: true, acMisc: -2 },
  },
  turned: { label: "Turned", preset: "Turned", icon: "RotateCcw" },
  unconscious: { label: "Unconscious", preset: "Unconscious", icon: "Bed" },
};

/** Lookup by preset key string (camelCase condition id). */
export function conditionPresetByKey(key: string): ConditionPreset | null {
  return (CONDITION_PRESETS as Record<string, ConditionPreset>)[key] ?? null;
}
