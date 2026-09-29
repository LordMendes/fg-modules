import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

function formatAdminDate(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export type AdminOverview = {
  counts: {
    users: number;
    pcPlans: number;
    campaigns: number;
    savedLists: number;
  };
  users: Array<{
    id: string;
    email: string;
    username: string;
    name: string | null;
    createdAt: string;
    pcPlanCount: number;
    listCount: number;
    campaignsAsDmCount: number;
    campaignMembershipCount: number;
  }>;
  pcPlans: Array<{
    id: string;
    name: string;
    ownerUsername: string;
    ownerEmail: string;
    createdAt: string;
    updatedAt: string;
    shared: boolean;
    campaignNames: string[];
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    dmUsername: string;
    dmEmail: string;
    createdAt: string;
    memberCount: number;
    pcCount: number;
    mapCount: number;
    npcCount: number;
  }>;
  savedLists: Array<{
    id: string;
    name: string;
    ownerUsername: string;
    ownerEmail: string;
    createdAt: string;
    itemCount: number;
  }>;
};

export async function loadAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();

  const [usersRaw, pcPlansRaw, campaignsRaw, savedListsRaw] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            pcPlans: true,
            lists: true,
            campaignsAsDm: true,
            campaignMembers: true,
          },
        },
      },
    }),
    prisma.pcPlan.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        shareToken: true,
        user: { select: { username: true, email: true } },
        campaignPcs: { select: { campaign: { select: { name: true } } } },
      },
    }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        dm: { select: { username: true, email: true } },
        _count: {
          select: {
            members: true,
            pcs: true,
            maps: true,
            npcs: true,
          },
        },
      },
    }),
    prisma.savedList.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: { select: { username: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const users = usersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    createdAt: formatAdminDate(u.createdAt),
    pcPlanCount: u._count.pcPlans,
    listCount: u._count.lists,
    campaignsAsDmCount: u._count.campaignsAsDm,
    campaignMembershipCount: u._count.campaignMembers,
  }));

  const pcPlans = pcPlansRaw.map((p) => ({
    id: p.id,
    name: p.name,
    ownerUsername: p.user.username,
    ownerEmail: p.user.email,
    createdAt: formatAdminDate(p.createdAt),
    updatedAt: formatAdminDate(p.updatedAt),
    shared: p.shareToken != null,
    campaignNames: p.campaignPcs.map((cp) => cp.campaign.name),
  }));

  const campaigns = campaignsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    dmUsername: c.dm.username,
    dmEmail: c.dm.email,
    createdAt: formatAdminDate(c.createdAt),
    memberCount: c._count.members,
    pcCount: c._count.pcs,
    mapCount: c._count.maps,
    npcCount: c._count.npcs,
  }));

  const savedLists = savedListsRaw.map((l) => ({
    id: l.id,
    name: l.name,
    ownerUsername: l.user.username,
    ownerEmail: l.user.email,
    createdAt: formatAdminDate(l.createdAt),
    itemCount: l._count.items,
  }));

  return {
    counts: {
      users: users.length,
      pcPlans: pcPlans.length,
      campaigns: campaigns.length,
      savedLists: savedLists.length,
    },
    users,
    pcPlans,
    campaigns,
    savedLists,
  };
}
