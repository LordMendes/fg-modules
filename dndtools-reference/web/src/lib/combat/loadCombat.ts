import {
  combatViewFromRow,
  encounterViewFromRow,
  npcViewFromRow,
  snapshotCombatStats,
} from "@/lib/combat/combatView";
import type {
  CampaignCombatView,
  CampaignEncounterView,
  CampaignNpcView,
} from "@/lib/combat/types";
import { prisma } from "@/lib/prisma";
import { tryPublicUrlForKey } from "@/lib/storage/r2";

export async function loadCombatForViewer(
  campaignId: string,
  viewer: { isDm: boolean; pcPlanId?: string | null },
): Promise<CampaignCombatView | null> {
  const combat = await prisma.campaignCombat.findUnique({
    where: { campaignId },
    include: {
      combatants: { orderBy: [{ init: "desc" }, { seq: "asc" }] },
    },
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

  return combatViewFromRow(combat, {
    isDm: viewer.isDm,
    viewerPcPlanId: viewer.pcPlanId ?? null,
    tokenImages,
  });
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
    return {
      ...view,
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
