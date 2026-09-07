/**
 * Client-side campaign live store (useSyncExternalStore).
 * Map token moves update the tokens Map without cloning the whole table.
 */

import type {
  CampaignActivityView,
  CampaignLiveEvent,
  CampaignMemberView,
  CampaignPcView,
  CampaignRollView,
  CampaignTableState,
} from "@/lib/campaign/types";
import type {
  CampaignMapListItem,
  CampaignMapView,
  MapAoePointerView,
  MapTokenView,
} from "@/lib/map/types";

export type MapPingLocal = {
  id: string;
  x: number;
  y: number;
  color: string;
};

export type LiveStoreState = {
  members: CampaignMemberView[];
  pcs: CampaignPcView[];
  onlineUserIds: string[];
  rolls: CampaignRollView[];
  activity: CampaignActivityView[];
  liveMap: CampaignMapView | null;
  maps: CampaignMapListItem[];
  /** Token overrides / live positions keyed by id. */
  tokens: Map<string, MapTokenView>;
  mapPings: MapPingLocal[];
  aoePointers: MapAoePointerView[];
  viewportGoTo: { x: number; y: number; nonce: number } | null;
  pcUpdated: {
    pcPlanId: string;
    actorUserId: string;
    updatedAt: string;
  } | null;
  /** Last token move we sent (ignore echo). */
  selfMoves: Map<string, number>;
  viewerUserId: string;
  connected: boolean;
};

type Listener = () => void;

function tokensFromMap(map: CampaignMapView | null): Map<string, MapTokenView> {
  const m = new Map<string, MapTokenView>();
  if (!map) return m;
  for (const t of map.tokens) m.set(t.id, t);
  return m;
}

export function createLiveStore(initial: {
  table: CampaignTableState;
  viewerUserId: string;
}) {
  let state: LiveStoreState = {
    members: initial.table.members,
    pcs: initial.table.pcs,
    onlineUserIds: [],
    rolls: initial.table.rolls,
    activity: [],
    liveMap: initial.table.liveMap,
    maps: initial.table.maps,
    tokens: tokensFromMap(initial.table.liveMap),
    mapPings: [],
    aoePointers: [],
    viewportGoTo: null,
    pcUpdated: null,
    selfMoves: new Map(),
    viewerUserId: initial.viewerUserId,
    connected: false,
  };

  const listeners = new Set<Listener>();
  /** Version bump for coarse subscriptions. */
  let version = 0;
  /** Separate version for token-only updates (board). */
  let tokenVersion = 0;
  /** Separate for pcUpdated (sheets). */
  let pcVersion = 0;
  /** Separate for rolls (dice). */
  let rollVersion = 0;

  const notify = (opts?: {
    tokens?: boolean;
    pc?: boolean;
    rolls?: boolean;
  }) => {
    version += 1;
    if (opts?.tokens) tokenVersion += 1;
    if (opts?.pc) pcVersion += 1;
    if (opts?.rolls) rollVersion += 1;
    for (const l of listeners) l();
  };

  const getState = () => state;
  const getVersion = () => version;
  const getTokenVersion = () => tokenVersion;
  const getPcVersion = () => pcVersion;
  const getRollVersion = () => rollVersion;

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const noteSelfMove = (tokenId: string, seq: number) => {
    state.selfMoves.set(tokenId, seq);
  };

  const applyLocalTokenPos = (
    tokenId: string,
    x: number,
    y: number,
    seq: number,
  ) => {
    const prev = state.tokens.get(tokenId);
    if (!prev) return;
    const next = { ...prev, x, y, seq };
    const tokens = new Map(state.tokens);
    tokens.set(tokenId, next);
    state = { ...state, tokens };
    noteSelfMove(tokenId, seq);
    notify({ tokens: true });
  };

  const setConnected = (connected: boolean) => {
    if (state.connected === connected) return;
    state = { ...state, connected };
    notify();
  };

  const hydrateFromTable = (next: CampaignTableState) => {
    const prev = state;
    const sameLive =
      prev.liveMap?.id === next.liveMap?.id &&
      prev.maps.length === next.maps.length &&
      prev.members === next.members &&
      prev.pcs === next.pcs &&
      prev.rolls === next.rolls;
    // Prefer keeping live WS tokens when hydrating an identical live map id
    // unless the HTTP snapshot is a fresh load with no local tokens yet.
    const keepTokens =
      prev.tokens.size > 0 &&
      next.liveMap &&
      prev.liveMap &&
      prev.liveMap.id === next.liveMap.id;
    state = {
      ...state,
      members: next.members,
      pcs: next.pcs,
      liveMap: next.liveMap,
      maps: next.maps,
      rolls: next.rolls,
      tokens: keepTokens ? prev.tokens : tokensFromMap(next.liveMap),
    };
    if (!sameLive || !keepTokens) {
      notify({ tokens: true });
    }
  };

  const applyEvent = (event: CampaignLiveEvent) => {
    switch (event.type) {
      case "ping":
        return;
      case "presence":
        state = { ...state, onlineUserIds: event.onlineUserIds };
        notify();
        return;
      case "roster":
        state = { ...state, members: event.members, pcs: event.pcs };
        notify();
        return;
      case "activity":
        state = {
          ...state,
          activity: [event.activity, ...state.activity].slice(0, 200),
        };
        notify();
        return;
      case "pcUpdated":
        state = {
          ...state,
          pcUpdated: {
            pcPlanId: event.pcPlanId,
            actorUserId: event.actorUserId,
            updatedAt: event.updatedAt,
          },
        };
        notify({ pc: true });
        return;
      case "roll":
        state = {
          ...state,
          rolls: [event.roll, ...state.rolls].slice(0, 50),
        };
        notify({ rolls: true });
        return;
      case "mapList":
        state = { ...state, maps: event.maps };
        notify();
        return;
      case "mapSnapshot": {
        state = {
          ...state,
          liveMap: event.map,
          tokens: tokensFromMap(event.map),
        };
        notify({ tokens: true });
        return;
      }
      case "mapTokenMove": {
        const selfSeq = state.selfMoves.get(event.tokenId);
        if (selfSeq != null && event.seq <= selfSeq && !event.committed) {
          return;
        }
        if (event.committed) {
          state.selfMoves.delete(event.tokenId);
        }
        const prev = state.tokens.get(event.tokenId);
        if (!prev) return;
        if (event.seq < prev.seq) return;
        const next = {
          ...prev,
          x: event.x,
          y: event.y,
          rotation: event.rotation,
          seq: event.seq,
        };
        const tokens = new Map(state.tokens);
        tokens.set(event.tokenId, next);
        // Keep liveMap.tokens roughly in sync for code that reads it.
        let liveMap = state.liveMap;
        if (liveMap) {
          liveMap = {
            ...liveMap,
            tokens: liveMap.tokens.map((t) =>
              t.id === event.tokenId ? next : t,
            ),
          };
        }
        state = { ...state, tokens, liveMap };
        notify({ tokens: true });
        return;
      }
      case "mapTokenUpsert": {
        const tokens = new Map(state.tokens);
        tokens.set(event.token.id, event.token);
        let liveMap = state.liveMap;
        if (liveMap) {
          const idx = liveMap.tokens.findIndex((t) => t.id === event.token.id);
          const list =
            idx >= 0
              ? liveMap.tokens.map((t, i) => (i === idx ? event.token : t))
              : [...liveMap.tokens, event.token];
          liveMap = { ...liveMap, tokens: list };
        }
        state = { ...state, tokens, liveMap };
        notify({ tokens: true });
        return;
      }
      case "mapTokenRemove": {
        const tokens = new Map(state.tokens);
        tokens.delete(event.tokenId);
        let liveMap = state.liveMap;
        if (liveMap) {
          liveMap = {
            ...liveMap,
            tokens: liveMap.tokens.filter((t) => t.id !== event.tokenId),
          };
        }
        state = { ...state, tokens, liveMap };
        notify({ tokens: true });
        return;
      }
      case "mapPing":
        state = {
          ...state,
          mapPings: [
            ...state.mapPings,
            {
              id: `${event.userId}-${Date.now()}-${Math.random()}`,
              x: event.x,
              y: event.y,
              color: event.color,
            },
          ],
        };
        notify({ tokens: true });
        return;
      case "mapViewportGoTo":
        state = {
          ...state,
          viewportGoTo: {
            x: event.x,
            y: event.y,
            nonce: Date.now(),
          },
        };
        notify({ tokens: true });
        return;
      case "mapAoeUpsert": {
        const idx = state.aoePointers.findIndex((p) => p.id === event.pointer.id);
        const aoePointers =
          idx >= 0
            ? state.aoePointers.map((p, i) =>
                i === idx ? event.pointer : p,
              )
            : [...state.aoePointers, event.pointer];
        state = { ...state, aoePointers };
        notify({ tokens: true });
        return;
      }
      case "mapAoeClear":
        state = { ...state, aoePointers: [] };
        notify({ tokens: true });
        return;
      default: {
        // Structural map updates (fog, drawings, lights, flags, grid, occluders).
        if (!state.liveMap) return;
        const map = applyMapStructuralEvent(state.liveMap, event);
        if (map === state.liveMap) return;
        state = { ...state, liveMap: map };
        notify({ tokens: true });
      }
    }
  };

  const expirePing = (id: string) => {
    state = {
      ...state,
      mapPings: state.mapPings.filter((p) => p.id !== id),
    };
    notify({ tokens: true });
  };

  return {
    subscribe,
    getState,
    getVersion,
    getTokenVersion,
    getPcVersion,
    getRollVersion,
    applyEvent,
    applyLocalTokenPos,
    noteSelfMove,
    setConnected,
    hydrateFromTable,
    expirePing,
  };
}

export type CampaignLiveStore = ReturnType<typeof createLiveStore>;

function applyMapStructuralEvent(
  map: CampaignMapView,
  event: CampaignLiveEvent,
): CampaignMapView {
  switch (event.type) {
    case "mapGrid":
      return {
        ...map,
        gridSizePx: event.gridSizePx,
        gridOffsetX: event.gridOffsetX,
        gridOffsetY: event.gridOffsetY,
        scaleFeet: event.scaleFeet,
        diagonalRule: event.diagonalRule,
      };
    case "mapFogUpsert": {
      const idx = map.fogRegions.findIndex((r) => r.id === event.region.id);
      const fogRegions =
        idx >= 0
          ? map.fogRegions.map((r, i) => (i === idx ? event.region : r))
          : [...map.fogRegions, event.region];
      return { ...map, fogRegions };
    }
    case "mapFogRemove":
      return {
        ...map,
        fogRegions: map.fogRegions.filter((r) => r.id !== event.regionId),
      };
    case "mapFogReset":
      return { ...map, fogRegions: [] };
    case "mapDrawingUpsert": {
      const idx = map.drawings.findIndex((d) => d.id === event.drawing.id);
      const drawings =
        idx >= 0
          ? map.drawings.map((d, i) => (i === idx ? event.drawing : d))
          : [...map.drawings, event.drawing];
      return { ...map, drawings };
    }
    case "mapDrawingRemove":
      return {
        ...map,
        drawings: map.drawings.filter((d) => d.id !== event.drawingId),
      };
    case "mapDrawingClear":
      return { ...map, drawings: [] };
    case "mapOccluderUpsert": {
      const idx = map.occluders.findIndex((o) => o.id === event.occluder.id);
      const occluders =
        idx >= 0
          ? map.occluders.map((o, i) => (i === idx ? event.occluder : o))
          : [...map.occluders, event.occluder];
      return { ...map, occluders };
    }
    case "mapOccluderRemove":
      return {
        ...map,
        occluders: map.occluders.filter((o) => o.id !== event.occluderId),
      };
    case "mapLightUpsert": {
      const idx = map.lights.findIndex((l) => l.id === event.light.id);
      const lights =
        idx >= 0
          ? map.lights.map((l, i) => (i === idx ? event.light : l))
          : [...map.lights, event.light];
      return { ...map, lights };
    }
    case "mapLightRemove":
      return {
        ...map,
        lights: map.lights.filter((l) => l.id !== event.lightId),
      };
    case "mapFlags":
      return {
        ...map,
        fogEnabled: event.fogEnabled,
        losEnabled: event.losEnabled,
        lightingEnabled: event.lightingEnabled,
        daylight: event.daylight,
        explorerEnabled: event.explorerEnabled,
      };
    default:
      return map;
  }
}

/** Merge tokens Map into a CampaignMapView for board rendering. */
export function mapViewWithTokens(
  liveMap: CampaignMapView | null,
  tokens: Map<string, MapTokenView>,
): CampaignMapView | null {
  if (!liveMap) return null;
  return {
    ...liveMap,
    tokens: Array.from(tokens.values()),
  };
}
