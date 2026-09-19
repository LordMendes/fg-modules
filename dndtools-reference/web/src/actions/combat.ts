"use server";

import { randomUUID } from "node:crypto";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  actNow,
  addCombatantFromStats,
  addEffect,
  addEncounterToCombat,
  addNpcLibraryToCombat,
  addNpcToLibrary,
  advanceCombatTurn,
  applyCombatDamage,
  applyHeal,
  applyNonlethal,
  applyTempHp,
  clearEffects,
  clearTargets,
  createEncounter,
  delayCombatant,
  deleteEncounter,
  endCombat,
  ensureCombat,
  monsterToCombatStats,
  npcCreatorToCombatStats,
  pcPlanToCombatStats,
  placeCombatantOnMap,
  publishCombatSnapshot,
  readyCombatant,
  removeCombatant,
  removeDeadNpcs,
  removeEffect,
  renameEncounter,
  resetCombat,
  rollInitiativeFor,
  setActiveCombatant,
  setCombatantFlags,
  setCombatantInit,
  setCombatantSpells,
  setSpellUses,
  resetSpellUses,
  setEncounterEntryQuantity,
  setHp,
  startCombat,
  statsFromNpcSnapshot,
  toggleCombatTarget,
  setCombatTargets,
  toggleEffectActive,
  updateEffect,
  type AddEffectInput,
  type UpdateEffectInput,
  type CombatActor,
  type CombatantFlagsInput,
  type CombatantScope,
  type ClearTargetsScope,
  type InitiativeScope,
} from "@/lib/combat/combatMutations";
import {
  loadCombatForViewer,
  loadEncounters,
  loadNpcLibrary,
} from "@/lib/combat/loadCombat";
import type { CombatFaction, CombatSpellEntry, CombatSpellUses } from "@/lib/combat/types";
import type { NpcFgExportState } from "@/lib/npc-creator/types";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import type { MapTokenView } from "@/lib/map/types";
import { tryPublicUrlForKey } from "@/lib/storage/r2";
import { prisma } from "@/lib/prisma";
import { normalizePcPlanState } from "@/lib/pc-planner/normalizePlanState";
import type { PcPlanState } from "@/lib/pc-planner/types";

export type CombatActionResult = {
  success: boolean;
  error?: string;
};

function newEntityId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

export async function requireCombatActor(campaignId: string): Promise<
  | { ok: false; error: string }
  | { ok: true; actor: CombatActor; isDm: boolean; pcPlanId: string | null }
> {
  const user = await requireCurrentUser();
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
    include: { campaign: { select: { dmUserId: true } } },
  });
  if (!member || member.status !== "active") {
    return { ok: false, error: "Not a campaign member" };
  }
  const isDm = member.role === "dm";
  const pcLink = await prisma.campaignPc.findFirst({
    where: { campaignId, userId: user.id },
    select: { pcPlanId: true },
  });
  return {
    ok: true,
    actor: {
      userId: user.id,
      role: isDm ? "dm" : "player",
      campaignId,
      dmUserId: member.campaign.dmUserId,
    },
    isDm,
    pcPlanId: pcLink?.pcPlanId ?? null,
  };
}

export async function searchMonstersForCombat(
  query: string,
  limit = 20,
): Promise<
  { slug: string; name: string; cr: string | null; size: string | null }[]
> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.monster.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      slug: true,
      name: true,
      challengeRating: true,
      size: true,
    },
    take: limit,
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    cr: r.challengeRating,
    size: r.size,
  }));
}

export async function addMonsterToNpcLibrary(
  campaignId: string,
  monsterSlug: string,
  faction: CombatFaction = "foe",
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };

  const monster = await prisma.monster.findUnique({
    where: { slug: monsterSlug },
  });
  if (!monster) return { success: false, error: "Monster not found" };

  const stats = monsterToCombatStats(monster);
  const result = await addNpcToLibrary(auth.actor, {
    name: stats.name,
    faction,
    source: "monster",
    monsterSlug,
    snapshot: stats.snapshot,
    stats,
  });
  if (!result.success) return result;
  return { success: true };
}

export async function addTemplateToNpcLibrary(
  campaignId: string,
  name: string,
  state: NpcFgExportState,
  faction: CombatFaction = "foe",
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };

  const stats = npcCreatorToCombatStats(state);
  const result = await addNpcToLibrary(auth.actor, {
    name: name.trim() || stats.name,
    faction,
    source: "template",
    snapshot: stats.snapshot,
    stats,
  });
  return result.success ? { success: true } : result;
}

export async function addNpcToCombatAction(
  campaignId: string,
  npcLibraryId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  const result = await addNpcLibraryToCombat(auth.actor, npcLibraryId);
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function createEncounterAction(
  campaignId: string,
  name: string,
): Promise<CombatActionResult & { encounterId?: string }> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  const result = await createEncounter(auth.actor, name);
  return result.success
    ? { success: true, encounterId: result.encounterId }
    : { success: false, error: result.error };
}

export async function renameEncounterAction(
  campaignId: string,
  encounterId: string,
  name: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  return renameEncounter(auth.actor, encounterId, name);
}

export async function deleteEncounterAction(
  campaignId: string,
  encounterId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  return deleteEncounter(auth.actor, encounterId);
}

export async function setEncounterEntryAction(
  campaignId: string,
  encounterId: string,
  campaignNpcId: string,
  quantity: number,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  return setEncounterEntryQuantity(
    auth.actor,
    encounterId,
    campaignNpcId,
    quantity,
  );
}

export async function addEncounterToCombatAction(
  campaignId: string,
  encounterId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  const result = await addEncounterToCombat(auth.actor, encounterId);
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

export async function placeCombatantOnMapAction(
  campaignId: string,
  mapId: string,
  combatantId: string,
  x: number,
  y: number,
): Promise<CombatActionResult & { token?: MapTokenView }> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };
  return placeCombatantOnMap(auth.actor, mapId, combatantId, x, y);
}

export async function spawnNpcOnMap(
  campaignId: string,
  mapId: string,
  npcLibraryId: string,
  x: number,
  y: number,
): Promise<CombatActionResult & { token?: MapTokenView }> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };

  const npc = await prisma.campaignNpc.findFirst({
    where: { id: npcLibraryId, campaignId },
  });
  if (!npc) return { success: false, error: "NPC not found" };

  const stats = statsFromNpcSnapshot(npc.name, npc.snapshot);

  const map = await prisma.campaignMap.findFirst({
    where: { id: mapId, campaignId },
  });
  if (!map) return { success: false, error: "Map not found" };

  const tokenId = newEntityId();
  const visibility = map.fogEnabled ? "mask" : "always";

  await prisma.campaignMapToken.create({
    data: {
      id: tokenId,
      mapId,
      kind: "npc",
      name: npc.name,
      imageKey: npc.imageKey,
      x,
      y,
      width: stats.spaceSquares,
      height: stats.spaceSquares,
      layer: "token",
      visibility,
      campaignNpcId: npc.id,
    },
  });

  await addCombatantFromStats(auth.actor, {
    kind: "npc",
    name: npc.name,
    faction: npc.faction as CombatFaction,
    tokenId,
    campaignNpcId: npc.id,
    stats,
  });

  const token: MapTokenView = {
    id: tokenId,
    kind: "npc",
    pcPlanId: null,
    name: npc.name,
    imageUrl: npc.imageKey ? tryPublicUrlForKey(npc.imageKey) : null,
    x,
    y,
    width: stats.spaceSquares,
    height: stats.spaceSquares,
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
  publishCampaignLive(campaignId, { type: "mapTokenUpsert", token });

  return { success: true, token };
}

export async function addPartyToCombat(
  campaignId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (!auth.isDm) return { success: false, error: "DM only" };

  const combatRow = await ensureCombat(auth.actor);
  if (!combatRow) return { success: false, error: "DM only" };

  const pcs = await prisma.campaignPc.findMany({
    where: { campaignId },
    include: { pcPlan: { select: { name: true, state: true } } },
  });

  const existingPc = new Set(
    combatRow.combatants.map((c) => c.pcPlanId).filter(Boolean),
  );

  for (const link of pcs) {
    if (existingPc.has(link.pcPlanId)) continue;
    const state = normalizePcPlanState(parseState(link.pcPlan.state));
    const stats = pcPlanToCombatStats(link.pcPlan.name, state);
    const hp = state.hitPoints;
    const wounds =
      hp.current != null ? Math.max(0, stats.hpMax - hp.current) : 0;

    await addCombatantFromStats(auth.actor, {
      kind: "pc",
      name: link.pcPlan.name,
      faction: "friend",
      pcPlanId: link.pcPlanId,
      stats,
      silent: true,
    });

    const added = await prisma.campaignCombatant.findFirst({
      where: { combatId: combatRow.id, pcPlanId: link.pcPlanId },
    });
    if (added && wounds > 0) {
      await prisma.campaignCombatant.update({
        where: { id: added.id },
        data: { wounds, hpTemp: hp.temporary ?? 0 },
      });
    }
  }

  await publishCombatSnapshot(campaignId, auth.actor.dmUserId);
  return { success: true };
}

function parseState(raw: unknown): PcPlanState {
  if (!raw || typeof raw !== "object") {
    return normalizePcPlanState({} as PcPlanState);
  }
  return raw as PcPlanState;
}

export async function combatStart(
  campaignId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return startCombat(auth.actor);
}

export async function combatEnd(
  campaignId: string,
  opts?: {
    awardXp?: boolean;
    selectedNpcIds?: string[];
    removeAllNpcs?: boolean;
  },
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return endCombat(auth.actor, opts);
}

export async function combatComputeEndXp(campaignId: string) {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false as const, error: auth.error };
  const { computeEndCombatXp } = await import("@/lib/combat/phase3Mutations");
  return computeEndCombatXp(auth.actor);
}

export async function combatUndo(
  campaignId: string,
  eventId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  const { undoCombatEvent } = await import("@/lib/combat/phase3Mutations");
  return undoCombatEvent(auth.actor, eventId);
}

export async function combatRest(
  campaignId: string,
  kind: "night" | "full",
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  const { restParty } = await import("@/lib/combat/phase3Mutations");
  return restParty(auth.actor, kind);
}

export async function combatReveal(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  const { revealCombatant } = await import("@/lib/combat/phase3Mutations");
  return revealCombatant(auth.actor, combatantId);
}

export async function combatDismissRollRequest(
  campaignId: string,
  requestId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  const { dismissRollRequest } = await import("@/lib/combat/phase3Mutations");
  return dismissRollRequest(auth.actor, requestId);
}

export async function combatCreateSaveRequest(
  campaignId: string,
  input: {
    targetCombatantId: string;
    saveType: "fort" | "ref" | "will";
    dc: number;
    label: string;
    sourceEventId?: string | null;
  },
) {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false as const, error: auth.error };
  const { createSaveRollRequest } = await import("@/lib/combat/phase3Mutations");
  return createSaveRollRequest(auth.actor, input);
}

export async function combatSetSettings(
  campaignId: string,
  patch: { strictTurns?: boolean; askPlayersToRoll?: boolean },
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  const { setCampaignCombatSettingsAction } =
    await import("@/lib/combat/phase3Mutations");
  return setCampaignCombatSettingsAction(auth.actor, patch);
}

export async function sendEncounterBuilderToCampaign(
  campaignId: string,
  encounterName: string,
  monsters: Array<{ monsterSlug: string; quantity: number }>,
) {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false as const, error: auth.error };
  const { sendEncounterToCampaign } = await import("@/lib/combat/phase3Mutations");
  return sendEncounterToCampaign(auth.actor, encounterName, monsters);
}

export async function combatReset(
  campaignId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return resetCombat(auth.actor);
}

export async function combatRollInitiative(
  campaignId: string,
  scope: InitiativeScope,
  combatantId?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return rollInitiativeFor(auth.actor, scope, combatantId);
}

export async function combatSetActiveCombatant(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setActiveCombatant(auth.actor, combatantId);
}

export async function combatDelayCombatant(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return delayCombatant(auth.actor, combatantId);
}

export async function combatReadyCombatant(
  campaignId: string,
  combatantId: string,
  trigger?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return readyCombatant(auth.actor, combatantId, trigger);
}

export async function combatActNow(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return actNow(auth.actor, combatantId);
}

export async function combatNextTurn(
  campaignId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return advanceCombatTurn(auth.actor);
}

export async function combatSetCombatTargets(
  campaignId: string,
  targetIds: string[],
): Promise<CombatActionResult & { targetIds?: string[] }> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setCombatTargets(auth.actor, targetIds);
}

export async function combatToggleTarget(
  campaignId: string,
  targetCombatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return toggleCombatTarget(auth.actor, targetCombatantId);
}

export async function combatSetInitiative(
  campaignId: string,
  combatantId: string,
  init: number,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setCombatantInit(auth.actor, combatantId, init);
}

export async function combatApplyDamage(
  campaignId: string,
  combatantId: string,
  damage:
    | number
    | { amount: number; types?: import("@/lib/combat/types").DamageType[]; source?: string },
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  if (typeof damage === "number") {
    return applyCombatDamage(auth.actor, combatantId, damage);
  }
  return applyCombatDamage(auth.actor, combatantId, {
    packets: [
      {
        amount: Math.max(0, Math.trunc(damage.amount)),
        types: damage.types?.length ? damage.types : ["untyped"],
        source: damage.source ?? "Damage",
      },
    ],
  });
}

export async function combatApplyHeal(
  campaignId: string,
  combatantId: string,
  amount: number,
  source?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return applyHeal(auth.actor, combatantId, amount, source);
}

export async function combatApplyTempHp(
  campaignId: string,
  combatantId: string,
  amount: number,
  source?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return applyTempHp(auth.actor, combatantId, amount, source);
}

export async function combatSetHp(
  campaignId: string,
  combatantId: string,
  hp: number,
  note?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setHp(auth.actor, combatantId, hp, note);
}

export async function combatApplyNonlethal(
  campaignId: string,
  combatantId: string,
  amount: number,
  source?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return applyNonlethal(auth.actor, combatantId, amount, source);
}

export async function combatAddEffect(
  campaignId: string,
  combatantIds: string[],
  input: AddEffectInput,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return addEffect(auth.actor, combatantIds, input);
}

export async function combatRemoveEffect(
  campaignId: string,
  effectId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return removeEffect(auth.actor, effectId);
}

export async function combatToggleEffectActive(
  campaignId: string,
  effectId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return toggleEffectActive(auth.actor, effectId);
}

export async function combatUpdateEffect(
  campaignId: string,
  effectId: string,
  input: UpdateEffectInput,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return updateEffect(auth.actor, effectId, input);
}

export async function combatClearEffects(
  campaignId: string,
  scope: CombatantScope,
  combatantId?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return clearEffects(auth.actor, scope, combatantId);
}

export async function combatClearTargets(
  campaignId: string,
  scope: ClearTargetsScope,
  combatantId?: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return clearTargets(auth.actor, scope, combatantId);
}

export async function combatSetCombatantFlags(
  campaignId: string,
  combatantId: string,
  flags: CombatantFlagsInput,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setCombatantFlags(auth.actor, combatantId, flags);
}

export async function combatSetCombatantSpells(
  campaignId: string,
  combatantId: string,
  spells: CombatSpellEntry[],
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setCombatantSpells(auth.actor, combatantId, spells);
}

export async function combatSetSpellUses(
  campaignId: string,
  combatantId: string,
  spellUses: CombatSpellUses,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return setSpellUses(auth.actor, combatantId, spellUses);
}

export async function combatResetSpellUses(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return resetSpellUses(auth.actor, combatantId);
}

export async function combatRemoveDeadNpcs(
  campaignId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return removeDeadNpcs(auth.actor);
}

export async function combatRemoveCombatant(
  campaignId: string,
  combatantId: string,
): Promise<CombatActionResult> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) return { success: false, error: auth.error };
  return removeCombatant(auth.actor, combatantId);
}

export async function loadCombatState(campaignId: string): Promise<{
  combat: Awaited<ReturnType<typeof loadCombatForViewer>>;
  npcLibrary: Awaited<ReturnType<typeof loadNpcLibrary>>;
  encounters: Awaited<ReturnType<typeof loadEncounters>>;
}> {
  const auth = await requireCombatActor(campaignId);
  if (!auth.ok) {
    return { combat: null, npcLibrary: [], encounters: [] };
  }
  const [combat, npcLibrary, encounters] = await Promise.all([
    loadCombatForViewer(campaignId, {
      isDm: auth.isDm,
      pcPlanId: auth.pcPlanId,
    }),
    auth.isDm ? loadNpcLibrary(campaignId) : Promise.resolve([]),
    auth.isDm ? loadEncounters(campaignId) : Promise.resolve([]),
  ]);
  return { combat, npcLibrary, encounters };
}
