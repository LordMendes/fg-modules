-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "dmUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPc" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pcPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignPc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRoll" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "characterName" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "dice" JSONB NOT NULL,
    "modifier" INTEGER NOT NULL DEFAULT 0,
    "iterativeModifiers" JSONB,
    "faces" JSONB NOT NULL,
    "faceSum" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "natural20" BOOLEAN NOT NULL DEFAULT false,
    "natural1" BOOLEAN NOT NULL DEFAULT false,
    "attackTotals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_joinCode_key" ON "Campaign"("joinCode");

-- CreateIndex
CREATE INDEX "Campaign_dmUserId_idx" ON "Campaign"("dmUserId");

-- CreateIndex
CREATE INDEX "CampaignMember_userId_idx" ON "CampaignMember"("userId");

-- CreateIndex
CREATE INDEX "CampaignMember_campaignId_idx" ON "CampaignMember"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMember_campaignId_userId_key" ON "CampaignMember"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "CampaignPc_campaignId_idx" ON "CampaignPc"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPc_userId_idx" ON "CampaignPc"("userId");

-- CreateIndex
CREATE INDEX "CampaignPc_pcPlanId_idx" ON "CampaignPc"("pcPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPc_campaignId_pcPlanId_key" ON "CampaignPc"("campaignId", "pcPlanId");

-- CreateIndex
CREATE INDEX "CampaignRoll_campaignId_createdAt_idx" ON "CampaignRoll"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_dmUserId_fkey" FOREIGN KEY ("dmUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPc" ADD CONSTRAINT "CampaignPc_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPc" ADD CONSTRAINT "CampaignPc_pcPlanId_fkey" FOREIGN KEY ("pcPlanId") REFERENCES "PcPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPc" ADD CONSTRAINT "CampaignPc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRoll" ADD CONSTRAINT "CampaignRoll_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRoll" ADD CONSTRAINT "CampaignRoll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
