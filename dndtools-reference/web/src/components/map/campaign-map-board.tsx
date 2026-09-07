"use client";

import {
  addDrawing,
  addFogRegion,
  addOccluder,
  broadcastMapTokenMove,
  clearDrawings,
  commitMapTokenMove,
  deleteDrawing,
  removeFogRegion,
  removeMapToken,
  resetFog,
  sendMapPing,
  sendMapViewportGoTo,
  setFogEnabled,
  setLightingEnabled,
  setLosEnabled,
  setDaylight,
  setTokenEmitsLight,
  setTokenLayer,
  setTokenVisibility,
  setDoorState,
  updateCampaignMapGrid,
  updateDrawing,
  upsertMapLight,
} from "@/actions/maps";
import { snapSizeFeet } from "@/lib/map/distance";
import type { GridConfig } from "@/lib/map/grid";
import {
  gridToPixels,
  pixelsToGrid,
  snapTokenTopLeft,
} from "@/lib/map/grid";
import { userColor } from "@/lib/map/permissions";
import type {
  CampaignMapView,
  MapAoePointerView,
  MapDrawingGeom,
  MapDrawingView,
  MapPoint,
  MapTokenView,
  MapTool,
} from "@/lib/map/types";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapDrawLayer } from "./map-draw-layer";
import { MapFogLayer } from "./map-fog-layer";
import { MapGridOverlay } from "./map-grid-overlay";
import { MapMeasure } from "./map-measure";
import { MapPingLayer, type MapPing } from "./map-ping-layer";
import { MapToken } from "./map-token";
import { MapToolbar } from "./map-toolbar";
import { MapVisionLayer } from "./map-vision-layer";

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const MOVE_THROTTLE_MS = 60;
const DAYLIGHT_DEBOUNCE_MS = 150;

const MemoMapToken = memo(MapToken);

type ViewportState = { x: number; y: number; scale: number };

type UndoEntry =
  | { type: "drawingCreate"; drawingId: string }
  | {
      type: "drawingUpdate";
      drawingId: string;
      prevGeom: MapDrawingGeom;
    }
  | { type: "fogCreate"; regionId: string };

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

type CampaignMapBoardProps = {
  campaignId: string;
  map: CampaignMapView;
  isDm: boolean;
  viewerUserId: string;
  onMapChange: (map: CampaignMapView | null) => void;
  onOpenPcSheet?: (pcPlanId: string) => void;
  extraPings?: MapPing[];
  aoePointers?: MapAoePointerView[];
  viewportGoTo?: { x: number; y: number } | null;
};

function viewportKey(campaignId: string) {
  return `campaign-map-viewport-${campaignId}`;
}

function loadViewport(campaignId: string): ViewportState | null {
  try {
    const raw = sessionStorage.getItem(viewportKey(campaignId));
    if (!raw) return null;
    return JSON.parse(raw) as ViewportState;
  } catch {
    return null;
  }
}

function saveViewport(campaignId: string, vp: ViewportState) {
  try {
    sessionStorage.setItem(viewportKey(campaignId), JSON.stringify(vp));
  } catch {
    // ignore
  }
}

function canMoveToken(token: MapTokenView, isDm: boolean, viewerUserId: string) {
  if (isDm) return true;
  return token.ownerUserId === viewerUserId;
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CampaignMapBoard({
  campaignId,
  map,
  isDm,
  viewerUserId,
  onMapChange: _onMapChange,
  onOpenPcSheet,
  extraPings = [],
  aoePointers: _aoePointers = [],
  viewportGoTo,
}: CampaignMapBoardProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const viewportLiveRef = useRef<ViewportState>({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<MapTool>("select");
  const [snap, setSnap] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [measureBroadcast, setMeasureBroadcast] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>(() => ({
    x: 0,
    y: 0,
    scale: 1,
  }));
  const [spacePan, setSpacePan] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenMenu, setTokenMenu] = useState<{
    tokenId: string;
    x: number;
    y: number;
  } | null>(null);
  const [localPings, setLocalPings] = useState<MapPing[]>([]);
  const [measurePoints, setMeasurePoints] = useState<MapPoint[]>([]);
  const [measureDraft, setMeasureDraft] = useState<MapPoint[]>([]);
  const [calibrateStartPx, setCalibrateStartPx] = useState<MapPoint | null>(
    null,
  );
  const [polygonDraft, setPolygonDraft] = useState<MapPoint[]>([]);
  const [fogDragging, setFogDragging] = useState(false);
  const [drawDraft, setDrawDraft] = useState<MapPoint[]>([]);
  const [polylineDraft, setPolylineDraft] = useState<MapPoint[]>([]);
  const [aoeDraft, setAoeDraft] = useState<{
    kind: "circle" | "square" | "cone";
    origin: MapPoint;
    current: MapPoint;
  } | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null,
  );
  const [localDrawingGeom, setLocalDrawingGeom] = useState<
    Record<string, MapDrawingGeom>
  >({});
  /** Optimistic token positions during drag (avoids cloning the full map). */
  const [localTokenPos, setLocalTokenPos] = useState<
    Record<string, { x: number; y: number; seq: number }>
  >({});
  const [localDaylight, setLocalDaylight] = useState(map.daylight);
  const localDaylightRef = useRef(map.daylight);
  const undoStackRef = useRef<UndoEntry[]>([]);
  const dragRef = useRef<{
    tokenId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    x: number;
    y: number;
    seq: number;
    lastBroadcast: number;
  } | null>(null);
  const shapeDragRef = useRef<{
    drawingId: string;
    mode: "move" | "resize" | "rotate";
    corner?: "nw" | "ne" | "sw" | "se";
    startGrid: MapPoint;
    origGeom: MapDrawingGeom;
  } | null>(null);
  const shapeGeomLiveRef = useRef<MapDrawingGeom | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const goToAnimRef = useRef<number | null>(null);
  const aoeCommitRef = useRef(false);
  const daylightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyWorldTransform = useCallback((vp: ViewportState) => {
    viewportLiveRef.current = vp;
    if (worldRef.current) {
      worldRef.current.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})`;
    }
  }, []);

  const commitViewport = useCallback(
    (vp: ViewportState) => {
      applyWorldTransform(vp);
      setViewport(vp);
      saveViewport(campaignId, vp);
    },
    [applyWorldTransform, campaignId],
  );

  useEffect(() => {
    if (!panRef.current) {
      applyWorldTransform(viewport);
    }
  }, [viewport, applyWorldTransform]);

  useEffect(() => {
    // Ignore SSE while a local persist is pending, and skip no-ops that match
    // the last value we set (avoids fighting the slider).
    if (daylightTimerRef.current) return;
    if (map.daylight === localDaylightRef.current) return;
    localDaylightRef.current = map.daylight;
    setLocalDaylight(map.daylight);
  }, [map.daylight]);

  const grid: GridConfig = useMemo(
    () => ({
      gridSizePx: map.gridSizePx,
      gridOffsetX: map.gridOffsetX,
      gridOffsetY: map.gridOffsetY,
    }),
    [map.gridSizePx, map.gridOffsetX, map.gridOffsetY],
  );

  const snapMode = snap ? ("center" as const) : ("off" as const);

  const displayTokens = useMemo(
    () =>
      map.tokens.map((t) => {
        const o = localTokenPos[t.id];
        return o ? { ...t, x: o.x, y: o.y, seq: o.seq } : t;
      }),
    [map.tokens, localTokenPos],
  );

  const tokenLayer = useMemo(
    () => displayTokens.filter((t) => t.layer !== "gm"),
    [displayTokens],
  );
  const gmTokens = useMemo(
    () => (isDm ? displayTokens.filter((t) => t.layer === "gm") : []),
    [displayTokens, isDm],
  );

  const viewerTokens = useMemo(() => {
    if (isDm && selectedTokenId) {
      const t = displayTokens.find((tok) => tok.id === selectedTokenId);
      if (t) return [t];
    }
    return displayTokens.filter(
      (t) => t.kind === "pc" && t.ownerUserId === viewerUserId,
    );
  }, [displayTokens, isDm, selectedTokenId, viewerUserId]);

  const tokenLights = useMemo(
    () =>
      displayTokens.map((t) => ({
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        emitsLight: t.emitsLight,
        lightBright: t.lightBright,
        lightDim: t.lightDim,
        visionRange: t.visionRange,
      })),
    [displayTokens],
  );

  const displayDrawings = useMemo(() => {
    return map.drawings.map((d) => {
      const g = localDrawingGeom[d.id];
      return g ? { ...d, geom: g } : d;
    });
  }, [map.drawings, localDrawingGeom]);

  useEffect(() => {
    setLocalDrawingGeom((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of ids) {
        const d = map.drawings.find((x) => x.id === id);
        if (
          d?.geom &&
          d.geom.x === next[id]!.x &&
          d.geom.y === next[id]!.y &&
          d.geom.sizeFeet === next[id]!.sizeFeet &&
          d.geom.rotation === next[id]!.rotation
        ) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [map.drawings]);

  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStackRef.current = [...undoStackRef.current.slice(-49), entry];
  }, []);

  const canEditDrawing = useCallback(
    (d: MapDrawingView) => isDm || d.authorUserId === viewerUserId,
    [isDm, viewerUserId],
  );

  const allPings = useMemo(
    () => [...localPings, ...extraPings],
    [localPings, extraPings],
  );

  const fitView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const pad = 32;
    const vw = el.clientWidth - pad * 2;
    const vh = el.clientHeight - pad * 2;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min(vw / map.imageWidth, vh / map.imageHeight)),
    );
    const x = (el.clientWidth - map.imageWidth * scale) / 2;
    const y = (el.clientHeight - map.imageHeight * scale) / 2;
    commitViewport({ x, y, scale });
  }, [commitViewport, map.imageWidth, map.imageHeight]);

  useEffect(() => {
    const saved = loadViewport(campaignId);
    if (saved) {
      commitViewport(saved);
    } else {
      fitView();
    }
  }, [campaignId, fitView, commitViewport]);

  useEffect(() => {
    if (!viewportGoTo) return;
    const el = viewportRef.current;
    if (!el) return;

    const live = viewportLiveRef.current;
    const px = gridToPixels(viewportGoTo.x, viewportGoTo.y, grid);
    const targetX = el.clientWidth / 2 - px.x * live.scale;
    const targetY = el.clientHeight / 2 - px.y * live.scale;

    const from = { ...live };
    const to = { x: targetX, y: targetY, scale: live.scale };
    const start = performance.now();
    const duration = 450;

    if (goToAnimRef.current) cancelAnimationFrame(goToAnimRef.current);

    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      const next = {
        x: from.x + (to.x - from.x) * ease,
        y: from.y + (to.y - from.y) * ease,
        scale: to.scale,
      };
      applyWorldTransform(next);
      if (t < 1) {
        goToAnimRef.current = requestAnimationFrame(step);
      } else {
        commitViewport(next);
        goToAnimRef.current = null;
      }
    }
    goToAnimRef.current = requestAnimationFrame(step);
  }, [viewportGoTo, grid, applyWorldTransform, commitViewport]);

  const clientToWorldPx = useCallback(
    (clientX: number, clientY: number): MapPoint => {
      const el = viewportRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const vp = viewportLiveRef.current;
      return {
        x: (clientX - rect.left - vp.x) / vp.scale,
        y: (clientY - rect.top - vp.y) / vp.scale,
      };
    },
    [],
  );

  const clientToGrid = useCallback(
    (clientX: number, clientY: number): MapPoint => {
      const el = viewportRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const vp = viewportLiveRef.current;
      const wx = (clientX - rect.left - vp.x) / vp.scale;
      const wy = (clientY - rect.top - vp.y) / vp.scale;
      return pixelsToGrid(wx, wy, grid);
    },
    [grid],
  );

  const updateTokenLocal = useCallback(
    (tokenId: string, x: number, y: number, seq: number) => {
      setLocalTokenPos((prev) => ({
        ...prev,
        [tokenId]: { x, y, seq },
      }));
    },
    [],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const entry = undoStackRef.current.pop();
        if (!entry) return;
        if (entry.type === "drawingCreate") {
          void deleteDrawing(campaignId, map.id, entry.drawingId);
          if (selectedDrawingId === entry.drawingId) {
            setSelectedDrawingId(null);
          }
        } else if (entry.type === "drawingUpdate") {
          setLocalDrawingGeom((prev) => ({
            ...prev,
            [entry.drawingId]: entry.prevGeom,
          }));
          void updateDrawing(campaignId, map.id, entry.drawingId, {
            geom: entry.prevGeom,
          });
        } else if (entry.type === "fogCreate") {
          void removeFogRegion(campaignId, map.id, entry.regionId);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDrawingId) {
          const d = map.drawings.find((x) => x.id === selectedDrawingId);
          if (d && canEditDrawing(d)) {
            e.preventDefault();
            void deleteDrawing(campaignId, map.id, selectedDrawingId);
            setSelectedDrawingId(null);
          }
        }
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpacePan(true);
        return;
      }

      const arrowMap: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        KeyW: { dx: 0, dy: -1 },
        KeyS: { dx: 0, dy: 1 },
        KeyA: { dx: -1, dy: 0 },
        KeyD: { dx: 1, dy: 0 },
      };
      const step = arrowMap[e.code];
      if (!step || !selectedTokenId) return;
      const token = displayTokens.find((t) => t.id === selectedTokenId);
      if (!token || !canMoveToken(token, isDm, viewerUserId)) return;
      e.preventDefault();
      let nx = token.x + step.dx;
      let ny = token.y + step.dy;
      const snapped = snapTokenTopLeft(
        nx,
        ny,
        token.width,
        token.height,
        snap ? "center" : "off",
      );
      nx = snapped.x;
      ny = snapped.y;
      const seq = token.seq + 1;
      updateTokenLocal(token.id, nx, ny, seq);
      void commitMapTokenMove(
        campaignId,
        token.id,
        nx,
        ny,
        token.rotation,
        seq,
      );
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpacePan(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    campaignId,
    map.id,
    map.drawings,
    selectedDrawingId,
    selectedTokenId,
    displayTokens,
    isDm,
    viewerUserId,
    snap,
    canEditDrawing,
    updateTokenLocal,
  ]);

  const handleDaylightChange = useCallback(
    (value: number) => {
      localDaylightRef.current = value;
      setLocalDaylight(value);
      if (daylightTimerRef.current) clearTimeout(daylightTimerRef.current);
      daylightTimerRef.current = setTimeout(() => {
        daylightTimerRef.current = null;
        void setDaylight(campaignId, map.id, value);
      }, DAYLIGHT_DEBOUNCE_MS);
    },
    [campaignId, map.id],
  );

  useEffect(() => {
    return () => {
      if (daylightTimerRef.current) clearTimeout(daylightTimerRef.current);
    };
  }, []);

  const addPing = useCallback((x: number, y: number, color: string) => {
    setLocalPings((prev) => [
      ...prev,
      { id: randomId(), x, y, color },
    ]);
  }, []);

  const handleBoardPointerDown = (e: React.PointerEvent) => {
    const isPanButton = e.button === 1 || e.button === 2;
    const panActive = tool === "pan" || spacePan || isPanButton;
    if (panActive) {
      e.preventDefault();
      const live = viewportLiveRef.current;
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: live.x,
        origY: live.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    const pt = clientToGrid(e.clientX, e.clientY);

    if (tool === "ping") {
      if (e.shiftKey && isDm) {
        void sendMapViewportGoTo(campaignId, pt.x, pt.y);
      } else {
        void sendMapPing(campaignId, pt.x, pt.y);
        addPing(pt.x, pt.y, userColor(viewerUserId));
      }
      return;
    }

    if (tool === "measure") {
      setMeasureDraft([pt]);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "calibrate" && isDm) {
      const px = clientToWorldPx(e.clientX, e.clientY);
      if (!calibrateStartPx) {
        setCalibrateStartPx(px);
      } else {
        const size = Math.max(
          Math.abs(px.x - calibrateStartPx.x),
          Math.abs(px.y - calibrateStartPx.y),
        );
        if (size > 0) {
          void updateCampaignMapGrid(
            campaignId,
            map.id,
            size,
            calibrateStartPx.x,
            calibrateStartPx.y,
            map.scaleFeet,
            map.diagonalRule,
          );
        }
        setCalibrateStartPx(null);
      }
      return;
    }

    if ((tool === "fogReveal" || tool === "fogHide") && isDm) {
      setFogDragging(true);
      setPolygonDraft([pt]);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "draw") {
      setDrawDraft([pt]);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "wall" || tool === "door") {
      setPolylineDraft((prev) => [...prev, pt]);
      return;
    }

    if (tool === "light" && isDm) {
      void upsertMapLight(campaignId, map.id, {
        x: pt.x,
        y: pt.y,
        brightFeet: 20,
        dimFeet: 20,
        color: "#ffcc66",
        enabled: true,
        mode: "light",
      });
      return;
    }

    if (tool === "aoeCircle" || tool === "aoeSquare" || tool === "aoeCone") {
      aoeCommitRef.current = false;
      setAoeDraft({
        kind:
          tool === "aoeCircle"
            ? "circle"
            : tool === "aoeSquare"
              ? "square"
              : "cone",
        origin: pt,
        current: pt,
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    setSelectedTokenId(null);
    setSelectedDrawingId(null);
    setTokenMenu(null);
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    const pan = panRef.current;
    if (pan) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      applyWorldTransform({
        x: pan.origX + dx,
        y: pan.origY + dy,
        scale: viewportLiveRef.current.scale,
      });
      return;
    }

    const pt = clientToGrid(e.clientX, e.clientY);

    if (shapeDragRef.current) {
      const d = shapeDragRef.current;
      const g = d.origGeom;
      let next: MapDrawingGeom = g;
      if (d.mode === "move") {
        const nx = g.x + (pt.x - d.startGrid.x);
        const ny = g.y + (pt.y - d.startGrid.y);
        next = snap
          ? {
              ...g,
              x: Math.round(nx * 2) / 2,
              y: Math.round(ny * 2) / 2,
            }
          : { ...g, x: nx, y: ny };
      } else if (d.mode === "resize") {
        const sizeGrid = Math.max(
          0.25,
          Math.hypot(pt.x - g.x, pt.y - g.y),
        );
        let sizeFeet = sizeGrid * map.scaleFeet;
        sizeFeet = snapSizeFeet(sizeFeet, map.scaleFeet, snap);
        next = { ...g, sizeFeet };
      } else if (d.mode === "rotate") {
        const rotation = (Math.atan2(pt.y - g.y, pt.x - g.x) * 180) / Math.PI;
        const snappedRot = snap ? Math.round(rotation / 45) * 45 : rotation;
        next = { ...g, rotation: snappedRot };
      }
      shapeGeomLiveRef.current = next;
      setLocalDrawingGeom((prev) => ({ ...prev, [d.drawingId]: next }));
      return;
    }

    if (measureDraft.length >= 1) {
      setMeasureDraft((prev) => {
        if (prev.length === 0) return prev;
        return [prev[0]!, pt];
      });
      return;
    }

    if (fogDragging && polygonDraft.length >= 1) {
      setPolygonDraft((prev) => {
        const last = prev[prev.length - 1]!;
        if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.15) return prev;
        return [...prev, pt];
      });
      return;
    }

    if (drawDraft.length >= 1) {
      setDrawDraft((prev) => [...prev, pt]);
      return;
    }

    if (aoeDraft) {
      setAoeDraft((prev) => (prev ? { ...prev, current: pt } : prev));
      return;
    }
  };

  const finishMeasure = (points: MapPoint[]) => {
    if (points.length < 2) return;
    setMeasurePoints(points);
    setMeasureDraft([]);
  };

  const handleBoardPointerUp = (e: React.PointerEvent) => {
    if (panRef.current) {
      panRef.current = null;
      commitViewport(viewportLiveRef.current);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (shapeDragRef.current) {
      const d = shapeDragRef.current;
      const geom = shapeGeomLiveRef.current ?? d.origGeom;
      shapeDragRef.current = null;
      shapeGeomLiveRef.current = null;
      pushUndo({
        type: "drawingUpdate",
        drawingId: d.drawingId,
        prevGeom: d.origGeom,
      });
      void updateDrawing(campaignId, map.id, d.drawingId, { geom });
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (measureDraft.length >= 1) {
      if (measureDraft.length >= 2) finishMeasure(measureDraft);
      else setMeasureDraft([]);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (fogDragging) {
      setFogDragging(false);
      const pts = polygonDraft;
      setPolygonDraft([]);
      if (pts.length >= 3) {
        const kind = tool === "fogHide" ? "hide" : "reveal";
        void addFogRegion(campaignId, map.id, kind, pts).then((res) => {
          if (res.success && res.region) {
            pushUndo({ type: "fogCreate", regionId: res.region.id });
          }
        });
      }
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (drawDraft.length >= 2) {
      void addDrawing(campaignId, map.id, {
        kind: "stroke",
        stroke: drawDraft,
      }).then((res) => {
        if (res.success && res.drawing) {
          pushUndo({ type: "drawingCreate", drawingId: res.drawing.id });
        }
      });
      setDrawDraft([]);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }
    if (drawDraft.length > 0) {
      setDrawDraft([]);
    }

    if (aoeDraft) {
      if (aoeCommitRef.current) {
        setAoeDraft(null);
        return;
      }
      aoeCommitRef.current = true;
      const dx = aoeDraft.current.x - aoeDraft.origin.x;
      const dy = aoeDraft.current.y - aoeDraft.origin.y;
      let sizeFeet =
        Math.hypot(dx, dy) * map.scaleFeet || map.scaleFeet * 3;
      sizeFeet = snapSizeFeet(sizeFeet, map.scaleFeet, snap);
      const rotation =
        aoeDraft.kind === "cone"
          ? (Math.atan2(dy, dx) * 180) / Math.PI
          : 0;
      void addDrawing(campaignId, map.id, {
        kind: aoeDraft.kind,
        geom: {
          x: aoeDraft.origin.x,
          y: aoeDraft.origin.y,
          sizeFeet,
          rotation,
        },
      }).then((res) => {
        if (res.success && res.drawing) {
          pushUndo({ type: "drawingCreate", drawingId: res.drawing.id });
          setSelectedDrawingId(res.drawing.id);
        }
      });
      setAoeDraft(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (dragRef.current) {
      dragRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const live = viewportLiveRef.current;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, live.scale * delta),
    );
    const wx = (mx - live.x) / live.scale;
    const wy = (my - live.y) / live.scale;
    commitViewport({
      scale: newScale,
      x: mx - wx * newScale,
      y: my - wy * newScale,
    });
  };

  const handleTokenPointerDown = (
    e: React.PointerEvent,
    token: MapTokenView,
  ) => {
    if (tool !== "select" && !spacePan) {
      // Let board tools (measure, fog, draw, shapes) receive the event.
      return;
    }
    e.stopPropagation();
    if (!canMoveToken(token, isDm, viewerUserId)) return;
    setSelectedTokenId(token.id);
    setSelectedDrawingId(null);
    const pt = clientToGrid(e.clientX, e.clientY);
    dragRef.current = {
      tokenId: token.id,
      startX: pt.x,
      startY: pt.y,
      origX: token.x,
      origY: token.y,
      x: token.x,
      y: token.y,
      seq: token.seq + 1,
      lastBroadcast: 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTokenPointerMove = (
    e: React.PointerEvent,
    token: MapTokenView,
  ) => {
    if (!dragRef.current || dragRef.current.tokenId !== token.id) return;
    const pt = clientToGrid(e.clientX, e.clientY);
    const d = dragRef.current;
    let nx = d.origX + (pt.x - d.startX);
    let ny = d.origY + (pt.y - d.startY);
    const snapped = snapTokenTopLeft(
      nx,
      ny,
      token.width,
      token.height,
      snapMode,
    );
    nx = snapped.x;
    ny = snapped.y;
    d.x = nx;
    d.y = ny;
    updateTokenLocal(d.tokenId, nx, ny, d.seq);
    const now = Date.now();
    if (now - d.lastBroadcast >= MOVE_THROTTLE_MS) {
      d.lastBroadcast = now;
      void broadcastMapTokenMove(
        campaignId,
        d.tokenId,
        nx,
        ny,
        token.rotation,
        d.seq,
      );
    }
  };

  const handleTokenPointerUp = (
    e: React.PointerEvent,
    token: MapTokenView,
  ) => {
    if (!dragRef.current || dragRef.current.tokenId !== token.id) return;
    const d = dragRef.current;
    void commitMapTokenMove(
      campaignId,
      d.tokenId,
      d.x,
      d.y,
      token.rotation,
      d.seq,
    );
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setLocalTokenPos((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of ids) {
        const t = map.tokens.find((tok) => tok.id === id);
        if (t && t.seq >= next[id]!.seq) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [map.tokens]);

  const handleTokenClick = (e: React.MouseEvent, token: MapTokenView) => {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedTokenId(token.id);
    setSelectedDrawingId(null);
    setTokenMenu(null);
  };

  const handleTokenDoubleClick = (
    e: React.MouseEvent,
    token: MapTokenView,
  ) => {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedTokenId(token.id);
    setTokenMenu(null);
    if (token.pcPlanId && onOpenPcSheet) {
      onOpenPcSheet(token.pcPlanId);
    }
  };

  const handleTokenContextMenu = (
    e: React.MouseEvent,
    token: MapTokenView,
  ) => {
    setSelectedTokenId(token.id);
    setTokenMenu({ tokenId: token.id, x: e.clientX, y: e.clientY });
  };

  const handleShapePointerDown = (
    e: React.PointerEvent,
    drawingId: string,
    mode: "move" | "resize" | "rotate",
    corner?: "nw" | "ne" | "sw" | "se",
  ) => {
    if (tool !== "select") return;
    const drawing = displayDrawings.find((d) => d.id === drawingId);
    if (!drawing?.geom || !canEditDrawing(drawing)) return;
    e.preventDefault();
    const pt = clientToGrid(e.clientX, e.clientY);
    shapeDragRef.current = {
      drawingId,
      mode,
      corner,
      startGrid: pt,
      origGeom: drawing.geom,
    };
    shapeGeomLiveRef.current = drawing.geom;
    setSelectedDrawingId(drawingId);
    setSelectedTokenId(null);
    const board = viewportRef.current;
    if (board) board.setPointerCapture(e.pointerId);
  };

  const finishPolyline = () => {
    if (polylineDraft.length < 2) {
      setPolylineDraft([]);
      return;
    }
    const kind = tool === "door" ? "door" : "wall";
    void addOccluder(campaignId, map.id, kind, polylineDraft);
    setPolylineDraft([]);
  };

  const measureColor = userColor(viewerUserId);
  const activeMeasure = measureDraft.length >= 2 ? measureDraft : measurePoints;

  return (
    <div className="campaign-map-board">
      <div
        ref={viewportRef}
        className="campaign-map-viewport"
        onWheel={handleWheel}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          ref={worldRef}
          className="campaign-map-world"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="campaign-map-image"
            src={map.imageUrl}
            alt={map.name}
            width={map.imageWidth}
            height={map.imageHeight}
            draggable={false}
          />

          <MapGridOverlay
            imageWidth={map.imageWidth}
            imageHeight={map.imageHeight}
            gridSizePx={map.gridSizePx}
            gridOffsetX={map.gridOffsetX}
            gridOffsetY={map.gridOffsetY}
            visible={gridVisible}
          />

          <MapFogLayer
            fogEnabled={map.fogEnabled}
            fogRegions={map.fogRegions}
            imageWidth={map.imageWidth}
            imageHeight={map.imageHeight}
            isDm={isDm}
            grid={grid}
          />

          <MapVisionLayer
            isDm={isDm}
            losEnabled={map.losEnabled}
            lightingEnabled={map.lightingEnabled}
            daylight={localDaylight}
            scaleFeet={map.scaleFeet}
            occluders={map.occluders}
            lights={map.lights}
            tokenLights={tokenLights}
            viewerTokens={viewerTokens}
            grid={grid}
            imageWidth={map.imageWidth}
            imageHeight={map.imageHeight}
          />

          <MapDrawLayer
            drawings={displayDrawings}
            grid={grid}
            scaleFeet={map.scaleFeet}
            imageWidth={map.imageWidth}
            imageHeight={map.imageHeight}
            selectedDrawingId={selectedDrawingId}
            draftStroke={
              drawDraft.length >= 2
                ? { color: userColor(viewerUserId), points: drawDraft }
                : null
            }
            draftShape={
              aoeDraft
                ? {
                    kind: aoeDraft.kind,
                    origin: aoeDraft.origin,
                    current: aoeDraft.current,
                    color: measureColor,
                  }
                : null
            }
            canEditDrawing={(d) => tool === "select" && canEditDrawing(d)}
            onSelectDrawing={(id) => {
              if (tool !== "select") return;
              setSelectedDrawingId(id);
              if (id) setSelectedTokenId(null);
            }}
            onShapePointerDown={handleShapePointerDown}
          />

          <svg
            className="map-occluder-layer map-occluder-layer--interactive"
            width={map.imageWidth}
            height={map.imageHeight}
          >
            {map.occluders.map((o) => (
              <g key={o.id}>
                <polyline
                  points={o.points
                    .map((p) => {
                      const px = gridToPixels(p.x, p.y, grid);
                      return `${px.x},${px.y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={o.kind === "door" ? "#c9a227" : "#888"}
                  strokeWidth={2}
                  strokeDasharray={o.state === "open" ? "6 4" : undefined}
                  pointerEvents="none"
                />
                {(o.kind === "door" || o.kind === "window") &&
                o.points.length >= 2 ? (
                  <circle
                    className="map-door-handle"
                    cx={
                      (gridToPixels(o.points[0]!.x, o.points[0]!.y, grid).x +
                        gridToPixels(o.points[1]!.x, o.points[1]!.y, grid).x) /
                      2
                    }
                    cy={
                      (gridToPixels(o.points[0]!.x, o.points[0]!.y, grid).y +
                        gridToPixels(o.points[1]!.x, o.points[1]!.y, grid).y) /
                      2
                    }
                    r={8}
                    fill={o.state === "open" ? "#66cc66" : "#c9a227"}
                    stroke="#111"
                    strokeWidth={1}
                    style={{ cursor: "pointer", pointerEvents: "auto" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (o.state === "locked" && !isDm) return;
                      const next = o.state === "open" ? "closed" : "open";
                      void setDoorState(campaignId, map.id, o.id, next);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDm) return;
                      void setDoorState(
                        campaignId,
                        map.id,
                        o.id,
                        o.state === "locked" ? "closed" : "locked",
                      );
                    }}
                  />
                ) : null}
              </g>
            ))}
            {polylineDraft.length >= 2 ? (
              <polyline
                points={polylineDraft
                  .map((p) => {
                    const px = gridToPixels(p.x, p.y, grid);
                    return `${px.x},${px.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#c9a227"
                strokeWidth={2}
                opacity={0.7}
                pointerEvents="none"
              />
            ) : null}
            {polygonDraft.length >= 2 ? (
              <polyline
                points={polygonDraft
                  .map((p) => {
                    const px = gridToPixels(p.x, p.y, grid);
                    return `${px.x},${px.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#66aaff"
                strokeWidth={2}
                opacity={0.7}
                pointerEvents="none"
              />
            ) : null}
            {calibrateStartPx ? (
              <circle
                cx={calibrateStartPx.x}
                cy={calibrateStartPx.y}
                r={6}
                fill="#c9a227"
              />
            ) : null}
          </svg>

          <div className="map-token-layer">
            {tokenLayer.map((token) => (
              <MemoMapToken
                key={token.id}
                token={token}
                grid={grid}
                selected={selectedTokenId === token.id}
                canMove={canMoveToken(token, isDm, viewerUserId)}
                isDm={isDm}
                onPointerDown={handleTokenPointerDown}
                onPointerMove={handleTokenPointerMove}
                onPointerUp={handleTokenPointerUp}
                onClick={handleTokenClick}
                onDoubleClick={handleTokenDoubleClick}
                onContextMenu={handleTokenContextMenu}
              />
            ))}
          </div>

          {isDm ? (
            <div className="map-token-layer map-token-layer--gm">
              {gmTokens.map((token) => (
                <MemoMapToken
                  key={token.id}
                  token={token}
                  grid={grid}
                  selected={selectedTokenId === token.id}
                  canMove={canMoveToken(token, isDm, viewerUserId)}
                  isDm={isDm}
                  onPointerDown={handleTokenPointerDown}
                  onPointerMove={handleTokenPointerMove}
                  onPointerUp={handleTokenPointerUp}
                  onClick={handleTokenClick}
                  onDoubleClick={handleTokenDoubleClick}
                  onContextMenu={handleTokenContextMenu}
                />
              ))}
            </div>
          ) : null}

          {activeMeasure.length >= 2 ? (
            <MapMeasure
              points={activeMeasure}
              diagonalRule={map.diagonalRule}
              scaleFeet={map.scaleFeet}
              color={measureColor}
              grid={grid}
              imageWidth={map.imageWidth}
              imageHeight={map.imageHeight}
            />
          ) : null}

          <MapPingLayer
            pings={allPings}
            grid={grid}
            onExpire={(id) =>
              setLocalPings((prev) => prev.filter((p) => p.id !== id))
            }
          />
        </div>
      </div>

      {(tool === "wall" || tool === "door") && polylineDraft.length >= 2 ? (
        <div className="campaign-map-board-hint">
          <button type="button" className="tool-btn" onClick={finishPolyline}>
            Finish {tool} ({polylineDraft.length} pts)
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={() => setPolylineDraft([])}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <MapToolbar
        tool={tool}
        onToolChange={setTool}
        isDm={isDm}
        snap={snap}
        onSnapChange={setSnap}
        gridVisible={gridVisible}
        onGridVisibleChange={setGridVisible}
        measureBroadcast={measureBroadcast}
        onMeasureBroadcastChange={setMeasureBroadcast}
        onFitView={fitView}
        fogEnabled={map.fogEnabled}
        losEnabled={map.losEnabled}
        lightingEnabled={map.lightingEnabled}
        onFogToggle={() =>
          void setFogEnabled(campaignId, map.id, !map.fogEnabled)
        }
        onLosToggle={() =>
          void setLosEnabled(campaignId, map.id, !map.losEnabled)
        }
        onLightingToggle={() =>
          void setLightingEnabled(campaignId, map.id, !map.lightingEnabled)
        }
        daylight={localDaylight}
        onDaylightChange={handleDaylightChange}
        onClearDrawings={() => void clearDrawings(campaignId, map.id)}
        onResetFog={() => void resetFog(campaignId, map.id)}
      />

      {tokenMenu ? (
        <div
          className="map-token-menu"
          style={{ left: tokenMenu.x, top: tokenMenu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenLayer(campaignId, map.id, tokenMenu.tokenId, "gm");
              setTokenMenu(null);
            }}
          >
            Move to GM layer
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenLayer(campaignId, map.id, tokenMenu.tokenId, "token");
              setTokenMenu(null);
            }}
          >
            Reveal to players
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenVisibility(
                campaignId,
                map.id,
                tokenMenu.tokenId,
                "always",
              );
              setTokenMenu(null);
            }}
          >
            Visible always
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenVisibility(
                campaignId,
                map.id,
                tokenMenu.tokenId,
                "mask",
              );
              setTokenMenu(null);
            }}
          >
            Mask-sensitive
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenVisibility(
                campaignId,
                map.id,
                tokenMenu.tokenId,
                "hidden",
              );
              setTokenMenu(null);
            }}
          >
            Hidden
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenEmitsLight(
                campaignId,
                map.id,
                tokenMenu.tokenId,
                true,
                20,
                20,
              );
              setTokenMenu(null);
            }}
          >
            Torch on
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void setTokenEmitsLight(
                campaignId,
                map.id,
                tokenMenu.tokenId,
                false,
                0,
                0,
              );
              setTokenMenu(null);
            }}
          >
            Torch off
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void removeMapToken(campaignId, map.id, tokenMenu.tokenId);
              setTokenMenu(null);
            }}
          >
            Remove token
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => setTokenMenu(null)}
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
