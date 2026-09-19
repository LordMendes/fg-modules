import { publishCampaignLive } from "@/lib/campaign/liveHub";
import type { CombatFaction } from "@/lib/combat/types";
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
import { applyDamageToHp } from "@/lib/combat/parseHp";
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
  damage: number,
) {
  const combat = await loadCombatRow(actor.campaignId);
  if (!combat) return { success: false as const, error: "No combat" };

  const c = combat.combatants.find((x) => x.id === combatantId);
  if (!c) return { success: false as const, error: "Combatant not found" };

  const next = applyDamageToHp(c.hpMax, c.wounds, c.hpTemp, damage);

  await prisma.campaignCombatant.update({
    where: { id: combatantId },
    data: { wounds: next.wounds, hpTemp: next.hpTemp },
  });

  if (c.kind === "pc" && c.pcPlanId) {
    const plan = await prisma.pcPlan.findUnique({
      where: { id: c.pcPlanId },
      select: { state: true, userId: true },
    });
    if (plan?.state && typeof plan.state === "object") {
      const state = normalizePcPlanState(
        structuredClone(plan.state as PcPlanState),
      );
      const hp = normalizeHitPointsState(state.hitPoints);
      const current = Math.max(0, c.hpMax - next.wounds);
      state.hitPoints = { ...hp, current, temporary: next.hpTemp };
      await prisma.pcPlan.update({
        where: { id: c.pcPlanId },
        data: { state: state as object },
      });
      publishCampaignLive(actor.campaignId, {
        type: "pcUpdated",
        pcPlanId: c.pcPlanId,
        actorUserId: actor.userId,
        updatedAt: new Date().toISOString(),
      });
    }
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
