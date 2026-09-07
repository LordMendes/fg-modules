"use client";

import { memo, useEffect, useRef } from "react";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import {
  DEFAULT_VISION_SQUARES,
  segmentsFromOccluders,
  tokenCenter,
  visibilityPolygon,
} from "@/lib/map/los";
import type {
  MapLightView,
  MapOccluderView,
  MapPoint,
  MapTokenView,
} from "@/lib/map/types";

type TokenLight = {
  x: number;
  y: number;
  width: number;
  height: number;
  emitsLight: boolean;
  lightBright: number;
  lightDim: number;
  visionRange: number | null;
};

type MapVisionLayerProps = {
  isDm: boolean;
  losEnabled: boolean;
  lightingEnabled: boolean;
  daylight: number;
  scaleFeet: number;
  occluders: MapOccluderView[];
  lights: MapLightView[];
  tokenLights: TokenLight[];
  viewerTokens: MapTokenView[];
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
};

function gridPolyToCanvas(
  ctx: CanvasRenderingContext2D,
  points: MapPoint[],
  grid: GridConfig,
) {
  if (points.length === 0) return;
  const first = gridToPixels(points[0]!.x, points[0]!.y, grid);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = gridToPixels(points[i]!.x, points[i]!.y, grid);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function paintLight(
  ctx: CanvasRenderingContext2D,
  center: MapPoint,
  brightFeet: number,
  dimFeet: number,
  scaleFeet: number,
  gridSizePx: number,
) {
  const dimRadius = Math.max(
    ((dimFeet + brightFeet) / scaleFeet) * gridSizePx,
    1,
  );
  const brightRadius = Math.min(
    (brightFeet / scaleFeet) * gridSizePx,
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
}

function MapVisionLayerInner({
  isDm,
  losEnabled,
  lightingEnabled,
  daylight,
  scaleFeet,
  occluders,
  lights,
  tokenLights,
  viewerTokens,
  grid,
  imageWidth,
  imageHeight,
}: MapVisionLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizedRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      sizedRef.current.w !== imageWidth ||
      sizedRef.current.h !== imageHeight
    ) {
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      sizedRef.current = { w: imageWidth, h: imageHeight };
    } else {
      ctx.clearRect(0, 0, imageWidth, imageHeight);
    }

    const losActive = losEnabled && !isDm;
    const lightingActive = lightingEnabled;

    if (!losActive && !lightingActive) return;

    const segments = segmentsFromOccluders(occluders);

    if (losActive) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(0, 0, imageWidth, imageHeight);

      ctx.globalCompositeOperation = "destination-out";
      for (const token of viewerTokens) {
        const origin = tokenCenter(token);
        const range =
          token.visionRange != null && token.visionRange > 0
            ? token.visionRange
            : DEFAULT_VISION_SQUARES;
        const poly = visibilityPolygon(origin, segments, range);
        ctx.beginPath();
        gridPolyToCanvas(ctx, poly, grid);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    if (lightingActive) {
      const darknessAlpha = 1 - Math.min(1, Math.max(0, daylight ?? 1));
      if (darknessAlpha > 0.01) {
        ctx.fillStyle = `rgba(0, 0, 0, ${darknessAlpha})`;
        ctx.fillRect(0, 0, imageWidth, imageHeight);
      }

      ctx.globalCompositeOperation = "destination-out";

      for (const light of lights) {
        if (!light.enabled) continue;
        paintLight(
          ctx,
          gridToPixels(light.x, light.y, grid),
          light.brightFeet,
          light.dimFeet,
          scaleFeet,
          grid.gridSizePx,
        );
      }

      for (const token of tokenLights) {
        if (!token.emitsLight) continue;
        paintLight(
          ctx,
          gridToPixels(
            token.x + token.width / 2,
            token.y + token.height / 2,
            grid,
          ),
          token.lightBright,
          token.lightDim,
          scaleFeet,
          grid.gridSizePx,
        );
      }

      ctx.globalCompositeOperation = "source-over";
    }
  }, [
    isDm,
    losEnabled,
    lightingEnabled,
    daylight,
    scaleFeet,
    occluders,
    lights,
    tokenLights,
    viewerTokens,
    grid,
    imageWidth,
    imageHeight,
  ]);

  if (!losEnabled && !lightingEnabled) return null;
  if (losEnabled && isDm && !lightingEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="map-vision-layer"
      width={imageWidth}
      height={imageHeight}
      aria-hidden
    />
  );
}

export const MapVisionLayer = memo(MapVisionLayerInner);
