"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  publishPcUpdated,
  recordAndPublishActivity,
} from "@/lib/campaign/activityLog";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import type { CampaignMemberView, CampaignPcView } from "@/lib/campaign/types";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { getWritablePlan } from "@/lib/pc-planner/planAccess";
import type { PcPlanState } from "@/lib/pc-planner/types";
import {
  PC_IMAGE_MAX_BYTES,
  processPcImage,
} from "@/lib/storage/process-pc-image";
import {
  pcImageObjectKey,
  publicUrlForKey,
  putPcImageObject,
  deletePcImageObject,
  type PcImageKind,
} from "@/lib/storage/r2";
import type { Prisma } from "@/generated/prisma/client";

export type PcImageActionResult = {
  success: boolean;
  error?: string;
  key?: string;
  url?: string;
};

function parseState(raw: unknown): PcPlanState {
  if (!raw || typeof raw !== "object") {
    return createDefaultPcPlanState();
  }
  return raw as PcPlanState;
}

function isPcImageKind(value: string): value is PcImageKind {
  return value === "profile" || value === "token";
}

function identityKeyField(kind: PcImageKind): "profileImageKey" | "tokenImageKey" {
  return kind === "profile" ? "profileImageKey" : "tokenImageKey";
}

function summarizePlan(state: PcPlanState): { classSummary: string } {
  const classSummary =
    state.identity.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ") ||
    "No class";
  return { classSummary };
}

function mapMember(m: {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { username: string };
}): CampaignMemberView {
  return {
    id: m.id,
    userId: m.userId,
    username: m.user.username,
    role: m.role === "dm" ? "dm" : "player",
    status: m.status === "pending" ? "pending" : "active",
  };
}

function mapPc(row: {
  id: string;
  pcPlanId: string;
  userId: string;
  user: { username: string };
  pcPlan: { name: string; state: unknown; updatedAt: Date };
}): CampaignPcView {
  const state = parseState(row.pcPlan.state);
  const { classSummary } = summarizePlan(state);
  let tokenImageUrl: string | null = null;
  try {
    if (state.identity.tokenImageKey) {
      tokenImageUrl = publicUrlForKey(
        state.identity.tokenImageKey,
        row.pcPlan.updatedAt,
      );
    }
  } catch {
    tokenImageUrl = null;
  }
  return {
    id: row.id,
    pcPlanId: row.pcPlanId,
    userId: row.userId,
    username: row.user.username,
    name: row.pcPlan.name,
    classSummary,
    tokenImageUrl,
    updatedAt: row.pcPlan.updatedAt.toISOString(),
  };
}

async function republishCampaignsForPlan(planId: string): Promise<void> {
  const links = await prisma.campaignPc.findMany({
    where: { pcPlanId: planId },
    select: { campaignId: true },
  });
  if (links.length === 0) return;

  for (const { campaignId } of links) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        members: {
          include: { user: { select: { username: true } } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        pcs: {
          include: {
            user: { select: { username: true } },
            pcPlan: { select: { name: true, state: true, updatedAt: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!campaign) continue;
    publishCampaignLive(campaignId, {
      type: "roster",
      members: campaign.members.map(mapMember),
      pcs: campaign.pcs.map(mapPc),
    });
  }
}

export async function uploadPcImage(
  planId: string,
  kind: string,
  formData: FormData,
): Promise<PcImageActionResult> {
  const user = await requireCurrentUser();
  if (!isPcImageKind(kind)) {
    return { success: false, error: "Invalid image kind" };
  }

  const writable = await getWritablePlan(planId, user.id);
  if (!writable) return { success: false, error: "Plan not found" };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Image file is required" };
  }
  if (file.size > PC_IMAGE_MAX_BYTES) {
    return { success: false, error: "Image must be 8 MB or smaller" };
  }

  const mime = file.type.toLowerCase();
  if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    return { success: false, error: "Image must be JPEG, PNG, or WebP" };
  }

  let processed;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    processed = await processPcImage(bytes, kind);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not process image",
    };
  }

  // Always key under the plan owner so DM uploads do not orphan files.
  const key = pcImageObjectKey(writable.userId, planId, kind);
  try {
    await putPcImageObject(key, processed.buffer);
  } catch {
    return { success: false, error: "Failed to upload image" };
  }

  const previousState = parseState(writable.state);
  const state = parseState(writable.state);
  const field = identityKeyField(kind);
  state.identity[field] = key;

  const updated = await prisma.pcPlan.update({
    where: { id: planId },
    data: {
      state: state as unknown as Prisma.InputJsonValue,
    },
  });

  if (kind === "token") {
    await republishCampaignsForPlan(planId);
  }

  const links = await prisma.campaignPc.findMany({
    where: { pcPlanId: planId },
    select: { campaignId: true, userId: true },
  });
  for (const link of links) {
    publishPcUpdated(link.campaignId, planId, user.id, updated.updatedAt);
    await recordAndPublishActivity({
      campaignId: link.campaignId,
      actorUserId: user.id,
      actorUsername: user.username,
      kind: "pc_update",
      summary: `${user.username} updated ${writable.name} (${kind} image)`,
      details: [
        {
          path: `${kind} image`,
          from: previousState.identity[field] ? "set" : "none",
          to: "set",
        },
      ],
      pcPlanId: planId,
      pcName: writable.name,
      subjectUserId: link.userId,
    });
  }

  return {
    success: true,
    key,
    url: publicUrlForKey(key, updated.updatedAt),
  };
}

export async function removePcImage(
  planId: string,
  kind: string,
): Promise<PcImageActionResult> {
  const user = await requireCurrentUser();
  if (!isPcImageKind(kind)) {
    return { success: false, error: "Invalid image kind" };
  }

  const writable = await getWritablePlan(planId, user.id);
  if (!writable) return { success: false, error: "Plan not found" };

  const state = parseState(writable.state);
  const field = identityKeyField(kind);
  const existingKey =
    state.identity[field] ?? pcImageObjectKey(writable.userId, planId, kind);

  try {
    await deletePcImageObject(existingKey);
  } catch {
    // Missing object is fine.
  }

  state.identity[field] = null;
  const updated = await prisma.pcPlan.update({
    where: { id: planId },
    data: {
      state: state as unknown as Prisma.InputJsonValue,
    },
  });

  if (kind === "token") {
    await republishCampaignsForPlan(planId);
  }

  const links = await prisma.campaignPc.findMany({
    where: { pcPlanId: planId },
    select: { campaignId: true, userId: true },
  });
  for (const link of links) {
    publishPcUpdated(link.campaignId, planId, user.id, updated.updatedAt);
    await recordAndPublishActivity({
      campaignId: link.campaignId,
      actorUserId: user.id,
      actorUsername: user.username,
      kind: "pc_update",
      summary: `${user.username} removed ${writable.name} ${kind} image`,
      details: [
        {
          path: `${kind} image`,
          from: "set",
          to: "none",
        },
      ],
      pcPlanId: planId,
      pcName: writable.name,
      subjectUserId: link.userId,
    });
  }

  return { success: true };
}
