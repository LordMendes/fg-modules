import type {
  CampaignMapView,
  MapFogRegionView,
  MapOccluderKind,
  MapOccluderView,
  MapPoint,
  MapTokenView,
} from "./types";

export type MapViewer = {
  userId: string;
  isDm: boolean;
};

/** Point-in-polygon (ray casting). */
export function pointInPolygon(point: MapPoint, polygon: MapPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersect =
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) +
          pi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function tokenCenter(token: {
  x: number;
  y: number;
  width: number;
  height: number;
}): MapPoint {
  return { x: token.x + token.width / 2, y: token.y + token.height / 2 };
}

/**
 * When fog is enabled, a point is revealed if it lies in any reveal region
 * and not in any hide region.
 */
export function isPointRevealed(
  point: MapPoint,
  fogEnabled: boolean,
  regions: MapFogRegionView[],
): boolean {
  if (!fogEnabled) return true;
  const reveals = regions.filter((r) => r.kind === "reveal");
  const hides = regions.filter((r) => r.kind === "hide");
  const inReveal = reveals.some((r) => pointInPolygon(point, r.points));
  if (!inReveal) return false;
  const inHide = hides.some((r) => pointInPolygon(point, r.points));
  return !inHide;
}

export function isTokenVisibleToViewer(
  token: MapTokenView,
  viewer: MapViewer,
  fogEnabled: boolean,
  fogRegions: MapFogRegionView[],
): boolean {
  if (viewer.isDm) return true;
  if (token.layer === "gm") return false;
  if (token.visibility === "hidden") return false;
  if (token.visibility === "mask") {
    // Before fog exists / fog off: treat mask as hidden to players.
    if (!fogEnabled) return false;
    return isPointRevealed(tokenCenter(token), fogEnabled, fogRegions);
  }
  return true;
}

export function filterOccluderForViewer(
  occluder: MapOccluderView,
  viewer: MapViewer,
): MapOccluderView {
  if (viewer.isDm) return occluder;
  if (occluder.kind === "secret") {
    return { ...occluder, kind: "wall" as MapOccluderKind };
  }
  return occluder;
}

export function filterMapViewForViewer(
  map: CampaignMapView,
  viewer: MapViewer,
): CampaignMapView {
  if (viewer.isDm) return map;
  return {
    ...map,
    tokens: map.tokens.filter((t) =>
      isTokenVisibleToViewer(t, viewer, map.fogEnabled, map.fogRegions),
    ),
    occluders: map.occluders.map((o) => filterOccluderForViewer(o, viewer)),
    // Players get fog regions needed to render their mask.
    fogRegions: map.fogEnabled ? map.fogRegions : [],
  };
}

export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 55%)`;
}
