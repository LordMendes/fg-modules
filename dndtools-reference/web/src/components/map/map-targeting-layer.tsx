"use client";

import type { GridConfig } from "@/lib/map/grid";
import { distanceFeet } from "@/lib/map/grid";
import { tokenCenterPx } from "@/lib/map/tokenGeometry";
import type { MapDiagonalRule, MapTokenView } from "@/lib/map/types";
import type { CombatantView } from "@/lib/combat/types";

type MapTargetingLayerProps = {
  tokens: MapTokenView[];
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
  scaleFeet: number;
  diagonalRule: MapDiagonalRule;
  actor: CombatantView | null;
  combatants: CombatantView[];
};

export function MapTargetingLayer({
  tokens,
  grid,
  imageWidth,
  imageHeight,
  scaleFeet,
  diagonalRule,
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
      const distFeet = distanceFeet(
        { x: actorToken.x, y: actorToken.y },
        { x: t.x, y: t.y },
        diagonalRule,
        scaleFeet,
      );
      const outOfReach = distFeet > actor.reachFeet;
      return { id: c.id, to, outOfReach };
    })
    .filter(
      (l): l is { id: string; to: { x: number; y: number }; outOfReach: boolean } =>
        Boolean(l),
    );

  if (lines.length === 0) return null;

  return (
    <svg
      className="map-targeting-layer"
      width={imageWidth}
      height={imageHeight}
      aria-hidden="true"
    >
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
        <marker
          id="map-target-arrowhead-far"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <polygon
            points="0 0, 8 4, 0 8"
            className="map-targeting-arrowhead map-targeting-arrowhead--far"
          />
        </marker>
      </defs>
      {lines.map((line) => (
        <line
          key={line.id}
          className={`map-targeting-arrow${line.outOfReach ? " map-targeting-arrow--far" : ""}`}
          x1={from.x}
          y1={from.y}
          x2={line.to.x}
          y2={line.to.y}
          markerEnd={
            line.outOfReach
              ? "url(#map-target-arrowhead-far)"
              : "url(#map-target-arrowhead)"
          }
        />
      ))}
    </svg>
  );
}
