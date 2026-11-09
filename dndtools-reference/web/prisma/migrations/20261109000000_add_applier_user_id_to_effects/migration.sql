-- Add applierUserId to CampaignCombatEffect for removal permissions
-- Effects with applierUserId can only be removed by that user or the DM
-- Legacy effects (applierUserId IS NULL) can only be removed by DM
ALTER TABLE "CampaignCombatEffect" ADD COLUMN "applierUserId" TEXT;
