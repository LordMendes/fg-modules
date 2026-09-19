import { rollFaces } from "@/lib/campaign/rollFaces";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import { normalizeDuration } from "@/lib/combat/effects/duration";
import { CONDITION_PRESETS } from "@/lib/combat/effects/presets";
import { parseEffect } from "@/lib/combat/effects/parseEffect";
import type {
  CombatEventKind,
  CombatEventPayloadMap,
  CombatEventRecord,
  CombatEventVisibility,
  CombatFilterCombatant,
  StatePatch,
} from "@/lib/combat/events/types";
import { deriveHealthStatus } from "@/lib/combat/healthStatus";
import {
  applyDefenses,
  type DamageFlags,
} from "@/lib/combat/rules/damage";
import { buildEngineContext, type CombatantFields } from "@/lib/combat/rules/engineContext";
import { resolveDeathState } from "@/lib/combat/rules/death";
import {
  actNow as actNowRule,
  delayCombatant as delayCombatantRule,
  readyCombatant as readyCombatantRule,
  rollInitiative,
  sortByInitiative,
  type InitiativeCombatant,
} from "@/lib/combat/rules/initiative";
import { heal, tempHp } from "@/lib/combat/rules/healing";
import {
  nextActor,
  turnEnd,
  turnStart,
  type EffectPatch,
  type TurnActor,
  type TurnBoundaryOutcome,
  type TurnEffect,
} from "@/lib/combat/rules/turn";
import type { ActiveEffect } from "@/lib/combat/effects/applyEffects";
import type { CombatantView, CombatFaction, DamagePacket } from "@/lib/combat/types";
import { Prisma } from "@/generated/prisma/client";
import {
  combatViewFromRow,
  expandEncounterNames,
  snapshotCombatStats,
} from "@/lib/combat/combatView";
import {
  npcCreatorToCombatStats,
  monsterToCombatStats,
  type CombatStatBlock,
} from "@/lib/combat/converters";
import { loadEncounters, loadNpcLibrary } from "@/lib/combat/loadCombat";
import type { NpcFgExportState } from "@/lib/npc-creator/types";
import { prisma } from "@/lib/prisma";
import type { PcPlanState } from "@/lib/pc-planner/types";
import { abilityModifier, computeCombatStats } from "@/lib/pc-planner/combatStats";
import {
  computeMaxHitPoints,
  normalizeHitPointsState,
} from "@/lib/pc-planner/hitPoints";
import { normalizePcPlanState } from "@/lib/pc-planner/normalizePlanState";
import {
  computeWeaponAttackRows,
  formatDamageWithModifier,
} from "@/lib/pc-planner/weaponAttacks";
import { buildPcDamageTypes } from "@/lib/combat/parseAttacks";
import type { CombatAttackLine } from "@/lib/combat/types";
import { tryPublicUrlForKey } from "@/lib/storage/r2";
import type { MapTokenView } from "@/lib/map/types";

function newEntityId(): string {
  return crypto.randomUUID();
}

export type CombatActor = {
  userId: string;
  role: "dm" | "player";
  campaignId: string;
  dmUserId: string;
};

function isDm(actor: CombatActor): boolean {
  return actor.role === "dm" && actor.userId === actor.dmUserId;
}

const combatInclude = {
  combatants: { orderBy: [{ init: "desc" as const }, { seq: "asc" as const }] },
};

const combatIncludeWithEffects = {
  combatants: {
    orderBy: [{ init: "desc" as const }, { seq: "asc" as const }],
    include: { effects: { orderBy: { seq: "asc" as const } } },
  },
};

export type CombatTransactionClient = Prisma.TransactionClient;

export type LockedCombatantRow = {
  id: string;
  kind: string;
  name: string;
  pcPlanId: string | null;
  init: number;
  initMod: number;
  hpMax: number;
  hpTemp: number;
  wounds: number;
  nonlethal: number;
  ac: number;
  acTouch: number | null;
  acFlat: number | null;
  attacks: unknown;
  targetIds: unknown;
  pendingTargetIds: unknown;
  pendingCrit: unknown;
  snapshot: unknown;
  stats: unknown;
  deathState: string | null;
  turnState: string;
  defenses: unknown;
  visibleToPlayers: boolean;
  identified: boolean;
  effects: Array<{
    id: string;
    label: string;
    components: unknown;
    active: boolean;
    applyMode: string;
    system: boolean;
    duration: number | null;
    durationUnit: string;
    tickInit: number | null;
    expiry: string;
    visibility: string;
    sourceCombatantId: string | null;
    seq: number;
  }>;
};

export type InitiativeScope = "all" | "npcs" | "pcs" | "one";
export type CombatantScope = "all" | "npcs" | "pcs" | "one";
export type ClearTargetsScope = "all" | "one";

export type AddEffectInput = {
  effectText: string;
  duration?: number | null;
  durationUnit?: "round" | "minute" | "hour" | "day";
  expiry?: "startOfTurn" | "endOfTurn";
  visibility?: "visible" | "hidden" | "gm";
  applyMode?: "all" | "once";
  sourceCombatantId?: string | null;
};

export type CombatantFlagsInput = {
  visibleToPlayers?: boolean;
  identified?: boolean;
  faction?: CombatFaction;
  turnState?: "normal" | "delayed" | "readied" | "dead" | "removed";
};

export type LockedCombatRow = {
  id: string;
  campaignId: string;
  round: number;
  eventSeq: number;
  currentCombatantId: string | null;
  combatants: LockedCombatantRow[];
};

export type WriteCombatEventOpts = {
  actorCombatantId?: string | null;
  targetCombatantId?: string | null;
  actorUserId?: string | null;
  visibility?: CombatEventVisibility;
  rollId?: string | null;
};

export type ApplyCombatDamageOpts = {
  packets: DamagePacket[];
  flags?: DamageFlags;
  source?: string;
  attackType?: "melee" | "ranged" | "mtouch" | "rtouch" | "grapple";
  crit?: boolean;
  multiplier?: number;
  rollId?: string | null;
  actorCombatantId?: string | null;
};

export async function lockCombatRow(
  tx: CombatTransactionClient,
  campaignId: string,
): Promise<LockedCombatRow | null> {
  await tx.$queryRaw`
    SELECT id FROM "CampaignCombat" WHERE "campaignId" = ${campaignId} FOR UPDATE
  `;
  return tx.campaignCombat.findUnique({
    where: { campaignId },
    include: combatIncludeWithEffects,
  }) as Promise<LockedCombatRow | null>;
}

export async function writeCombatEvent<K extends CombatEventKind>(
  tx: CombatTransactionClient,
  combat: { id: string; campaignId: string; round: number; eventSeq: number },
  kind: K,
  payload: CombatEventPayloadMap[K],
  opts: WriteCombatEventOpts = {},
): Promise<{ row: { id: string; seq: number }; record: CombatEventRecord }> {
  const nextSeq = combat.eventSeq + 1;
  await tx.campaignCombat.update({
    where: { id: combat.id },
    data: { eventSeq: nextSeq },
  });
  combat.eventSeq = nextSeq;

  const row = await tx.campaignCombatEvent.create({
    data: {
      id: newEntityId(),
      combatId: combat.id,
      campaignId: combat.campaignId,
      seq: nextSeq,
      round: combat.round,
      kind,
      actorCombatantId: opts.actorCombatantId ?? null,
      targetCombatantId: opts.targetCombatantId ?? null,
      actorUserId: opts.actorUserId ?? null,
      payload: payload as unknown as Prisma.InputJsonValue,
      visibility: opts.visibility ?? "all",
      rollId: opts.rollId ?? null,
    },
  });

  const record: CombatEventRecord = {
    id: row.id,
    seq: row.seq,
    round: row.round,
    kind: row.kind as CombatEventKind,
    at: row.createdAt.toISOString(),
    actorCombatantId: row.actorCombatantId,
    targetCombatantId: row.targetCombatantId,
    actorName: null,
    targetName: null,
    payload: payload as CombatEventPayloadMap[CombatEventKind],
    visibility: row.visibility as CombatEventVisibility,
    rollId: row.rollId,
    reverted: row.revertedAt != null,
  };

  return { row, record };
}

export function combatantsForEventFilter(
  combatants: LockedCombatRow["combatants"],
): CombatFilterCombatant[] {
  return combatants.map((c, index) => ({
    id: c.id,
    name: c.name,
    pcPlanId: c.pcPlanId,
    visibleToPlayers: c.visibleToPlayers,
    identified: c.identified,
    genericLabel: `Creature ${index + 1}`,
  }));
}

export function publishCombatEvent(
  campaignId: string,
  event: CombatEventRecord,
  combatants: CombatFilterCombatant[],
): void {
  publishCampaignLive(campaignId, {
    type: "combatEvent",
    event,
    combatants,
  });
}

function clampInt(value: unknown, min: number, max: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.trunc(Number(value))));
}

function asTargetIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string");
}

function asPendingCrit(
  raw: unknown,
): { multiplier: number; threatFace: number; attackName: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.multiplier !== "number" ||
    typeof o.threatFace !== "number" ||
    typeof o.attackName !== "string"
  ) {
    return null;
  }
  return {
    multiplier: o.multiplier,
    threatFace: o.threatFace,
    attackName: o.attackName,
  };
}

function mapDbEffects(
  rows: LockedCombatantRow["effects"],
): ActiveEffect[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    components: Array.isArray(row.components)
      ? (row.components as ActiveEffect["components"])
      : [],
    active: row.active,
    applyMode: row.applyMode as ActiveEffect["applyMode"],
  }));
}

function combatantFields(c: LockedCombatantRow): CombatantFields {
  const snapshot = (c.snapshot ?? {}) as Record<string, unknown>;
  return {
    id: c.id,
    name: c.name,
    kind: c.kind === "pc" ? "pc" : "npc",
    ac: c.ac,
    acTouch: c.acTouch,
    acFlat: c.acFlat,
    fort: typeof snapshot.fort === "number" ? snapshot.fort : undefined,
    ref: typeof snapshot.ref === "number" ? snapshot.ref : undefined,
    will: typeof snapshot.will === "number" ? snapshot.will : undefined,
    initMod: c.initMod,
    hpMax: c.hpMax,
    hpTemp: c.hpTemp,
    wounds: c.wounds,
    nonlethal: c.nonlethal,
    defenses: (c.defenses ?? {}) as CombatantFields["defenses"],
    stats: (c.stats ?? {}) as CombatantFields["stats"],
    effects: mapDbEffects(c.effects),
  };
}

function toTurnEffects(rows: LockedCombatantRow["effects"]): TurnEffect[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    components: Array.isArray(row.components)
      ? (row.components as TurnEffect["components"])
      : [],
    active: row.active,
    applyMode: row.applyMode as TurnEffect["applyMode"],
    duration: row.duration,
    durationUnit: row.durationUnit as TurnEffect["durationUnit"],
    tickInit: row.tickInit,
    expiry: row.expiry as TurnEffect["expiry"],
  }));
}

function toTurnActor(c: LockedCombatantRow): TurnActor {
  const ctx = buildEngineContext(combatantFields(c));
  return {
    id: c.id,
    name: c.name,
    init: c.init,
    hpMax: c.hpMax,
    wounds: c.wounds,
    hpTemp: c.hpTemp,
    nonlethal: c.nonlethal,
    deathState: c.deathState as TurnActor["deathState"],
    defenses: (c.defenses ?? {}) as TurnActor["defenses"],
    effects: toTurnEffects(c.effects),
    pendingTargetIds: asTargetIds(c.pendingTargetIds),
    pendingCrit: asPendingCrit(c.pendingCrit) ?? undefined,
    stats: (c.stats ?? {}) as TurnActor["stats"],
    conditions: [...ctx.conditions],
  };
}

async function ownsCombatant(
  actor: CombatActor,
  combatant: Pick<LockedCombatantRow, "kind" | "pcPlanId">,
): Promise<boolean> {
  if (isDm(actor)) return true;
  if (combatant.kind !== "pc" || !combatant.pcPlanId) return false;
  const link = await prisma.campaignPc.findFirst({
    where: {
      campaignId: actor.campaignId,
      pcPlanId: combatant.pcPlanId,
      userId: actor.userId,
    },
  });
  return Boolean(link);
}

function combatantInCombat(
  combat: LockedCombatRow,
  combatantId: string,
): LockedCombatantRow | null {
  return combat.combatants.find((c) => c.id === combatantId) ?? null;
}

function filterCombatantsByScope(
  combatants: LockedCombatantRow[],
  scope: CombatantScope,
  combatantId?: string,
): LockedCombatantRow[] {
  switch (scope) {
    case "all":
      return combatants;
    case "npcs":
      return combatants.filter((c) => c.kind === "npc");
    case "pcs":
      return combatants.filter((c) => c.kind === "pc");
    case "one": {
      if (!combatantId) return [];
      const row = combatants.find((c) => c.id === combatantId);
      return row ? [row] : [];
    }
    default:
      return [];
  }
}

async function applyStatePatchesInTx(
  tx: CombatTransactionClient,
  patches: StatePatch[],
): Promise<void> {
  const merged = new Map<string, StatePatch>();
  for (const patch of patches) {
    const prev = merged.get(patch.combatantId) ?? { combatantId: patch.combatantId };
    merged.set(patch.combatantId, { ...prev, ...patch });
  }

  for (const patch of merged.values()) {
    const data: Prisma.CampaignCombatantUpdateInput = {};
    if (patch.init != null) data.init = patch.init;
    if (patch.turnState != null) data.turnState = patch.turnState;
    if (patch.pendingTargetIds != null) {
      data.pendingTargetIds = patch.pendingTargetIds;
    }
    if (patch.pendingCrit !== undefined) {
      data.pendingCrit = patch.pendingCrit as Prisma.InputJsonValue;
    }
    if (patch.wounds != null) data.wounds = patch.wounds;
    if (patch.hpTemp != null) data.hpTemp = patch.hpTemp;
    if (patch.nonlethal != null) data.nonlethal = patch.nonlethal;
    if (patch.deathState !== undefined) data.deathState = patch.deathState;
    if (Object.keys(data).length === 0) continue;
    await tx.campaignCombatant.update({
      where: { id: patch.combatantId },
      data,
    });
  }
}

function applyPatchToMemory(
  combat: LockedCombatRow,
  patch: StatePatch,
): LockedCombatantRow | null {
  const c = combat.combatants.find((x) => x.id === patch.combatantId);
  if (!c) return null;
  if (patch.init != null) c.init = patch.init;
  if (patch.turnState != null) c.turnState = patch.turnState;
  if (patch.pendingTargetIds != null) {
    c.pendingTargetIds = patch.pendingTargetIds;
  }
  if (patch.pendingCrit !== undefined) c.pendingCrit = patch.pendingCrit;
  if (patch.wounds != null) c.wounds = patch.wounds;
  if (patch.hpTemp != null) c.hpTemp = patch.hpTemp;
  if (patch.nonlethal != null) c.nonlethal = patch.nonlethal;
  if (patch.deathState !== undefined) c.deathState = patch.deathState;
  return c;
}

async function applyEffectPatchesInTx(
  tx: CombatTransactionClient,
  combat: LockedCombatRow,
  effectPatches: EffectPatch[],
): Promise<void> {
  for (const patch of effectPatches) {
    if (patch.remove) {
      await tx.campaignCombatEffect.deleteMany({ where: { id: patch.effectId } });
      for (const c of combat.combatants) {
        c.effects = c.effects.filter((e) => e.id !== patch.effectId);
      }
      continue;
    }
    if (patch.duration !== undefined) {
      await tx.campaignCombatEffect.update({
        where: { id: patch.effectId },
        data: { duration: patch.duration },
      });
      for (const c of combat.combatants) {
        const effect = c.effects.find((e) => e.id === patch.effectId);
        if (effect) effect.duration = patch.duration ?? null;
      }
    }
  }
}

async function syncDeathSystemEffects(
  tx: CombatTransactionClient,
  combatant: LockedCombatantRow,
): Promise<void> {
  const death = resolveDeathState({
    hpMax: combatant.hpMax,
    wounds: combatant.wounds,
    nonlethal: combatant.nonlethal,
    deathState: combatant.deathState as "dying" | "stable" | "disabled" | "dead" | null,
  });
  combatant.deathState = death.deathState;
  if (death.turnState) combatant.turnState = death.turnState;
  await applySystemEffectPatches(
    tx,
    combatant.id,
    death.systemEffects.add,
    death.systemEffects.remove,
  );
}

async function applyTurnBoundaryInTx(
  tx: CombatTransactionClient,
  actor: CombatActor,
  combat: LockedCombatRow,
  outcome: TurnBoundaryOutcome,
  combatantId: string,
): Promise<CombatEventRecord[]> {
  const events: CombatEventRecord[] = [];

  await applyEffectPatchesInTx(tx, combat, outcome.effectPatches);
  await applyStatePatchesInTx(tx, outcome.patches);

  for (const patch of outcome.patches) {
    const c = applyPatchToMemory(combat, patch);
    if (!c) continue;
    await syncDeathSystemEffects(tx, c);
    if (patch.wounds != null || patch.hpTemp != null) {
      await syncPcPlanHpFromCombatant(tx, actor, c, c.wounds, c.hpTemp);
    }
  }

  for (const event of outcome.events) {
    const written = await writeCombatEvent(
      tx,
      combat,
      event.kind,
      event.payload as CombatEventPayloadMap[CombatEventKind],
      {
        actorCombatantId: combatantId,
        targetCombatantId: combatantId,
        actorUserId: actor.userId,
      },
    );
    events.push(written.record);
  }

  return events;
}

async function publishMutationResult(
  actor: CombatActor,
  combat: LockedCombatRow,
  events: CombatEventRecord[],
): Promise<void> {
  const filterCombatants = combatantsForEventFilter(combat.combatants);
  for (const event of events) {
    publishCombatEvent(actor.campaignId, event, filterCombatants);
  }
  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
}

function validateEffectText(text: string): { ok: true; trimmed: string } | { ok: false; error: string } {
  const trimmed = text.trim().slice(0, 200);
  if (!trimmed) return { ok: false, error: "Effect text required" };
  const { components } = parseEffect(trimmed);
  const label = trimmed.split(";")[0]?.trim() ?? "";
  if (components.length === 0 && !label) {
    return { ok: false, error: "Invalid effect text" };
  }
  return { ok: true, trimmed };
}

async function applySystemEffectPatches(
  tx: CombatTransactionClient,
  combatantId: string,
  add: string[],
  remove: string[],
): Promise<void> {
  for (const condition of remove) {
    const preset = CONDITION_PRESETS[condition as keyof typeof CONDITION_PRESETS];
    if (!preset) continue;
    await tx.campaignCombatEffect.deleteMany({
      where: { combatantId, system: true, label: preset.label },
    });
  }
  for (const condition of add) {
    const preset = CONDITION_PRESETS[condition as keyof typeof CONDITION_PRESETS];
    if (!preset) continue;
    const { components } = parseEffect(preset.preset);
    await tx.campaignCombatEffect.deleteMany({
      where: { combatantId, system: true, label: preset.label },
    });
    await tx.campaignCombatEffect.create({
      data: {
        id: newEntityId(),
        combatantId,
        label: preset.label,
        components: components as unknown as Prisma.InputJsonValue,
        system: true,
        visibility: "visible",
        active: true,
        duration: null,
        durationUnit: "round",
        expiry: "startOfTurn",
        applyMode: "all",
        seq: 0,
      },
    });
  }
}

async function syncPcPlanHpFromCombatant(
  tx: CombatTransactionClient,
  actor: CombatActor,
  combatant: LockedCombatRow["combatants"][number],
  wounds: number,
  hpTemp: number,
): Promise<void> {
  if (combatant.kind !== "pc" || !combatant.pcPlanId) return;

  const plan = await tx.pcPlan.findUnique({
    where: { id: combatant.pcPlanId },
    select: { state: true },
  });
  if (!plan?.state || typeof plan.state !== "object") return;

  const state = normalizePcPlanState(structuredClone(plan.state as PcPlanState));
  const hp = normalizeHitPointsState(state.hitPoints);
  const current = Math.max(0, combatant.hpMax - wounds);
  state.hitPoints = { ...hp, current, temporary: hpTemp };
  await tx.pcPlan.update({
    where: { id: combatant.pcPlanId },
    data: { state: state as object },
  });

  publishCampaignLive(actor.campaignId, {
    type: "pcUpdated",
    pcPlanId: combatant.pcPlanId,
    actorUserId: actor.userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function applyCombatDamageInTx(
  tx: CombatTransactionClient,
  actor: CombatActor,
  combat: LockedCombatRow,
  combatantId: string,
  opts: ApplyCombatDamageOpts,
): Promise<
  | { success: true; events: CombatEventRecord[] }
  | { success: false; error: string }
> {
  const c = combat.combatants.find((x) => x.id === combatantId);
  if (!c) return { success: false as const, error: "Combatant not found" };

  const hpBefore = Math.max(0, c.hpMax - c.wounds) + Math.max(0, c.hpTemp);
  const conditions = c.effects
    .filter((e) => e.active)
    .flatMap((e) =>
      Array.isArray(e.components)
        ? (e.components as { tag?: string; condition?: string }[])
            .filter((comp) => comp.tag === "COND" && comp.condition)
            .map((comp) => comp.condition!)
        : [],
    );

  const defenseResult = applyDefenses(
    opts.packets,
    {
      hpMax: c.hpMax,
      wounds: c.wounds,
      hpTemp: c.hpTemp,
      nonlethal: c.nonlethal,
      defenses: (c.defenses ?? {}) as import("@/lib/combat/types").Defenses,
      conditions: conditions as import("@/lib/combat/types").ConditionKey[],
    },
    opts.flags ?? {},
  );

  const death = resolveDeathState({
    hpMax: c.hpMax,
    wounds: defenseResult.wounds,
    nonlethal: defenseResult.nonlethal,
    deathState: c.deathState as "dying" | "stable" | "disabled" | "dead" | null,
  });

  await tx.campaignCombatant.update({
    where: { id: combatantId },
    data: {
      wounds: defenseResult.wounds,
      hpTemp: defenseResult.hpTemp,
      nonlethal: defenseResult.nonlethal,
      deathState: death.deathState,
      ...(death.turnState ? { turnState: death.turnState } : {}),
    },
  });

  c.wounds = defenseResult.wounds;
  c.hpTemp = defenseResult.hpTemp;
  c.nonlethal = defenseResult.nonlethal;
  c.deathState = death.deathState;
  if (death.turnState) c.turnState = death.turnState;

  await applySystemEffectPatches(
    tx,
    combatantId,
    death.systemEffects.add,
    death.systemEffects.remove,
  );

  const hpAfter = Math.max(0, c.hpMax - defenseResult.wounds) + Math.max(0, defenseResult.hpTemp);
  const statusAfter = deriveHealthStatus(
    c.hpMax,
    defenseResult.wounds,
    defenseResult.hpTemp,
    c.nonlethal,
    c.deathState as CombatantView["deathState"],
  );

  const events: CombatEventRecord[] = [];

  const damageEvent = await writeCombatEvent(tx, combat, "damage", {
    source: opts.source ?? "Damage",
    attackType: opts.attackType,
    packets: opts.packets,
    crit: Boolean(opts.crit),
    multiplier: opts.multiplier ?? 1,
    adjustments: defenseResult.adjustments,
    applied: defenseResult.applied,
    toTemp: defenseResult.toTemp,
    toNonlethal: defenseResult.toNonlethal,
    hpBefore,
    hpAfter,
    hpMax: c.hpMax,
    statusAfter,
  }, {
    actorCombatantId: opts.actorCombatantId ?? null,
    targetCombatantId: combatantId,
    actorUserId: actor.userId,
    rollId: opts.rollId ?? null,
  });
  events.push(damageEvent.record);

  if (death.deathState) {
    const deathEvent = await writeCombatEvent(tx, combat, "death", {
      targetName: c.name,
      deathState: death.deathState,
      hp: hpAfter - Math.max(0, defenseResult.hpTemp),
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
      rollId: opts.rollId ?? null,
    });
    events.push(deathEvent.record);
  }

  await syncPcPlanHpFromCombatant(tx, actor, c, defenseResult.wounds, defenseResult.hpTemp);
  return { success: true as const, events };
}

async function loadCombatRow(campaignId: string) {
  return prisma.campaignCombat.findUnique({
    where: { campaignId },
    include: combatIncludeWithEffects,
  });
}

async function publishCombatSnapshot(
  campaignId: string,
  _dmUserId: string,
  viewer?: { isDm: boolean; pcPlanId?: string | null },
) {
  const combat = await loadCombatRow(campaignId);
  const tokenIds = combat?.combatants
    .map((c) => c.tokenId)
    .filter((id): id is string => Boolean(id)) ?? [];
  const tokens =
    tokenIds.length > 0
      ? await prisma.campaignMapToken.findMany({
          where: { id: { in: tokenIds } },
          select: { id: true, imageKey: true },
        })
      : [];
  const tokenImages: Record<string, string | null> = {};
  for (const t of tokens) {
    tokenImages[t.id] = t.imageKey ? tryPublicUrlForKey(t.imageKey) : null;
  }

  const view = combatViewFromRow(combat, {
    isDm: viewer?.isDm ?? true,
    viewerPcPlanId: viewer?.pcPlanId ?? null,
    tokenImages: new Map(Object.entries(tokenImages)),
  });
  publishCampaignLive(campaignId, {
    type: "combatSnapshot",
    combat: view,
    raw: combat,
    tokenImages,
  });
}

async function publishNpcLibrarySnapshot(campaignId: string) {
  const npcLibrary = await loadNpcLibrary(campaignId);
  publishCampaignLive(campaignId, { type: "npcLibrarySnapshot", npcLibrary });
}

async function publishEncountersSnapshot(campaignId: string) {
  const encounters = await loadEncounters(campaignId);
  publishCampaignLive(campaignId, { type: "encountersSnapshot", encounters });
}

export async function ensureCombat(actor: CombatActor) {
  if (!isDm(actor)) return null;
  let combat = await loadCombatRow(actor.campaignId);
  if (!combat) {
    combat = await prisma.campaignCombat.create({
      data: {
        id: newEntityId(),
        campaignId: actor.campaignId,
        round: 1,
        active: true,
      },
      include: combatIncludeWithEffects,
    });
    await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  }
  return combat;
}

export function uniqueCombatName(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function statsFromNpcSnapshot(
  name: string,
  snapshotRaw: unknown,
): CombatStatBlock {
  const stats = snapshotCombatStats(snapshotRaw);
  const raw = (snapshotRaw ?? {}) as Record<string, unknown>;
  return {
    name,
    hpMax: stats.hpMax,
    ac: stats.ac,
    acTouch: stats.acTouch,
    acFlat: stats.acFlat,
    initMod: stats.initMod,
    spaceSquares: stats.spaceSquares,
    reachFeet: stats.reachFeet,
    attacks: stats.attacks,
    snapshot: stats.snapshot,
    defenses:
      raw.defenses && typeof raw.defenses === "object"
        ? (raw.defenses as CombatStatBlock["defenses"])
        : {},
    stats:
      raw.stats && typeof raw.stats === "object"
        ? (raw.stats as CombatStatBlock["stats"])
        : {},
  };
}

export async function addNpcToLibrary(
  actor: CombatActor,
  input: {
    name: string;
    faction: CombatFaction;
    source: "template" | "monster" | "adhoc";
    monsterSlug?: string | null;
    snapshot: unknown;
    stats: CombatStatBlock;
    imageKey?: string | null;
  },
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const row = await prisma.campaignNpc.create({
    data: {
      id: newEntityId(),
      campaignId: actor.campaignId,
      name: input.name.trim().slice(0, 64) || "NPC",
      faction: input.faction,
      source: input.source,
      monsterSlug: input.monsterSlug ?? null,
      snapshot: {
        ...input.stats.snapshot,
        hpMax: input.stats.hpMax,
        ac: input.stats.ac,
        acTouch: input.stats.acTouch,
        acFlat: input.stats.acFlat,
        spaceSquares: input.stats.spaceSquares,
        reachFeet: input.stats.reachFeet,
        attacks: input.stats.attacks,
        initMod: input.stats.initMod,
        defenses: input.stats.defenses,
        stats: input.stats.stats,
      },
      imageKey: input.imageKey ?? null,
    },
  });

  await publishNpcLibrarySnapshot(actor.campaignId);
  return { success: true as const, npcId: row.id };
}

export async function addCombatantFromStats(
  actor: CombatActor,
  input: {
    kind: "pc" | "npc";
    name: string;
    faction: CombatFaction;
    tokenId?: string | null;
    pcPlanId?: string | null;
    campaignNpcId?: string | null;
    stats: CombatStatBlock;
    /** Use name as-is (already uniquified by caller). */
    forceName?: boolean;
    /** Skip publish when batching multiple adds. */
    silent?: boolean;
  },
) {
  const combat = await ensureCombat(actor);
  if (!combat) return { success: false as const, error: "DM only" };

  const names = combat.combatants.map((c) => c.name);
  const name = input.forceName
    ? input.name
    : uniqueCombatName(names, input.name);

  const row = await prisma.campaignCombatant.create({
    data: {
      id: newEntityId(),
      combatId: combat.id,
      kind: input.kind,
      tokenId: input.tokenId ?? null,
      pcPlanId: input.pcPlanId ?? null,
      campaignNpcId: input.campaignNpcId ?? null,
      name,
      faction: input.faction,
      initMod: input.stats.initMod,
      hpMax: input.stats.hpMax,
      ac: input.stats.ac,
      acTouch: input.stats.acTouch,
      acFlat: input.stats.acFlat,
      spaceSquares: input.stats.spaceSquares,
      reachFeet: input.stats.reachFeet,
      attacks: input.stats.attacks,
      snapshot: input.stats.snapshot,
      defenses: input.stats.defenses,
      stats: input.stats.stats,
      seq: combat.combatants.length,
    },
  });

  // Keep in-memory list current for subsequent silent adds in the same request.
  (combat.combatants as Array<{ id: string; name: string }>).push({
    id: row.id,
    name,
  });

  if (!combat.currentCombatantId) {
    await prisma.campaignCombat.update({
      where: { id: combat.id },
      data: { currentCombatantId: row.id },
    });
    combat.currentCombatantId = row.id;
  }

  if (!input.silent) {
    await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  }
  return { success: true as const, combatantId: row.id };
}

/** Add an NPC library entry to combat without placing a map token. */
export async function addNpcLibraryToCombat(
  actor: CombatActor,
  npcLibraryId: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const npc = await prisma.campaignNpc.findFirst({
    where: { id: npcLibraryId, campaignId: actor.campaignId },
  });
  if (!npc) return { success: false as const, error: "NPC not found" };

  const stats = statsFromNpcSnapshot(npc.name, npc.snapshot);
  return addCombatantFromStats(actor, {
    kind: "npc",
    name: npc.name,
    faction: npc.faction as CombatFaction,
    campaignNpcId: npc.id,
    stats,
  });
}

export async function createEncounter(
  actor: CombatActor,
  name: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };
  const trimmed = name.trim().slice(0, 64) || "Encounter";
  const row = await prisma.campaignEncounter.create({
    data: {
      id: newEntityId(),
      campaignId: actor.campaignId,
      name: trimmed,
    },
  });
  await publishEncountersSnapshot(actor.campaignId);
  return { success: true as const, encounterId: row.id };
}

export async function renameEncounter(
  actor: CombatActor,
  encounterId: string,
  name: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };
  const trimmed = name.trim().slice(0, 64);
  if (!trimmed) return { success: false as const, error: "Name required" };

  const existing = await prisma.campaignEncounter.findFirst({
    where: { id: encounterId, campaignId: actor.campaignId },
  });
  if (!existing) return { success: false as const, error: "Encounter not found" };

  await prisma.campaignEncounter.update({
    where: { id: encounterId },
    data: { name: trimmed },
  });
  await publishEncountersSnapshot(actor.campaignId);
  return { success: true as const };
}

export async function deleteEncounter(
  actor: CombatActor,
  encounterId: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };
  const existing = await prisma.campaignEncounter.findFirst({
    where: { id: encounterId, campaignId: actor.campaignId },
  });
  if (!existing) return { success: false as const, error: "Encounter not found" };

  await prisma.campaignEncounter.delete({ where: { id: encounterId } });
  await publishEncountersSnapshot(actor.campaignId);
  return { success: true as const };
}

export async function setEncounterEntryQuantity(
  actor: CombatActor,
  encounterId: string,
  campaignNpcId: string,
  quantity: number,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const encounter = await prisma.campaignEncounter.findFirst({
    where: { id: encounterId, campaignId: actor.campaignId },
    include: { entries: true },
  });
  if (!encounter) return { success: false as const, error: "Encounter not found" };

  const npc = await prisma.campaignNpc.findFirst({
    where: { id: campaignNpcId, campaignId: actor.campaignId },
  });
  if (!npc) return { success: false as const, error: "NPC not found" };

  const qty = Math.floor(quantity);
  if (qty <= 0) {
    await prisma.campaignEncounterEntry.deleteMany({
      where: { encounterId, campaignNpcId },
    });
  } else {
    const existing = encounter.entries.find(
      (e) => e.campaignNpcId === campaignNpcId,
    );
    if (existing) {
      await prisma.campaignEncounterEntry.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, qty) },
      });
    } else {
      await prisma.campaignEncounterEntry.create({
        data: {
          id: newEntityId(),
          encounterId,
          campaignNpcId,
          quantity: Math.min(99, qty),
          seq: encounter.entries.length,
        },
      });
    }
  }

  await prisma.campaignEncounter.update({
    where: { id: encounterId },
    data: { updatedAt: new Date() },
  });
  await publishEncountersSnapshot(actor.campaignId);
  return { success: true as const };
}

/** Expand an encounter into unplaced combatants. */
export async function addEncounterToCombat(
  actor: CombatActor,
  encounterId: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const encounter = await prisma.campaignEncounter.findFirst({
    where: { id: encounterId, campaignId: actor.campaignId },
    include: {
      entries: {
        include: { campaignNpc: true },
        orderBy: { seq: "asc" },
      },
    },
  });
  if (!encounter) return { success: false as const, error: "Encounter not found" };
  if (encounter.entries.length === 0) {
    return { success: false as const, error: "Encounter is empty" };
  }

  const combat = await ensureCombat(actor);
  if (!combat) return { success: false as const, error: "DM only" };

  const expansion = encounter.entries.flatMap((entry) => {
    const qty = Math.max(1, entry.quantity);
    return Array.from({ length: qty }, () => entry.campaignNpc);
  });

  const names = expandEncounterNames(
    encounter.entries.map((e) => ({
      name: e.campaignNpc.name,
      quantity: e.quantity,
    })),
    combat.combatants.map((c) => c.name),
  );

  for (let i = 0; i < expansion.length; i += 1) {
    const npc = expansion[i]!;
    const name = names[i] ?? npc.name;
    const stats = statsFromNpcSnapshot(npc.name, npc.snapshot);
    await addCombatantFromStats(actor, {
      kind: "npc",
      name,
      faction: npc.faction as CombatFaction,
      campaignNpcId: npc.id,
      stats: { ...stats, name },
      forceName: true,
      silent: true,
    });
  }

  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  return { success: true as const, added: expansion.length };
}

/** Place an existing unplaced combatant onto the live map. */
export async function placeCombatantOnMap(
  actor: CombatActor,
  mapId: string,
  combatantId: string,
  x: number,
  y: number,
): Promise<
  | { success: false; error: string }
  | { success: true; token: MapTokenView }
> {
  if (!isDm(actor)) return { success: false, error: "DM only" };

  const combat = await loadCombatRow(actor.campaignId);
  if (!combat) return { success: false, error: "No combat" };

  const combatant = combat.combatants.find((c) => c.id === combatantId);
  if (!combatant) return { success: false, error: "Combatant not found" };
  if (combatant.kind !== "npc") {
    return { success: false, error: "Only NPCs can be placed from tray" };
  }
  if (combatant.tokenId) {
    return { success: false, error: "Already on the map" };
  }

  const map = await prisma.campaignMap.findFirst({
    where: { id: mapId, campaignId: actor.campaignId },
  });
  if (!map) return { success: false, error: "Map not found" };

  let imageKey: string | null = null;
  if (combatant.campaignNpcId) {
    const npc = await prisma.campaignNpc.findUnique({
      where: { id: combatant.campaignNpcId },
      select: { imageKey: true },
    });
    imageKey = npc?.imageKey ?? null;
  }

  const tokenId = newEntityId();
  const visibility = map.fogEnabled ? "mask" : "always";
  const width = combatant.spaceSquares || 1;

  await prisma.campaignMapToken.create({
    data: {
      id: tokenId,
      mapId,
      kind: "npc",
      name: combatant.name,
      imageKey,
      x,
      y,
      width,
      height: width,
      layer: "token",
      visibility,
      campaignNpcId: combatant.campaignNpcId,
    },
  });

  await prisma.campaignCombatant.update({
    where: { id: combatantId },
    data: { tokenId },
  });

  const token: MapTokenView = {
    id: tokenId,
    kind: "npc",
    pcPlanId: null,
    name: combatant.name,
    imageUrl: imageKey ? tryPublicUrlForKey(imageKey) : null,
    x,
    y,
    width,
    height: width,
    rotation: 0,
    layer: "token",
    visibility: visibility as "always" | "mask",
    ownerUserId: null,
    visionRange: null,
    emitsLight: false,
    lightBright: 0,
    lightDim: 0,
    seq: 0,
  };

  publishCampaignLive(actor.campaignId, { type: "mapTokenUpsert", token });
  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  return { success: true, token };
}

function weaponRowsToCombatAttacks(
  state: PcPlanState,
  combatStats: ReturnType<typeof computeCombatStats>,
): CombatAttackLine[] {
  return computeWeaponAttackRows(state, combatStats).map((row) => {
    const item = state.inventory[row.inventoryIndex];
    const enhancementBonus = item?.enhancementBonus ?? 0;
    const damageTypes = buildPcDamageTypes(row.damageType, enhancementBonus);
    const damage = formatDamageWithModifier(row.damageDice, row.damageModifier);

    return {
      name: row.name,
      bonus: row.attackBonus,
      mode: row.mode,
      damage,
      threatMin: row.threatMin,
      critMultiplier: row.critMultiplier,
      attackType: row.mode,
      damageTypes,
      iterativeBonuses: row.fullAttackBonuses,
    };
  });
}

function pcCasterLevel(state: PcPlanState): number | undefined {
  const levels = (state.spellClasses ?? [])
    .map((spellClass) => spellClass.casterLevelOverride ?? spellClass.casterLevel)
    .filter((value) => Number.isFinite(value));
  if (levels.length === 0) return undefined;
  return Math.max(...levels);
}

export function pcPlanToCombatStats(
  name: string,
  state: PcPlanState,
  classAdvancement?: Parameters<typeof computeCombatStats>[2],
): CombatStatBlock {
  const normalized = normalizePcPlanState(structuredClone(state));
  const stats = computeCombatStats(normalized, null, classAdvancement ?? null);
  const hp = normalizeHitPointsState(normalized.hitPoints);
  const hpMax = computeMaxHitPoints(normalized, null) || hp.current || 1;
  const attacks = weaponRowsToCombatAttacks(normalized, stats);
  const cl = pcCasterLevel(normalized);

  return {
    name,
    hpMax,
    ac: stats.ac.total,
    acTouch: stats.touch.total,
    acFlat: stats.flatFooted.total,
    initMod: stats.initiative.total,
    spaceSquares: 1,
    reachFeet: 5,
    attacks,
    snapshot: {
      speed: `${stats.speed.total} ft.`,
      fort: stats.fortitude.total,
      ref: stats.reflex.total,
      will: stats.will.total,
      initMod: stats.initiative.total,
      abilities: {
        str: abilityModifier(normalized.abilities.str),
        dex: abilityModifier(normalized.abilities.dex),
        con: abilityModifier(normalized.abilities.con),
        int: abilityModifier(normalized.abilities.int),
        wis: abilityModifier(normalized.abilities.wis),
        cha: abilityModifier(normalized.abilities.cha),
      },
    },
    defenses: {},
    stats: {
      str: abilityModifier(normalized.abilities.str),
      dex: abilityModifier(normalized.abilities.dex),
      con: abilityModifier(normalized.abilities.con),
      int: abilityModifier(normalized.abilities.int),
      wis: abilityModifier(normalized.abilities.wis),
      cha: abilityModifier(normalized.abilities.cha),
      ...(cl != null ? { cl } : {}),
    },
  };
}

export async function syncPcCombatantHp(
  campaignId: string,
  pcPlanId: string,
  hpMax: number,
  current: number,
  temp: number,
) {
  const combat = await loadCombatRow(campaignId);
  if (!combat) return;
  const c = combat.combatants.find((x) => x.pcPlanId === pcPlanId);
  if (!c) return;
  const wounds = Math.max(0, hpMax - current);
  await prisma.campaignCombatant.update({
    where: { id: c.id },
    data: { hpMax, wounds, hpTemp: Math.max(0, temp) },
  });
}

export async function applyCombatDamage(
  actor: CombatActor,
  combatantId: string,
  input: ApplyCombatDamageOpts | number,
) {
  const opts: ApplyCombatDamageOpts =
    typeof input === "number"
      ? {
          packets: [
            {
              amount: Math.max(0, Math.trunc(input)),
              types: ["untyped"],
              source: "Damage",
            },
          ],
        }
      : input;

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const applied = await applyCombatDamageInTx(tx, actor, combat, combatantId, opts);
    if (!applied.success) return applied;

    return { success: true as const, combat, events: applied.events };
  });

  if (!result.success) return result;

  const filterCombatants = combatantsForEventFilter(result.combat.combatants);
  for (const event of result.events) {
    publishCombatEvent(actor.campaignId, event, filterCombatants);
  }

  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  return { success: true as const };
}

export async function toggleCombatTarget(actor: CombatActor, targetId: string) {
  const combat = await loadCombatRow(actor.campaignId);
  if (!combat) return { success: false as const, error: "No combat" };

  const current = combat.combatants.find(
    (c) => c.id === combat.currentCombatantId,
  );
  if (!current) return { success: false as const, error: "No active turn" };

  const canToggle =
    isDm(actor) ||
    (current.kind === "pc" &&
      current.pcPlanId &&
      (await prisma.campaignPc.findFirst({
        where: {
          campaignId: actor.campaignId,
          pcPlanId: current.pcPlanId,
          userId: actor.userId,
        },
      })));
  if (!canToggle) return { success: false as const, error: "Not your turn" };

  const raw = current.targetIds;
  const ids = Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === "string")
    : [];
  const next = ids.includes(targetId)
    ? ids.filter((id) => id !== targetId)
    : [...ids, targetId];

  await prisma.campaignCombatant.update({
    where: { id: current.id },
    data: { targetIds: next },
  });

  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  return { success: true as const, targetIds: next };
}

export async function startCombat(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    let combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) {
      const id = newEntityId();
      await tx.campaignCombat.create({
        data: {
          id,
          campaignId: actor.campaignId,
          round: 1,
          active: true,
          state: "active",
          startedAt: new Date(),
        },
      });
      combat = await lockCombatRow(tx, actor.campaignId);
    }
    if (!combat) return { success: false as const, error: "No combat" };

    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: {
        state: "active",
        active: true,
        startedAt: new Date(),
        endedAt: null,
      },
    });

    const events: CombatEventRecord[] = [];
    const startEvent = await writeCombatEvent(tx, combat, "combatStart", {}, {
      actorUserId: actor.userId,
    });
    events.push(startEvent.record);

    if (!combat.currentCombatantId && combat.combatants.length > 0) {
      const sorted = sortByInitiative(
        combat.combatants.map((c) => ({
          id: c.id,
          init: c.init,
          initMod: c.initMod,
          turnState: c.turnState as InitiativeCombatant["turnState"],
        })),
        { skipInactive: true },
      );
      const topId = sorted[0]?.id;
      if (topId) {
        await tx.campaignCombat.update({
          where: { id: combat.id },
          data: { currentCombatantId: topId },
        });
        combat.currentCombatantId = topId;
      }
    }

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function endCombat(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const combatantIds = combat.combatants.map((c) => c.id);
    if (combatantIds.length > 0) {
      await tx.campaignCombatEffect.deleteMany({
        where: {
          combatantId: { in: combatantIds },
          duration: { not: null },
        },
      });
      await tx.campaignCombatant.updateMany({
        where: { combatId: combat.id },
        data: {
          pendingTargetIds: [],
          pendingCrit: Prisma.DbNull,
          targetIds: [],
        },
      });
      for (const c of combat.combatants) {
        c.effects = c.effects.filter((e) => e.duration == null);
        c.targetIds = [];
        c.pendingTargetIds = [];
        c.pendingCrit = null;
      }
    }

    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: {
        state: "ended",
        active: false,
        endedAt: new Date(),
      },
    });

    const endEvent = await writeCombatEvent(tx, combat, "combatEnd", {}, {
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [endEvent.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function resetCombat(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const npcIds = combat.combatants.filter((c) => c.kind === "npc").map((c) => c.id);
    if (npcIds.length > 0) {
      await tx.campaignCombatEffect.deleteMany({
        where: { combatantId: { in: npcIds } },
      });
      await tx.campaignCombatant.deleteMany({
        where: { id: { in: npcIds } },
      });
      combat.combatants = combat.combatants.filter((c) => c.kind !== "npc");
    }

    const remainingIds = combat.combatants.map((c) => c.id);
    if (remainingIds.length > 0) {
      await tx.campaignCombatant.updateMany({
        where: { id: { in: remainingIds } },
        data: {
          init: 0,
          pendingTargetIds: [],
          pendingCrit: Prisma.DbNull,
          targetIds: [],
          turnState: "normal",
          deathState: null,
        },
      });
      for (const c of combat.combatants) {
        c.init = 0;
        c.targetIds = [];
        c.pendingTargetIds = [];
        c.pendingCrit = null;
        c.turnState = "normal";
        c.deathState = null;
      }
    }

    const nextCurrent = combat.combatants[0]?.id ?? null;
    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: {
        round: 1,
        currentCombatantId: nextCurrent,
        state: combat.combatants.length > 0 ? "active" : "idle",
        startedAt: null,
        endedAt: null,
        active: combat.combatants.length > 0,
      },
    });
    combat.round = 1;
    combat.currentCombatantId = nextCurrent;

    const noteEvent = await writeCombatEvent(tx, combat, "note", {
      text: "Combat reset",
    }, { actorUserId: actor.userId });

    return { success: true as const, combat, events: [noteEvent.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function rollInitiativeFor(
  actor: CombatActor,
  scope: InitiativeScope,
  combatantId?: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let targets = filterCombatantsByScope(combat.combatants, scope, combatantId);
    if (scope === "one" && !combatantId) {
      return { success: false as const, error: "Combatant required" };
    }

    if (scope === "all" || scope === "npcs" || scope === "pcs") {
      if (!isDm(actor)) return { success: false as const, error: "DM only" };
    } else {
      const allowed: LockedCombatantRow[] = [];
      for (const row of targets) {
        if (isDm(actor) || (await ownsCombatant(actor, row))) {
          allowed.push(row);
        }
      }
      targets = allowed;
    }

    if (targets.length === 0) {
      return { success: false as const, error: "No eligible combatants" };
    }

    const events: CombatEventRecord[] = [];
    const patches: StatePatch[] = [];

    for (const row of targets) {
      const face = rollFaces([{ qty: 1, sides: 20 }])[0] ?? 1;
      const ctx = buildEngineContext(combatantFields(row));
      const outcome = rollInitiative(ctx, face, row.initMod);
      patches.push(...outcome.patches);

      const event = await writeCombatEvent(tx, combat, "init", outcome.payload, {
        actorCombatantId: row.id,
        targetCombatantId: row.id,
        actorUserId: actor.userId,
      });
      events.push(event.record);
      row.init = outcome.payload.storedInit;
      row.turnState = "normal";
    }

    await applyStatePatchesInTx(tx, patches);

    if (!combat.currentCombatantId) {
      const sorted = sortByInitiative(
        combat.combatants.map((c) => ({
          id: c.id,
          init: c.init,
          initMod: c.initMod,
          turnState: c.turnState as InitiativeCombatant["turnState"],
        })),
        { skipInactive: true },
      );
      const topId = sorted[0]?.id;
      if (topId) {
        await tx.campaignCombat.update({
          where: { id: combat.id },
          data: { currentCombatantId: topId, state: "active" },
        });
        combat.currentCombatantId = topId;
      }
    }

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function setActiveCombatant(
  actor: CombatActor,
  combatantId: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    if (!combatantInCombat(combat, combatantId)) {
      return { success: false as const, error: "Combatant not found" };
    }

    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: { currentCombatantId: combatantId },
    });
    combat.currentCombatantId = combatantId;

    const row = combatantInCombat(combat, combatantId)!;
    const event = await writeCombatEvent(tx, combat, "turnStart", {
      combatantName: row.name,
      init: row.init,
    }, {
      actorCombatantId: combatantId,
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function delayCombatant(
  actor: CombatActor,
  combatantId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const patches = delayCombatantRule(combatantId);
    await applyStatePatchesInTx(tx, patches);
    row.turnState = "delayed";

    const event = await writeCombatEvent(tx, combat, "delay", {
      combatantName: row.name,
    }, {
      actorCombatantId: combatantId,
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function readyCombatant(
  actor: CombatActor,
  combatantId: string,
  trigger?: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const patches = readyCombatantRule(combatantId);
    await applyStatePatchesInTx(tx, patches);
    row.turnState = "readied";

    const event = await writeCombatEvent(tx, combat, "ready", {
      combatantName: row.name,
      trigger: trigger?.trim().slice(0, 120) || undefined,
    }, {
      actorCombatantId: combatantId,
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function actNow(actor: CombatActor, combatantId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const current = combat.currentCombatantId
      ? combatantInCombat(combat, combat.currentCombatantId)
      : null;
    const currentInit = current?.init ?? row.init + 1;
    const outcome = actNowRule(combatantId, currentInit);
    await applyStatePatchesInTx(tx, outcome.patches);
    row.init = outcome.payload.init;
    row.turnState = "normal";

    const event = await writeCombatEvent(tx, combat, "init", {
      face: 0,
      initMod: row.initMod,
      effectBonus: 0,
      storedInit: outcome.payload.init,
    }, {
      actorCombatantId: combatantId,
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function advanceCombatTurn(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat || combat.combatants.length === 0) {
      return { success: false as const, error: "No combatants" };
    }

    const events: CombatEventRecord[] = [];
    const currentId = combat.currentCombatantId;
    const current = currentId ? combatantInCombat(combat, currentId) : null;

    if (current) {
      const endOutcome = turnEnd(toTurnActor(current));
      events.push(
        ...(await applyTurnBoundaryInTx(tx, actor, combat, endOutcome, current.id)),
      );
    }

    const initiativeList = combat.combatants.map((c) => ({
      id: c.id,
      init: c.init,
      initMod: c.initMod,
      turnState: c.turnState as InitiativeCombatant["turnState"],
    }));
    const { nextId, roundIncrement } = nextActor(initiativeList, currentId);
    if (!nextId) {
      return { success: false as const, error: "No active combatants" };
    }

    const nextRound = roundIncrement ? combat.round + 1 : combat.round;
    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: {
        currentCombatantId: nextId,
        ...(roundIncrement ? { round: nextRound } : {}),
      },
    });
    combat.currentCombatantId = nextId;
    if (roundIncrement) {
      combat.round = nextRound;
      const roundEvent = await writeCombatEvent(tx, combat, "roundStart", {
        round: nextRound,
      }, { actorUserId: actor.userId });
      events.push(roundEvent.record);
    }

    const next = combatantInCombat(combat, nextId)!;
    const dmgoFaces = rollFaces([{ qty: 20, sides: 6 }]);
    const startOutcome = turnStart(toTurnActor(next), { dmgoFaces });
    events.push(
      ...(await applyTurnBoundaryInTx(tx, actor, combat, startOutcome, next.id)),
    );

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function applyHeal(
  actor: CombatActor,
  combatantId: string,
  amount: number,
  source = "Heal",
) {
  const healAmount = clampInt(amount, 0, 9999);
  if (healAmount == null) return { success: false as const, error: "Invalid amount" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const hpBefore = Math.max(0, row.hpMax - row.wounds);
    const healed = heal(healAmount, {
      hpMax: row.hpMax,
      wounds: row.wounds,
      hpTemp: row.hpTemp,
      nonlethal: row.nonlethal,
      deathState: row.deathState as "dying" | "stable" | "disabled" | "dead" | null,
    });

    await tx.campaignCombatant.update({
      where: { id: combatantId },
      data: { wounds: healed.wounds, nonlethal: healed.nonlethal },
    });
    row.wounds = healed.wounds;
    row.nonlethal = healed.nonlethal;
    await syncDeathSystemEffects(tx, row);
    await syncPcPlanHpFromCombatant(tx, actor, row, row.wounds, row.hpTemp);

    const hpAfter = Math.max(0, row.hpMax - row.wounds);
    const event = await writeCombatEvent(tx, combat, "heal", {
      source,
      amount: healed.healed,
      hpBefore,
      hpAfter,
      hpMax: row.hpMax,
      statusAfter: deriveHealthStatus(
        row.hpMax,
        row.wounds,
        row.hpTemp,
        row.nonlethal,
        row.deathState as CombatantView["deathState"],
      ),
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function applyTempHp(
  actor: CombatActor,
  combatantId: string,
  amount: number,
  source = "Temp HP",
) {
  const tempAmount = clampInt(amount, 0, 9999);
  if (tempAmount == null) return { success: false as const, error: "Invalid amount" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const tempBefore = row.hpTemp;
    const applied = tempHp(tempAmount, { hpTemp: row.hpTemp });
    await tx.campaignCombatant.update({
      where: { id: combatantId },
      data: { hpTemp: applied.hpTemp },
    });
    row.hpTemp = applied.hpTemp;
    await syncPcPlanHpFromCombatant(tx, actor, row, row.wounds, row.hpTemp);

    const event = await writeCombatEvent(tx, combat, "tempHp", {
      source,
      amount: applied.applied,
      tempBefore,
      tempAfter: applied.hpTemp,
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function setHp(
  actor: CombatActor,
  combatantId: string,
  hp: number,
  note?: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const targetHp = clampInt(hp, -999, 9999);
  if (targetHp == null) return { success: false as const, error: "Invalid HP" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };

    const hpBefore = Math.max(0, row.hpMax - row.wounds);
    const wounds = Math.max(0, row.hpMax - targetHp);
    await tx.campaignCombatant.update({
      where: { id: combatantId },
      data: { wounds },
    });
    row.wounds = wounds;
    await syncDeathSystemEffects(tx, row);
    await syncPcPlanHpFromCombatant(tx, actor, row, row.wounds, row.hpTemp);

    const hpAfter = Math.max(0, row.hpMax - row.wounds);
    const event = await writeCombatEvent(tx, combat, "hpEdit", {
      hpBefore,
      hpAfter,
      hpMax: row.hpMax,
      note: note?.trim().slice(0, 120) || undefined,
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function applyNonlethal(
  actor: CombatActor,
  combatantId: string,
  amount: number,
  source = "Nonlethal",
) {
  const addAmount = clampInt(amount, 0, 9999);
  if (addAmount == null) return { success: false as const, error: "Invalid amount" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };
    if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
      return { success: false as const, error: "Not allowed" };
    }

    const nonlethalBefore = row.nonlethal;
    const nextNonlethal = row.nonlethal + addAmount;
    await tx.campaignCombatant.update({
      where: { id: combatantId },
      data: { nonlethal: nextNonlethal },
    });
    row.nonlethal = nextNonlethal;
    await syncDeathSystemEffects(tx, row);

    const event = await writeCombatEvent(tx, combat, "nonlethal", {
      source,
      amount: addAmount,
      nonlethalBefore,
      nonlethalAfter: nextNonlethal,
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function addEffect(
  actor: CombatActor,
  combatantIds: string[],
  input: AddEffectInput,
) {
  const validated = validateEffectText(input.effectText);
  if (!validated.ok) return { success: false as const, error: validated.error };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    if (combatantIds.length === 0) {
      return { success: false as const, error: "No targets" };
    }

    const events: CombatEventRecord[] = [];
    const { components } = parseEffect(validated.trimmed);
    const normalized = normalizeDuration({
      duration: input.duration ?? null,
      durationUnit: input.durationUnit ?? "round",
    });

    for (const combatantId of combatantIds) {
      const row = combatantInCombat(combat, combatantId);
      if (!row) return { success: false as const, error: "Combatant not found" };
      if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
        return { success: false as const, error: "Not allowed" };
      }

      const sourceId = input.sourceCombatantId ?? null;
      const sourceRow = sourceId ? combatantInCombat(combat, sourceId) : row;
      const tickInit = sourceRow?.init ?? row.init;
      const seq = row.effects.length;

      const effectRow = await tx.campaignCombatEffect.create({
        data: {
          id: newEntityId(),
          combatantId,
          label: validated.trimmed,
          components: components as unknown as Prisma.InputJsonValue,
          sourceCombatantId: sourceId,
          duration: normalized.duration,
          durationUnit: normalized.durationUnit,
          tickInit,
          expiry: input.expiry ?? "startOfTurn",
          applyMode: input.applyMode ?? "all",
          visibility: input.visibility ?? "visible",
          active: true,
          system: false,
          seq,
        },
      });

      row.effects.push({
        id: effectRow.id,
        label: effectRow.label,
        components: effectRow.components,
        active: true,
        applyMode: effectRow.applyMode,
        system: false,
        duration: effectRow.duration,
        durationUnit: effectRow.durationUnit,
        tickInit: effectRow.tickInit,
        expiry: effectRow.expiry,
        visibility: effectRow.visibility,
        sourceCombatantId: effectRow.sourceCombatantId,
        seq,
      });

      const sourceName = sourceRow?.name ?? null;
      const event = await writeCombatEvent(tx, combat, "effectApply", {
        label: validated.trimmed.split(";")[0]?.trim() ?? validated.trimmed,
        effectText: validated.trimmed,
        duration: normalized.duration,
        durationUnit: normalized.durationUnit,
        targetName: row.name,
        sourceName,
      }, {
        actorCombatantId: sourceId ?? combatantId,
        targetCombatantId: combatantId,
        actorUserId: actor.userId,
      });
      events.push(event.record);
    }

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function removeEffect(
  actor: CombatActor,
  effectId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let targetRow: LockedCombatantRow | null = null;
    let effect:
      | LockedCombatantRow["effects"][number]
      | undefined;
    for (const row of combat.combatants) {
      effect = row.effects.find((e) => e.id === effectId);
      if (effect) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow || !effect) {
      return { success: false as const, error: "Effect not found" };
    }
    if (effect.system) return { success: false as const, error: "Cannot remove system effect" };
    if (!isDm(actor)) {
      if (!(await ownsCombatant(actor, targetRow))) {
        return { success: false as const, error: "Not allowed" };
      }
      if (effect.visibility === "gm") {
        return { success: false as const, error: "Not allowed" };
      }
    }

    await tx.campaignCombatEffect.delete({ where: { id: effectId } });
    targetRow.effects = targetRow.effects.filter((e) => e.id !== effectId);

    const event = await writeCombatEvent(tx, combat, "effectRemove", {
      label: effect.label.split(";")[0]?.trim() ?? effect.label,
      targetName: targetRow.name,
    }, {
      targetCombatantId: targetRow.id,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function toggleEffectActive(
  actor: CombatActor,
  effectId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let targetRow: LockedCombatantRow | null = null;
    let effect:
      | LockedCombatantRow["effects"][number]
      | undefined;
    for (const row of combat.combatants) {
      effect = row.effects.find((e) => e.id === effectId);
      if (effect) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow || !effect) {
      return { success: false as const, error: "Effect not found" };
    }
    if (effect.system) return { success: false as const, error: "Cannot toggle system effect" };
    if (!isDm(actor)) {
      if (!(await ownsCombatant(actor, targetRow))) {
        return { success: false as const, error: "Not allowed" };
      }
      if (effect.visibility === "gm") {
        return { success: false as const, error: "Not allowed" };
      }
    }

    const nextActive = !effect.active;
    await tx.campaignCombatEffect.update({
      where: { id: effectId },
      data: { active: nextActive },
    });
    effect.active = nextActive;

    const event = await writeCombatEvent(tx, combat, "note", {
      text: `${effect.label.split(";")[0]?.trim() ?? effect.label} ${nextActive ? "activated" : "deactivated"}`,
    }, {
      targetCombatantId: targetRow.id,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function clearEffects(
  actor: CombatActor,
  scope: CombatantScope,
  combatantId?: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let targets = filterCombatantsByScope(combat.combatants, scope, combatantId);
    if (scope === "one" && !combatantId) {
      return { success: false as const, error: "Combatant required" };
    }

    if (scope !== "one") {
      if (!isDm(actor)) return { success: false as const, error: "DM only" };
    } else {
      const allowed: LockedCombatantRow[] = [];
      for (const row of targets) {
        if (isDm(actor) || (await ownsCombatant(actor, row))) {
          allowed.push(row);
        }
      }
      targets = allowed;
    }

    if (targets.length === 0) {
      return { success: false as const, error: "No eligible combatants" };
    }

    const events: CombatEventRecord[] = [];
    for (const row of targets) {
      const removable = row.effects.filter((e) => !e.system);
      if (removable.length === 0) continue;

      await tx.campaignCombatEffect.deleteMany({
        where: {
          id: { in: removable.map((e) => e.id) },
          system: false,
        },
      });
      row.effects = row.effects.filter((e) => e.system);

      const event = await writeCombatEvent(tx, combat, "note", {
        text: `Effects cleared on ${row.name}`,
      }, {
        targetCombatantId: row.id,
        actorUserId: actor.userId,
      });
      events.push(event.record);
    }

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function clearTargets(
  actor: CombatActor,
  scope: ClearTargetsScope,
  combatantId?: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let targets: LockedCombatantRow[];
    if (scope === "all") {
      if (!isDm(actor)) return { success: false as const, error: "DM only" };
      targets = combat.combatants;
    } else {
      if (!combatantId) return { success: false as const, error: "Combatant required" };
      const row = combatantInCombat(combat, combatantId);
      if (!row) return { success: false as const, error: "Combatant not found" };
      if (!isDm(actor) && !(await ownsCombatant(actor, row))) {
        return { success: false as const, error: "Not allowed" };
      }
      targets = [row];
    }

    const events: CombatEventRecord[] = [];
    for (const row of targets) {
      const previous = [
        ...new Set([
          ...asTargetIds(row.targetIds),
          ...asTargetIds(row.pendingTargetIds),
        ]),
      ];
      if (previous.length === 0 && !row.pendingCrit) continue;

      await tx.campaignCombatant.update({
        where: { id: row.id },
        data: {
          targetIds: [],
          pendingTargetIds: [],
          pendingCrit: Prisma.DbNull,
        },
      });
      row.targetIds = [];
      row.pendingTargetIds = [];
      row.pendingCrit = null;

      const event = await writeCombatEvent(tx, combat, "untarget", {
        targetNames: previous.map(
          (id) => combat.combatants.find((c) => c.id === id)?.name ?? "Unknown",
        ),
      }, {
        actorCombatantId: row.id,
        actorUserId: actor.userId,
      });
      events.push(event.record);
    }

    return { success: true as const, combat, events };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function setCombatantFlags(
  actor: CombatActor,
  combatantId: string,
  flags: CombatantFlagsInput,
) {
  const hasVisibility = flags.visibleToPlayers != null || flags.identified != null;
  const hasFaction = flags.faction != null;
  const hasTurnState = flags.turnState != null;

  if (!hasVisibility && !hasFaction && !hasTurnState) {
    return { success: false as const, error: "No flags to update" };
  }

  if ((hasVisibility || hasFaction) && !isDm(actor)) {
    return { success: false as const, error: "DM only" };
  }
  if (hasTurnState && !isDm(actor)) {
    return { success: false as const, error: "DM only" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combatantInCombat(combat, combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };

    const data: Prisma.CampaignCombatantUpdateInput = {};
    if (flags.visibleToPlayers != null) {
      data.visibleToPlayers = flags.visibleToPlayers;
      row.visibleToPlayers = flags.visibleToPlayers;
    }
    if (flags.identified != null) {
      data.identified = flags.identified;
      row.identified = flags.identified;
    }
    if (flags.faction != null) {
      data.faction = flags.faction;
    }
    if (flags.turnState != null) {
      data.turnState = flags.turnState;
      row.turnState = flags.turnState;
    }

    await tx.campaignCombatant.update({ where: { id: combatantId }, data });

    const notes: string[] = [];
    if (flags.visibleToPlayers != null) {
      notes.push(flags.visibleToPlayers ? "shown to players" : "hidden from players");
    }
    if (flags.identified != null) {
      notes.push(flags.identified ? "identified" : "unidentified");
    }
    if (flags.faction != null) notes.push(`faction ${flags.faction}`);
    if (flags.turnState != null) notes.push(`turn state ${flags.turnState}`);

    const event = await writeCombatEvent(tx, combat, "note", {
      text: `${row.name}: ${notes.join(", ")}`,
    }, {
      targetCombatantId: combatantId,
      actorUserId: actor.userId,
    });

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function removeDeadNpcs(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const deadNpcs = combat.combatants.filter(
      (c) =>
        c.kind === "npc" &&
        (c.deathState === "dead" || c.turnState === "dead"),
    );
    if (deadNpcs.length === 0) {
      return { success: false as const, error: "No dead NPCs" };
    }

    const removedNames = deadNpcs.map((c) => c.name);
    const removedIds = deadNpcs.map((c) => c.id);
    await tx.campaignCombatEffect.deleteMany({
      where: { combatantId: { in: removedIds } },
    });
    await tx.campaignCombatant.deleteMany({ where: { id: { in: removedIds } } });
    combat.combatants = combat.combatants.filter((c) => !removedIds.includes(c.id));

    if (
      combat.currentCombatantId &&
      removedIds.includes(combat.currentCombatantId)
    ) {
      const nextId = combat.combatants[0]?.id ?? null;
      await tx.campaignCombat.update({
        where: { id: combat.id },
        data: { currentCombatantId: nextId },
      });
      combat.currentCombatantId = nextId;
    }

    const event = await writeCombatEvent(tx, combat, "note", {
      text: `Removed dead NPCs: ${removedNames.join(", ")}`,
    }, { actorUserId: actor.userId });

    return {
      success: true as const,
      combat,
      events: [event.record],
      removedIds,
    };
  });

  if (!result.success) return result;
  for (const combatantId of result.removedIds) {
    publishCampaignLive(actor.campaignId, { type: "combatantRemove", combatantId });
  }
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function setCombatantInit(
  actor: CombatActor,
  combatantId: string,
  init: number,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };
  await prisma.campaignCombatant.update({
    where: { id: combatantId },
    data: { init },
  });
  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  return { success: true as const };
}

export async function removeCombatant(actor: CombatActor, combatantId: string) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const combat = await loadCombatRow(actor.campaignId);
  const row = combat?.combatants.find((c) => c.id === combatantId);

  await prisma.campaignCombatant.delete({ where: { id: combatantId } });

  if (combat && combat.currentCombatantId === combatantId) {
    const remaining = combat.combatants.filter((c) => c.id !== combatantId);
    await prisma.campaignCombat.update({
      where: { id: combat.id },
      data: {
        currentCombatantId: remaining[0]?.id ?? null,
      },
    });
  }

  // Leave map token in place if any; DM can remove separately.
  void row;

  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
  publishCampaignLive(actor.campaignId, {
    type: "combatantRemove",
    combatantId,
  });
  return { success: true as const };
}

export {
  monsterToCombatStats,
  npcCreatorToCombatStats,
  publishCombatSnapshot,
  publishNpcLibrarySnapshot,
  publishEncountersSnapshot,
};
