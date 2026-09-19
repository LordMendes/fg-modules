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

export type CombatEventVisibility = "all" | "dm";

export type CombatEventTone =
  | "neutral"
  | "hit"
  | "miss"
  | "crit"
  | "damage"
  | "heal"
  | "effect"
  | "death";

export type CombatEventLine = {
  text: string;
  tone: CombatEventTone;
};

export type ItemizedModifier = {
  label: string;
  value: number;
};

export type CombatStartEventPayload = {
  label?: string;
};

export type CombatEndEventPayload = {
  label?: string;
};

export type RoundStartEventPayload = {
  round: number;
};

export type TurnStartEventPayload = {
  combatantName: string;
  init?: number;
};

export type TurnEndEventPayload = {
  combatantName: string;
};

export type DelayEventPayload = {
  combatantName: string;
};

export type ReadyEventPayload = {
  combatantName: string;
  trigger?: string;
};

export type TargetEventPayload = {
  targetNames: string[];
};

export type UntargetEventPayload = {
  targetNames: string[];
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
  attackType?: "melee" | "ranged" | "mtouch" | "rtouch" | "grapple";
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
  hpMax?: number;
  statusAfter: CombatHealthStatus;
};

export type HealEventPayload = {
  source: string;
  amount: number;
  dice?: string;
  hpBefore: number;
  hpAfter: number;
  hpMax: number;
  statusAfter: CombatHealthStatus;
};

export type TempHpEventPayload = {
  source: string;
  amount: number;
  tempBefore: number;
  tempAfter: number;
};

export type NonlethalEventPayload = {
  source: string;
  amount: number;
  nonlethalBefore: number;
  nonlethalAfter: number;
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

export type SrEventPayload = {
  spellName: string;
  face: number;
  casterLevel: number;
  clBonus: number;
  total: number;
  sr: number;
  success: boolean;
};

export type CastEventPayload = {
  spellName: string;
  casterLevel?: number;
  targetNames: string[];
};

export type EffectApplyEventPayload = {
  label: string;
  effectText: string;
  duration: number | null;
  durationUnit: "round" | "minute" | "hour" | "day";
  targetName: string;
  sourceName: string | null;
};

export type EffectRemoveEventPayload = {
  label: string;
  targetName: string;
};

export type EffectExpireEventPayload = {
  label: string;
  targetName: string;
};

export type EffectTickEventPayload = {
  label: string;
  targetName: string;
  description: string;
};

export type DeathEventPayload = {
  targetName: string;
  deathState: "dying" | "stable" | "disabled" | "dead";
  hp: number;
};

export type StabilizeEventPayload = {
  targetName: string;
  success: boolean;
  face?: number;
};

export type RegenEventPayload = {
  source: string;
  amount: number;
  hpBefore: number;
  hpAfter: number;
  hpMax: number;
  statusAfter: CombatHealthStatus;
};

export type HpEditEventPayload = {
  hpBefore: number;
  hpAfter: number;
  hpMax: number;
  note?: string;
};

export type NoteEventPayload = {
  text: string;
};

export type UndoEventPayload = {
  revertedSeq: number;
  revertedKind: CombatEventKind;
  summary: string;
};

export type CombatEventPayloadMap = {
  combatStart: CombatStartEventPayload;
  combatEnd: CombatEndEventPayload;
  roundStart: RoundStartEventPayload;
  turnStart: TurnStartEventPayload;
  turnEnd: TurnEndEventPayload;
  init: InitEventPayload;
  delay: DelayEventPayload;
  ready: ReadyEventPayload;
  target: TargetEventPayload;
  untarget: UntargetEventPayload;
  attack: AttackEventPayload;
  critConfirm: CritConfirmEventPayload;
  damage: DamageEventPayload;
  heal: HealEventPayload;
  tempHp: TempHpEventPayload;
  nonlethal: NonlethalEventPayload;
  save: SaveEventPayload;
  sr: SrEventPayload;
  cast: CastEventPayload;
  effectApply: EffectApplyEventPayload;
  effectRemove: EffectRemoveEventPayload;
  effectExpire: EffectExpireEventPayload;
  effectTick: EffectTickEventPayload;
  death: DeathEventPayload;
  stabilize: StabilizeEventPayload;
  regen: RegenEventPayload;
  hpEdit: HpEditEventPayload;
  note: NoteEventPayload;
  undo: UndoEventPayload;
};

export type CombatEventPayload = CombatEventPayloadMap[CombatEventKind];

/** Persisted combat event row (before per-viewer filtering). */
export type CombatEventRecord = {
  id: string;
  seq: number;
  round: number;
  kind: CombatEventKind;
  at: string;
  actorCombatantId: string | null;
  targetCombatantId: string | null;
  actorName: string | null;
  targetName: string | null;
  payload: CombatEventPayload;
  visibility: CombatEventVisibility;
  rollId: string | null;
  reverted: boolean;
};

export type CombatEventView = {
  id: string;
  seq: number;
  round: number;
  kind: CombatEventKind;
  at: string;
  actorName: string | null;
  targetName: string | null;
  lines: CombatEventLine[];
  payload: unknown;
  rollId: string | null;
  reverted: boolean;
};

export type CombatEventViewer = {
  isDm: boolean;
  viewerPcPlanId?: string | null;
};

export type CombatFilterCombatant = {
  id: string;
  name: string;
  pcPlanId: string | null;
  visibleToPlayers: boolean;
  identified: boolean;
  genericLabel?: string;
};

export type CombatFilterContext = {
  combatants: CombatFilterCombatant[];
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
