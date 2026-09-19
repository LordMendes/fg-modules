import { publishCampaignLive } from "@/lib/campaign/liveHub";
import type { CombatRollRequestView } from "@/lib/combat/types";
import { prisma } from "@/lib/prisma";

export type RollRequestRow = {
  id: string;
  combatId: string;
  targetCombatantId: string;
  kind: string;
  saveType: string;
  dc: number | null;
  label: string;
  sourceEventId: string | null;
  status: string;
  createdAt: Date;
};

export function rollRequestToView(row: RollRequestRow): CombatRollRequestView {
  return {
    id: row.id,
    targetCombatantId: row.targetCombatantId,
    saveType: row.saveType as CombatRollRequestView["saveType"],
    dc: row.dc,
    label: row.label,
    sourceEventId: row.sourceEventId,
    status: row.status as CombatRollRequestView["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadPendingRollRequests(
  combatId: string,
): Promise<CombatRollRequestView[]> {
  const rows = await prisma.campaignCombatRollRequest.findMany({
    where: { combatId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(rollRequestToView);
}

export function publishRollRequest(
  campaignId: string,
  request: CombatRollRequestView,
): void {
  publishCampaignLive(campaignId, {
    type: "combatRollRequest",
    requestId: request.id,
    targetCombatantId: request.targetCombatantId,
    saveType: request.saveType,
    dc: request.dc,
    label: request.label,
    request,
  });
}

export function publishRollRequestResolved(
  campaignId: string,
  requestId: string,
): void {
  publishCampaignLive(campaignId, {
    type: "combatRollRequestResolved",
    requestId,
  });
}

export async function dismissPendingRequestsForCombatant(
  combatId: string,
  combatantId: string,
): Promise<string[]> {
  const rows = await prisma.campaignCombatRollRequest.findMany({
    where: { combatId, targetCombatantId: combatantId, status: "pending" },
  });
  if (rows.length === 0) return [];
  await prisma.campaignCombatRollRequest.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { status: "dismissed" },
  });
  return rows.map((r) => r.id);
}
