-- CreateTable
CREATE TABLE "PcPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortcut" TEXT,
    "state" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PcPlan_userId_idx" ON "PcPlan"("userId");

-- CreateIndex
CREATE INDEX "PcPlan_userId_shortcut_idx" ON "PcPlan"("userId", "shortcut");

-- CreateIndex
CREATE UNIQUE INDEX "PcPlan_userId_name_key" ON "PcPlan"("userId", "name");

-- AddForeignKey
ALTER TABLE "PcPlan" ADD CONSTRAINT "PcPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
