"use client";

import { memo } from "react";
import { polygonPath } from "@/lib/map/fog";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import type { MapFogRegionView, MapPoint } from "@/lib/map/types";

function gridPathToPixels(points: MapPoint[], grid: GridConfig): string {
  if (points.length === 0) return "";
  const converted = points.map((p) => gridToPixels(p.x, p.y, grid));
  return polygonPath(converted);
}

function playerMaskPath(
  imageWidth: number,
  imageHeight: number,
  fogRegions: MapFogRegionView[],
  grid: GridConfig,
): string {
  const parts: string[] = [
    `M 0 0 L ${imageWidth} 0 L ${imageWidth} ${imageHeight} L 0 ${imageHeight} Z`,
  ];
  for (const region of fogRegions) {
    if (region.kind === "reveal" && region.points.length >= 3) {
      parts.push(gridPathToPixels(region.points, grid));
    }
  }
  return parts.join(" ");
}

type MapFogLayerProps = {
  fogEnabled: boolean;
  fogRegions: MapFogRegionView[];
  imageWidth: number;
  imageHeight: number;
  isDm: boolean;
  grid: GridConfig;
};

function MapFogLayerInner({
  fogEnabled,
  fogRegions,
  imageWidth,
  imageHeight,
  isDm,
  grid,
}: MapFogLayerProps) {
  if (!fogEnabled) return null;

  const hideRegions = fogRegions.filter((r) => r.kind === "hide");
  const revealRegions = fogRegions.filter((r) => r.kind === "reveal");

  return (
    <svg
      className={`map-fog-layer${isDm ? " map-fog-layer--dm" : " map-fog-layer--player"}`}
      width={imageWidth}
      height={imageHeight}
      aria-hidden
    >
      {!isDm ? (
        <path
          className="map-fog-mask"
          d={playerMaskPath(imageWidth, imageHeight, fogRegions, grid)}
          fillRule="evenodd"
        />
      ) : null}
      {hideRegions.map((region: MapFogRegionView) => (
        <path
          key={region.id}
          className="map-fog-hide"
          d={gridPathToPixels(region.points, grid)}
        />
      ))}
      {isDm
        ? revealRegions.map((region) => (
            <path
              key={region.id}
              className="map-fog-reveal"
              d={gridPathToPixels(region.points, grid)}
            />
          ))
        : null}
    </svg>
  );
}

export const MapFogLayer = memo(MapFogLayerInner);
