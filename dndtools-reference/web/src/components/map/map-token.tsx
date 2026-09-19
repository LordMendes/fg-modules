"use client";

import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import type { MapTokenView } from "@/lib/map/types";

type MapTokenProps = {
  token: MapTokenView;
  grid: GridConfig;
  selected: boolean;
  canMove: boolean;
  isDm?: boolean;
  /** Extra reach beyond token footprint, in grid squares. */
  reachSquares?: number;
  showReach?: boolean;
  onPointerDown?: (e: React.PointerEvent, token: MapTokenView) => void;
  onPointerMove?: (e: React.PointerEvent, token: MapTokenView) => void;
  onPointerUp?: (e: React.PointerEvent, token: MapTokenView) => void;
  onClick?: (e: React.MouseEvent, token: MapTokenView) => void;
  onDoubleClick?: (e: React.MouseEvent, token: MapTokenView) => void;
  onContextMenu?: (e: React.MouseEvent, token: MapTokenView) => void;
  onDragOver?: (e: React.DragEvent, token: MapTokenView) => void;
  onDrop?: (e: React.DragEvent, token: MapTokenView) => void;
  dropHighlight?: boolean;
};

export function MapToken({
  token,
  grid,
  selected,
  canMove,
  isDm,
  reachSquares = 0,
  showReach = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragOver,
  onDrop,
  dropHighlight = false,
}: MapTokenProps) {
  const topLeft = gridToPixels(token.x, token.y, grid);
  const widthPx = token.width * grid.gridSizePx;
  const heightPx = token.height * grid.gridSizePx;
  const reachPx =
    showReach && reachSquares > 0
      ? reachSquares * grid.gridSizePx
      : 0;

  return (
    <div
      className={`map-token${selected ? " map-token--selected" : ""}${
        canMove ? " map-token--draggable" : ""
      }${token.layer === "gm" ? " map-token--gm" : ""}${
        token.visibility === "mask" ? " map-token--mask" : ""
      }${token.visibility === "hidden" ? " map-token--hidden" : ""}${
        dropHighlight ? " map-token--combat-drop" : ""
      }`}
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: widthPx,
        height: heightPx,
        transform: token.rotation ? `rotate(${token.rotation}deg)` : undefined,
      }}
      onPointerDown={(e) => onPointerDown?.(e, token)}
      onPointerMove={(e) => onPointerMove?.(e, token)}
      onPointerUp={(e) => onPointerUp?.(e, token)}
      onClick={(e) => onClick?.(e, token)}
      onDoubleClick={(e) => onDoubleClick?.(e, token)}
      onContextMenu={(e) => {
        if (!isDm || !onContextMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, token);
      }}
      onDragOver={(e) => onDragOver?.(e, token)}
      onDrop={(e) => onDrop?.(e, token)}
      role="button"
      tabIndex={0}
      aria-label={token.name}
    >
      {reachPx > 0 ? (
        <span
          className="map-token-reach"
          style={{
            width: widthPx + reachPx * 2,
            height: heightPx + reachPx * 2,
            left: -reachPx,
            top: -reachPx,
          }}
          aria-hidden
        />
      ) : null}
      {token.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="map-token-image"
          src={token.imageUrl}
          alt=""
          draggable={false}
        />
      ) : (
        <div className="map-token-silhouette" aria-hidden />
      )}
      <span className="map-token-nameplate">{token.name}</span>
    </div>
  );
}
