"use client";

import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import type { MapTokenView } from "@/lib/map/types";
import type { CombatantView } from "@/lib/combat/types";

type MapTargetingLayerProps = {
  tokens: MapTokenView[];
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
  actor: CombatantView | null;
  combatants: CombatantView[];
};

function tokenCenterPx(token: MapTokenView, grid: GridConfig) {
  const tl = gridToPixels(token.x, token.y, grid);
  const w = token.width * grid.gridSizePx;
  const h = token.height * grid.gridSizePx;
  return { x: tl.x + w / 2, y: tl.y + h / 2 };
}

export function MapTargetingLayer({
  tokens,
  grid,
  imageWidth,
  imageHeight,
  actor,
  combatants,
}: MapTargetingLayerProps) {
  if (!actor?.tokenId || actor.targetIds.length === 0) return null;

  const actorToken = tokens.find((t) => t.id === actor.tokenId);
  if (!actorToken) return null;

  const from = tokenCenterPx(actorToken, grid);
  const lines = actor.targetIds
    .map((id) => combatants.find((c) => c.id === id))
    .filter((c): c is CombatantView => Boolean(c?.tokenId))
    .map((c) => {
      const t = tokens.find((tok) => tok.id === c.tokenId);
      if (!t) return null;
      const to = tokenCenterPx(t, grid);
      return { id: c.id, to };
    })
    .filter((l): l is { id: string; to: { x: number; y: number } } => Boolean(l));

  if (lines.length === 0) return null;

  return (
    <svg
      className="map-targeting-layer"
      width={imageWidth}
      height={imageHeight}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <line
          key={line.id}
          className="map-targeting-arrow"
          x1={from.x}
          y1={from.y}
          x2={line.to.x}
          y2={line.to.y}
          markerEnd="url(#map-target-arrowhead)"
        />
      ))}
      <defs>
        <marker
          id="map-target-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 8 4, 0 8" className="map-targeting-arrowhead" />
        </marker>
      </defs>
    </svg>
  );
}
