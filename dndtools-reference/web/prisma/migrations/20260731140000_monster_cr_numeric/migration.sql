-- AlterTable
ALTER TABLE "Monster" ADD COLUMN "challengeRatingNum" DOUBLE PRECISION;

-- Backfill numeric CR from stored challengeRating strings
UPDATE "Monster"
SET "challengeRatingNum" = CASE
  WHEN "challengeRating" ~ '^\s*\d+\s*/\s*\d+\s*$' THEN
    (regexp_match("challengeRating", '^\s*(\d+)\s*/\s*(\d+)\s*$'))[1]::double precision
    / NULLIF((regexp_match("challengeRating", '^\s*(\d+)\s*/\s*(\d+)\s*$'))[2]::double precision, 0)
  WHEN "challengeRating" ~ '^\s*-?\d+(\.\d+)?\s*$' THEN
    TRIM("challengeRating")::double precision
  ELSE NULL
END
WHERE "challengeRating" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Monster_challengeRatingNum_idx" ON "Monster"("challengeRatingNum");
