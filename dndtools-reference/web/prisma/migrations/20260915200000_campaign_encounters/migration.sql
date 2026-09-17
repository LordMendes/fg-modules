-- Campaign combat tracker + encounter bundles

CREATE TABLE IF NOT EXISTS "CampaignNpc" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faction" TEXT NOT NULL DEFAULT 'foe',
    "source" TEXT NOT NULL DEFAULT 'adhoc',
    "monsterSlug" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "imageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignNpc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignCombat" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "currentCombatantId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCombat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignCombatant" (
    "id" TEXT NOT NULL,
    "combatId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tokenId" TEXT,
    "pcPlanId" TEXT,
    "campaignNpcId" TEXT,
    "name" TEXT NOT NULL,
    "faction" TEXT NOT NULL DEFAULT 'foe',
    "init" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initMod" INTEGER NOT NULL DEFAULT 0,
    "hpMax" INTEGER NOT NULL DEFAULT 1,
    "hpTemp" INTEGER NOT NULL DEFAULT 0,
    "wounds" INTEGER NOT NULL DEFAULT 0,
    "ac" INTEGER NOT NULL DEFAULT 10,
    "acTouch" INTEGER,
    "acFlat" INTEGER,
    "spaceSquares" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "reachFeet" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "attacks" JSONB NOT NULL DEFAULT '[]',
    "targetIds" JSONB NOT NULL DEFAULT '[]',
    "visibleToPlayers" BOOLEAN NOT NULL DEFAULT true,
    "identified" BOOLEAN NOT NULL DEFAULT true,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignCombatant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignEncounter" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignEncounter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignEncounterEntry" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "campaignNpcId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignEncounterEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CampaignMapToken" ADD COLUMN IF NOT EXISTS "campaignNpcId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignCombat_campaignId_key" ON "CampaignCombat"("campaignId");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignCombatant_tokenId_key" ON "CampaignCombatant"("tokenId");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignEncounterEntry_encounterId_campaignNpcId_key" ON "CampaignEncounterEntry"("encounterId", "campaignNpcId");

CREATE INDEX IF NOT EXISTS "CampaignNpc_campaignId_idx" ON "CampaignNpc"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignCombatant_combatId_idx" ON "CampaignCombatant"("combatId");
CREATE INDEX IF NOT EXISTS "CampaignCombatant_pcPlanId_idx" ON "CampaignCombatant"("pcPlanId");
CREATE INDEX IF NOT EXISTS "CampaignCombatant_campaignNpcId_idx" ON "CampaignCombatant"("campaignNpcId");
CREATE INDEX IF NOT EXISTS "CampaignEncounter_campaignId_idx" ON "CampaignEncounter"("campaignId");
CREATE INDEX IF NOT EXISTS "CampaignEncounterEntry_encounterId_idx" ON "CampaignEncounterEntry"("encounterId");
CREATE INDEX IF NOT EXISTS "CampaignEncounterEntry_campaignNpcId_idx" ON "CampaignEncounterEntry"("campaignNpcId");
CREATE INDEX IF NOT EXISTS "CampaignMapToken_campaignNpcId_idx" ON "CampaignMapToken"("campaignNpcId");

DO $$ BEGIN
  ALTER TABLE "CampaignNpc" ADD CONSTRAINT "CampaignNpc_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignCombat" ADD CONSTRAINT "CampaignCombat_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignCombatant" ADD CONSTRAINT "CampaignCombatant_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "CampaignCombat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignCombatant" ADD CONSTRAINT "CampaignCombatant_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "CampaignMapToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignCombatant" ADD CONSTRAINT "CampaignCombatant_campaignNpcId_fkey" FOREIGN KEY ("campaignNpcId") REFERENCES "CampaignNpc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignMapToken" ADD CONSTRAINT "CampaignMapToken_campaignNpcId_fkey" FOREIGN KEY ("campaignNpcId") REFERENCES "CampaignNpc"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignEncounter" ADD CONSTRAINT "CampaignEncounter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignEncounterEntry" ADD CONSTRAINT "CampaignEncounterEntry_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "CampaignEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CampaignEncounterEntry" ADD CONSTRAINT "CampaignEncounterEntry_campaignNpcId_fkey" FOREIGN KEY ("campaignNpcId") REFERENCES "CampaignNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
