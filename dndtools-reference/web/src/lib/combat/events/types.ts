import type {
  CombatHealthStatus,
  DamagePacket,
  DamageType,
} from "../types";

export type CombatEventKind =
  | "combatStart"
  | "combatEnd"
  | "roundStart"
  | "turnStart"
  | "turnEnd"
  | "init"
  | "delay"
  | "ready"
  | "target"
  | "untarget"
  | "attack"
  | "critConfirm"
  | "damage"
  | "heal"
  | "tempHp"
  | "nonlethal"
  | "save"
  | "sr"
  | "cast"
  | "effectApply"
  | "effectRemove"
  | "effectExpire"
  | "effectTick"
  | "death"
  | "stabilize"
  | "regen"
  | "hpEdit"
  | "note"
  | "undo";

export type ItemizedModifier = {
  label: string;
  value: number;
};

export type AttackEventPayload = {
  attackName: string;
  attackType: "melee" | "ranged" | "mtouch" | "rtouch" | "grapple";
  face: number;
  bonus: number;
  adhoc: number;
  total: number;
  acType: "normal" | "touch" | "flat";
  acValue: number;
  hit: boolean;
  autoMiss: boolean;
  autoHit: boolean;
  threat: boolean;
  concealmentRoll?: { face: number; missChance: number; missed: boolean };
  modifiers: ItemizedModifier[];
  /** Grapple log-only resolution. */
  grappleLog?: string;
};

export type CritConfirmEventPayload = {
  attackName: string;
  face: number;
  bonus: number;
  adhoc: number;
  total: number;
  acType: "normal" | "touch" | "flat";
  acValue: number;
  confirmed: boolean;
  autoMiss: boolean;
  autoHit: boolean;
  immuneToCrit: boolean;
  modifiers: ItemizedModifier[];
};

export type InitEventPayload = {
  face: number;
  initMod: number;
  effectBonus: number;
  storedInit: number;
};

export type DamageEventPayload = {
  source: string;
  packets: DamagePacket[];
  crit: boolean;
  multiplier: number;
  adjustments: {
    kind: "dr" | "resist" | "immune" | "vuln" | "half" | "precisionImmune";
    amount: number;
    note: string;
  }[];
  applied: number;
  toTemp: number;
  toNonlethal: number;
  hpBefore: number;
  hpAfter: number;
  statusAfter: CombatHealthStatus;
};

export type SaveEventPayload = {
  saveType: "fort" | "ref" | "will";
  dc: number;
  face: number;
  bonus: number;
  total: number;
  success: boolean;
  autoFail: boolean;
  source: string;
  consequence?: "half" | "negate" | "effect";
};

/** State mutation returned by pure rules functions for the mutation layer to apply. */
export type StatePatch = {
  combatantId: string;
  init?: number;
  turnState?: "normal" | "delayed" | "readied" | "dead" | "removed";
  pendingTargetIds?: string[];
  pendingCrit?: { multiplier: number; threatFace: number; attackName: string } | null;
  wounds?: number;
  hpTemp?: number;
  nonlethal?: number;
  deathState?: "dying" | "stable" | "disabled" | "dead" | null;
};

export type RuleOutcome<TPayload> = {
  payload: TPayload;
  patches: StatePatch[];
};

/** Extra damage component from effects for critical scaling tests. */
export type CritDamageComponent = {
  dice: string;
  value: number;
  types: DamageType[];
  descriptors: string[];
  precision?: boolean;
};

export type CritDamageResult = {
  baseDice: string;
  baseModifier: number;
  multiplier: number;
  scaledDice: string;
  scaledModifier: number;
  extraDice: CritDamageComponent[];
};
