-- AlterTable
ALTER TABLE "Spell" ADD COLUMN "schools" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Spell" ADD COLUMN "disciplines" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Spell" ADD COLUMN "subschool" TEXT;

-- CreateIndex
CREATE INDEX "Spell_subschool_idx" ON "Spell"("subschool");

-- GIN indexes for array overlap filters (hasSome)
CREATE INDEX "Spell_schools_gin_idx" ON "Spell" USING GIN ("schools");
CREATE INDEX "Spell_disciplines_gin_idx" ON "Spell" USING GIN ("disciplines");
