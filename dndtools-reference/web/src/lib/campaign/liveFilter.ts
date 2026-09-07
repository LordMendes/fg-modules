import { canViewerSeeActivity } from "@/lib/campaign/activityVisibility";
import { stripHiddenRollForViewer } from "@/lib/campaign/rollVisibility";
import type { CampaignLiveEvent } from "@/lib/campaign/types";
import {
  filterMapViewForViewer,
  filterOccluderForViewer,
  isTokenVisibleToViewer,
  type MapViewer,
} from "@/lib/map/permissions";
import type {
  CampaignMapView,
  MapFogRegionView,
  MapTokenView,
} from "@/lib/map/types";


export type LiveRoomTokenMeta = {
  id: string;
  layer: MapTokenView["layer"];
  ownerUserId: string | null;
  visibility: MapTokenView["visibility"];
  x: number;
  y: number;
  width: number;
  height: number;
  seq: number;
};

export type LiveFilterContext = {
  dmUserId: string;
  /** Fog flag from the live scene (if any). */
  fogEnabled: boolean;
  fogRegions: MapFogRegionView[];
  /** Token meta keyed by id (for move visibility without full token payload). */
  tokens: Record<string, LiveRoomTokenMeta>;
};

function viewerOf(
  userId: string,
  ctx: LiveFilterContext,
): MapViewer {
  return { userId, isDm: userId === ctx.dmUserId };
}

/**
 * Filter a live event for a specific subscriber.
 * Returns null to drop the event for that viewer.
 * Pure / data-driven so Redis pub/sub replicas can apply the same rules.
 */
export function filterLiveEventForViewer(
  userId: string,
  event: CampaignLiveEvent,
  ctx: LiveFilterContext,
): CampaignLiveEvent | null {
  const viewer = viewerOf(userId, ctx);

  switch (event.type) {
    case "mapSnapshot": {
      if (!event.map) return event;
      return {
        type: "mapSnapshot",
        map: filterMapViewForViewer(event.map, viewer),
      };
    }
    case "mapList": {
      if (viewer.isDm) return event;
      return null;
    }
    case "mapTokenMove": {
      const meta = ctx.tokens[event.tokenId];
      if (!meta) {
        // Unknown token: DM gets it; players drop (safe default).
        return viewer.isDm ? event : null;
      }
      const stub: MapTokenView = {
        id: meta.id,
        kind: "npc",
        pcPlanId: null,
        name: "",
        imageUrl: null,
        x: meta.x,
        y: meta.y,
        width: meta.width,
        height: meta.height,
        rotation: 0,
        layer: meta.layer,
        visibility: meta.visibility,
        ownerUserId: meta.ownerUserId,
        visionRange: null,
        emitsLight: false,
        lightBright: 0,
        lightDim: 0,
        seq: meta.seq,
      };
      if (
        isTokenVisibleToViewer(stub, viewer, ctx.fogEnabled, ctx.fogRegions)
      ) {
        return event;
      }
      return null;
    }
    case "mapTokenUpsert": {
      if (
        isTokenVisibleToViewer(
          event.token,
          viewer,
          ctx.fogEnabled,
          ctx.fogRegions,
        )
      ) {
        return event;
      }
      // Players who lose visibility get a remove.
      if (viewer.isDm) return event;
      return { type: "mapTokenRemove", tokenId: event.token.id };
    }
    case "mapOccluderUpsert": {
      return {
        type: "mapOccluderUpsert",
        occluder: filterOccluderForViewer(event.occluder, viewer),
      };
    }
    case "activity": {
      if (
        canViewerSeeActivity(
          { userId: viewer.userId, isDm: viewer.isDm },
          event.activity,
        )
      ) {
        return event;
      }
      return null;
    }
    case "roll": {
      const roll = stripHiddenRollForViewer(event.roll, {
        userId: viewer.userId,
        isDm: viewer.isDm,
      });
      if (!roll) return null;
      return { type: "roll", roll };
    }
    default:
      return event;
  }
}


/** Build filter context from a map snapshot (or null). */
export function filterContextFromMap(
  dmUserId: string,
  map: CampaignMapView | null,
): LiveFilterContext {
  const tokens: Record<string, LiveRoomTokenMeta> = {};
  if (map) {
    for (const t of map.tokens) {
      tokens[t.id] = {
        id: t.id,
        layer: t.layer,
        ownerUserId: t.ownerUserId,
        visibility: t.visibility,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        seq: t.seq,
      };
    }
  }
  return {
    dmUserId,
    fogEnabled: map?.fogEnabled ?? false,
    fogRegions: map?.fogRegions ?? [],
    tokens,
  };
}

/** Apply a move/upsert/remove into filter context (mutates). */
export function applyEventToFilterContext(
  ctx: LiveFilterContext,
  event: CampaignLiveEvent,
): void {
  if (event.type === "mapTokenMove") {
    const prev = ctx.tokens[event.tokenId];
    if (!prev) return;
    if (event.seq < prev.seq) return;
    ctx.tokens[event.tokenId] = {
      ...prev,
      x: event.x,
      y: event.y,
      seq: event.seq,
    };
    return;
  }
  if (event.type === "mapTokenUpsert") {
    const t = event.token;
    ctx.tokens[t.id] = {
      id: t.id,
      layer: t.layer,
      ownerUserId: t.ownerUserId,
      visibility: t.visibility,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      seq: t.seq,
    };
    return;
  }
  if (event.type === "mapTokenRemove") {
    delete ctx.tokens[event.tokenId];
    return;
  }
  if (event.type === "mapFlags") {
    ctx.fogEnabled = event.fogEnabled;
    return;
  }
  if (event.type === "mapFogUpsert") {
    const idx = ctx.fogRegions.findIndex((r) => r.id === event.region.id);
    if (idx >= 0) {
      ctx.fogRegions = ctx.fogRegions.map((r, i) =>
        i === idx ? event.region : r,
      );
    } else {
      ctx.fogRegions = [...ctx.fogRegions, event.region];
    }
    return;
  }
  if (event.type === "mapFogRemove") {
    ctx.fogRegions = ctx.fogRegions.filter((r) => r.id !== event.regionId);
    return;
  }
  if (event.type === "mapFogReset") {
    ctx.fogRegions = [];
    return;
  }
  if (event.type === "mapSnapshot") {
    const next = filterContextFromMap(ctx.dmUserId, event.map);
    ctx.fogEnabled = next.fogEnabled;
    ctx.fogRegions = next.fogRegions;
    ctx.tokens = next.tokens;
  }
}
