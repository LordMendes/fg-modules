import { prisma } from "@/lib/prisma";

export type CampaignCombatSettings = {
  strictTurns?: boolean;
  askPlayersToRoll?: boolean;
};

export type CampaignSettings = {
  combat?: CampaignCombatSettings;
};

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  combat: {
    strictTurns: false,
    askPlayersToRoll: true,
  },
};

export function normalizeCampaignSettings(raw: unknown): CampaignSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CAMPAIGN_SETTINGS };
  const o = raw as Record<string, unknown>;
  const combatRaw = o.combat;
  const combat =
    combatRaw && typeof combatRaw === "object"
      ? (combatRaw as Record<string, unknown>)
      : {};
  return {
    combat: {
      strictTurns:
        typeof combat.strictTurns === "boolean"
          ? combat.strictTurns
          : DEFAULT_CAMPAIGN_SETTINGS.combat!.strictTurns,
      askPlayersToRoll:
        typeof combat.askPlayersToRoll === "boolean"
          ? combat.askPlayersToRoll
          : DEFAULT_CAMPAIGN_SETTINGS.combat!.askPlayersToRoll,
    },
  };
}

export async function loadCampaignSettings(
  campaignId: string,
): Promise<CampaignSettings> {
  const row = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { settings: true },
  });
  return normalizeCampaignSettings(row?.settings);
}

export async function updateCampaignCombatSettings(
  campaignId: string,
  patch: Partial<CampaignCombatSettings>,
): Promise<CampaignSettings> {
  const current = await loadCampaignSettings(campaignId);
  const next: CampaignSettings = {
    ...current,
    combat: {
      ...current.combat,
      ...patch,
    },
  };
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { settings: next as object },
  });
  return next;
}

export function isStrictTurns(settings: CampaignSettings): boolean {
  return settings.combat?.strictTurns === true;
}

export function shouldAskPlayersToRoll(settings: CampaignSettings): boolean {
  return settings.combat?.askPlayersToRoll !== false;
}
