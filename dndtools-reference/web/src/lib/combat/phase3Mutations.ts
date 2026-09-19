import { publishCampaignLive } from "@/lib/campaign/liveHub";
import {
  loadCampaignSettings,
  shouldAskPlayersToRoll,
  updateCampaignCombatSettings,
  type CampaignCombatSettings,
} from "@/lib/campaign/settings";
import {
  averagePartyLevel,
  computeDefeatedNpcXpRows,
  sumSelectedXp,
} from "@/lib/combat/combatXp";
import {
  labelsFromCombatants,
  mergeLabelsIntoPayload,
} from "@/lib/combat/eventLabels";
import { restPcPlanState, type RestKind } from "@/lib/combat/restParty";
import {
  dismissPendingRequestsForCombatant,
  loadPendingRollRequests,
  publishRollRequest,
  publishRollRequestResolved,
  rollRequestToView,
} from "@/lib/combat/rollRequests";
import { canUndoEvent, planUndoRevert } from "@/lib/combat/undoEvent";
import type {
  CombatEventKind,
  CombatEventPayloadMap,
} from "@/lib/combat/events/types";
import type { CombatActor } from "@/lib/combat/combatMutations";
import {
  addNpcToLibrary,
  applyStatePatchesInTx,
  combatantsForEventFilter,
  createEncounter,
  lockCombatRow,
  monsterToCombatStats,
  publishMutationResult,
  setEncounterEntryQuantity,
  syncPcPlanHpFromCombatant,
  writeCombatEvent,
} from "@/lib/combat/combatMutations";
import { normalizePcPlanState } from "@/lib/pc-planner/normalizePlanState";
import type { PcPlanState } from "@/lib/pc-planner/types";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function newEntityId(): string {
  return crypto.randomUUID();
}

function isDm(actor: CombatActor): boolean {
  return actor.role === "dm" && actor.userId === actor.dmUserId;
}

async function ownsPcCombatant(
  actor: CombatActor,
  pcPlanId: string | null,
): Promise<boolean> {
  if (!pcPlanId) return false;
  const link = await prisma.campaignPc.findFirst({
    where: {
      campaignId: actor.campaignId,
      pcPlanId,
      userId: actor.userId,
    },
  });
  return Boolean(link);
}

export async function findOwnedPcCombatant(
  actor: CombatActor,
  combat: { combatants: Array<{ id: string; kind: string; pcPlanId: string | null }> },
) {
  for (const c of combat.combatants) {
    if (c.kind === "pc" && c.pcPlanId && (await ownsPcCombatant(actor, c.pcPlanId))) {
      return c;
    }
  }
  return null;
}

export async function toggleCombatTargetPhase3(
  actor: CombatActor,
  targetId: string,
) {
  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    let actorRow = combat.combatants.find(
      (c) => c.id === combat.currentCombatantId,
    );

    if (!isDm(actor)) {
      actorRow = (await findOwnedPcCombatant(actor, combat)) as typeof actorRow;
      if (!actorRow) {
        return { success: false as const, error: "No PC in combat" };
      }
    } else if (!actorRow) {
      return { success: false as const, error: "No active turn" };
    }

    const raw = actorRow.targetIds;
    const ids = Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === "string")
      : [];
    const adding = !ids.includes(targetId);
    const next = adding ? [...ids, targetId] : ids.filter((id) => id !== targetId);

    await tx.campaignCombatant.update({
      where: { id: actorRow.id },
      data: { targetIds: next },
    });
    actorRow.targetIds = next;

    const filterCtx = combatantsForEventFilter(combat.combatants);
    const labels = labelsFromCombatants(
      filterCtx,
      actorRow.id,
      targetId,
      { isDm: true, viewerPcPlanId: null },
    );
    const target = combat.combatants.find((c) => c.id === targetId);
    const event = await writeCombatEvent(
      tx,
      combat,
      adding ? "target" : "untarget",
      mergeLabelsIntoPayload(
        { targetNames: [target?.name ?? "Unknown"] },
        labels,
      ),
      {
        actorCombatantId: actorRow.id,
        targetCombatantId: targetId,
        actorUserId: actor.userId,
      },
    );

    return { success: true as const, combat, events: [event.record], targetIds: next };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const, targetIds: result.targetIds };
}

export async function revealCombatant(
  actor: CombatActor,
  combatantId: string,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const row = combat.combatants.find((c) => c.id === combatantId);
    if (!row) return { success: false as const, error: "Combatant not found" };

    await tx.campaignCombatant.update({
      where: { id: combatantId },
      data: { visibleToPlayers: true },
    });
    row.visibleToPlayers = true;

    const filterCtx = combatantsForEventFilter(combat.combatants);
    const labels = labelsFromCombatants(
      filterCtx,
      null,
      combatantId,
      { isDm: true, viewerPcPlanId: null },
    );
    const event = await writeCombatEvent(
      tx,
      combat,
      "note",
      mergeLabelsIntoPayload({ text: `${row.name} appears` }, labels),
      {
        targetCombatantId: combatantId,
        actorUserId: actor.userId,
      },
    );

    return { success: true as const, combat, events: [event.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function undoCombatEvent(actor: CombatActor, eventId: string) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const eventRow = await tx.campaignCombatEvent.findFirst({
      where: { id: eventId, combatId: combat.id },
    });
    if (!eventRow || eventRow.revertedAt) {
      return { success: false as const, error: "Event not found" };
    }

    const allRows = await tx.campaignCombatEvent.findMany({
      where: { combatId: combat.id },
      select: {
        id: true,
        kind: true,
        targetCombatantId: true,
        revertedAt: true,
        seq: true,
      },
      orderBy: { seq: "asc" },
    });

    const check = canUndoEvent(
      {
        id: eventRow.id,
        kind: eventRow.kind as CombatEventKind,
        targetCombatantId: eventRow.targetCombatantId,
        reverted: eventRow.revertedAt != null,
      },
      allRows.map((row) => ({
        ...row,
        kind: row.kind as CombatEventKind,
      })),
    );
    if (!check.ok) return { success: false as const, error: check.reason };

    const kind = eventRow.kind as CombatEventKind;
    const payload = eventRow.payload as CombatEventPayloadMap[CombatEventKind];
    const targetId = eventRow.targetCombatantId;

    let effectRow = null;
    if (kind === "effectApply" || kind === "effectRemove") {
      const p = payload as CombatEventPayloadMap["effectApply"];
      effectRow = await tx.campaignCombatEffect.findFirst({
        where: { combatantId: targetId ?? "", label: p.label },
        orderBy: { createdAt: "desc" },
      });
    }

    const plan = planUndoRevert(kind, payload, targetId, effectRow ?? undefined);

    await applyStatePatchesInTx(tx, plan.combatantPatches);
    for (const patch of plan.combatantPatches) {
      const row = combat.combatants.find((c) => c.id === patch.combatantId);
      if (!row) continue;
      if (patch.wounds != null) row.wounds = patch.wounds;
      if (patch.hpTemp != null) row.hpTemp = patch.hpTemp;
      if (patch.nonlethal != null) row.nonlethal = patch.nonlethal;
      if (patch.deathState !== undefined) row.deathState = patch.deathState;
      if (patch.init != null) row.init = patch.init;
      await syncPcPlanHpFromCombatant(tx, actor, row, row.wounds, row.hpTemp);
    }

    if (plan.effectDeletes.length) {
      await tx.campaignCombatEffect.deleteMany({
        where: { id: { in: plan.effectDeletes } },
      });
    }
    for (const restore of plan.effectRestores) {
      await tx.campaignCombatEffect.create({ data: restore.data });
    }

    await tx.campaignCombatEvent.update({
      where: { id: eventId },
      data: { revertedAt: new Date() },
    });

    const undoEvent = await writeCombatEvent(tx, combat, "undo", {
      revertedSeq: eventRow.seq,
      revertedKind: kind,
      summary: plan.summary,
    }, {
      actorUserId: actor.userId,
      targetCombatantId: targetId,
    });

    return {
      success: true as const,
      combat,
      events: [undoEvent.record],
      revertedEventId: eventId,
    };
  });

  if (!result.success) return result;
  publishCampaignLive(actor.campaignId, {
    type: "combatEventReverted",
    eventId: result.revertedEventId,
  });
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function restParty(actor: CombatActor, kind: RestKind) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    const pcRows = combat.combatants.filter((c) => c.kind === "pc" && c.pcPlanId);
    for (const row of pcRows) {
      const plan = await tx.pcPlan.findUnique({ where: { id: row.pcPlanId! } });
      if (!plan) continue;
      const nextState = restPcPlanState(plan.state as PcPlanState, kind);
      await tx.pcPlan.update({
        where: { id: plan.id },
        data: { state: nextState as object },
      });

      const rawCurrent = nextState.hitPoints.current ?? Math.max(0, row.hpMax - row.wounds);
      const current = Math.min(row.hpMax, rawCurrent);
      row.wounds = Math.max(0, row.hpMax - current);
      row.hpTemp = 0;
      row.nonlethal = 0;
      await tx.campaignCombatant.update({
        where: { id: row.id },
        data: {
          wounds: row.wounds,
          hpTemp: row.hpTemp,
          nonlethal: 0,
          deathState: null,
        },
      });

      await tx.campaignCombatEffect.deleteMany({
        where: {
          combatantId: row.id,
          durationUnit: "day",
        },
      });
      row.effects = row.effects.filter((e) => e.durationUnit !== "day");

      publishCampaignLive(actor.campaignId, {
        type: "pcUpdated",
        pcPlanId: plan.id,
        actorUserId: actor.userId,
        updatedAt: new Date().toISOString(),
      });
    }

    const note = await writeCombatEvent(tx, combat, "note", {
      text: kind === "full" ? "Party takes full bed rest" : "Party rests overnight",
    }, { actorUserId: actor.userId });

    return { success: true as const, combat, events: [note.record] };
  });

  if (!result.success) return result;
  await publishMutationResult(actor, result.combat, result.events);
  return { success: true as const };
}

export async function computeEndCombatXp(actor: CombatActor) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const combat = await prisma.campaignCombat.findUnique({
    where: { campaignId: actor.campaignId },
    include: {
      combatants: {
        orderBy: [{ init: "desc" as const }, { seq: "asc" as const }],
        include: { effects: true },
      },
    },
  });
  if (!combat) return { success: false as const, error: "No combat" };

  const pcs = await prisma.campaignPc.findMany({
    where: { campaignId: actor.campaignId },
    include: { pcPlan: { select: { state: true } } },
  });
  const partySize = Math.max(1, pcs.length);
  const partyLevel = averagePartyLevel(pcs.map((p) => p.pcPlan));

  const rows = computeDefeatedNpcXpRows(
    combat.combatants.filter((c) => c.kind === "npc"),
    partySize,
  );

  const totalXp = sumSelectedXp(rows);
  return {
    success: true as const,
    partySize,
    partyLevel,
    defeated: rows,
    totalXp,
    perPc: partySize > 0 ? Math.floor(totalXp) : 0,
  };
}

export async function endCombatWithOptions(
  actor: CombatActor,
  opts: {
    awardXp?: boolean;
    selectedNpcIds?: string[];
    removeAllNpcs?: boolean;
  } = {},
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };

    if (opts.awardXp && opts.selectedNpcIds?.length) {
      const pcs = await tx.campaignPc.findMany({
        where: { campaignId: actor.campaignId },
        include: { pcPlan: true },
      });
      const partySize = Math.max(1, pcs.length);
      const rows = computeDefeatedNpcXpRows(
        combat.combatants.filter((c) => c.kind === "npc"),
        partySize,
      ).map((r) => ({
        ...r,
        selected: opts.selectedNpcIds!.includes(r.combatantId),
      }));
      const total = sumSelectedXp(rows);
      const share = partySize > 0 ? Math.floor(total) : 0;

      for (const pc of pcs) {
        const state = normalizePcPlanState(pc.pcPlan.state as PcPlanState);
        const nextXp = (state.identity.xp ?? 0) + share;
        const nextState = {
          ...state,
          identity: { ...state.identity, xp: nextXp },
        };
        await tx.pcPlan.update({
          where: { id: pc.pcPlanId },
          data: { state: nextState as object },
        });
        publishCampaignLive(actor.campaignId, {
          type: "pcUpdated",
          pcPlanId: pc.pcPlanId,
          actorUserId: actor.userId,
          updatedAt: new Date().toISOString(),
        });
      }

      await writeCombatEvent(tx, combat, "note", {
        text: `Awarded ${share} XP to each PC (${total} total)`,
      }, { actorUserId: actor.userId });
    }

    if (opts.removeAllNpcs) {
      const npcIds = combat.combatants.filter((c) => c.kind === "npc").map((c) => c.id);
      if (npcIds.length) {
        await tx.campaignCombatEffect.deleteMany({
          where: { combatantId: { in: npcIds } },
        });
        await tx.campaignCombatant.deleteMany({ where: { id: { in: npcIds } } });
        combat.combatants = combat.combatants.filter((c) => c.kind !== "npc");
      }
    }

    const combatantIds = combat.combatants.map((c) => c.id);
    if (combatantIds.length > 0) {
      await tx.campaignCombatEffect.deleteMany({
        where: { combatantId: { in: combatantIds }, duration: { not: null } },
      });
      await tx.campaignCombatant.updateMany({
        where: { combatId: combat.id },
        data: {
          pendingTargetIds: [],
          pendingCrit: Prisma.DbNull,
          targetIds: [],
        },
      });
    }

    await tx.campaignCombatRollRequest.deleteMany({
      where: { combatId: combat.id, status: "pending" },
    });

    const keep = 2000;
    const oldEvents = await tx.campaignCombatEvent.findMany({
      where: { combatId: combat.id },
      orderBy: { seq: "desc" },
      skip: keep,
      select: { id: true },
    });
    if (oldEvents.length) {
      await tx.campaignCombatEvent.deleteMany({
        where: { id: { in: oldEvents.map((e) => e.id) } },
      });
    }

    await tx.campaignCombat.update({
      where: { id: combat.id },
      data: { state: "ended", active: false, endedAt: new Date() },
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

export async function createSaveRollRequest(
  actor: CombatActor,
  input: {
    targetCombatantId: string;
    saveType: "fort" | "ref" | "will";
    dc: number;
    label: string;
    sourceEventId?: string | null;
  },
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const result = await prisma.$transaction(async (tx) => {
    const combat = await lockCombatRow(tx, actor.campaignId);
    if (!combat) return { success: false as const, error: "No combat" };
    const target = combat.combatants.find((c) => c.id === input.targetCombatantId);
    if (!target) return { success: false as const, error: "Target not found" };

    const row = await tx.campaignCombatRollRequest.create({
      data: {
        id: newEntityId(),
        combatId: combat.id,
        targetCombatantId: input.targetCombatantId,
        kind: "save",
        saveType: input.saveType,
        dc: input.dc,
        label: input.label,
        sourceEventId: input.sourceEventId ?? null,
        status: "pending",
      },
    });

    return { success: true as const, request: rollRequestToView(row), combat };
  });

  if (!result.success) return result;
  publishRollRequest(actor.campaignId, result.request);
  await publishMutationResult(actor, result.combat, []);
  return { success: true as const, request: result.request };
}

export async function dismissRollRequest(actor: CombatActor, requestId: string) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  const row = await prisma.campaignCombatRollRequest.update({
    where: { id: requestId },
    data: { status: "dismissed" },
  });
  publishRollRequestResolved(actor.campaignId, row.id);
  return { success: true as const };
}

export async function resolveRollRequestStatus(
  requestId: string,
  status: "rolled" | "dmRolled",
) {
  await prisma.campaignCombatRollRequest.update({
    where: { id: requestId },
    data: { status },
  });
}

export async function setCampaignCombatSettingsAction(
  actor: CombatActor,
  patch: Partial<CampaignCombatSettings>,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };
  const settings = await updateCampaignCombatSettings(actor.campaignId, patch);
  publishCampaignLive(actor.campaignId, {
    type: "combatSettings",
    settings: settings.combat ?? {},
  });
  return { success: true as const, settings };
}

export async function sendEncounterToCampaign(
  actor: CombatActor,
  encounterName: string,
  monsters: Array<{ monsterSlug: string; quantity: number; faction?: "friend" | "foe" | "neutral" }>,
) {
  if (!isDm(actor)) return { success: false as const, error: "DM only" };

  for (const m of monsters) {
    const monster = await prisma.monster.findUnique({ where: { slug: m.monsterSlug } });
    if (!monster) continue;
    const stats = monsterToCombatStats(monster);
    await addNpcToLibrary(actor, {
      name: monster.name,
      faction: m.faction ?? "foe",
      source: "monster",
      monsterSlug: m.monsterSlug,
      snapshot: stats.snapshot,
      stats,
    });
  }

  const library = await prisma.campaignNpc.findMany({
    where: {
      campaignId: actor.campaignId,
      monsterSlug: { in: monsters.map((m) => m.monsterSlug) },
    },
  });

  const enc = await createEncounter(actor, encounterName);
  if (!enc.success) return enc;

  for (const m of monsters) {
    const npc = library.find((n) => n.monsterSlug === m.monsterSlug);
    if (!npc) continue;
    await setEncounterEntryQuantity(actor, enc.encounterId, npc.id, m.quantity);
  }

  return {
    success: true as const,
    encounterId: enc.encounterId,
    campaignId: actor.campaignId,
  };
}

export async function cleanupCombatantRemoval(
  actor: CombatActor,
  combatId: string,
  combatantId: string,
) {
  const dismissed = await dismissPendingRequestsForCombatant(combatId, combatantId);
  for (const id of dismissed) {
    publishRollRequestResolved(actor.campaignId, id);
  }
}

export { loadPendingRollRequests, shouldAskPlayersToRoll, loadCampaignSettings };
