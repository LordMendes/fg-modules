import { publishCampaignLive } from "@/lib/campaign/liveHub";
import { CONDITION_PRESETS } from "@/lib/combat/effects/presets";
import { parseEffect } from "@/lib/combat/effects/parseEffect";
import type {
  CombatEventKind,
  CombatEventPayloadMap,
  CombatEventRecord,
  CombatEventVisibility,
  CombatFilterCombatant,
} from "@/lib/combat/events/types";
import { deriveHealthStatus } from "@/lib/combat/healthStatus";
import {
  applyDefenses,
  type DamageFlags,
} from "@/lib/combat/rules/damage";
import { resolveDeathState } from "@/lib/combat/rules/death";
import type { CombatFaction, DamagePacket } from "@/lib/combat/types";
import type { Prisma } from "@/generated/prisma/client";
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
  }>;
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
  const statusAfter = deriveHealthStatus(c.hpMax, defenseResult.wounds, defenseResult.hpTemp);

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
    include: combatInclude,
  });
}

async function publishCombatSnapshot(
  campaignId: string,
  dmUserId: string,
  viewer?: { isDm: boolean; pcPlanId?: string | null },
) {
  const combat = await loadCombatRow(campaignId);
  const view = combatViewFromRow(combat, {
    isDm: viewer?.isDm ?? true,
    viewerPcPlanId: viewer?.pcPlanId ?? null,
  });
  publishCampaignLive(campaignId, { type: "combatSnapshot", combat: view });
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
      include: combatInclude,
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

export async function advanceCombatTurn(actor: CombatActor) {
  const combat = await loadCombatRow(actor.campaignId);
  if (!combat || combat.combatants.length === 0) {
    return { success: false as const, error: "No combatants" };
  }

  const sorted = [...combat.combatants].sort((a, b) => b.init - a.init);
  const idx = sorted.findIndex((c) => c.id === combat.currentCombatantId);
  const nextIdx = idx < 0 ? 0 : (idx + 1) % sorted.length;
  const nextRound = idx >= 0 && nextIdx === 0;

  await prisma.campaignCombat.update({
    where: { id: combat.id },
    data: {
      currentCombatantId: sorted[nextIdx]!.id,
      round: nextRound ? combat.round + 1 : combat.round,
    },
  });

  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);
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
