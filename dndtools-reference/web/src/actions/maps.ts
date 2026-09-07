"use server";

import { randomUUID } from "node:crypto";
import { requireCurrentUser } from "@/lib/auth/session";
import { publishCampaignLive } from "@/lib/campaign/liveHub";
import { asDiagonalRule } from "@/lib/map/grid";
import { simplifyPolygon } from "@/lib/map/fog";
import { canWalkTo, tokenCenter } from "@/lib/map/los";
import {
  loadLiveMapForCampaign,
  loadPcTokenUrls,
  mapDrawingRow,
  mapFogRegionRow,
  mapInclude,
  mapLightRow,
  mapOccluderRow,
  toCampaignMapView,
} from "@/lib/map/mapView";
import {
  filterMapViewForViewer,
  filterOccluderForViewer,
  isTokenVisibleToViewer,
  userColor,
  type MapViewer,
} from "@/lib/map/permissions";
import type {
  CampaignMapListItem,
  CampaignMapView,
  MapAoePointerView,
  MapFogKind,
  MapLightView,
  MapOccluderKind,
  MapOccluderState,
  MapOccluderView,
  MapPoint,
  MapTokenLayer,
  MapTokenView,
  MapTokenVisibility,
} from "@/lib/map/types";
import { parseUvtt } from "@/lib/map/uvtt";
import { prisma } from "@/lib/prisma";
import { processMapImage } from "@/lib/storage/map-image";
import {
  campaignMapImageKey,
  campaignMapTokenImageKey,
  copyPcImageObject,
  deletePcImageObject,
  putPcImageObject,
} from "@/lib/storage/r2";
import type { Prisma } from "@/generated/prisma/client";

export type MapActionResult = {
  success: boolean;
  error?: string;
  blocked?: boolean;
};

type TokenRow = {
  id: string;
  mapId: string;
  kind: string;
  pcPlanId: string | null;
  name: string;
  imageKey: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: string;
  visibility: string;
  ownerUserId: string | null;
  visionRange: number | null;
  emitsLight: boolean;
  lightBright: number;
  lightDim: number;
  seq: number;
  map?: { campaignId: string; fogEnabled: boolean; losEnabled: boolean };
};

const AOE_TTL_MS = 60_000;

const globalForAoe = globalThis as typeof globalThis & {
  __campaignAoePointers?: Map<string, MapAoePointerView[]>;
};

function aoeStore(): Map<string, MapAoePointerView[]> {
  if (!globalForAoe.__campaignAoePointers) {
    globalForAoe.__campaignAoePointers = new Map();
  }
  return globalForAoe.__campaignAoePointers;
}

function newMapId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

function newEntityId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

function parsePoints(raw: unknown): MapPoint[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: MapPoint[] = [];
  for (const item of raw) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as MapPoint).x !== "number" ||
      typeof (item as MapPoint).y !== "number" ||
      !Number.isFinite((item as MapPoint).x) ||
      !Number.isFinite((item as MapPoint).y)
    ) {
      return null;
    }
    out.push({ x: (item as MapPoint).x, y: (item as MapPoint).y });
  }
  return out;
}

function asFogKind(value: string): MapFogKind {
  return value === "hide" ? "hide" : "reveal";
}

function asTokenLayer(value: string): MapTokenLayer {
  return value === "gm" ? "gm" : "token";
}

function asTokenVisibility(value: string): MapTokenVisibility {
  if (value === "hidden" || value === "mask" || value === "always") return value;
  return "always";
}

function asOccluderKind(value: string): MapOccluderKind {
  const allowed: MapOccluderKind[] = [
    "wall",
    "door",
    "window",
    "terrain",
    "secret",
    "illusion",
    "pit",
  ];
  return allowed.includes(value as MapOccluderKind)
    ? (value as MapOccluderKind)
    : "wall";
}

function asOccluderState(value: string): MapOccluderState {
  if (value === "open" || value === "locked" || value === "closed") return value;
  return "closed";
}

function validateMapName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Map name is required";
  if (trimmed.length > 64) return "Map name must be 64 characters or fewer";
  return null;
}

async function requireActiveMember(campaignId: string, userId: string) {
  const member = await prisma.campaignMember.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
    include: {
      campaign: { select: { dmUserId: true, liveMapId: true } },
    },
  });
  if (!member || member.status !== "active") return null;
  return member;
}

function viewerFromMember(member: { userId: string; role: string }): MapViewer {
  return { userId: member.userId, isDm: member.role === "dm" };
}

async function requireMapInCampaign(campaignId: string, mapId: string) {
  return prisma.campaignMap.findFirst({
    where: { id: mapId, campaignId },
    include: { campaign: { select: { dmUserId: true, liveMapId: true } } },
  });
}

async function loadRawMapView(mapId: string): Promise<CampaignMapView | null> {
  const row = await prisma.campaignMap.findUnique({
    where: { id: mapId },
    include: mapInclude,
  });
  if (!row) return null;
  const pcIds = row.tokens
    .map((t) => t.pcPlanId)
    .filter((id): id is string => Boolean(id));
  const urls = await loadPcTokenUrls(pcIds);
  return toCampaignMapView(row, urls);
}

async function tokenViewFromRow(
  row: TokenRow,
  pcTokenUrls?: Map<string, string | null>,
): Promise<MapTokenView> {
  let urls = pcTokenUrls;
  if (!urls && row.kind === "pc" && row.pcPlanId) {
    urls = await loadPcTokenUrls([row.pcPlanId]);
  }
  const view = toCampaignMapView(
    {
      id: row.mapId,
      name: "",
      imageKey: "",
      imageWidth: 0,
      imageHeight: 0,
      gridSizePx: 70,
      gridOffsetX: 0,
      gridOffsetY: 0,
      gridType: "square",
      scaleFeet: 5,
      diagonalRule: "5105",
      fogEnabled: false,
      losEnabled: false,
      lightingEnabled: false,
      daylight: 1,
      explorerEnabled: false,
      updatedAt: new Date(),
      tokens: [row],
      fogRegions: [],
      drawings: [],
      occluders: [],
      lights: [],
    },
    urls ?? new Map(),
  );
  return view.tokens[0]!;
}

function publishFilteredMapSnapshot(
  campaignId: string,
  dmUserId: string,
  map: CampaignMapView | null,
): void {
  publishCampaignLive(
    campaignId,
    { type: "mapSnapshot", map },
    {
      filterForUser: (userId, event) => {
        if (event.type !== "mapSnapshot") return event;
        if (!map) return { type: "mapSnapshot", map: null };
        const viewer: MapViewer = { userId, isDm: userId === dmUserId };
        return {
          type: "mapSnapshot",
          map: filterMapViewForViewer(map, viewer),
        };
      },
    },
  );
}

function publishMapList(
  campaignId: string,
  dmUserId: string,
  maps: CampaignMapListItem[],
): void {
  publishCampaignLive(
    campaignId,
    { type: "mapList", maps },
    {
      filterForUser: (userId, event) => {
        if (event.type !== "mapList") return event;
        if (userId === dmUserId) return event;
        return null;
      },
    },
  );
}

function publishFilteredTokenUpsert(
  campaignId: string,
  dmUserId: string,
  token: MapTokenView,
  mapContext: { fogEnabled: boolean; fogRegions: CampaignMapView["fogRegions"] },
): void {
  publishCampaignLive(
    campaignId,
    { type: "mapTokenUpsert", token },
    {
      filterForUser: (userId, event) => {
        if (event.type !== "mapTokenUpsert") return event;
        const viewer: MapViewer = { userId, isDm: userId === dmUserId };
        if (
          isTokenVisibleToViewer(
            token,
            viewer,
            mapContext.fogEnabled,
            mapContext.fogRegions,
          )
        ) {
          return event;
        }
        return { type: "mapTokenRemove", tokenId: token.id };
      },
    },
  );
}

function publishMapFlags(
  campaignId: string,
  flags: {
    fogEnabled: boolean;
    losEnabled: boolean;
    lightingEnabled: boolean;
    daylight: number;
    explorerEnabled: boolean;
  },
): void {
  publishCampaignLive(campaignId, { type: "mapFlags", ...flags });
}

function publishFilteredOccluderUpsert(
  campaignId: string,
  dmUserId: string,
  occluder: MapOccluderView,
): void {
  publishCampaignLive(
    campaignId,
    { type: "mapOccluderUpsert", occluder },
    {
      filterForUser: (userId, event) => {
        if (event.type !== "mapOccluderUpsert") return event;
        const viewer: MapViewer = { userId, isDm: userId === dmUserId };
        return {
          type: "mapOccluderUpsert",
          occluder: filterOccluderForViewer(occluder, viewer),
        };
      },
    },
  );
}

async function syncMaskTokensForMap(
  campaignId: string,
  mapId: string,
  dmUserId: string,
): Promise<void> {
  const raw = await loadRawMapView(mapId);
  if (!raw) return;
  for (const token of raw.tokens) {
    if (token.visibility !== "mask" && token.layer !== "gm") continue;
    publishFilteredTokenUpsert(campaignId, dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }
}

function canUserMoveToken(
  token: { ownerUserId: string | null },
  userId: string,
  isDm: boolean,
): boolean {
  if (isDm) return true;
  if (token.ownerUserId === userId) return true;
  return false;
}

function pointToSegmentDistance(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function minDistanceToPolyline(point: MapPoint, points: MapPoint[]): number {
  if (points.length < 2) {
    if (points.length === 1) return Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y);
    return Infinity;
  }
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(min, pointToSegmentDistance(point, points[i]!, points[i + 1]!));
  }
  return min;
}

async function playerNearOccluder(
  campaignId: string,
  mapId: string,
  userId: string,
  occluderPoints: MapPoint[],
  maxSquares: number,
): Promise<boolean> {
  const tokens = await prisma.campaignMapToken.findMany({
    where: {
      mapId,
      OR: [{ ownerUserId: userId }, { pcPlanId: { not: null } }],
    },
  });
  if (tokens.length === 0) return false;

  const ownedPcIds = new Set(
    (
      await prisma.campaignPc.findMany({
        where: { campaignId, userId },
        select: { pcPlanId: true },
      })
    ).map((r) => r.pcPlanId),
  );

  for (const token of tokens) {
    if (token.ownerUserId !== userId) {
      if (!token.pcPlanId || !ownedPcIds.has(token.pcPlanId)) continue;
    }
    const center = tokenCenter(token);
    if (minDistanceToPolyline(center, occluderPoints) <= maxSquares) {
      return true;
    }
  }
  return false;
}

async function deleteMapAssets(campaignId: string, mapId: string): Promise<void> {
  const map = await prisma.campaignMap.findUnique({
    where: { id: mapId },
    include: { tokens: { select: { id: true, imageKey: true } } },
  });
  if (!map) return;
  await deletePcImageObject(campaignMapImageKey(campaignId, mapId)).catch(() => {});
  for (const token of map.tokens) {
    if (token.imageKey) {
      await deletePcImageObject(token.imageKey).catch(() => {});
    } else {
      await deletePcImageObject(
        campaignMapTokenImageKey(campaignId, mapId, token.id),
      ).catch(() => {});
    }
  }
}

export async function listCampaignMaps(
  campaignId: string,
): Promise<CampaignMapListItem[]> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") return [];

  const rows = await prisma.campaignMap.findMany({
    where: { campaignId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function createCampaignMap(
  campaignId: string,
  formData: FormData,
): Promise<MapActionResult & { mapId?: string }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can create maps" };
  }

  const name = String(formData.get("name") ?? "");
  const nameError = validateMapName(name);
  if (nameError) return { success: false, error: nameError };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Map image is required" };
  }

  let processed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    processed = await processMapImage(buffer);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process image",
    };
  }

  const mapId = newMapId();
  const imageKey = campaignMapImageKey(campaignId, mapId);

  try {
    await putPcImageObject(imageKey, processed.buffer);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload map image",
    };
  }

  const existingCount = await prisma.campaignMap.count({ where: { campaignId } });
  const isFirst = existingCount === 0;

  await prisma.campaignMap.create({
    data: {
      id: mapId,
      campaignId,
      name: name.trim(),
      imageKey,
      imageWidth: processed.width,
      imageHeight: processed.height,
    },
  });

  if (isFirst) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { liveMapId: mapId },
    });
  }

  const maps = await listCampaignMaps(campaignId);
  publishMapList(campaignId, member.campaign.dmUserId, maps);

  if (isFirst) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, raw);
  }

  return { success: true, mapId };
}

export async function deleteCampaignMap(
  campaignId: string,
  mapId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can delete maps" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const wasLive = map.campaign.liveMapId === mapId;

  await deleteMapAssets(campaignId, mapId);
  await prisma.campaignMap.delete({ where: { id: mapId } });

  if (wasLive) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { liveMapId: null },
    });
    publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, null);
  }

  const maps = await listCampaignMaps(campaignId);
  publishMapList(campaignId, member.campaign.dmUserId, maps);

  return { success: true };
}

export async function renameCampaignMap(
  campaignId: string,
  mapId: string,
  name: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can rename maps" };
  }

  const nameError = validateMapName(name);
  if (nameError) return { success: false, error: nameError };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { name: name.trim() },
  });

  const maps = await listCampaignMaps(campaignId);
  publishMapList(campaignId, member.campaign.dmUserId, maps);

  return { success: true };
}

export async function setLiveCampaignMap(
  campaignId: string,
  mapId: string | null,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can set the live map" };
  }

  if (mapId) {
    const map = await requireMapInCampaign(campaignId, mapId);
    if (!map) return { success: false, error: "Map not found" };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { liveMapId: mapId },
  });

  const raw = mapId ? await loadRawMapView(mapId) : null;
  publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, raw);

  return { success: true };
}

export async function updateCampaignMapGrid(
  campaignId: string,
  mapId: string,
  gridSizePx: number,
  gridOffsetX: number,
  gridOffsetY: number,
  scaleFeet: number,
  diagonalRule: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can calibrate the grid" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  if (!(gridSizePx > 0) || !(scaleFeet > 0)) {
    return { success: false, error: "Invalid grid settings" };
  }

  const rule = asDiagonalRule(diagonalRule);

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: {
      gridSizePx,
      gridOffsetX,
      gridOffsetY,
      scaleFeet,
      diagonalRule: rule,
    },
  });

  publishCampaignLive(campaignId, {
    type: "mapGrid",
    gridSizePx,
    gridOffsetX,
    gridOffsetY,
    scaleFeet,
    diagonalRule: rule,
  });

  if (map.campaign.liveMapId === mapId) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, raw);
  }

  return { success: true };
}

export async function placePcToken(
  campaignId: string,
  mapId: string,
  pcPlanId: string,
  x: number,
  y: number,
): Promise<MapActionResult & { token?: MapTokenView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const link = await prisma.campaignPc.findUnique({
    where: { campaignId_pcPlanId: { campaignId, pcPlanId } },
    include: { pcPlan: { select: { name: true } } },
  });
  if (!link) return { success: false, error: "Character is not on this campaign roster" };

  const isDm = member.role === "dm";
  if (!isDm && link.userId !== user.id) {
    return { success: false, error: "Cannot place another player's character" };
  }

  const existing = await prisma.campaignMapToken.findFirst({
    where: { mapId, pcPlanId },
  });

  let row: TokenRow;
  if (existing) {
    row = await prisma.campaignMapToken.update({
      where: { id: existing.id },
      data: { x, y },
    });
  } else {
    row = await prisma.campaignMapToken.create({
      data: {
        id: newEntityId(),
        mapId,
        kind: "pc",
        pcPlanId,
        name: link.pcPlan.name,
        x,
        y,
        layer: "token",
        visibility: "always",
        ownerUserId: link.userId,
      },
    });
  }

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true, token };
}

export async function placeNpcToken(
  campaignId: string,
  mapId: string,
  name: string,
  x: number,
  y: number,
  formData?: FormData,
): Promise<MapActionResult & { token?: MapTokenView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can place NPC tokens" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const trimmed = name.trim().slice(0, 64);
  if (!trimmed) return { success: false, error: "Token name is required" };

  const tokenId = newEntityId();
  let imageKey: string | null = null;

  const file = formData?.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processMapImage(buffer);
      imageKey = campaignMapTokenImageKey(campaignId, mapId, tokenId);
      await putPcImageObject(imageKey, processed.buffer);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to process token image",
      };
    }
  }

  const visibility: MapTokenVisibility = map.fogEnabled ? "mask" : "always";

  const row = await prisma.campaignMapToken.create({
    data: {
      id: tokenId,
      mapId,
      kind: "npc",
      name: trimmed,
      imageKey,
      x,
      y,
      layer: "token",
      visibility,
    },
  });

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true, token };
}

export async function placePartyTokens(
  campaignId: string,
  mapId: string,
  startX = 0,
  startY = 0,
): Promise<MapActionResult & { placed?: number }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can place the party" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const pcs = await prisma.campaignPc.findMany({
    where: { campaignId },
    include: { pcPlan: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  let placed = 0;
  for (let i = 0; i < pcs.length; i++) {
    const pc = pcs[i]!;
    const result = await placePcToken(
      campaignId,
      mapId,
      pc.pcPlanId,
      startX + i,
      startY,
    );
    if (result.success) placed++;
  }

  return { success: true, placed };
}

export async function removeMapToken(
  campaignId: string,
  mapId: string,
  tokenId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const token = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!token) return { success: false, error: "Token not found" };

  const isDm = member.role === "dm";
  if (!canUserMoveToken(token, user.id, isDm)) {
    return { success: false, error: "Cannot remove this token" };
  }

  if (token.imageKey) {
    await deletePcImageObject(token.imageKey).catch(() => {});
  }

  await prisma.campaignMapToken.delete({ where: { id: tokenId } });

  publishCampaignLive(campaignId, { type: "mapTokenRemove", tokenId });

  return { success: true };
}

export async function broadcastMapTokenMove(
  campaignId: string,
  tokenId: string,
  x: number,
  y: number,
  rotation: number,
  seq: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const token = await prisma.campaignMapToken.findUnique({
    where: { id: tokenId },
    include: { map: { select: { campaignId: true } } },
  });
  if (!token || token.map.campaignId !== campaignId) {
    return { success: false, error: "Token not found" };
  }

  const isDm = member.role === "dm";
  if (!canUserMoveToken(token, user.id, isDm)) {
    return { success: false, error: "Cannot move this token" };
  }

  publishCampaignLive(campaignId, {
    type: "mapTokenMove",
    tokenId,
    x,
    y,
    rotation,
    seq,
    committed: false,
  });

  return { success: true };
}

export async function commitMapTokenMove(
  campaignId: string,
  tokenId: string,
  x: number,
  y: number,
  rotation: number,
  seq: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const token = await prisma.campaignMapToken.findUnique({
    where: { id: tokenId },
    include: {
      map: {
        select: {
          campaignId: true,
          losEnabled: true,
          fogEnabled: true,
        },
      },
    },
  });
  if (!token || token.map.campaignId !== campaignId) {
    return { success: false, error: "Token not found" };
  }

  const isDm = member.role === "dm";
  if (!canUserMoveToken(token, user.id, isDm)) {
    return { success: false, error: "Cannot move this token" };
  }

  if (token.map.losEnabled) {
    const occluderRows = await prisma.campaignMapOccluder.findMany({
      where: { mapId: token.mapId },
    });
    const occluders = occluderRows.map(mapOccluderRow);
    const from = tokenCenter(token);
    const to = tokenCenter({ x, y, width: token.width, height: token.height });
    if (!canWalkTo(from, to, occluders)) {
      const snapSeq = Math.max(seq, token.seq + 1);
      publishCampaignLive(campaignId, {
        type: "mapTokenMove",
        tokenId,
        x: token.x,
        y: token.y,
        rotation: token.rotation,
        seq: snapSeq,
        committed: true,
      });
      return {
        success: false,
        error: "Blocked by a wall",
        blocked: true,
      };
    }
  }

  const nextSeq = Math.max(seq, token.seq + 1);
  await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data: { x, y, rotation, seq: nextSeq },
  });

  publishCampaignLive(campaignId, {
    type: "mapTokenMove",
    tokenId,
    x,
    y,
    rotation,
    seq: nextSeq,
    committed: true,
  });

  await syncMaskTokensForMap(campaignId, token.mapId, member.campaign.dmUserId);

  return { success: true };
}

export async function sendMapPing(
  campaignId: string,
  x: number,
  y: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  publishCampaignLive(campaignId, {
    type: "mapPing",
    x,
    y,
    color: userColor(user.id),
    userId: user.id,
  });

  return { success: true };
}

export async function sendMapViewportGoTo(
  campaignId: string,
  x: number,
  y: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can force viewport sync" };
  }

  publishCampaignLive(campaignId, { type: "mapViewportGoTo", x, y });

  return { success: true };
}

export async function setFogEnabled(
  campaignId: string,
  mapId: string,
  enabled: boolean,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can toggle fog" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { fogEnabled: enabled },
  });

  const updated = await prisma.campaignMap.findUniqueOrThrow({
    where: { id: mapId },
    select: {
      fogEnabled: true,
      losEnabled: true,
      lightingEnabled: true,
      daylight: true,
      explorerEnabled: true,
    },
  });

  publishMapFlags(campaignId, updated);

  if (map.campaign.liveMapId === mapId) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, raw);
  }

  return { success: true };
}

export async function addFogRegion(
  campaignId: string,
  mapId: string,
  kind: string,
  points: unknown,
): Promise<MapActionResult & { region?: CampaignMapView["fogRegions"][number] }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can edit fog" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const parsed = parsePoints(points);
  if (!parsed || parsed.length < 3) {
    return { success: false, error: "Fog region needs at least 3 points" };
  }

  const simplified = simplifyPolygon(parsed);
  const fogKind = asFogKind(kind);

  const row = await prisma.campaignMapFogRegion.create({
    data: {
      id: newEntityId(),
      mapId,
      kind: fogKind,
      points: simplified as unknown as Prisma.InputJsonValue,
    },
  });

  const region = mapFogRegionRow(row);
  publishCampaignLive(campaignId, { type: "mapFogUpsert", region });
  await syncMaskTokensForMap(campaignId, mapId, member.campaign.dmUserId);

  return { success: true, region };
}

export async function removeFogRegion(
  campaignId: string,
  mapId: string,
  regionId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can edit fog" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const region = await prisma.campaignMapFogRegion.findFirst({
    where: { id: regionId, mapId },
  });
  if (!region) return { success: false, error: "Fog region not found" };

  await prisma.campaignMapFogRegion.delete({ where: { id: regionId } });

  publishCampaignLive(campaignId, { type: "mapFogRemove", regionId });
  await syncMaskTokensForMap(campaignId, mapId, member.campaign.dmUserId);

  return { success: true };
}

export async function resetFog(
  campaignId: string,
  mapId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can reset fog" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMapFogRegion.deleteMany({ where: { mapId } });

  publishCampaignLive(campaignId, { type: "mapFogReset" });
  await syncMaskTokensForMap(campaignId, mapId, member.campaign.dmUserId);

  return { success: true };
}

export async function setTokenLayer(
  campaignId: string,
  mapId: string,
  tokenId: string,
  layer: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can change token layer" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!existing) return { success: false, error: "Token not found" };

  const tokenLayer = asTokenLayer(layer);
  const row = await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data: { layer: tokenLayer },
  });

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true };
}

export async function setTokenVisibility(
  campaignId: string,
  mapId: string,
  tokenId: string,
  visibility: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can change token visibility" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!existing) return { success: false, error: "Token not found" };

  const vis = asTokenVisibility(visibility);
  const row = await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data: { visibility: vis },
  });

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true };
}

export async function addDrawing(
  campaignId: string,
  mapId: string,
  input:
    | unknown
    | {
        kind?: "stroke" | "circle" | "square" | "cone";
        stroke?: unknown;
        geom?: {
          x: number;
          y: number;
          sizeFeet: number;
          rotation: number;
        };
      },
): Promise<MapActionResult & { drawing?: CampaignMapView["drawings"][number] }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  // Backward compat: bare point array = freehand stroke
  const payload =
    Array.isArray(input) || (input && typeof input === "object" && !("kind" in (input as object)) && !("geom" in (input as object)) && !("stroke" in (input as object)))
      ? { kind: "stroke" as const, stroke: input }
      : (input as {
          kind?: "stroke" | "circle" | "square" | "cone";
          stroke?: unknown;
          geom?: {
            x: number;
            y: number;
            sizeFeet: number;
            rotation: number;
          };
        });

  const kind = payload.kind ?? "stroke";
  let strokePoints: MapPoint[] = [];
  let geomJson: Prisma.InputJsonValue | undefined;

  if (kind === "stroke") {
    const points = parsePoints(payload.stroke);
    if (!points || points.length < 2) {
      return { success: false, error: "Drawing needs at least 2 points" };
    }
    strokePoints = points;
  } else {
    const g = payload.geom;
    if (
      !g ||
      typeof g.x !== "number" ||
      typeof g.y !== "number" ||
      typeof g.sizeFeet !== "number" ||
      typeof g.rotation !== "number" ||
      !Number.isFinite(g.sizeFeet) ||
      g.sizeFeet <= 0
    ) {
      return { success: false, error: "Shape needs valid geometry" };
    }
    geomJson = {
      x: g.x,
      y: g.y,
      sizeFeet: g.sizeFeet,
      rotation: g.rotation,
    };
  }

  const row = await prisma.campaignMapDrawing.create({
    data: {
      id: newEntityId(),
      mapId,
      authorUserId: user.id,
      color: userColor(user.id),
      kind,
      stroke: strokePoints as unknown as Prisma.InputJsonValue,
      geom: geomJson ?? undefined,
    },
  });

  const drawing = mapDrawingRow(row);
  publishCampaignLive(campaignId, { type: "mapDrawingUpsert", drawing });

  return { success: true, drawing };
}

export async function updateDrawing(
  campaignId: string,
  mapId: string,
  drawingId: string,
  input: {
    stroke?: unknown;
    geom?: {
      x: number;
      y: number;
      sizeFeet: number;
      rotation: number;
    };
  },
): Promise<MapActionResult & { drawing?: CampaignMapView["drawings"][number] }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapDrawing.findFirst({
    where: { id: drawingId, mapId },
  });
  if (!existing) return { success: false, error: "Drawing not found" };

  const isDm = member.role === "dm";
  if (!isDm && existing.authorUserId !== user.id) {
    return { success: false, error: "Cannot edit this drawing" };
  }

  const data: Prisma.CampaignMapDrawingUpdateInput = {};
  if (input.stroke !== undefined) {
    const points = parsePoints(input.stroke);
    if (!points) return { success: false, error: "Invalid stroke" };
    data.stroke = points as unknown as Prisma.InputJsonValue;
  }
  if (input.geom !== undefined) {
    const g = input.geom;
    if (
      typeof g.x !== "number" ||
      typeof g.y !== "number" ||
      typeof g.sizeFeet !== "number" ||
      typeof g.rotation !== "number" ||
      !Number.isFinite(g.sizeFeet) ||
      g.sizeFeet <= 0
    ) {
      return { success: false, error: "Invalid geometry" };
    }
    data.geom = {
      x: g.x,
      y: g.y,
      sizeFeet: g.sizeFeet,
      rotation: g.rotation,
    };
  }

  const row = await prisma.campaignMapDrawing.update({
    where: { id: drawingId },
    data,
  });

  const drawing = mapDrawingRow(row);
  publishCampaignLive(campaignId, { type: "mapDrawingUpsert", drawing });

  return { success: true, drawing };
}

export async function deleteDrawing(
  campaignId: string,
  mapId: string,
  drawingId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapDrawing.findFirst({
    where: { id: drawingId, mapId },
  });
  if (!existing) return { success: false, error: "Drawing not found" };

  const isDm = member.role === "dm";
  if (!isDm && existing.authorUserId !== user.id) {
    return { success: false, error: "Cannot delete this drawing" };
  }

  await prisma.campaignMapDrawing.delete({ where: { id: drawingId } });
  publishCampaignLive(campaignId, {
    type: "mapDrawingRemove",
    drawingId,
  });

  return { success: true };
}

export async function clearDrawings(
  campaignId: string,
  mapId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can clear all drawings" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMapDrawing.deleteMany({ where: { mapId } });

  publishCampaignLive(campaignId, { type: "mapDrawingClear" });

  return { success: true };
}

export async function upsertAoePointer(
  campaignId: string,
  input: {
    id: string;
    kind: "circle" | "square" | "cone";
    x: number;
    y: number;
    sizeFeet: number;
    rotation: number;
    color?: string;
  },
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const pointer: MapAoePointerView = {
    id: input.id,
    kind: input.kind,
    x: input.x,
    y: input.y,
    sizeFeet: input.sizeFeet,
    rotation: input.rotation,
    color: input.color ?? userColor(user.id),
    authorUserId: user.id,
    expiresAt: Date.now() + AOE_TTL_MS,
  };

  const store = aoeStore();
  const list = store.get(campaignId) ?? [];
  const idx = list.findIndex((p) => p.id === pointer.id);
  if (idx >= 0) {
    list[idx] = pointer;
  } else {
    list.push(pointer);
  }
  store.set(
    campaignId,
    list.filter((p) => p.expiresAt > Date.now()),
  );

  publishCampaignLive(campaignId, { type: "mapAoeUpsert", pointer });

  return { success: true };
}

export async function clearAoePointers(campaignId: string): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  aoeStore().delete(campaignId);
  publishCampaignLive(campaignId, { type: "mapAoeClear" });

  return { success: true };
}

export async function setLosEnabled(
  campaignId: string,
  mapId: string,
  enabled: boolean,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can toggle line of sight" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { losEnabled: enabled },
  });

  const flags = await prisma.campaignMap.findUniqueOrThrow({
    where: { id: mapId },
    select: {
      fogEnabled: true,
      losEnabled: true,
      lightingEnabled: true,
      daylight: true,
      explorerEnabled: true,
    },
  });
  publishMapFlags(campaignId, flags);

  return { success: true };
}

export async function setExplorerEnabled(
  campaignId: string,
  mapId: string,
  enabled: boolean,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can toggle explorer memory" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { explorerEnabled: enabled },
  });

  const flags = await prisma.campaignMap.findUniqueOrThrow({
    where: { id: mapId },
    select: {
      fogEnabled: true,
      losEnabled: true,
      lightingEnabled: true,
      daylight: true,
      explorerEnabled: true,
    },
  });
  publishMapFlags(campaignId, flags);

  return { success: true };
}

export async function addOccluder(
  campaignId: string,
  mapId: string,
  kind: string,
  points: unknown,
  state?: string,
): Promise<MapActionResult & { occluder?: MapOccluderView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can edit walls" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const parsed = parsePoints(points);
  if (!parsed || parsed.length < 2) {
    return { success: false, error: "Occluder needs at least 2 points" };
  }

  const row = await prisma.campaignMapOccluder.create({
    data: {
      id: newEntityId(),
      mapId,
      kind: asOccluderKind(kind),
      points: parsed as unknown as Prisma.InputJsonValue,
      state: asOccluderState(state ?? "closed"),
    },
  });

  const occluder = mapOccluderRow(row);
  publishFilteredOccluderUpsert(campaignId, member.campaign.dmUserId, occluder);

  return { success: true, occluder };
}

export async function removeOccluder(
  campaignId: string,
  mapId: string,
  occluderId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can edit walls" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const occluder = await prisma.campaignMapOccluder.findFirst({
    where: { id: occluderId, mapId },
  });
  if (!occluder) return { success: false, error: "Occluder not found" };

  await prisma.campaignMapOccluder.delete({ where: { id: occluderId } });

  publishCampaignLive(campaignId, { type: "mapOccluderRemove", occluderId });

  return { success: true };
}

export async function setDoorState(
  campaignId: string,
  mapId: string,
  occluderId: string,
  state: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const occluder = await prisma.campaignMapOccluder.findFirst({
    where: { id: occluderId, mapId },
  });
  if (!occluder) return { success: false, error: "Door not found" };

  const kind = asOccluderKind(occluder.kind);
  if (kind !== "door" && kind !== "window") {
    return { success: false, error: "Not a door" };
  }

  const nextState = asOccluderState(state);
  const isDm = member.role === "dm";

  if (!isDm) {
    if (occluder.state === "locked") {
      return { success: false, error: "Door is locked" };
    }
    if (nextState === "locked") {
      return { success: false, error: "Players cannot lock doors" };
    }
    const points = parsePoints(occluder.points);
    if (!points) return { success: false, error: "Invalid door geometry" };
    const near = await playerNearOccluder(campaignId, mapId, user.id, points, 1.5);
    if (!near) {
      return { success: false, error: "You are too far from the door" };
    }
  }

  const row = await prisma.campaignMapOccluder.update({
    where: { id: occluderId },
    data: { state: nextState },
  });

  const view = mapOccluderRow(row);
  publishFilteredOccluderUpsert(campaignId, member.campaign.dmUserId, view);

  return { success: true };
}

export async function setTokenVisionRange(
  campaignId: string,
  mapId: string,
  tokenId: string,
  visionRange: number | null,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return { success: false, error: "Not a campaign member" };

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const token = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!token) return { success: false, error: "Token not found" };

  const isDm = member.role === "dm";
  if (!isDm && token.ownerUserId !== user.id) {
    return { success: false, error: "Cannot edit this token" };
  }

  let range: number | null = visionRange;
  if (range != null) {
    if (!Number.isFinite(range) || range < 0) {
      return { success: false, error: "Invalid vision range" };
    }
    range = Math.min(999, Math.round(range));
  }

  const row = await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data: { visionRange: range },
  });

  const view = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, view, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true };
}

export async function importUvtt(
  campaignId: string,
  formData: FormData,
): Promise<MapActionResult & { mapId?: string }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can import UVTT files" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "UVTT file is required" };
  }

  const nameRaw = String(formData.get("name") ?? file.name.replace(/\.[^.]+$/, ""));
  const nameError = validateMapName(nameRaw);
  if (nameError) return { success: false, error: nameError };

  let parsed;
  try {
    const text = await file.text();
    parsed = parseUvtt(text);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to parse UVTT",
    };
  }

  let processed;
  try {
    const buffer = Buffer.from(parsed.imageBase64, "base64");
    processed = await processMapImage(buffer);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process embedded image",
    };
  }

  const mapId = newMapId();
  const imageKey = campaignMapImageKey(campaignId, mapId);

  try {
    await putPcImageObject(imageKey, processed.buffer);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload map image",
    };
  }

  const existingCount = await prisma.campaignMap.count({ where: { campaignId } });
  const isFirst = existingCount === 0;

  await prisma.campaignMap.create({
    data: {
      id: mapId,
      campaignId,
      name: nameRaw.trim(),
      imageKey,
      imageWidth: processed.width || parsed.imageWidth,
      imageHeight: processed.height || parsed.imageHeight,
      gridSizePx: parsed.gridSizePx,
      gridOffsetX: parsed.gridOffsetX,
      gridOffsetY: parsed.gridOffsetY,
      losEnabled: true,
      occluders: {
        create: parsed.occluders.map((o) => ({
          id: newEntityId(),
          kind: o.kind,
          points: o.points as unknown as Prisma.InputJsonValue,
          state: o.state,
        })),
      },
      lights: {
        create: parsed.lights.map((l) => ({
          id: newEntityId(),
          x: l.x,
          y: l.y,
          brightFeet: l.brightFeet,
          dimFeet: l.dimFeet,
          color: l.color,
          enabled: true,
        })),
      },
    },
  });

  if (isFirst) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { liveMapId: mapId },
    });
  }

  const maps = await listCampaignMaps(campaignId);
  publishMapList(campaignId, member.campaign.dmUserId, maps);

  if (isFirst) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(campaignId, member.campaign.dmUserId, raw);
  }

  return { success: true, mapId };
}

export async function setLightingEnabled(
  campaignId: string,
  mapId: string,
  enabled: boolean,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can toggle lighting" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { lightingEnabled: enabled },
  });

  const flags = await prisma.campaignMap.findUniqueOrThrow({
    where: { id: mapId },
    select: {
      fogEnabled: true,
      losEnabled: true,
      lightingEnabled: true,
      daylight: true,
      explorerEnabled: true,
    },
  });
  publishMapFlags(campaignId, flags);

  return { success: true };
}

export async function setDaylight(
  campaignId: string,
  mapId: string,
  daylight: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can set daylight" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  if (!Number.isFinite(daylight)) {
    return { success: false, error: "Invalid daylight value" };
  }
  const clamped = Math.max(0, Math.min(1, daylight));

  await prisma.campaignMap.update({
    where: { id: mapId },
    data: { daylight: clamped },
  });

  const flags = await prisma.campaignMap.findUniqueOrThrow({
    where: { id: mapId },
    select: {
      fogEnabled: true,
      losEnabled: true,
      lightingEnabled: true,
      daylight: true,
      explorerEnabled: true,
    },
  });
  publishMapFlags(campaignId, flags);

  return { success: true };
}

export async function upsertMapLight(
  campaignId: string,
  mapId: string,
  light: {
    id?: string;
    x: number;
    y: number;
    brightFeet: number;
    dimFeet: number;
    color: string;
    enabled: boolean;
    mode: string;
  },
): Promise<MapActionResult & { light?: MapLightView }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can edit lights" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const lightId = light.id ?? newEntityId();
  const mode = light.mode === "darkness" ? "darkness" : "light";

  if (light.id) {
    const existing = await prisma.campaignMapLight.findFirst({
      where: { id: light.id, mapId },
    });
    if (!existing) return { success: false, error: "Light not found" };
  }

  const row = await prisma.campaignMapLight.upsert({
    where: { id: lightId },
    create: {
      id: lightId,
      mapId,
      x: light.x,
      y: light.y,
      brightFeet: light.brightFeet,
      dimFeet: light.dimFeet,
      color: light.color,
      enabled: light.enabled,
      mode,
    },
    update: {
      x: light.x,
      y: light.y,
      brightFeet: light.brightFeet,
      dimFeet: light.dimFeet,
      color: light.color,
      enabled: light.enabled,
      mode,
    },
  });

  const view = mapLightRow(row);
  publishCampaignLive(campaignId, { type: "mapLightUpsert", light: view });

  return { success: true, light: view };
}

export async function removeMapLight(
  campaignId: string,
  mapId: string,
  lightId: string,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can remove lights" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapLight.findFirst({
    where: { id: lightId, mapId },
  });
  if (!existing) return { success: false, error: "Light not found" };

  await prisma.campaignMapLight.delete({ where: { id: lightId } });

  publishCampaignLive(campaignId, { type: "mapLightRemove", lightId });

  return { success: true };
}

export async function setTokenEmitsLight(
  campaignId: string,
  mapId: string,
  tokenId: string,
  emitsLight: boolean,
  lightBright: number,
  lightDim: number,
): Promise<MapActionResult> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can configure token lights" };
  }

  const map = await requireMapInCampaign(campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!existing) return { success: false, error: "Token not found" };

  const row = await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data: {
      emitsLight,
      lightBright: Math.max(0, lightBright),
      lightDim: Math.max(0, lightDim),
    },
  });

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(campaignId, member.campaign.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true };
}

export async function duplicateCampaignMap(
  campaignId: string,
  mapId: string,
): Promise<MapActionResult & { mapId?: string }> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member || member.role !== "dm") {
    return { success: false, error: "Only the DM can duplicate maps" };
  }

  const source = await prisma.campaignMap.findFirst({
    where: { id: mapId, campaignId },
    include: {
      tokens: true,
      fogRegions: true,
      drawings: true,
      occluders: true,
      lights: true,
      explorer: true,
    },
  });
  if (!source) return { success: false, error: "Map not found" };

  const newId = newMapId();
  const destImageKey = campaignMapImageKey(campaignId, newId);

  try {
    await copyPcImageObject(source.imageKey, destImageKey);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to copy map image",
    };
  }

  const tokenIdMap = new Map<string, string>();
  for (const t of source.tokens) {
    tokenIdMap.set(t.id, newEntityId());
  }

  for (const t of source.tokens) {
    if (!t.imageKey) continue;
    const newTokenId = tokenIdMap.get(t.id)!;
    const destKey = campaignMapTokenImageKey(campaignId, newId, newTokenId);
    try {
      await copyPcImageObject(t.imageKey, destKey);
    } catch {
      // Skip broken token images.
    }
  }

  await prisma.campaignMap.create({
    data: {
      id: newId,
      campaignId,
      name: `${source.name} (copy)`,
      imageKey: destImageKey,
      imageWidth: source.imageWidth,
      imageHeight: source.imageHeight,
      gridSizePx: source.gridSizePx,
      gridOffsetX: source.gridOffsetX,
      gridOffsetY: source.gridOffsetY,
      gridType: source.gridType,
      scaleFeet: source.scaleFeet,
      diagonalRule: source.diagonalRule,
      fogEnabled: source.fogEnabled,
      losEnabled: source.losEnabled,
      lightingEnabled: source.lightingEnabled,
      daylight: source.daylight,
      explorerEnabled: source.explorerEnabled,
      tokens: {
        create: source.tokens.map((t) => ({
          id: tokenIdMap.get(t.id)!,
          kind: t.kind,
          pcPlanId: t.pcPlanId,
          name: t.name,
          imageKey: t.imageKey
            ? campaignMapTokenImageKey(campaignId, newId, tokenIdMap.get(t.id)!)
            : null,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          rotation: t.rotation,
          layer: t.layer,
          visibility: t.visibility,
          ownerUserId: t.ownerUserId,
          visionRange: t.visionRange,
          emitsLight: t.emitsLight,
          lightBright: t.lightBright,
          lightDim: t.lightDim,
          seq: t.seq,
        })),
      },
      fogRegions: {
        create: source.fogRegions.map((r) => ({
          id: newEntityId(),
          kind: r.kind,
          points: r.points as Prisma.InputJsonValue,
        })),
      },
      drawings: {
        create: source.drawings.map((d) => ({
          id: newEntityId(),
          authorUserId: d.authorUserId,
          color: d.color,
          kind: d.kind,
          stroke: d.stroke as Prisma.InputJsonValue,
          geom: (d.geom ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      },
      occluders: {
        create: source.occluders.map((o) => ({
          id: newEntityId(),
          kind: o.kind,
          points: o.points as Prisma.InputJsonValue,
          state: o.state,
        })),
      },
      lights: {
        create: source.lights.map((l) => ({
          id: newEntityId(),
          x: l.x,
          y: l.y,
          brightFeet: l.brightFeet,
          dimFeet: l.dimFeet,
          color: l.color,
          enabled: l.enabled,
          mode: l.mode,
        })),
      },
      explorer: {
        create: source.explorer.map((c) => ({
          id: newEntityId(),
          owner: c.owner,
          cx: c.cx,
          cy: c.cy,
        })),
      },
    },
  });

  const maps = await listCampaignMaps(campaignId);
  publishMapList(campaignId, member.campaign.dmUserId, maps);

  return { success: true, mapId: newId };
}

export async function deleteMapTokensForPc(
  campaignId: string,
  pcPlanId: string,
): Promise<string[]> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return [];

  const isDm = member.role === "dm";
  const link = await prisma.campaignPc.findUnique({
    where: { campaignId_pcPlanId: { campaignId, pcPlanId } },
  });
  if (!isDm && (!link || link.userId !== user.id)) return [];

  const maps = await prisma.campaignMap.findMany({
    where: { campaignId },
    select: { id: true },
  });
  const mapIds = maps.map((m) => m.id);
  if (mapIds.length === 0) return [];

  const tokens = await prisma.campaignMapToken.findMany({
    where: { mapId: { in: mapIds }, pcPlanId },
  });
  if (tokens.length === 0) return [];

  const deletedIds = tokens.map((t) => t.id);
  await prisma.campaignMapToken.deleteMany({
    where: { id: { in: deletedIds } },
  });

  for (const tokenId of deletedIds) {
    publishCampaignLive(campaignId, { type: "mapTokenRemove", tokenId });
  }

  return deletedIds;
}

export async function getCampaignMapState(
  campaignId: string,
): Promise<{
  liveMap: CampaignMapView | null;
  maps: CampaignMapListItem[];
} | null> {
  const user = await requireCurrentUser();
  const member = await requireActiveMember(campaignId, user.id);
  if (!member) return null;

  const viewer = viewerFromMember(member);
  return loadLiveMapForCampaign(
    campaignId,
    member.campaign.liveMapId,
    viewer,
  );
}
