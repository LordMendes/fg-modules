-- CreateTable
CREATE TABLE "PcPlanRevision" (
    "id" TEXT NOT NULL,
    "pcPlanId" TEXT NOT NULL,
    "characterLevel" INTEGER NOT NULL,
    "classSummary" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcPlanRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PcPlanRevision_pcPlanId_idx" ON "PcPlanRevision"("pcPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "PcPlanRevision_pcPlanId_characterLevel_key" ON "PcPlanRevision"("pcPlanId", "characterLevel");

-- AddForeignKey
ALTER TABLE "PcPlanRevision" ADD CONSTRAINT "PcPlanRevision_pcPlanId_fkey" FOREIGN KEY ("pcPlanId") REFERENCES "PcPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
