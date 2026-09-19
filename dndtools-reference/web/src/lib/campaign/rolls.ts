import { publishCampaignLive } from "@/lib/campaign/liveHub";
import { computeRollTotals } from "@/lib/campaign/rollFaces";
import {
  toCampaignRollView,
  type StoredCampaignRoll,
} from "@/lib/campaign/rollVisibility";
import type { RollKind } from "@/lib/dice/types";
import type { DicePoolItem } from "@/lib/dice/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const ROLL_HISTORY_LIMIT = 50;

export type PersistCampaignRollInput = {
  campaignId: string;
  userId: string;
  username: string;
  kind: RollKind;
  label: string;
  hidden: boolean;
  characterName?: string | null;
  dice: DicePoolItem[];
  modifier: number;
  iterativeModifiers?: number[];
  faces: number[];
  totals: ReturnType<typeof computeRollTotals>;
};

export async function persistCampaignRoll(
  input: PersistCampaignRollInput,
  tx?: Prisma.TransactionClient,
): Promise<StoredCampaignRoll> {
  const db = tx ?? prisma;
  const { totals } = input;

  const row = await db.campaignRoll.create({
    data: {
      campaignId: input.campaignId,
      userId: input.userId,
      username: input.username,
      characterName: input.characterName?.trim().slice(0, 64) || null,
      kind: input.kind,
      label: input.label.trim().slice(0, 120) || "Roll",
      hidden: Boolean(input.hidden),
      dice: input.dice as unknown as Prisma.InputJsonValue,
      modifier: input.modifier,
      iterativeModifiers: input.iterativeModifiers
        ? (input.iterativeModifiers as unknown as Prisma.InputJsonValue)
        : undefined,
      faces: input.faces as unknown as Prisma.InputJsonValue,
      faceSum: totals.faceSum,
      total: totals.total,
      natural20: totals.natural20,
      natural1: totals.natural1,
      attackTotals: totals.attackTotals
        ? (totals.attackTotals as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  const old = await db.campaignRoll.findMany({
    where: { campaignId: input.campaignId },
    orderBy: { createdAt: "desc" },
    skip: ROLL_HISTORY_LIMIT,
    select: { id: true },
  });
  if (old.length > 0) {
    await db.campaignRoll.deleteMany({
      where: { id: { in: old.map((r) => r.id) } },
    });
  }

  return row;
}

/** Publish DM-complete roll; replicas strip via filterLiveEventForViewer. */
export function publishRoll(
  campaignId: string,
  roll: StoredCampaignRoll,
  actorUserId: string,
): void {
  const fullView = toCampaignRollView(roll, { userId: actorUserId, isDm: true });
  publishCampaignLive(campaignId, { type: "roll", roll: fullView });
}
