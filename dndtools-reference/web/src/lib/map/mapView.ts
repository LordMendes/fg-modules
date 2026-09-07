import { prisma } from "@/lib/prisma";
import { asDiagonalRule } from "@/lib/map/grid";
import { filterMapViewForViewer, type MapViewer } from "@/lib/map/permissions";
import type {
  CampaignMapListItem,
  CampaignMapView,
  MapDrawingGeom,
  MapDrawingKind,
  MapDrawingView,
  MapFogKind,
  MapFogRegionView,
  MapGridType,
  MapLightMode,
  MapLightView,
  MapOccluderKind,
  MapOccluderState,
  MapOccluderView,
  MapPoint,
  MapTokenKind,
  MapTokenLayer,
  MapTokenView,
  MapTokenVisibility,
} from "@/lib/map/types";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import type { PcPlanState } from "@/lib/pc-planner/types";
import { tryPublicUrlForKey } from "@/lib/storage/r2";

function parseState(raw: unknown): PcPlanState {
  if (!raw || typeof raw !== "object") return createDefaultPcPlanState();
  return raw as PcPlanState;
}

function asPoints(raw: unknown): MapPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: MapPoint[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as MapPoint).x === "number" &&
      typeof (item as MapPoint).y === "number"
    ) {
      out.push({ x: (item as MapPoint).x, y: (item as MapPoint).y });
    }
  }
  return out;
}

function asTokenKind(v: string): MapTokenKind {
  if (v === "pc" || v === "npc" || v === "object") return v;
  return "npc";
}

function asLayer(v: string): MapTokenLayer {
  return v === "gm" ? "gm" : "token";
}

function asVisibility(v: string): MapTokenVisibility {
  if (v === "hidden" || v === "mask" || v === "always") return v;
  return "always";
}

function asFogKind(v: string): MapFogKind {
  return v === "hide" ? "hide" : "reveal";
}

function asOccluderKind(v: string): MapOccluderKind {
  const allowed: MapOccluderKind[] = [
    "wall",
    "door",
    "window",
    "terrain",
    "secret",
    "illusion",
    "pit",
  ];
  return (allowed.includes(v as MapOccluderKind) ? v : "wall") as MapOccluderKind;
}

function asOccluderState(v: string): MapOccluderState {
  if (v === "open" || v === "locked" || v === "closed") return v;
  return "closed";
}

function asLightMode(v: string): MapLightMode {
  return v === "darkness" ? "darkness" : "light";
}

function asGridType(v: string): MapGridType {
  if (v === "hexH" || v === "hexV" || v === "square") return v;
  return "square";
}

type MapRow = {
  id: string;
  name: string;
  imageKey: string;
  imageWidth: number;
  imageHeight: number;
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridType: string;
  scaleFeet: number;
  diagonalRule: string;
  fogEnabled: boolean;
  losEnabled: boolean;
  lightingEnabled: boolean;
  daylight: number;
  explorerEnabled: boolean;
  updatedAt: Date;
  tokens: {
    id: string;
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
  }[];
  fogRegions: { id: string; kind: string; points: unknown }[];
  drawings: {
    id: string;
    authorUserId: string;
    color: string;
    kind: string;
    stroke: unknown;
    geom: unknown;
  }[];
  occluders: { id: string; kind: string; points: unknown; state: string }[];
  lights: {
    id: string;
    x: number;
    y: number;
    brightFeet: number;
    dimFeet: number;
    color: string;
    enabled: boolean;
    mode: string;
  }[];
};

function mapTokenRow(
  t: MapRow["tokens"][number],
  pcTokenUrls: Map<string, string | null>,
): MapTokenView {
  let imageUrl: string | null = null;
  if (t.kind === "pc" && t.pcPlanId) {
    imageUrl = pcTokenUrls.get(t.pcPlanId) ?? null;
  } else if (t.imageKey) {
    imageUrl = tryPublicUrlForKey(t.imageKey);
  }
  return {
    id: t.id,
    kind: asTokenKind(t.kind),
    pcPlanId: t.pcPlanId,
    name: t.name,
    imageUrl,
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    rotation: t.rotation,
    layer: asLayer(t.layer),
    visibility: asVisibility(t.visibility),
    ownerUserId: t.ownerUserId,
    visionRange: t.visionRange,
    emitsLight: t.emitsLight,
    lightBright: t.lightBright,
    lightDim: t.lightDim,
    seq: t.seq,
  };
}

export function mapFogRegionRow(r: {
  id: string;
  kind: string;
  points: unknown;
}): MapFogRegionView {
  return { id: r.id, kind: asFogKind(r.kind), points: asPoints(r.points) };
}

function asDrawingKind(v: string): MapDrawingKind {
  if (v === "circle" || v === "square" || v === "cone" || v === "stroke") {
    return v;
  }
  return "stroke";
}

function asDrawingGeom(raw: unknown): MapDrawingGeom | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  if (
    typeof g.x !== "number" ||
    typeof g.y !== "number" ||
    typeof g.sizeFeet !== "number" ||
    typeof g.rotation !== "number"
  ) {
    return null;
  }
  return {
    x: g.x,
    y: g.y,
    sizeFeet: g.sizeFeet,
    rotation: g.rotation,
  };
}

export function mapDrawingRow(d: {
  id: string;
  authorUserId: string;
  color: string;
  kind?: string;
  stroke: unknown;
  geom?: unknown;
}): MapDrawingView {
  return {
    id: d.id,
    authorUserId: d.authorUserId,
    color: d.color,
    kind: asDrawingKind(d.kind ?? "stroke"),
    stroke: asPoints(d.stroke),
    geom: asDrawingGeom(d.geom),
  };
}

export function mapOccluderRow(o: {
  id: string;
  kind: string;
  points: unknown;
  state: string;
}): MapOccluderView {
  return {
    id: o.id,
    kind: asOccluderKind(o.kind),
    points: asPoints(o.points),
    state: asOccluderState(o.state),
  };
}

export function mapLightRow(l: MapRow["lights"][number]): MapLightView {
  return {
    id: l.id,
    x: l.x,
    y: l.y,
    brightFeet: l.brightFeet,
    dimFeet: l.dimFeet,
    color: l.color,
    enabled: l.enabled,
    mode: asLightMode(l.mode),
  };
}

export function toCampaignMapView(
  row: MapRow,
  pcTokenUrls: Map<string, string | null>,
): CampaignMapView {
  const imageUrl =
    tryPublicUrlForKey(row.imageKey, row.updatedAt) ?? `/media/${row.imageKey}`;
  return {
    id: row.id,
    name: row.name,
    imageUrl,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    gridSizePx: row.gridSizePx,
    gridOffsetX: row.gridOffsetX,
    gridOffsetY: row.gridOffsetY,
    gridType: asGridType(row.gridType),
    scaleFeet: row.scaleFeet,
    diagonalRule: asDiagonalRule(row.diagonalRule),
    fogEnabled: row.fogEnabled,
    losEnabled: row.losEnabled,
    lightingEnabled: row.lightingEnabled,
    daylight: row.daylight,
    explorerEnabled: row.explorerEnabled,
    tokens: row.tokens.map((t) => mapTokenRow(t, pcTokenUrls)),
    fogRegions: row.fogRegions.map(mapFogRegionRow),
    drawings: row.drawings.map(mapDrawingRow),
    occluders: row.occluders.map(mapOccluderRow),
    lights: row.lights.map(mapLightRow),
  };
}

const mapInclude = {
  tokens: { orderBy: { createdAt: "asc" as const } },
  fogRegions: { orderBy: { createdAt: "asc" as const } },
  drawings: { orderBy: { createdAt: "asc" as const } },
  occluders: { orderBy: { createdAt: "asc" as const } },
  lights: { orderBy: { id: "asc" as const } },
};

export async function loadPcTokenUrls(
  pcPlanIds: string[],
): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(pcPlanIds.filter(Boolean)));
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;
  const plans = await prisma.pcPlan.findMany({
    where: { id: { in: unique } },
    select: { id: true, state: true, updatedAt: true },
  });
  for (const plan of plans) {
    const state = parseState(plan.state);
    map.set(
      plan.id,
      tryPublicUrlForKey(state.identity.tokenImageKey, plan.updatedAt),
    );
  }
  return map;
}

export async function loadCampaignMapView(
  mapId: string,
  viewer: MapViewer,
): Promise<CampaignMapView | null> {
  const row = await prisma.campaignMap.findUnique({
    where: { id: mapId },
    include: mapInclude,
  });
  if (!row) return null;
  const pcIds = row.tokens
    .map((t) => t.pcPlanId)
    .filter((id): id is string => Boolean(id));
  const urls = await loadPcTokenUrls(pcIds);
  const view = toCampaignMapView(row, urls);
  return filterMapViewForViewer(view, viewer);
}

export async function loadLiveMapForCampaign(
  campaignId: string,
  liveMapId: string | null,
  viewer: MapViewer,
): Promise<{
  liveMap: CampaignMapView | null;
  maps: CampaignMapListItem[];
}> {
  const maps = viewer.isDm
    ? (
        await prisma.campaignMap.findMany({
          where: { campaignId },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        })
      ).map((m) => ({ id: m.id, name: m.name }))
    : [];

  if (!liveMapId) {
    return { liveMap: null, maps };
  }

  const liveMap = await loadCampaignMapView(liveMapId, viewer);
  return { liveMap, maps };
}

export { mapInclude };
