"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser, type AuthUser } from "@/lib/auth/session";
import { generateJoinCode, isValidJoinCode, normalizeJoinCode } from "@/lib/campaign/joinCode";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import { computeRollTotals, rollFaces } from "@/lib/campaign/rollFaces";
import { toCampaignRollView } from "@/lib/campaign/rollVisibility";
import type {
  CampaignMemberRole,
  CampaignMemberStatus,
  CampaignMemberView,
  CampaignPcView,
  CampaignRollView,
  CampaignSummary,
  CampaignTableState,
  StartCampaignRollInput,
} from "@/lib/campaign/types";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { computeSpellClass, formatSlotSummary } from "@/lib/pc-planner/spellSlots";
import { syncPcPlanState } from "@/lib/pc-planner/syncState";
import { getClassSpellTablesBySlugs } from "@/lib/entities";
import type { PcPlanState } from "@/lib/pc-planner/types";
import type { DicePoolItem, RollKind } from "@/lib/dice/types";
import type { Prisma } from "@/generated/prisma/client";

export type CampaignActionResult = {
  success: boolean;
  error?: string;
};

const ROLL_HISTORY_LIMIT = 50;

function parseState(raw: unknown): PcPlanState {
  if (!raw || typeof raw !== "object") {
    return createDefaultPcPlanState();
  }
  return raw as PcPlanState;
}

function summarizePlan(state: PcPlanState): { classSummary: string; slotSummary: string } {
  const classSummary =
    state.identity.classLevels.map((c) => `${c.className} ${c.level}`).join(" / ") ||
    "No class";

  const spellClass = state.spellClasses[0];
  if (!spellClass) {
    return { classSummary, slotSummary: "—" };
  }

  const computed = computeSpellClass(
    spellClass.classSlug,
    spellClass.label,
    spellClass.casterLevel,
    state.abilities,
  );
  return { classSummary, slotSummary: formatSlotSummary(computed.slots) };
}

function asRole(value: string): CampaignMemberRole {
  return value === "dm" ? "dm" : "player";
}

function asStatus(value: string): CampaignMemberStatus {
  return value === "pending" ? "pending" : "active";
}

function validateCampaignName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Campaign name is required";
  if (trimmed.length > 64) return "Campaign name must be 64 characters or fewer";
  return null;
}

async function uniqueJoinCode(): Promise<string> {
  if (!prisma.campaign) {
    throw new Error("Campaign database is not ready. Restart the dev server.");
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.campaign.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate join code");
}

async function requireActiveMember(campaignId: string, userId: string) {
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
    include: {
      campaign: true,
    },
  });
  if (!member || member.status !== "active") {
    return null;
  }
  return member;
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
    role: asRole(m.role),
    status: asStatus(m.status),
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
  return {
    id: row.id,
    pcPlanId: row.pcPlanId,
    userId: row.userId,
    username: row.user.username,
    name: row.pcPlan.name,
    classSummary,
    updatedAt: row.pcPlan.updatedAt.toISOString(),
  };
}

async function loadRollsForViewer(
  campaignId: string,
  viewer: { userId: string; isDm: boolean },
): Promise<CampaignRollView[]> {
  const rows = await prisma.campaignRoll.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: ROLL_HISTORY_LIMIT,
  });

  return rows
    .map((row) => toCampaignRollView(row, viewer))
    .filter((roll) => {
      // Hidden rolls that this viewer cannot reveal are omitted from the log.
      if (roll.hidden && !roll.revealResult) return false;
      return true;
    });
}

async function buildTableState(
  campaignId: string,
  user: AuthUser,
): Promise<CampaignTableState | null> {
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
  if (!campaign) return null;

  const me = campaign.members.find((m) => m.userId === user.id);
  if (!me) return null;

  const isDm = me.role === "dm" && me.status === "active";
  const rolls = me.status === "active"
    ? await loadRollsForViewer(campaignId, { userId: user.id, isDm })
    : [];

  return {
    id: campaign.id,
    name: campaign.name,
    joinCode: campaign.joinCode,
    dmUserId: campaign.dmUserId,
    myRole: asRole(me.role),
    myStatus: asStatus(me.status),
    members: campaign.members.map(mapMember),
    pcs: campaign.pcs.map(mapPc),
    rolls,
  };
}

function publishRoster(campaignId: string, members: CampaignMemberView[], pcs: CampaignPcView[]) {
  publishCampaignLive(campaignId, { type: "roster", members, pcs });
}

export async function listMyCampaigns(): Promise<CampaignSummary[]> {
  const user = await requireCurrentUser();
  if (!prisma.campaignMember) {
    throw new Error("Campaign database is not ready. Restart the dev server.");
  }
  const memberships = await prisma.campaignMember.findMany({
    where: { userId: user.id },
    include: {
      campaign: {
        include: {
          _count: { select: { members: true, pcs: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.campaign.id,
    name: m.campaign.name,
    joinCode: m.campaign.joinCode,
    role: asRole(m.role),
    status: asStatus(m.status),
    memberCount: m.campaign._count.members,
    pcCount: m.campaign._count.pcs,
    updatedAt: m.campaign.updatedAt.toISOString(),
  }));
}

export async function createCampaign(
  name: string,
): Promise<CampaignActionResult & { campaign?: CampaignSummary }> {
  const user = await requireCurrentUser();
  const nameError = validateCampaignName(name);
  if (nameError) return { success: false, error: nameError };

  let joinCode: string;
  try {
    joinCode = await uniqueJoinCode();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not create campaign",
    };
  }
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      joinCode,
      dmUserId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "dm",
          status: "active",
        },
      },
    },
  });

  return {
    success: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      joinCode: campaign.joinCode,
      role: "dm",
      status: "active",
      memberCount: 1,
      pcCount: 0,
      updatedAt: campaign.updatedAt.toISOString(),
    },
  };
}

export async function joinCampaignByCode(
  code: string,
): Promise<CampaignActionResult & { campaignId?: string }> {
  const user = await requireCurrentUser();
  const joinCode = normalizeJoinCode(code);
  if (!isValidJoinCode(joinCode)) {
    return { success: false, error: "Invalid join code" };
  }

  const campaign = await prisma.campaign.findUnique({ where: { joinCode } });
  if (!campaign) return { success: false, error: "Campaign not found" };

  const existing = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } },
  });

  if (existing) {
    if (existing.status === "pending") {
      await prisma.campaignMember.update({
        where: { id: existing.id },
        data: { status: "active" },
      });
    }
    return { success: true, campaignId: campaign.id };
  }

  if (campaign.dmUserId === user.id) {
    return { success: true, campaignId: campaign.id };
  }

  await prisma.campaignMember.create({
    data: {
      campaignId: campaign.id,
      userId: user.id,
      role: "player",
      status: "active",
    },
  });

  const table = await buildTableState(campaign.id, user);
  if (table) publishRoster(campaign.id, table.members, table.pcs);

  return { success: true, campaignId: campaign.id };
}

export async function inviteByUsername(
  campaignId: string,
  username: string,
): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can invite players" };
  }

  const trimmed = username.trim();
  if (!trimmed) return { success: false, error: "Username is required" };

  const target = await prisma.user.findUnique({
    where: { username: trimmed },
    select: { id: true, username: true },
  });
  if (!target) return { success: false, error: "User not found" };
  if (target.id === user.id) return { success: false, error: "You are already the DM" };

  const existing = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: target.id } },
  });
  if (existing) {
    if (existing.status === "active") {
      return { success: false, error: "User is already a member" };
    }
    return { success: true };
  }

  await prisma.campaignMember.create({
    data: {
      campaignId,
      userId: target.id,
      role: "player",
      status: "pending",
    },
  });

  return { success: true };
}

export async function acceptCampaignInvite(
  campaignId: string,
): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
  });
  if (!member || member.status !== "pending") {
    return { success: false, error: "No pending invite" };
  }

  await prisma.campaignMember.update({
    where: { id: member.id },
    data: { status: "active" },
  });

  const table = await buildTableState(campaignId, user);
  if (table) publishRoster(campaignId, table.members, table.pcs);

  return { success: true };
}

export async function declineCampaignInvite(
  campaignId: string,
): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
  });
  if (!member || member.status !== "pending") {
    return { success: false, error: "No pending invite" };
  }

  await prisma.campaignMember.delete({ where: { id: member.id } });
  return { success: true };
}

export async function leaveCampaign(campaignId: string): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: user.id } },
  });
  if (!member) return { success: false, error: "Not a member" };
  if (member.role === "dm") {
    return { success: false, error: "DM cannot leave; delete the campaign instead" };
  }

  await prisma.campaignPc.deleteMany({
    where: { campaignId, userId: user.id },
  });
  await prisma.campaignMember.delete({ where: { id: member.id } });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: { include: { user: { select: { username: true } } } },
      pcs: {
        include: {
          user: { select: { username: true } },
          pcPlan: { select: { name: true, state: true, updatedAt: true } },
        },
      },
    },
  });
  if (campaign) {
    publishRoster(
      campaignId,
      campaign.members.map(mapMember),
      campaign.pcs.map(mapPc),
    );
  }

  return { success: true };
}

export async function kickMember(
  campaignId: string,
  targetUserId: string,
): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can kick members" };
  }
  if (targetUserId === user.id) {
    return { success: false, error: "Cannot kick yourself" };
  }

  const target = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId: targetUserId } },
  });
  if (!target || target.role === "dm") {
    return { success: false, error: "Member not found" };
  }

  await prisma.campaignPc.deleteMany({
    where: { campaignId, userId: targetUserId },
  });
  await prisma.campaignMember.delete({ where: { id: target.id } });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: { include: { user: { select: { username: true } } } },
      pcs: {
        include: {
          user: { select: { username: true } },
          pcPlan: { select: { name: true, state: true, updatedAt: true } },
        },
      },
    },
  });
  if (campaign) {
    publishRoster(
      campaignId,
      campaign.members.map(mapMember),
      campaign.pcs.map(mapPc),
    );
  }

  return { success: true };
}

export async function deleteCampaign(campaignId: string): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.dmUserId !== user.id) {
    return { success: false, error: "Only the DM can delete this campaign" };
  }
  await prisma.campaign.delete({ where: { id: campaignId } });
  return { success: true };
}

export async function getCampaignTable(
  campaignId: string,
): Promise<CampaignTableState | null> {
  const user = await requireCurrentUser();
  return buildTableState(campaignId, user);
}

export async function attachPcToCampaign(
  campaignId: string,
  pcPlanId: string,
): Promise<CampaignActionResult & { pc?: CampaignPcView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const plan = await prisma.pcPlan.findFirst({
    where: { id: pcPlanId, userId: user.id },
  });
  if (!plan) return { success: false, error: "Character not found" };

  const existing = await prisma.campaignPc.findUnique({
    where: { campaignId_pcPlanId: { campaignId, pcPlanId } },
  });
  if (existing) return { success: false, error: "Character already attached" };

  const row = await prisma.campaignPc.create({
    data: {
      campaignId,
      pcPlanId,
      userId: user.id,
    },
    include: {
      user: { select: { username: true } },
      pcPlan: { select: { name: true, state: true, updatedAt: true } },
    },
  });

  const table = await buildTableState(campaignId, user);
  if (table) publishRoster(campaignId, table.members, table.pcs);

  return { success: true, pc: mapPc(row) };
}

export async function createPcInCampaign(
  campaignId: string,
  name?: string,
): Promise<CampaignActionResult & { pc?: CampaignPcView; planId?: string }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const trimmed =
    name?.trim() ||
    `${user.username}-${Date.now().toString(36).slice(-4)}`;
  if (trimmed.length > 64) {
    return { success: false, error: "Name must be 64 characters or fewer" };
  }

  const existing = await prisma.pcPlan.findUnique({
    where: { userId_name: { userId: user.id, name: trimmed } },
  });
  if (existing) {
    return { success: false, error: "You already have a plan with this name" };
  }

  const state = createDefaultPcPlanState(trimmed);
  const plan = await prisma.pcPlan.create({
    data: {
      userId: user.id,
      name: trimmed,
      state: state as unknown as Prisma.InputJsonValue,
    },
  });

  const row = await prisma.campaignPc.create({
    data: {
      campaignId,
      pcPlanId: plan.id,
      userId: user.id,
    },
    include: {
      user: { select: { username: true } },
      pcPlan: { select: { name: true, state: true, updatedAt: true } },
    },
  });

  const table = await buildTableState(campaignId, user);
  if (table) publishRoster(campaignId, table.members, table.pcs);

  return { success: true, pc: mapPc(row), planId: plan.id };
}

export async function unlinkPcFromCampaign(
  campaignId: string,
  campaignPcId: string,
): Promise<CampaignActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const row = await prisma.campaignPc.findFirst({
    where: { id: campaignPcId, campaignId },
  });
  if (!row) return { success: false, error: "Character link not found" };

  const isDm = member.role === "dm";
  if (!isDm && row.userId !== user.id) {
    return { success: false, error: "Cannot remove another player's character" };
  }

  await prisma.campaignPc.delete({ where: { id: row.id } });

  const table = await buildTableState(campaignId, user);
  if (table) publishRoster(campaignId, table.members, table.pcs);

  return { success: true };
}

export type CampaignPcPlanResult = {
  id: string;
  name: string;
  shortcut: string | null;
  state: PcPlanState;
  updatedAt: Date;
  ownerUserId: string;
  canEdit: boolean;
};

export async function getCampaignPcPlan(
  campaignId: string,
  pcPlanId: string,
): Promise<CampaignPcPlanResult | null> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return null;

  const link = await prisma.campaignPc.findUnique({
    where: { campaignId_pcPlanId: { campaignId, pcPlanId } },
    include: { pcPlan: true },
  });
  if (!link) return null;

  const isDm = member.role === "dm";
  const isOwner = link.userId === user.id;
  if (!isDm && !isOwner) return null;

  const parsed = parseState(link.pcPlan.state);
  const slugs = parsed.spellClasses.map((sc) => sc.classSlug);
  const classSpellTables = await getClassSpellTablesBySlugs(slugs);

  return {
    id: link.pcPlan.id,
    name: link.pcPlan.name,
    shortcut: link.pcPlan.shortcut,
    state: syncPcPlanState(parsed, null, classSpellTables),
    updatedAt: link.pcPlan.updatedAt,
    ownerUserId: link.userId,
    canEdit: isOwner,
  };
}

const ALLOWED_KINDS: RollKind[] = [
  "attack",
  "damage",
  "save",
  "skill",
  "initiative",
  "cast",
  "spell",
  "hitDie",
  "tray",
  "other",
];

function sanitizeDice(dice: DicePoolItem[]): DicePoolItem[] | null {
  if (!Array.isArray(dice) || dice.length === 0) return null;
  const out: DicePoolItem[] = [];
  let totalQty = 0;
  for (const item of dice) {
    if (!item || typeof item.qty !== "number" || typeof item.sides !== "number") {
      return null;
    }
    if (item.qty < 1 || item.qty > 40) return null;
    if (![4, 6, 8, 10, 12, 20, 100].includes(item.sides)) return null;
    totalQty += item.qty;
    out.push({
      qty: Math.floor(item.qty),
      sides: item.sides as DicePoolItem["sides"],
      ...(typeof item.themeColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(item.themeColor)
        ? { themeColor: item.themeColor }
        : {}),
    });
  }
  if (totalQty < 1 || totalQty > 40) return null;
  return out;
}

export async function startCampaignRoll(
  input: StartCampaignRollInput,
): Promise<CampaignActionResult & { roll?: CampaignRollView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(input.campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const dice = sanitizeDice(input.dice);
  if (!dice) return { success: false, error: "Invalid dice pool" };

  const faces = rollFaces(dice);
  const kind = ALLOWED_KINDS.includes(input.kind) ? input.kind : "other";
  const label = (input.label || "Roll").trim().slice(0, 120);
  const modifier = Number.isFinite(input.modifier)
    ? Math.max(-999, Math.min(999, Math.round(input.modifier)))
    : 0;
  const iterative =
    Array.isArray(input.iterativeModifiers) && input.iterativeModifiers.length > 0
      ? input.iterativeModifiers
          .slice(0, 20)
          .map((n) => Math.max(-999, Math.min(999, Math.round(Number(n) || 0))))
      : undefined;

  const totals = computeRollTotals({
    faces,
    modifier,
    iterativeModifiers: iterative,
    dice,
  });

  const characterName = input.characterName?.trim().slice(0, 64) || null;

  const row = await prisma.campaignRoll.create({
    data: {
      campaignId: input.campaignId,
      userId: user.id,
      username: user.username,
      characterName,
      kind,
      label,
      hidden: Boolean(input.hidden),
      dice: dice as unknown as Prisma.InputJsonValue,
      modifier,
      iterativeModifiers: iterative
        ? (iterative as unknown as Prisma.InputJsonValue)
        : undefined,
      faces: faces as unknown as Prisma.InputJsonValue,
      faceSum: totals.faceSum,
      total: totals.total,
      natural20: totals.natural20,
      natural1: totals.natural1,
      attackTotals: totals.attackTotals
        ? (totals.attackTotals as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  // Trim old rolls
  const old = await prisma.campaignRoll.findMany({
    where: { campaignId: input.campaignId },
    orderBy: { createdAt: "desc" },
    skip: ROLL_HISTORY_LIMIT,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.campaignRoll.deleteMany({
      where: { id: { in: old.map((r) => r.id) } },
    });
  }

  const fullView = toCampaignRollView(row, { userId: user.id, isDm: true });
  const dmUserId = member.campaign.dmUserId;

  publishCampaignLive(
    input.campaignId,
    { type: "roll", roll: fullView },
    {
      filterForUser: (viewerId, event) => {
        if (event.type !== "roll") return event;
        const view = toCampaignRollView(row, {
          userId: viewerId,
          isDm: viewerId === dmUserId,
        });
        return { type: "roll", roll: view };
      },
    },
  );

  return {
    success: true,
    roll: toCampaignRollView(row, {
      userId: user.id,
      isDm: member.role === "dm",
    }),
  };
}

export async function getCampaignRollHistory(
  campaignId: string,
): Promise<CampaignRollView[]> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return [];
  return loadRollsForViewer(campaignId, {
    userId: user.id,
    isDm: member.role === "dm",
  });
}
