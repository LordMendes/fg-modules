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
  /** Live aim line while choosing a target. */
  previewFrom?: CombatantView | null;
  previewToTokenId?: string | null;
};

type ArrowLine = {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  outOfReach: boolean;
  preview: boolean;
};

function arrowParts(
  from: { x: number; y: number },
  to: { x: number; y: number },
  head = 14,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 12) return null;
  const ux = dx / len;
  const uy = dy / len;
  const tip = { x: to.x - ux * 4, y: to.y - uy * 4 };
  const base = { x: tip.x - ux * head, y: tip.y - uy * head };
  const px = -uy * head * 0.42;
  const py = ux * head * 0.42;
  return {
    x1: from.x,
    y1: from.y,
    x2: base.x,
    y2: base.y,
    head: `${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`,
  };
}

export function MapTargetingLayer({
  tokens,
  grid,
  imageWidth,
  imageHeight,
  scaleFeet,
  diagonalRule,
  actor,
  combatants,
  previewFrom,
  previewToTokenId,
}: MapTargetingLayerProps) {
  const lines: ArrowLine[] = [];

  if (actor?.tokenId && actor.targetIds.length > 0) {
    const actorToken = tokens.find((t) => t.id === actor.tokenId);
    if (actorToken) {
      const from = tokenCenterPx(actorToken, grid);
      for (const id of actor.targetIds) {
        const combatant = combatants.find((c) => c.id === id);
        const token = combatant?.tokenId
          ? tokens.find((t) => t.id === combatant.tokenId)
          : null;
        if (!token) continue;
        const to = tokenCenterPx(token, grid);
        const distFeet = distanceFeet(
          { x: actorToken.x, y: actorToken.y },
          { x: token.x, y: token.y },
          diagonalRule,
          scaleFeet,
        );
        lines.push({
          id: combatant!.id,
          from,
          to,
          outOfReach: distFeet > actor.reachFeet,
          preview: false,
        });
      }
    }
  }

  const aimFrom = previewFrom ?? actor;
  if (aimFrom?.tokenId && previewToTokenId && previewToTokenId !== aimFrom.tokenId) {
    const already = lines.some((line) => {
      const combatant = combatants.find((c) => c.id === line.id);
      return combatant?.tokenId === previewToTokenId;
    });
    if (!already) {
      const fromToken = tokens.find((t) => t.id === aimFrom.tokenId);
      const toToken = tokens.find((t) => t.id === previewToTokenId);
      if (fromToken && toToken) {
        lines.push({
          id: "preview",
          from: tokenCenterPx(fromToken, grid),
          to: tokenCenterPx(toToken, grid),
          outOfReach: false,
          preview: true,
        });
      }
    }
  }

  if (lines.length === 0) return null;

  return (
    <svg
      className="map-targeting-layer"
      width={imageWidth}
      height={imageHeight}
      aria-hidden="true"
    >
      {lines.map((line) => {
        const parts = arrowParts(line.from, line.to);
        if (!parts) return null;
        const className = [
          "map-targeting-arrow",
          line.preview ? "map-targeting-arrow--preview" : "",
          !line.preview && line.outOfReach ? "map-targeting-arrow--far" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const headClass = [
          "map-targeting-arrowhead",
          line.preview ? "map-targeting-arrowhead--preview" : "",
          !line.preview && line.outOfReach ? "map-targeting-arrowhead--far" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g key={line.id}>
            <line
              className={className}
              x1={parts.x1}
              y1={parts.y1}
              x2={parts.x2}
              y2={parts.y2}
            />
            <polygon className={headClass} points={parts.head} />
          </g>
        );
      })}
    </svg>
  );
}
