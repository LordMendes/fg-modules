"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { computeSpellClass, formatSlotSummary } from "@/lib/pc-planner/spellSlots";
import {
  matchesClassLevelFilter,
  parsePcShortcutQuery,
} from "@/lib/pc-planner/shortcutSearch";
import { syncPcPlanState } from "@/lib/pc-planner/syncState";
import { getClassSpellTablesBySlugs } from "@/lib/entities";
import type { PcPlanState } from "@/lib/pc-planner/types";
import {
  copyPcImageObject,
  deletePcPlanImages,
  pcImageObjectKey,
} from "@/lib/storage/r2";
import type { Prisma } from "@/generated/prisma/client";

export type PcPlanSummary = {
  id: string;
  name: string;
  shortcut: string | null;
  updatedAt: Date;
  classSummary: string;
  slotSummary: string;
};

export type PcPlanWithState = {
  id: string;
  name: string;
  shortcut: string | null;
  state: PcPlanState;
  updatedAt: Date;
};

export type PcPlanActionResult = {
  success: boolean;
  error?: string;
};

function validatePlanName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Plan name is required";
  if (trimmed.length > 64) return "Plan name must be 64 characters or fewer";
  return null;
}

function parseState(raw: unknown): PcPlanState {
  if (!raw || typeof raw !== "object") {
    return createDefaultPcPlanState();
  }
  return raw as PcPlanState;
}

async function getOwnedPlan(planId: string, userId: string) {
  return prisma.pcPlan.findFirst({
    where: { id: planId, userId },
  });
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

export async function getUserPcPlans(): Promise<PcPlanSummary[]> {
  const user = await requireCurrentUser();
  const plans = await prisma.pcPlan.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return plans.map((plan) => {
    const state = parseState(plan.state);
    const { classSummary, slotSummary } = summarizePlan(state);
    return {
      id: plan.id,
      name: plan.name,
      shortcut: plan.shortcut,
      updatedAt: plan.updatedAt,
      classSummary,
      slotSummary,
    };
  });
}

export async function getPcPlan(planId: string): Promise<PcPlanWithState | null> {
  const user = await requireCurrentUser();
  const plan = await prisma.pcPlan.findFirst({
    where: { id: planId, userId: user.id },
  });
  if (!plan) return null;

  const parsed = parseState(plan.state);
  const slugs = parsed.spellClasses.map((sc) => sc.classSlug);
  const classSpellTables = await getClassSpellTablesBySlugs(slugs);

  return {
    id: plan.id,
    name: plan.name,
    shortcut: plan.shortcut,
    state: syncPcPlanState(parsed, null, classSpellTables),
    updatedAt: plan.updatedAt,
  };
}

async function nextPcPlanName(userId: string, username: string): Promise<string> {
  const prefix = `${username}-`;
  const plans = await prisma.pcPlan.findMany({
    where: { userId, name: { startsWith: prefix } },
    select: { name: true },
  });

  let max = 0;
  for (const plan of plans) {
    const suffix = plan.name.slice(prefix.length);
    if (/^\d+$/.test(suffix)) {
      const n = Number.parseInt(suffix, 10);
      if (n > max) max = n;
    }
  }

  return `${username}-${max + 1}`;
}

export async function createPcPlan(
  name?: string,
): Promise<PcPlanActionResult & { plan?: PcPlanWithState }> {
  const user = await requireCurrentUser();
  const trimmed = name?.trim() || (await nextPcPlanName(user.id, user.username));
  const nameError = validatePlanName(trimmed);
  if (nameError) return { success: false, error: nameError };

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

  return {
    success: true,
    plan: {
      id: plan.id,
      name: plan.name,
      shortcut: plan.shortcut,
      state,
      updatedAt: plan.updatedAt,
    },
  };
}

export async function savePcPlan(
  planId: string,
  state: PcPlanState,
): Promise<PcPlanActionResult> {
  const user = await requireCurrentUser();
  const owned = await getOwnedPlan(planId, user.id);
  if (!owned) return { success: false, error: "Plan not found" };

  const slugs = state.spellClasses.map((sc) => sc.classSlug);
  const classSpellTables = await getClassSpellTablesBySlugs(slugs);
  const synced = syncPcPlanState(state, null, classSpellTables);
  // Re-read keys just before write so a concurrent upload is not wiped by autosave.
  const latest = await getOwnedPlan(planId, user.id);
  const ownedState = parseState(latest?.state ?? owned.state);
  synced.identity.profileImageKey =
    ownedState.identity.profileImageKey ||
    state.identity.profileImageKey ||
    null;
  synced.identity.tokenImageKey =
    ownedState.identity.tokenImageKey ||
    state.identity.tokenImageKey ||
    null;
  await prisma.pcPlan.update({
    where: { id: planId },
    data: {
      state: synced as unknown as Prisma.InputJsonValue,
      name: synced.identity.name.trim() || owned.name,
    },
  });

  return { success: true };
}

export async function renamePcPlan(
  planId: string,
  name: string,
  shortcut?: string | null,
): Promise<PcPlanActionResult> {
  const user = await requireCurrentUser();
  const nameError = validatePlanName(name);
  if (nameError) return { success: false, error: nameError };

  const owned = await getOwnedPlan(planId, user.id);
  if (!owned) return { success: false, error: "Plan not found" };

  const trimmed = name.trim();
  const duplicate = await prisma.pcPlan.findFirst({
    where: { userId: user.id, name: trimmed, NOT: { id: planId } },
  });
  if (duplicate) {
    return { success: false, error: "You already have a plan with this name" };
  }

  const shortcutValue =
    shortcut === undefined
      ? owned.shortcut
      : shortcut?.trim()
        ? shortcut.trim().slice(0, 32)
        : null;

  await prisma.pcPlan.update({
    where: { id: planId },
    data: { name: trimmed, shortcut: shortcutValue },
  });

  return { success: true };
}

export async function deletePcPlan(planId: string): Promise<PcPlanActionResult> {
  const user = await requireCurrentUser();
  const owned = await getOwnedPlan(planId, user.id);
  if (!owned) return { success: false, error: "Plan not found" };

  await prisma.pcPlan.delete({ where: { id: planId } });
  try {
    await deletePcPlanImages(user.id, planId);
  } catch {
    // Best-effort cleanup; plan row is already gone.
  }
  return { success: true };
}

export async function searchPcPlans(query: string): Promise<PcPlanSummary[]> {
  const user = await requireCurrentUser();
  const parsed = parsePcShortcutQuery(query);
  const namePart = parsed.nameQuery.toLowerCase();

  const plans = await prisma.pcPlan.findMany({
    where: {
      userId: user.id,
      ...(namePart
        ? {
            OR: [
              { name: { contains: namePart, mode: "insensitive" } },
              { shortcut: { contains: namePart, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return plans
    .map((plan) => {
      const state = parseState(plan.state);
      const { classSummary, slotSummary } = summarizePlan(state);
      return {
        id: plan.id,
        name: plan.name,
        shortcut: plan.shortcut,
        updatedAt: plan.updatedAt,
        classSummary,
        slotSummary,
        state,
      };
    })
    .filter((row) =>
      matchesClassLevelFilter(
        row.state.identity.classLevels,
        parsed.classFilter,
        parsed.levelFilter,
      ),
    )
    .map(({ state: _state, ...summary }) => summary);
}

export async function duplicatePcPlan(
  planId: string,
): Promise<PcPlanActionResult & { plan?: PcPlanWithState }> {
  const user = await requireCurrentUser();
  const owned = await getOwnedPlan(planId, user.id);
  if (!owned) return { success: false, error: "Plan not found" };

  const baseName = `${owned.name} (copy)`;
  let name = baseName;
  let suffix = 2;
  while (
    await prisma.pcPlan.findUnique({
      where: { userId_name: { userId: user.id, name } },
    })
  ) {
    name = `${owned.name} (copy ${suffix})`;
    suffix++;
  }

  const state = parseState(owned.state);
  const sourceProfileKey = state.identity.profileImageKey ?? null;
  const sourceTokenKey = state.identity.tokenImageKey ?? null;
  // Clear keys until copies succeed; do not share object keys across plans.
  state.identity.profileImageKey = null;
  state.identity.tokenImageKey = null;

  const plan = await prisma.pcPlan.create({
    data: {
      userId: user.id,
      name,
      state: state as unknown as Prisma.InputJsonValue,
    },
  });

  if (sourceProfileKey) {
    const dest = pcImageObjectKey(user.id, plan.id, "profile");
    try {
      await copyPcImageObject(sourceProfileKey, dest);
      state.identity.profileImageKey = dest;
    } catch {
      // Leave null if copy fails.
    }
  }
  if (sourceTokenKey) {
    const dest = pcImageObjectKey(user.id, plan.id, "token");
    try {
      await copyPcImageObject(sourceTokenKey, dest);
      state.identity.tokenImageKey = dest;
    } catch {
      // Leave null if copy fails.
    }
  }

  if (state.identity.profileImageKey || state.identity.tokenImageKey) {
    await prisma.pcPlan.update({
      where: { id: plan.id },
      data: { state: state as unknown as Prisma.InputJsonValue },
    });
  }

  return {
    success: true,
    plan: {
      id: plan.id,
      name: plan.name,
      shortcut: plan.shortcut,
      state,
      updatedAt: plan.updatedAt,
    },
  };
}
