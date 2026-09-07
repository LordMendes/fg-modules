-- AlterTable
ALTER TABLE "CampaignMapDrawing" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'stroke';
ALTER TABLE "CampaignMapDrawing" ADD COLUMN IF NOT EXISTS "geom" JSONB;
ALTER TABLE "CampaignMapDrawing" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure stroke has a default for geometric rows
ALTER TABLE "CampaignMapDrawing" ALTER COLUMN "stroke" SET DEFAULT '[]';
