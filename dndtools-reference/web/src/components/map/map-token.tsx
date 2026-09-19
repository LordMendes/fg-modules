"use client";



import type { CombatantView } from "@/lib/combat/types";

import type { GridConfig } from "@/lib/map/grid";

import { gridToPixels } from "@/lib/map/grid";

import type { MapTokenView } from "@/lib/map/types";

import { Skull } from "lucide-react";

import { MapTokenStatus } from "./map-token-status";



type MapTokenProps = {

  token: MapTokenView;

  grid: GridConfig;

  selected: boolean;

  canMove: boolean;

  isDm?: boolean;

  viewerPcPlanId?: string | null;

  combatant?: CombatantView | null;

  isActiveTurn?: boolean;

  fxClass?: string;

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

  viewerPcPlanId = null,

  combatant = null,

  isActiveTurn = false,

  fxClass = "",

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

  const isDead =

    combatant?.status === "dead" ||

    combatant?.deathState === "dead" ||

    combatant?.turnState === "dead";

  const isDying =

    !isDead &&

    (combatant?.status === "dying" || combatant?.deathState === "dying");



  return (

    <div

      className={`map-token${selected ? " map-token--selected" : ""}${

        isActiveTurn ? " map-token--active" : ""

      }${isDead ? " map-token--dead" : ""}${isDying ? " map-token--dying" : ""}${canMove ? " map-token--draggable" : ""}${token.layer === "gm" ? " map-token--gm" : ""}${

        token.visibility === "mask" ? " map-token--mask" : ""

      }${token.visibility === "hidden" ? " map-token--hidden" : ""}${

        dropHighlight ? " map-token--combat-drop" : ""

      }${fxClass ? ` ${fxClass}` : ""}`}

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

        if (!onContextMenu) return;

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

      {isDead ? (
        <span className="map-token-dead-overlay" title="Dead">
          <Skull size={Math.min(20, widthPx * 0.45)} strokeWidth={2} />
        </span>
      ) : null}

      <span className="map-token-nameplate">{token.name}</span>

      {combatant ? (

        <MapTokenStatus

          combatant={combatant}

          isDm={Boolean(isDm)}

          viewerPcPlanId={viewerPcPlanId}

          isActive={isActiveTurn}

          tokenWidthPx={widthPx}

        />

      ) : null}

    </div>

  );

}

