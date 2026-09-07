"use client";

import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels, polylineFeet } from "@/lib/map/grid";
import type { MapDiagonalRule, MapPoint } from "@/lib/map/types";

type MapMeasureProps = {
  points: MapPoint[];
  diagonalRule: MapDiagonalRule;
  scaleFeet: number;
  color: string;
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
};

function toPixelPath(points: MapPoint[], grid: GridConfig): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const p0 = gridToPixels(first!.x, first!.y, grid);
  let d = `M ${p0.x} ${p0.y}`;
  for (const pt of rest) {
    const p = gridToPixels(pt.x, pt.y, grid);
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

export function MapMeasure({
  points,
  diagonalRule,
  scaleFeet,
  color,
  grid,
  imageWidth,
  imageHeight,
}: MapMeasureProps) {
  if (points.length < 2) return null;

  const path = toPixelPath(points, grid);
  const feet = polylineFeet(points, diagonalRule, scaleFeet);
  const last = points[points.length - 1]!;
  const labelPos = gridToPixels(last.x, last.y, grid);

  return (
    <svg
      className="map-measure-overlay"
      width={imageWidth}
      height={imageHeight}
      aria-hidden
    >
      <polyline
        points={points
          .map((p) => {
            const px = gridToPixels(p.x, p.y, grid);
            return `${px.x},${px.y}`;
          })
          .join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={path} fill="none" stroke="transparent" />
      <text
        className="map-measure-label"
        x={labelPos.x + 8}
        y={labelPos.y - 8}
        fill={color}
      >
        {Math.round(feet)} ft
      </text>
    </svg>
  );
}
