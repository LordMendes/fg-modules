-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "liveMapId" TEXT;

-- CreateTable
CREATE TABLE "CampaignMap" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "imageWidth" INTEGER NOT NULL,
    "imageHeight" INTEGER NOT NULL,
    "gridSizePx" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "gridOffsetX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gridOffsetY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gridType" TEXT NOT NULL DEFAULT 'square',
    "scaleFeet" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "diagonalRule" TEXT NOT NULL DEFAULT '5105',
    "fogEnabled" BOOLEAN NOT NULL DEFAULT false,
    "losEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lightingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "daylight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "explorerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapToken" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pcPlanId" TEXT,
    "name" TEXT NOT NULL,
    "imageKey" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "layer" TEXT NOT NULL DEFAULT 'token',
    "visibility" TEXT NOT NULL DEFAULT 'always',
    "ownerUserId" TEXT,
    "visionRange" DOUBLE PRECISION,
    "emitsLight" BOOLEAN NOT NULL DEFAULT false,
    "lightBright" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lightDim" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMapToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapFogRegion" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMapFogRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapDrawing" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "stroke" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMapDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapOccluder" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'wall',
    "points" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'closed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMapOccluder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapLight" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "brightFeet" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "dimFeet" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "color" TEXT NOT NULL DEFAULT '#ffd8a8',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" TEXT NOT NULL DEFAULT 'light',

    CONSTRAINT "CampaignMapLight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMapExplorerCell" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "owner" TEXT NOT NULL DEFAULT 'party',
    "cx" INTEGER NOT NULL,
    "cy" INTEGER NOT NULL,

    CONSTRAINT "CampaignMapExplorerCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignMap_campaignId_idx" ON "CampaignMap"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignMapToken_mapId_idx" ON "CampaignMapToken"("mapId");

-- CreateIndex
CREATE INDEX "CampaignMapToken_pcPlanId_idx" ON "CampaignMapToken"("pcPlanId");

-- CreateIndex
CREATE INDEX "CampaignMapFogRegion_mapId_idx" ON "CampaignMapFogRegion"("mapId");

-- CreateIndex
CREATE INDEX "CampaignMapDrawing_mapId_idx" ON "CampaignMapDrawing"("mapId");

-- CreateIndex
CREATE INDEX "CampaignMapOccluder_mapId_idx" ON "CampaignMapOccluder"("mapId");

-- CreateIndex
CREATE INDEX "CampaignMapLight_mapId_idx" ON "CampaignMapLight"("mapId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMapExplorerCell_mapId_owner_cx_cy_key" ON "CampaignMapExplorerCell"("mapId", "owner", "cx", "cy");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_liveMapId_fkey" FOREIGN KEY ("liveMapId") REFERENCES "CampaignMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMap" ADD CONSTRAINT "CampaignMap_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapToken" ADD CONSTRAINT "CampaignMapToken_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapFogRegion" ADD CONSTRAINT "CampaignMapFogRegion_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapDrawing" ADD CONSTRAINT "CampaignMapDrawing_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapOccluder" ADD CONSTRAINT "CampaignMapOccluder_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapLight" ADD CONSTRAINT "CampaignMapLight_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMapExplorerCell" ADD CONSTRAINT "CampaignMapExplorerCell_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "CampaignMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
