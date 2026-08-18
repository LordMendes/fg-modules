-- AlterTable
ALTER TABLE "Monster" ADD COLUMN "hitDiceNum" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Monster_hitDiceNum_idx" ON "Monster"("hitDiceNum");
