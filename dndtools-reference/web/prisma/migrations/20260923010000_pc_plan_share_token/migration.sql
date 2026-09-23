-- AlterTable
ALTER TABLE "PcPlan" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PcPlan_shareToken_key" ON "PcPlan"("shareToken");
