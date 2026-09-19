-- Phase 0 encounter engine: combat state, effects, events, combatant engine fields

ALTER TABLE "CampaignCombat" ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "CampaignCombat" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "CampaignCombat" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "CampaignCombat" ADD COLUMN IF NOT EXISTS "eventSeq" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "nonlethal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "turnState" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "deathState" TEXT;
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "defenses" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "pendingTargetIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "pendingCrit" JSONB;
ALTER TABLE "CampaignCombatant" ADD COLUMN IF NOT EXISTS "stats" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "CampaignCombatEffect" (
    "id" TEXT NOT NULL,
    "combatantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "components" JSONB NOT NULL DEFAULT '[]',
    "sourceCombatantId" TEXT,
    "duration" INTEGER,
    "durationUnit" TEXT NOT NULL DEFAULT 'round',
    "tickInit" DOUBLE PRECISION,
    "expiry" TEXT NOT NULL DEFAULT 'startOfTurn',
    "applyMode" TEXT NOT NULL DEFAULT 'all',
    "visibility" TEXT NOT NULL DEFAULT 'visible',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCombatEffect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignCombatEvent" (
    "id" TEXT NOT NULL,
    "combatId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "actorCombatantId" TEXT,
    "targetCombatantId" TEXT,
    "actorUserId" TEXT,
    "payload" JSONB NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "rollId" TEXT,
    "revertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCombatEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CampaignCombatEffect_combatantId_idx" ON "CampaignCombatEffect"("combatantId");
CREATE INDEX IF NOT EXISTS "CampaignCombatEvent_combatId_seq_idx" ON "CampaignCombatEvent"("combatId", "seq");
CREATE INDEX IF NOT EXISTS "CampaignCombatEvent_campaignId_createdAt_idx" ON "CampaignCombatEvent"("campaignId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "CampaignCombatEffect" ADD CONSTRAINT "CampaignCombatEffect_combatantId_fkey" FOREIGN KEY ("combatantId") REFERENCES "CampaignCombatant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignCombatEvent" ADD CONSTRAINT "CampaignCombatEvent_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "CampaignCombat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing combats: active when they have combatants, otherwise idle
UPDATE "CampaignCombat" c
SET "state" = CASE
  WHEN EXISTS (SELECT 1 FROM "CampaignCombatant" cc WHERE cc."combatId" = c."id")
  THEN 'active'
  ELSE 'idle'
END;
