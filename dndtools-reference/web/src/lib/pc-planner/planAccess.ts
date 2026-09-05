import { prisma } from "@/lib/prisma";

/**
 * Returns a PcPlan the user may write: either they own it, or they are an
 * active DM of a campaign that has the plan linked.
 */
export async function getWritablePlan(planId: string, userId: string) {
  const owned = await prisma.pcPlan.findFirst({
    where: { id: planId, userId },
  });
  if (owned) return owned;

  const link = await prisma.campaignPc.findFirst({
    where: {
      pcPlanId: planId,
      campaign: {
        members: {
          some: {
            userId,
            role: "dm",
            status: "active",
          },
        },
      },
    },
    include: { pcPlan: true },
  });

  return link?.pcPlan ?? null;
}
