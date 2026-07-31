-- AlterTable
ALTER TABLE "Monster" ADD COLUMN "size" TEXT;

-- Backfill from stat_line first token (3.5 size categories)
UPDATE "Monster"
SET "size" = split_part(TRIM("indexData"->>'stat_line'), ' ', 1)
WHERE split_part(TRIM("indexData"->>'stat_line'), ' ', 1) IN (
  'Fine', 'Diminutive', 'Tiny', 'Small', 'Medium',
  'Large', 'Huge', 'Gargantuan', 'Colossal'
);

-- CreateIndex
CREATE INDEX "Monster_size_idx" ON "Monster"("size");
