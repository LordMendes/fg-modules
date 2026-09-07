"use client";

import { memo, useEffect, useRef } from "react";
import type { Camera } from "@/lib/map/camera";
import { overlayCanvasSize } from "@/lib/map/camera";
import { formatFeetLabel } from "@/lib/map/distance";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import {
  DEFAULT_VISION_SQUARES,
  segmentsFromOccluders,
  tokenCenter,
  visibilityPolygon,
} from "@/lib/map/los";
import type {
  CampaignMapView,
  MapDrawingView,
  MapPoint,
  MapTokenView,
} from "@/lib/map/types";

export type OverlayPing = { id: string; x: number; y: number; color: string };

type MapViewportOverlayProps = {
  camera: Camera;
  map: CampaignMapView;
  grid: GridConfig;
  isDm: boolean;
  viewerUserId: string;
  viewerTokens: MapTokenView[];
  tokens: MapTokenView[];
  gridVisible: boolean;
  pings: OverlayPing[];
  measurePoints: MapPoint[];
  measureColor: string;
  draftStroke: { color: string; points: MapPoint[] } | null;
  draftShape: {
    kind: "circle" | "square" | "cone";
    origin: MapPoint;
    current: MapPoint;
    color: string;
  } | null;
  polygonDraft: MapPoint[];
  polylineDraft: MapPoint[];
  /** Bump to force redraw (token drag via refs may skip React). */
  paintNonce: number;
};

function paintGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  map: CampaignMapView,
  grid: GridConfig,
) {
  const { gridSizePx, gridOffsetX, gridOffsetY } = grid;
  if (gridSizePx <= 0) return;
  ctx.save();
  ctx.strokeStyle = "rgba(201, 162, 39, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = gridOffsetX; x <= map.imageWidth + gridSizePx; x += gridSizePx) {
    const a = worldToScreenLocal(camera, x, 0);
    const b = worldToScreenLocal(camera, x, map.imageHeight);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  for (let y = gridOffsetY; y <= map.imageHeight + gridSizePx; y += gridSizePx) {
    const a = worldToScreenLocal(camera, 0, y);
    const b = worldToScreenLocal(camera, map.imageWidth, y);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
}

function worldToScreenLocal(camera: Camera, wx: number, wy: number) {
  return {
    x: wx * camera.scale + camera.x,
    y: wy * camera.scale + camera.y,
  };
}

function gridPt(
  camera: Camera,
  grid: GridConfig,
  p: MapPoint,
): { x: number; y: number } {
  const px = gridToPixels(p.x, p.y, grid);
  return worldToScreenLocal(camera, px.x, px.y);
}

function paintFog(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  map: CampaignMapView,
  grid: GridConfig,
  isDm: boolean,
) {
  if (!map.fogEnabled) return;
  const w = map.imageWidth * camera.scale;
  const h = map.imageHeight * camera.scale;
  const origin = worldToScreenLocal(camera, 0, 0);

  if (!isDm) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    // Even-odd: full rect minus reveals.
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, w, h);
    for (const region of map.fogRegions) {
      if (region.kind !== "reveal" || region.points.length < 3) continue;
      const pts = region.points.map((p) => gridPt(camera, grid, p));
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.closePath();
    }
    ctx.fill("evenodd");
    ctx.restore();
  }

  for (const region of map.fogRegions) {
    if (region.kind !== "hide" || region.points.length < 3) continue;
    const pts = region.points.map((p) => gridPt(camera, grid, p));
    ctx.save();
    ctx.fillStyle = isDm ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.92)";
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (isDm) {
    for (const region of map.fogRegions) {
      if (region.kind !== "reveal" || region.points.length < 3) continue;
      const pts = region.points.map((p) => gridPt(camera, grid, p));
      ctx.save();
      ctx.strokeStyle = "#66aaff";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
}

function paintVision(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  map: CampaignMapView,
  grid: GridConfig,
  isDm: boolean,
  viewerTokens: MapTokenView[],
  tokens: MapTokenView[],
) {
  const losActive = map.losEnabled && !isDm;
  const lightingActive = map.lightingEnabled;
  if (!losActive && !lightingActive) return;

  const origin = worldToScreenLocal(camera, 0, 0);
  const w = map.imageWidth * camera.scale;
  const h = map.imageHeight * camera.scale;
  const segments = segmentsFromOccluders(map.occluders);

  ctx.save();
  // Clip to map bounds in screen space.
  ctx.beginPath();
  ctx.rect(origin.x, origin.y, w, h);
  ctx.clip();

  if (losActive) {
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(origin.x, origin.y, w, h);
    ctx.globalCompositeOperation = "destination-out";
    for (const token of viewerTokens) {
      const center = tokenCenter(token);
      const range =
        token.visionRange != null && token.visionRange > 0
          ? token.visionRange
          : DEFAULT_VISION_SQUARES;
      const poly = visibilityPolygon(center, segments, range, 180);
      ctx.beginPath();
      if (poly.length === 0) continue;
      const first = gridPt(camera, grid, poly[0]!);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < poly.length; i++) {
        const p = gridPt(camera, grid, poly[i]!);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  if (lightingActive) {
    const darknessAlpha = 1 - Math.min(1, Math.max(0, map.daylight ?? 1));
    if (darknessAlpha > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${darknessAlpha})`;
      ctx.fillRect(origin.x, origin.y, w, h);
    }
    ctx.globalCompositeOperation = "destination-out";
    const paintLight = (
      gx: number,
      gy: number,
      brightFeet: number,
      dimFeet: number,
    ) => {
      const center = gridPt(camera, grid, { x: gx, y: gy });
      const dimRadius = Math.max(
        ((dimFeet + brightFeet) / map.scaleFeet) * grid.gridSizePx * camera.scale,
        1,
      );
      const brightRadius = Math.min(
        (brightFeet / map.scaleFeet) * grid.gridSizePx * camera.scale,
        dimRadius,
      );
      const gradient = ctx.createRadialGradient(
        center.x,
        center.y,
        0,
        center.x,
        center.y,
        dimRadius,
      );
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(
        Math.min(0.99, brightRadius / dimRadius),
        "rgba(255,255,255,0.85)",
      );
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center.x, center.y, dimRadius, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const light of map.lights) {
      if (!light.enabled) continue;
      paintLight(light.x, light.y, light.brightFeet, light.dimFeet);
    }
    for (const t of tokens) {
      if (!t.emitsLight) continue;
      paintLight(
        t.x + t.width / 2,
        t.y + t.height / 2,
        t.lightBright,
        t.lightDim,
      );
    }
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
}

function paintDrawings(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  map: CampaignMapView,
  grid: GridConfig,
  drawings: MapDrawingView[],
) {
  for (const d of drawings) {
    ctx.save();
    ctx.strokeStyle = d.color;
    ctx.fillStyle = d.color;
    ctx.lineWidth = 2;
    if (d.kind === "stroke" && d.stroke.length >= 2) {
      ctx.beginPath();
      const first = gridPt(camera, grid, d.stroke[0]!);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < d.stroke.length; i++) {
        const p = gridPt(camera, grid, d.stroke[i]!);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    } else if (d.geom) {
      const c = gridPt(camera, grid, { x: d.geom.x, y: d.geom.y });
      const sizePx =
        (d.geom.sizeFeet / map.scaleFeet) * grid.gridSizePx * camera.scale;
      ctx.translate(c.x, c.y);
      ctx.rotate((d.geom.rotation * Math.PI) / 180);
      ctx.globalAlpha = 0.35;
      if (d.kind === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, sizePx, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
      } else if (d.kind === "square") {
        ctx.fillRect(-sizePx, -sizePx, sizePx * 2, sizePx * 2);
        ctx.globalAlpha = 1;
        ctx.strokeRect(-sizePx, -sizePx, sizePx * 2, sizePx * 2);
      } else if (d.kind === "cone") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, sizePx, -Math.PI / 4, Math.PI / 4);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = d.color;
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(formatFeetLabel(d.geom.sizeFeet), 8, -8);
    }
    ctx.restore();
  }
}

function paintOccluders(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  grid: GridConfig,
  map: CampaignMapView,
  polylineDraft: MapPoint[],
) {
  for (const o of map.occluders) {
    if (o.points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = o.kind === "door" ? "#c9a227" : "#888";
    ctx.lineWidth = 2;
    if (o.state === "open") ctx.setLineDash([6, 4]);
    ctx.beginPath();
    const first = gridPt(camera, grid, o.points[0]!);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < o.points.length; i++) {
      const p = gridPt(camera, grid, o.points[i]!);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (polylineDraft.length >= 2) {
    ctx.save();
    ctx.strokeStyle = "#c9a227";
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const first = gridPt(camera, grid, polylineDraft[0]!);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < polylineDraft.length; i++) {
      const p = gridPt(camera, grid, polylineDraft[i]!);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function paintPings(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  grid: GridConfig,
  pings: OverlayPing[],
) {
  for (const ping of pings) {
    const p = gridPt(camera, grid, { x: ping.x, y: ping.y });
    ctx.save();
    ctx.strokeStyle = ping.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = ping.color;
    ctx.fill();
    ctx.restore();
  }
}

function paintMeasure(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  grid: GridConfig,
  points: MapPoint[],
  color: string,
) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const first = gridPt(camera, grid, points[0]!);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = gridPt(camera, grid, points[i]!);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function MapViewportOverlayInner(props: MapViewportOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    camera,
    map,
    grid,
    isDm,
    viewerTokens,
    tokens,
    gridVisible,
    pings,
    measurePoints,
    measureColor,
    draftStroke,
    draftShape,
    polygonDraft,
    polylineDraft,
    paintNonce,
  } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    const { width, height, dpr } = overlayCanvasSize(cssW, cssH);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (gridVisible) paintGrid(ctx, camera, map, grid);
    paintFog(ctx, camera, map, grid, isDm);
    paintVision(ctx, camera, map, grid, isDm, viewerTokens, tokens);
    paintDrawings(ctx, camera, map, grid, map.drawings);
    if (draftStroke && draftStroke.points.length >= 2) {
      paintDrawings(ctx, camera, map, grid, [
        {
          id: "draft",
          authorUserId: "",
          color: draftStroke.color,
          kind: "stroke",
          stroke: draftStroke.points,
          geom: null,
        },
      ]);
    }
    paintOccluders(ctx, camera, grid, map, polylineDraft);
    if (polygonDraft.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "#66aaff";
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = gridPt(camera, grid, polygonDraft[0]!);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < polygonDraft.length; i++) {
        const p = gridPt(camera, grid, polygonDraft[i]!);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
    paintMeasure(ctx, camera, grid, measurePoints, measureColor);
    paintPings(ctx, camera, grid, pings);
    void draftShape;
  }, [
    camera,
    map,
    grid,
    isDm,
    viewerTokens,
    tokens,
    gridVisible,
    pings,
    measurePoints,
    measureColor,
    draftStroke,
    draftShape,
    polygonDraft,
    polylineDraft,
    paintNonce,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // Trigger paint via layout change.
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.width;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="map-viewport-overlay-host">
      <canvas
        ref={canvasRef}
        className="map-viewport-overlay"
        aria-hidden
      />
    </div>
  );
}

export const MapViewportOverlay = memo(MapViewportOverlayInner);
