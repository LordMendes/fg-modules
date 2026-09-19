import {
  combatViewFromRow,
  encounterViewFromRow,
  npcViewFromRow,
  snapshotCombatStats,
} from "@/lib/combat/combatView";
import { filterEventForViewer } from "@/lib/combat/events/filter";
import type {
  CombatEventKind,
  CombatEventPayload,
  CombatEventRecord,
  CombatEventView,
  CombatEventVisibility,
} from "@/lib/combat/events/types";
import type {
  CampaignCombatView,
  CampaignEncounterView,
  CampaignNpcView,
} from "@/lib/combat/types";
import { loadCampaignSettings } from "@/lib/campaign/settings";
import { calculateEncounterSummary } from "@/lib/encounter/calculateEl";
import { parseCr } from "@/lib/encounter/parseCr";
import { averagePartyLevel } from "@/lib/combat/combatXp";
import { loadPendingRollRequests } from "@/lib/combat/rollRequests";
import { prisma } from "@/lib/prisma";
import { tryPublicUrlForKey } from "@/lib/storage/r2";

function eventRowToRecord(row: {
  id: string;
  seq: number;
  round: number;
  kind: string;
  actorCombatantId: string | null;
  targetCombatantId: string | null;
  payload: unknown;
  visibility: string;
  rollId: string | null;
  revertedAt: Date | null;
  createdAt: Date;
}): CombatEventRecord {
  return {
    id: row.id,
    seq: row.seq,
    round: row.round,
    kind: row.kind as CombatEventKind,
    at: row.createdAt.toISOString(),
    actorCombatantId: row.actorCombatantId,
    targetCombatantId: row.targetCombatantId,
    actorName: null,
    targetName: null,
    payload: row.payload as CombatEventPayload,
    visibility: row.visibility as CombatEventVisibility,
    rollId: row.rollId,
    reverted: row.revertedAt != null,
  };
}

const combatInclude = {
  combatants: {
    orderBy: [{ init: "desc" as const }, { seq: "asc" as const }],
    include: {
      effects: { orderBy: { seq: "asc" as const } },
    },
  },
};

export async function loadCombatForViewer(
  campaignId: string,
  viewer: { isDm: boolean; pcPlanId?: string | null },
): Promise<CampaignCombatView | null> {
  const combat = await prisma.campaignCombat.findUnique({
    where: { campaignId },
    include: combatInclude,
  });
  if (!combat) return null;

  const tokenIds = combat.combatants
    .map((c) => c.tokenId)
    .filter((id): id is string => Boolean(id));
  const tokens =
    tokenIds.length > 0
      ? await prisma.campaignMapToken.findMany({
          where: { id: { in: tokenIds } },
          select: { id: true, imageKey: true },
        })
      : [];
  const tokenImages = new Map<string, string | null>();
  for (const t of tokens) {
    tokenImages.set(t.id, t.imageKey ? tryPublicUrlForKey(t.imageKey) : null);
  }

  const settings = await loadCampaignSettings(campaignId);
  const rollRequests =
    combat.state === "active" || combat.state === "idle"
      ? await loadPendingRollRequests(combat.id)
      : [];

  const view = combatViewFromRow(combat, {
    isDm: viewer.isDm,
    viewerPcPlanId: viewer.pcPlanId ?? null,
    tokenImages,
  });
  if (!view) return null;
  return {
    ...view,
    settings: {
      strictTurns: settings.combat?.strictTurns === true,
      askPlayersToRoll: settings.combat?.askPlayersToRoll !== false,
    },
    rollRequests: viewer.isDm
      ? rollRequests
      : rollRequests.filter((r) => {
          const target = combat.combatants.find(
            (c) => c.id === r.targetCombatantId,
          );
          return target?.pcPlanId === viewer.pcPlanId;
        }),
  };
}

export async function loadCombatEvents(
  campaignId: string,
  viewer: { isDm: boolean; pcPlanId?: string | null },
  limit = 100,
): Promise<CombatEventView[]> {
  const combat = await prisma.campaignCombat.findUnique({
    where: { campaignId },
    include: {
      combatants: {
        select: {
          id: true,
          name: true,
          pcPlanId: true,
          visibleToPlayers: true,
          identified: true,
        },
        orderBy: { seq: "asc" },
      },
      events: {
        orderBy: { seq: "desc" },
        take: limit,
      },
    },
  });
  if (!combat) return [];

  const filterContext = {
    combatants: combat.combatants.map((c, index) => ({
      id: c.id,
      name: c.name,
      pcPlanId: c.pcPlanId,
      visibleToPlayers: c.visibleToPlayers,
      identified: c.identified,
      genericLabel: `Creature ${index + 1}`,
    })),
  };

  return combat.events
    .map(eventRowToRecord)
    .map((record) =>
      filterEventForViewer(record, {
        isDm: viewer.isDm,
        viewerPcPlanId: viewer.pcPlanId ?? null,
      }, filterContext),
    )
    .filter((event): event is CombatEventView => event != null)
    .reverse();
}

export async function loadNpcLibrary(
  campaignId: string,
): Promise<CampaignNpcView[]> {
  const rows = await prisma.campaignNpc.findMany({
    where: { campaignId },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => {
    const stats = snapshotCombatStats(row.snapshot);
    const imageUrl = row.imageKey ? tryPublicUrlForKey(row.imageKey) : null;
    return npcViewFromRow(row, stats, imageUrl);
  });
}

export async function loadEncounters(
  campaignId: string,
): Promise<CampaignEncounterView[]> {
  const pcs = await prisma.campaignPc.findMany({
    where: { campaignId },
    include: { pcPlan: { select: { state: true } } },
  });
  const partyLevel = averagePartyLevel(pcs.map((p) => p.pcPlan));
  const partyConfig = {
    partySize: Math.max(1, pcs.length),
    partyLevel,
    difficulty: "medium" as const,
  };

  const rows = await prisma.campaignEncounter.findMany({
    where: { campaignId },
    orderBy: { updatedAt: "desc" },
    include: {
      entries: {
        include: {
          campaignNpc: {
            select: {
              name: true,
              faction: true,
              snapshot: true,
              imageKey: true,
            },
          },
        },
        orderBy: { seq: "asc" },
      },
    },
  });

  return rows.map((row) => {
    const view = encounterViewFromRow(row);
    const summary = calculateEncounterSummary(
      row.entries.map((entry) => {
        const snap = entry.campaignNpc.snapshot as { challengeRating?: string };
        const cr =
          snap.challengeRating ??
          String(parseCr(snap.challengeRating) ?? "0");
        return {
          slug: entry.campaignNpcId,
          name: entry.campaignNpc.name,
          cr,
          count: entry.quantity,
        };
      }),
      partyConfig,
    );
    return {
      ...view,
      el: summary.el,
      targetEl: summary.targetEl,
      entries: view.entries.map((entry, i) => {
        const raw = row.entries[i];
        const imageKey = raw?.campaignNpc.imageKey;
        return {
          ...entry,
          imageUrl: imageKey ? tryPublicUrlForKey(imageKey) : null,
        };
      }),
    };
  });
}
