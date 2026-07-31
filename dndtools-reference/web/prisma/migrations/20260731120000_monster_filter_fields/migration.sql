-- AlterTable
ALTER TABLE "Monster" ADD COLUMN "alignment" TEXT,
ADD COLUMN "environment" TEXT,
ADD COLUMN "treasure" TEXT;

-- Backfill from indexData for existing rows
UPDATE "Monster"
SET
  "alignment" = NULLIF(TRIM("indexData"->>'alignment'), ''),
  "environment" = NULLIF(TRIM("indexData"->>'environment'), ''),
  "treasure" = NULLIF(TRIM("indexData"->>'treasure'), '')
WHERE "indexData" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Monster_alignment_idx" ON "Monster"("alignment");

-- CreateIndex
CREATE INDEX "Monster_environment_idx" ON "Monster"("environment");

-- CreateIndex
CREATE INDEX "Monster_treasure_idx" ON "Monster"("treasure");
