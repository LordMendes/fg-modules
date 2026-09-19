-- Phase 3: campaign combat settings and roll requests

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "CampaignCombatRollRequest" (
    "id" TEXT NOT NULL,
    "combatId" TEXT NOT NULL,
    "targetCombatantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'save',
    "saveType" TEXT NOT NULL,
    "dc" INTEGER,
    "label" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCombatRollRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignCombatRollRequest_combatId_status_idx"
    ON "CampaignCombatRollRequest"("combatId", "status");

CREATE INDEX IF NOT EXISTS "CampaignCombatRollRequest_targetCombatantId_idx"
    ON "CampaignCombatRollRequest"("targetCombatantId");
