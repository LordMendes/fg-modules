import { prisma } from "@/lib/prisma";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import type {
  CampaignActivityDetail,
  CampaignActivityKind,
  CampaignActivityView,
} from "@/lib/campaign/types";
import type { Prisma } from "@/generated/prisma/client";

const ACTIVITY_HISTORY_LIMIT = 500;

export function canViewerSeeActivity(
  viewer: { userId: string; isDm: boolean },
  activity: { actorUserId: string; subjectUserId: string | null },
): boolean {
  if (viewer.isDm) return true;
  if (activity.actorUserId === viewer.userId) return true;
  if (activity.subjectUserId && activity.subjectUserId === viewer.userId) {
    return true;
  }
  return false;
}

export function mapActivityRow(row: {
  id: string;
  kind: string;
  summary: string;
  details: unknown;
  actorUserId: string;
  actorUsername: string;
  pcPlanId: string | null;
  pcName: string | null;
  subjectUserId: string | null;
  createdAt: Date;
}): CampaignActivityView {
  const details = Array.isArray(row.details)
    ? (row.details as CampaignActivityDetail[])
    : [];
  return {
    id: row.id,
    kind: row.kind as CampaignActivityKind,
    summary: row.summary,
    details,
    actorUserId: row.actorUserId,
    actorUsername: row.actorUsername,
    pcPlanId: row.pcPlanId,
    pcName: row.pcName,
    subjectUserId: row.subjectUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function trimActivity(campaignId: string) {
  const overflow = await prisma.campaignActivity.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    skip: ACTIVITY_HISTORY_LIMIT,
    select: { id: true },
  });
  if (overflow.length === 0) return;
  await prisma.campaignActivity.deleteMany({
    where: { id: { in: overflow.map((r) => r.id) } },
  });
}

function publishActivityLive(
  campaignId: string,
  activity: CampaignActivityView,
  dmUserIds: Set<string>,
) {
  publishCampaignLive(
    campaignId,
    { type: "activity", activity },
    {
      filterForUser: (viewerId, event) => {
        if (event.type !== "activity") return event;
        const isDm = dmUserIds.has(viewerId);
        if (
          canViewerSeeActivity({ userId: viewerId, isDm }, event.activity)
        ) {
          return event;
        }
        return null;
      },
    },
  );
}

export type RecordActivityInput = {
  campaignId: string;
  actorUserId: string;
  actorUsername: string;
  kind: CampaignActivityKind;
  summary: string;
  details?: CampaignActivityDetail[];
  pcPlanId?: string | null;
  pcName?: string | null;
  subjectUserId?: string | null;
};

export async function recordAndPublishActivity(
  input: RecordActivityInput,
): Promise<CampaignActivityView> {
  if (!prisma.campaignActivity) {
    throw new Error("Campaign activity database is not ready. Restart the dev server.");
  }

  const row = await prisma.campaignActivity.create({
    data: {
      campaignId: input.campaignId,
      actorUserId: input.actorUserId,
      actorUsername: input.actorUsername,
      kind: input.kind,
      summary: input.summary,
      details: (input.details ?? []) as unknown as Prisma.InputJsonValue,
      pcPlanId: input.pcPlanId ?? null,
      pcName: input.pcName ?? null,
      subjectUserId: input.subjectUserId ?? null,
    },
  });

  await trimActivity(input.campaignId);

  const view = mapActivityRow(row);

  const dmMembers = await prisma.campaignMember.findMany({
    where: { campaignId: input.campaignId, role: "dm", status: "active" },
    select: { userId: true },
  });
  publishActivityLive(
    input.campaignId,
    view,
    new Set(dmMembers.map((m) => m.userId)),
  );

  return view;
}

export function publishPcUpdated(
  campaignId: string,
  pcPlanId: string,
  actorUserId: string,
  updatedAt: Date,
) {
  publishCampaignLive(campaignId, {
    type: "pcUpdated",
    pcPlanId,
    actorUserId,
    updatedAt: updatedAt.toISOString(),
  });
}
