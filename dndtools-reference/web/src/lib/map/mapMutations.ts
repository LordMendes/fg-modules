import { randomUUID } from "crypto";
import {
  publishCampaignLive,
  seedCampaignRoomMeta,
} from "@/lib/campaign/liveHub";
import { asDiagonalRule } from "@/lib/map/grid";
import { simplifyPolygon } from "@/lib/map/fog";
import { canWalkTo, tokenCenter } from "@/lib/map/los";
import {
  loadPcTokenUrls,
  mapDrawingRow,
  mapFogRegionRow,
  mapInclude,
  mapLightRow,
  mapOccluderRow,
  toCampaignMapView,
} from "@/lib/map/mapView";
import { userColor } from "@/lib/map/permissions";
import type {
  CampaignMapView,
  MapFogKind,
  MapOccluderKind,
  MapOccluderState,
  MapOccluderView,
  MapPoint,
  MapTokenLayer,
  MapTokenView,
  MapTokenVisibility,
} from "@/lib/map/types";
import { prisma } from "@/lib/prisma";
import { deletePcImageObject } from "@/lib/storage/r2";
import type { Prisma } from "@/generated/prisma/client";

export type MapActor = {
  userId: string;
  role: "dm" | "player";
  campaignId: string;
  dmUserId: string;
};

export type MapMutationResult = {
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
  void seedCampaignRoomMeta(campaignId, dmUserId, map);
  publishCampaignLive(campaignId, { type: "mapSnapshot", map });
}

function publishFilteredTokenUpsert(
  campaignId: string,
  _dmUserId: string,
  token: MapTokenView,
  _mapContext: {
    fogEnabled: boolean;
    fogRegions: CampaignMapView["fogRegions"];
  },
): void {
  publishCampaignLive(campaignId, { type: "mapTokenUpsert", token });
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
  _dmUserId: string,
  occluder: MapOccluderView,
): void {
  publishCampaignLive(campaignId, { type: "mapOccluderUpsert", occluder });
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
    if (points.length === 1) {
      return Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y);
    }
    return Infinity;
  }
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(
      min,
      pointToSegmentDistance(point, points[i]!, points[i + 1]!),
    );
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

function isDm(actor: MapActor): boolean {
  return actor.role === "dm";
}

export async function commitTokenMove(
  actor: MapActor,
  tokenId: string,
  x: number,
  y: number,
  rotation: number,
  seq: number,
): Promise<MapMutationResult> {
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
  if (!token || token.map.campaignId !== actor.campaignId) {
    return { success: false, error: "Token not found" };
  }

  if (!canUserMoveToken(token, actor.userId, isDm(actor))) {
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
      publishCampaignLive(actor.campaignId, {
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

  publishCampaignLive(actor.campaignId, {
    type: "mapTokenMove",
    tokenId,
    x,
    y,
    rotation,
    seq: nextSeq,
    committed: true,
  });

  await syncMaskTokensForMap(actor.campaignId, token.mapId, actor.dmUserId);

  return { success: true };
}

export async function mutateAddDrawing(
  actor: MapActor,
  mapId: string,
  input: {
    drawingId?: string;
    kind?: "stroke" | "circle" | "square" | "cone";
    stroke?: unknown;
    geom?: {
      x: number;
      y: number;
      sizeFeet: number;
      rotation: number;
    };
  },
): Promise<MapMutationResult> {
  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  if (input.drawingId) {
    const existing = await prisma.campaignMapDrawing.findFirst({
      where: { id: input.drawingId, mapId },
    });
    if (existing) {
      if (!isDm(actor) && existing.authorUserId !== actor.userId) {
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
        where: { id: input.drawingId },
        data,
      });
      const drawing = mapDrawingRow(row);
      publishCampaignLive(actor.campaignId, {
        type: "mapDrawingUpsert",
        drawing,
      });
      return { success: true };
    }
  }

  const kind = input.kind ?? "stroke";
  let strokePoints: MapPoint[] = [];
  let geomJson: Prisma.InputJsonValue | undefined;

  if (kind === "stroke") {
    const points = parsePoints(input.stroke);
    if (!points || points.length < 2) {
      return { success: false, error: "Drawing needs at least 2 points" };
    }
    strokePoints = points;
  } else {
    const g = input.geom;
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
      id: input.drawingId ?? newEntityId(),
      mapId,
      authorUserId: actor.userId,
      color: userColor(actor.userId),
      kind,
      stroke: strokePoints as unknown as Prisma.InputJsonValue,
      geom: geomJson ?? undefined,
    },
  });

  const drawing = mapDrawingRow(row);
  publishCampaignLive(actor.campaignId, { type: "mapDrawingUpsert", drawing });

  return { success: true };
}

export async function mutateUpdateDrawing(
  actor: MapActor,
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
): Promise<MapMutationResult> {
  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapDrawing.findFirst({
    where: { id: drawingId, mapId },
  });
  if (!existing) return { success: false, error: "Drawing not found" };

  if (!isDm(actor) && existing.authorUserId !== actor.userId) {
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
  publishCampaignLive(actor.campaignId, { type: "mapDrawingUpsert", drawing });

  return { success: true };
}

export async function mutateDeleteDrawing(
  actor: MapActor,
  mapId: string,
  drawingId: string,
): Promise<MapMutationResult> {
  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapDrawing.findFirst({
    where: { id: drawingId, mapId },
  });
  if (!existing) return { success: false, error: "Drawing not found" };

  if (!isDm(actor) && existing.authorUserId !== actor.userId) {
    return { success: false, error: "Cannot delete this drawing" };
  }

  await prisma.campaignMapDrawing.delete({ where: { id: drawingId } });
  publishCampaignLive(actor.campaignId, {
    type: "mapDrawingRemove",
    drawingId,
  });

  return { success: true };
}

export async function mutateClearDrawings(
  actor: MapActor,
  mapId: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can clear all drawings" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMapDrawing.deleteMany({ where: { mapId } });
  publishCampaignLive(actor.campaignId, { type: "mapDrawingClear" });

  return { success: true };
}

export async function mutateAddFogRegion(
  actor: MapActor,
  mapId: string,
  kind: string,
  points: unknown,
  regionId?: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can edit fog" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const parsed = parsePoints(points);
  if (!parsed || parsed.length < 3) {
    return { success: false, error: "Fog region needs at least 3 points" };
  }

  const simplified = simplifyPolygon(parsed);
  const fogKind = asFogKind(kind);
  const id = regionId?.trim() || newEntityId();

  const row = await prisma.campaignMapFogRegion.create({
    data: {
      id,
      mapId,
      kind: fogKind,
      points: simplified as unknown as Prisma.InputJsonValue,
    },
  });

  const region = mapFogRegionRow(row);
  publishCampaignLive(actor.campaignId, { type: "mapFogUpsert", region });
  await syncMaskTokensForMap(actor.campaignId, mapId, actor.dmUserId);

  return { success: true };
}

export async function mutateRemoveFogRegion(
  actor: MapActor,
  mapId: string,
  regionId: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can edit fog" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const region = await prisma.campaignMapFogRegion.findFirst({
    where: { id: regionId, mapId },
  });
  if (!region) return { success: false, error: "Fog region not found" };

  await prisma.campaignMapFogRegion.delete({ where: { id: regionId } });
  publishCampaignLive(actor.campaignId, { type: "mapFogRemove", regionId });
  await syncMaskTokensForMap(actor.campaignId, mapId, actor.dmUserId);

  return { success: true };
}

export async function mutateResetFog(
  actor: MapActor,
  mapId: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can reset fog" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  await prisma.campaignMapFogRegion.deleteMany({ where: { mapId } });
  publishCampaignLive(actor.campaignId, { type: "mapFogReset" });
  await syncMaskTokensForMap(actor.campaignId, mapId, actor.dmUserId);

  return { success: true };
}

export async function mutateSetMapFlags(
  actor: MapActor,
  mapId: string,
  partial: {
    fogEnabled?: boolean;
    losEnabled?: boolean;
    lightingEnabled?: boolean;
    daylight?: number;
    explorerEnabled?: boolean;
  },
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can change map flags" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const data: Prisma.CampaignMapUpdateInput = {};
  if (partial.fogEnabled !== undefined) data.fogEnabled = partial.fogEnabled;
  if (partial.losEnabled !== undefined) data.losEnabled = partial.losEnabled;
  if (partial.lightingEnabled !== undefined) {
    data.lightingEnabled = partial.lightingEnabled;
  }
  if (partial.explorerEnabled !== undefined) {
    data.explorerEnabled = partial.explorerEnabled;
  }
  if (partial.daylight !== undefined) {
    if (!Number.isFinite(partial.daylight)) {
      return { success: false, error: "Invalid daylight value" };
    }
    data.daylight = Math.max(0, Math.min(1, partial.daylight));
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No flags to update" };
  }

  const fogChanged = partial.fogEnabled !== undefined;

  await prisma.campaignMap.update({
    where: { id: mapId },
    data,
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
  publishMapFlags(actor.campaignId, flags);

  if (fogChanged && map.campaign.liveMapId === mapId) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(actor.campaignId, actor.dmUserId, raw);
  }

  return { success: true };
}

export async function mutateAddOccluder(
  actor: MapActor,
  mapId: string,
  kind: string,
  points: unknown,
  state?: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can edit walls" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
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
  publishFilteredOccluderUpsert(actor.campaignId, actor.dmUserId, occluder);

  return { success: true };
}

export async function mutateRemoveOccluder(
  actor: MapActor,
  mapId: string,
  occluderId: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can edit walls" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const occluder = await prisma.campaignMapOccluder.findFirst({
    where: { id: occluderId, mapId },
  });
  if (!occluder) return { success: false, error: "Occluder not found" };

  await prisma.campaignMapOccluder.delete({ where: { id: occluderId } });
  publishCampaignLive(actor.campaignId, {
    type: "mapOccluderRemove",
    occluderId,
  });

  return { success: true };
}

export async function mutateSetDoorState(
  actor: MapActor,
  mapId: string,
  occluderId: string,
  state: string,
): Promise<MapMutationResult> {
  const map = await requireMapInCampaign(actor.campaignId, mapId);
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

  if (!isDm(actor)) {
    if (occluder.state === "locked") {
      return { success: false, error: "Door is locked" };
    }
    if (nextState === "locked") {
      return { success: false, error: "Players cannot lock doors" };
    }
    const doorPoints = parsePoints(occluder.points);
    if (!doorPoints) return { success: false, error: "Invalid door geometry" };
    const near = await playerNearOccluder(
      actor.campaignId,
      mapId,
      actor.userId,
      doorPoints,
      1.5,
    );
    if (!near) {
      return { success: false, error: "You are too far from the door" };
    }
  }

  const row = await prisma.campaignMapOccluder.update({
    where: { id: occluderId },
    data: { state: nextState },
  });

  const view = mapOccluderRow(row);
  publishFilteredOccluderUpsert(actor.campaignId, actor.dmUserId, view);

  return { success: true };
}

export async function mutateUpsertLight(
  actor: MapActor,
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
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can edit lights" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
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
  publishCampaignLive(actor.campaignId, { type: "mapLightUpsert", light: view });

  return { success: true };
}

export async function mutateRemoveLight(
  actor: MapActor,
  mapId: string,
  lightId: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can remove lights" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapLight.findFirst({
    where: { id: lightId, mapId },
  });
  if (!existing) return { success: false, error: "Light not found" };

  await prisma.campaignMapLight.delete({ where: { id: lightId } });
  publishCampaignLive(actor.campaignId, { type: "mapLightRemove", lightId });

  return { success: true };
}

export async function mutateUpdateGrid(
  actor: MapActor,
  mapId: string,
  gridSizePx: number,
  gridOffsetX: number,
  gridOffsetY: number,
  scaleFeet: number,
  diagonalRule: string,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can calibrate the grid" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
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

  publishCampaignLive(actor.campaignId, {
    type: "mapGrid",
    gridSizePx,
    gridOffsetX,
    gridOffsetY,
    scaleFeet,
    diagonalRule: rule,
  });

  if (map.campaign.liveMapId === mapId) {
    const raw = await loadRawMapView(mapId);
    publishFilteredMapSnapshot(actor.campaignId, actor.dmUserId, raw);
  }

  return { success: true };
}

export async function mutateTokenProps(
  actor: MapActor,
  mapId: string,
  tokenId: string,
  props: {
    layer?: string;
    visibility?: string;
    emitsLight?: boolean;
    lightBright?: number;
    lightDim?: number;
  },
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can change token properties" };
  }

  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const existing = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!existing) return { success: false, error: "Token not found" };

  const data: Prisma.CampaignMapTokenUpdateInput = {};
  if (props.layer !== undefined) data.layer = asTokenLayer(props.layer);
  if (props.visibility !== undefined) {
    data.visibility = asTokenVisibility(props.visibility);
  }
  if (props.emitsLight !== undefined) data.emitsLight = props.emitsLight;
  if (props.lightBright !== undefined) {
    data.lightBright = Math.max(0, props.lightBright);
  }
  if (props.lightDim !== undefined) {
    data.lightDim = Math.max(0, props.lightDim);
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No token properties to update" };
  }

  const row = await prisma.campaignMapToken.update({
    where: { id: tokenId },
    data,
  });

  const token = await tokenViewFromRow(row);
  const raw = await loadRawMapView(mapId);
  if (raw) {
    publishFilteredTokenUpsert(actor.campaignId, actor.dmUserId, token, {
      fogEnabled: raw.fogEnabled,
      fogRegions: raw.fogRegions,
    });
  }

  return { success: true };
}

export async function mutateRemoveToken(
  actor: MapActor,
  mapId: string,
  tokenId: string,
): Promise<MapMutationResult> {
  const map = await requireMapInCampaign(actor.campaignId, mapId);
  if (!map) return { success: false, error: "Map not found" };

  const token = await prisma.campaignMapToken.findFirst({
    where: { id: tokenId, mapId },
  });
  if (!token) return { success: false, error: "Token not found" };

  if (!canUserMoveToken(token, actor.userId, isDm(actor))) {
    return { success: false, error: "Cannot remove this token" };
  }

  if (token.imageKey) {
    await deletePcImageObject(token.imageKey).catch(() => {});
  }

  await prisma.campaignMapToken.delete({ where: { id: tokenId } });
  publishCampaignLive(actor.campaignId, { type: "mapTokenRemove", tokenId });

  // Detach linked combatant (onDelete: SetNull) and refresh CT / unplaced tray.
  const { publishCombatSnapshot } = await import("@/lib/combat/combatMutations");
  await publishCombatSnapshot(actor.campaignId, actor.dmUserId);

  return { success: true };
}

export async function mutateMapPing(
  actor: MapActor,
  x: number,
  y: number,
): Promise<MapMutationResult> {
  publishCampaignLive(actor.campaignId, {
    type: "mapPing",
    x,
    y,
    color: userColor(actor.userId),
    userId: actor.userId,
  });
  return { success: true };
}

export async function mutateViewportGoTo(
  actor: MapActor,
  x: number,
  y: number,
): Promise<MapMutationResult> {
  if (!isDm(actor)) {
    return { success: false, error: "Only the DM can force viewport sync" };
  }

  publishCampaignLive(actor.campaignId, { type: "mapViewportGoTo", x, y });
  return { success: true };
}
