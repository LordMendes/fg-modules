"use client";

import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import { coneSectorPath } from "@/lib/map/distance";
import type { MapTokenView } from "@/lib/map/types";
import type { CombatSpellEntry } from "@/lib/combat/types";

type AreaSpellPlacement = {
  spell: CombatSpellEntry;
  casterTokenId: string;
  /** Grid-space center (for radius) or origin (for cone/line). */
  x: number;
  y: number;
  /** Rotation in degrees (for cone/line). */
  rotation: number;
  /** Highlighted token IDs inside the area. */
  highlightedTokenIds: string[];
};

type MapAreaSpellLayerProps = {
  placement: AreaSpellPlacement | null;
  tokens: MapTokenView[];
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
  scaleFeet: number;
};

export function MapAreaSpellLayer({
  placement,
  tokens,
  grid,
  imageWidth,
  imageHeight,
  scaleFeet,
}: MapAreaSpellLayerProps) {
  if (!placement) return null;

  const { spell, x, y, rotation, highlightedTokenIds } = placement;
  const shape = spell.areaShape;
  const radiusFeet = spell.rangeFeet ?? 20;

  const centerPx = gridToPixels({ x, y }, grid);
  const radiusPx = radiusFeet / scaleFeet;

  const highlightedTokens = tokens.filter((t) =>
    highlightedTokenIds.includes(t.id),
  );

  return (
    <svg
      className="map-area-spell-layer"
      width={imageWidth}
      height={imageHeight}
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <pattern
          id="area-spell-pattern"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="rgba(255, 100, 50, 0.15)" />
          <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="rgba(255, 100, 50, 0.3)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Area preview shape */}
      {shape === "circle" && (
        <circle
          cx={centerPx.x}
          cy={centerPx.y}
          r={radiusPx}
          fill="url(#area-spell-pattern)"
          stroke="rgb(255, 100, 50)"
          strokeWidth="3"
          strokeDasharray="8 4"
        />
      )}

      {shape === "square" && (
        <rect
          x={centerPx.x - radiusPx}
          y={centerPx.y - radiusPx}
          width={radiusPx * 2}
          height={radiusPx * 2}
          fill="url(#area-spell-pattern)"
          stroke="rgb(255, 100, 50)"
          strokeWidth="3"
          strokeDasharray="8 4"
          transform={`rotate(${rotation} ${centerPx.x} ${centerPx.y})`}
        />
      )}

      {shape === "cone" && (
        <path
          d={coneSectorPath(centerPx, radiusPx, rotation)}
          fill="url(#area-spell-pattern)"
          stroke="rgb(255, 100, 50)"
          strokeWidth="3"
          strokeDasharray="8 4"
        />
      )}

      {shape === "ray" && (
        <line
          x1={centerPx.x}
          y1={centerPx.y}
          x2={centerPx.x + Math.cos((rotation * Math.PI) / 180) * radiusPx}
          y2={centerPx.y + Math.sin((rotation * Math.PI) / 180) * radiusPx}
          stroke="rgb(255, 100, 50)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="12 6"
        />
      )}

      {/* Token highlights */}
      {highlightedTokens.map((token) => {
        const tokenCenterPx = gridToPixels({ x: token.x, y: token.y }, grid);
        const tokenSizePx = (token.width * grid.gridSize) / scaleFeet;
        return (
          <g key={token.id}>
            <circle
              cx={tokenCenterPx.x}
              cy={tokenCenterPx.y}
              r={tokenSizePx * 0.6}
              fill="none"
              stroke="rgb(255, 200, 50)"
              strokeWidth="4"
              opacity="0.9"
            />
            <circle
              cx={tokenCenterPx.x}
              cy={tokenCenterPx.y}
              r={tokenSizePx * 0.6}
              fill="rgba(255, 200, 50, 0.2)"
            />
          </g>
        );
      })}

      {/* Instructions */}
      <text
        x={imageWidth / 2}
        y="30"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="bold"
        stroke="black"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {spell.name} — Click to cast | Right-click or Esc to cancel
      </text>
    </svg>
  );
}
