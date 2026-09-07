"use client";

import { memo } from "react";
import {
  coneSectorPath,
  formatFeetLabel,
} from "@/lib/map/distance";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import type {
  MapDrawingGeom,
  MapDrawingView,
  MapPoint,
} from "@/lib/map/types";

type MapDrawLayerProps = {
  drawings: MapDrawingView[];
  grid: GridConfig;
  scaleFeet: number;
  imageWidth: number;
  imageHeight: number;
  selectedDrawingId?: string | null;
  draftStroke?: { color: string; points: MapPoint[] } | null;
  draftShape?: {
    kind: "circle" | "square" | "cone";
    origin: MapPoint;
    current: MapPoint;
    color: string;
  } | null;
  canEditDrawing?: (d: MapDrawingView) => boolean;
  onSelectDrawing?: (id: string | null) => void;
  onShapePointerDown?: (
    e: React.PointerEvent,
    drawingId: string,
    mode: "move" | "resize" | "rotate",
    corner?: "nw" | "ne" | "sw" | "se",
  ) => void;
};

function strokeToPolyline(points: MapPoint[], grid: GridConfig): string {
  return points
    .map((p) => {
      const px = gridToPixels(p.x, p.y, grid);
      return `${px.x},${px.y}`;
    })
    .join(" ");
}

function sizePxFromGeom(geom: MapDrawingGeom, scaleFeet: number, grid: GridConfig) {
  return (geom.sizeFeet / scaleFeet) * grid.gridSizePx;
}

function FeetLabel({
  x,
  y,
  sizeFeet,
  color,
}: {
  x: number;
  y: number;
  sizeFeet: number;
  color: string;
}) {
  return (
    <text
      className="map-shape-label"
      x={x + 8}
      y={y - 8}
      fill={color}
    >
      {formatFeetLabel(sizeFeet)}
    </text>
  );
}

function ShapeBody({
  drawing,
  grid,
  scaleFeet,
  selected,
  interactive,
  onSelect,
  onPointerDown,
}: {
  drawing: MapDrawingView;
  grid: GridConfig;
  scaleFeet: number;
  selected: boolean;
  interactive: boolean;
  onSelect?: (id: string) => void;
  onPointerDown?: (
    e: React.PointerEvent,
    drawingId: string,
    mode: "move" | "resize" | "rotate",
    corner?: "nw" | "ne" | "sw" | "se",
  ) => void;
}) {
  const geom = drawing.geom;
  if (!geom) return null;
  const c = gridToPixels(geom.x, geom.y, grid);
  const r = sizePxFromGeom(geom, scaleFeet, grid);
  const fillOpacity = selected ? 0.35 : 0.25;
  const pe = interactive ? "auto" : "none";

  const commonProps = {
    fill: drawing.color,
    fillOpacity,
    stroke: drawing.color,
    strokeWidth: selected ? 2.5 : 2,
    style: { pointerEvents: pe as "auto" | "none", cursor: interactive ? "move" : undefined },
    onClick: (e: React.MouseEvent) => {
      if (!interactive) return;
      e.stopPropagation();
      onSelect?.(drawing.id);
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (!interactive) return;
      e.stopPropagation();
      onSelect?.(drawing.id);
      onPointerDown?.(e, drawing.id, "move");
    },
  };

  let body: React.ReactNode = null;
  if (drawing.kind === "circle") {
    body = <circle cx={c.x} cy={c.y} r={r} {...commonProps} />;
  } else if (drawing.kind === "square") {
    const half = r;
    body = (
      <rect
        x={c.x - half}
        y={c.y - half}
        width={half * 2}
        height={half * 2}
        transform={
          geom.rotation
            ? `rotate(${geom.rotation} ${c.x} ${c.y})`
            : undefined
        }
        {...commonProps}
      />
    );
  } else if (drawing.kind === "cone") {
    body = (
      <path d={coneSectorPath(c, r, geom.rotation)} {...commonProps} />
    );
  }

  const handles =
    selected && interactive ? (
      <g className="map-shape-handles">
        {(
          [
            ["nw", c.x - r, c.y - r],
            ["ne", c.x + r, c.y - r],
            ["sw", c.x - r, c.y + r],
            ["se", c.x + r, c.y + r],
          ] as const
        ).map(([corner, hx, hy]) => (
          <circle
            key={corner}
            className="map-shape-handle"
            cx={hx}
            cy={hy}
            r={7}
            fill="#fff"
            stroke={drawing.color}
            strokeWidth={2}
            style={{ pointerEvents: "auto", cursor: "nwse-resize" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown?.(e, drawing.id, "resize", corner);
            }}
          />
        ))}
        <line
          x1={c.x}
          y1={c.y - r}
          x2={c.x}
          y2={c.y - r - 28}
          stroke={drawing.color}
          strokeWidth={1.5}
          pointerEvents="none"
        />
        <circle
          className="map-shape-handle map-shape-handle--rotate"
          cx={c.x}
          cy={c.y - r - 28}
          r={7}
          fill="#fff"
          stroke={drawing.color}
          strokeWidth={2}
          style={{ pointerEvents: "auto", cursor: "grab" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown?.(e, drawing.id, "rotate");
          }}
        />
      </g>
    ) : null;

  return (
    <g>
      {body}
      <FeetLabel x={c.x} y={c.y - r} sizeFeet={geom.sizeFeet} color={drawing.color} />
      {handles}
    </g>
  );
}

function MapDrawLayerInner({
  drawings,
  grid,
  scaleFeet,
  imageWidth,
  imageHeight,
  selectedDrawingId = null,
  draftStroke,
  draftShape,
  canEditDrawing,
  onSelectDrawing,
  onShapePointerDown,
}: MapDrawLayerProps) {
  let draftPreview: React.ReactNode = null;
  if (draftShape) {
    const origin = gridToPixels(draftShape.origin.x, draftShape.origin.y, grid);
    const sizeGrid = Math.hypot(
      draftShape.current.x - draftShape.origin.x,
      draftShape.current.y - draftShape.origin.y,
    );
    const sizePx = sizeGrid * grid.gridSizePx || grid.gridSizePx * 3;
    const sizeFeet = sizeGrid * scaleFeet || scaleFeet * 3;
    const dx = draftShape.current.x - draftShape.origin.x;
    const dy = draftShape.current.y - draftShape.origin.y;
    const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (draftShape.kind === "circle") {
      draftPreview = (
        <g>
          <circle
            cx={origin.x}
            cy={origin.y}
            r={sizePx}
            fill="none"
            stroke={draftShape.color}
            strokeDasharray="4 4"
          />
          <FeetLabel
            x={origin.x}
            y={origin.y - sizePx}
            sizeFeet={sizeFeet}
            color={draftShape.color}
          />
        </g>
      );
    } else if (draftShape.kind === "square") {
      draftPreview = (
        <g>
          <rect
            x={origin.x - sizePx}
            y={origin.y - sizePx}
            width={sizePx * 2}
            height={sizePx * 2}
            fill="none"
            stroke={draftShape.color}
            strokeDasharray="4 4"
          />
          <FeetLabel
            x={origin.x}
            y={origin.y - sizePx}
            sizeFeet={sizeFeet}
            color={draftShape.color}
          />
        </g>
      );
    } else {
      draftPreview = (
        <g>
          <path
            d={coneSectorPath(origin, sizePx, rotation)}
            fill={draftShape.color}
            fillOpacity={0.15}
            stroke={draftShape.color}
            strokeDasharray="4 4"
          />
          <FeetLabel
            x={origin.x}
            y={origin.y - sizePx}
            sizeFeet={sizeFeet}
            color={draftShape.color}
          />
        </g>
      );
    }
  }

  return (
    <svg
      className="map-draw-layer"
      width={imageWidth}
      height={imageHeight}
      aria-hidden
    >
      {drawings.map((d) => {
        if (d.kind === "stroke" || !d.geom) {
          return (
            <polyline
              key={d.id}
              points={strokeToPolyline(d.stroke, grid)}
              fill="none"
              stroke={d.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={selectedDrawingId === d.id ? 1 : 0.95}
              style={{
                pointerEvents:
                  canEditDrawing?.(d) && d.kind === "stroke" ? "stroke" : "none",
                cursor: canEditDrawing?.(d) ? "pointer" : undefined,
              }}
              onClick={(e) => {
                if (!canEditDrawing?.(d)) return;
                e.stopPropagation();
                onSelectDrawing?.(d.id);
              }}
            />
          );
        }
        return (
          <ShapeBody
            key={d.id}
            drawing={d}
            grid={grid}
            scaleFeet={scaleFeet}
            selected={selectedDrawingId === d.id}
            interactive={Boolean(canEditDrawing?.(d))}
            onSelect={(id) => onSelectDrawing?.(id)}
            onPointerDown={onShapePointerDown}
          />
        );
      })}
      {draftStroke && draftStroke.points.length >= 2 ? (
        <polyline
          points={strokeToPolyline(draftStroke.points, grid)}
          fill="none"
          stroke={draftStroke.color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ) : null}
      {draftPreview}
    </svg>
  );
}

export const MapDrawLayer = memo(MapDrawLayerInner);
