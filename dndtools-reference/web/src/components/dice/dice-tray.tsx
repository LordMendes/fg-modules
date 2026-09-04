"use client";

import { Dices } from "lucide-react";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DieIcon } from "@/components/dice/die-icon";
import { useDice } from "@/components/dice/dice-provider";
import { poolDieCount } from "@/lib/dice/notation";
import { DICE_SKINS } from "@/lib/dice/skins";
import { DIE_SIDES, type DieSides } from "@/lib/dice/types";
import {
  clampTrayPos,
  DRAG_MOVE_THRESHOLD_PX,
  useFloatingTrayPos,
} from "@/components/dice/use-floating-tray-pos";

const TRAY_POS_KEY = "pc-planner-dice-tray-pos";

type ThrowDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  kind: "die" | "pool";
  sides?: DieSides;
};

type ThrowGhost = {
  x: number;
  y: number;
  kind: "die" | "pool";
  sides?: DieSides;
};

function dieLabel(sides: DieSides): string {
  return `d${sides}`;
}

function pointInRect(x: number, y: number, el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

export function DiceTray() {
  const {
    trayExpanded,
    toggleTray,
    pool,
    addDie,
    removeDie,
    clearPool,
    modifier,
    setModifier,
    rollPool,
    rollDie,
    clearDice,
    rolling,
    ready,
    skinId,
    themeColor,
    setSkinId,
    setThemeColor,
  } = useDice();

  const defaultPos = useCallback(
    (width: number, height: number) =>
      clampTrayPos(16, window.innerHeight - height - 16, width, height),
    [],
  );

  const {
    rootRef,
    pos,
    movedRef,
    beginMoveDrag,
    onMovePointerMove,
    onMovePointerUp,
    style,
  } = useFloatingTrayPos({
    storageKey: TRAY_POS_KEY,
    defaultPos,
    layoutKey: trayExpanded,
  });

  const [throwGhost, setThrowGhost] = useState<ThrowGhost | null>(null);
  const throwDragRef = useRef<ThrowDrag | null>(null);

  function beginThrowDrag(
    event: ReactPointerEvent,
    kind: "die" | "pool",
    sides?: DieSides,
  ) {
    if (event.button !== 0 || rolling || !ready) return;
    if (kind === "pool" && poolDieCount(pool) === 0) return;
    event.preventDefault();
    event.stopPropagation();
    throwDragRef.current = {
      pointerId: event.pointerId,
      kind,
      sides,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setThrowGhost({ kind, sides, x: event.clientX, y: event.clientY });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onThrowPointerMove(event: ReactPointerEvent) {
    const drag = throwDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_MOVE_THRESHOLD_PX) {
      drag.moved = true;
    }
    setThrowGhost({
      kind: drag.kind,
      sides: drag.sides,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function onThrowPointerUp(event: ReactPointerEvent) {
    const drag = throwDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    throwDragRef.current = null;
    setThrowGhost(null);
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    const overTray = pointInRect(event.clientX, event.clientY, rootRef.current);

    if (drag.kind === "pool") {
      if (drag.moved && overTray) return;
      rollPool();
      return;
    }

    if (drag.sides == null) return;

    if (drag.moved && !overTray) {
      rollDie(drag.sides);
      return;
    }

    if (!drag.moved) {
      addDie(drag.sides);
    }
  }

  return (
    <>
      <div
        ref={rootRef}
        className={`dice-tray${trayExpanded ? " dice-tray--expanded" : ""}${throwGhost ? " dice-tray--throwing" : ""}`}
        style={style}
      >
        {!trayExpanded ? (
          <button
            type="button"
            className="dice-tray-collapsed"
            aria-expanded={false}
            aria-controls="dice-tray-panel"
            title="Open dice tray (drag to move)"
            onPointerDown={(e) => {
              if (!pos) return;
              beginMoveDrag(e, pos);
            }}
            onPointerMove={onMovePointerMove}
            onPointerUp={(e) => {
              const wasMove = movedRef.current;
              onMovePointerUp(e);
              if (!wasMove) toggleTray();
            }}
            onPointerCancel={onMovePointerUp}
          >
            <Dices className="dice-tray-icon" aria-hidden="true" />
            <span className="dice-tray-collapsed-label">Dice</span>
          </button>
        ) : (
          <div
            id="dice-tray-panel"
            className="dice-tray-panel"
            role="region"
            aria-label="Dice tray"
          >
            <header
              className="dice-tray-header dice-tray-drag-handle"
              onPointerDown={(e) => {
                if (!pos) return;
                if ((e.target as HTMLElement).closest("button")) return;
                beginMoveDrag(e, pos);
              }}
              onPointerMove={onMovePointerMove}
              onPointerUp={onMovePointerUp}
              onPointerCancel={onMovePointerUp}
            >
              <div className="dice-tray-header-title">
                <Dices className="dice-tray-icon" aria-hidden="true" />
                <span>Dice tray</span>
                <span className="dice-tray-drag-hint" aria-hidden="true">
                  drag to move
                </span>
              </div>
              <button
                type="button"
                className="tool-btn tool-btn--ghost dice-tray-collapse-btn"
                onClick={toggleTray}
                aria-label="Collapse dice tray"
              >
                ▾
              </button>
            </header>

            <p className="dice-tray-hint">
              Drag a die onto the screen to throw it. Click to add it to the pool.
            </p>

            <div className="dice-tray-dice-row" role="group" aria-label="Dice">
              {DIE_SIDES.map((sides) => (
                <button
                  key={sides}
                  type="button"
                  className="dice-tray-die-btn"
                  disabled={rolling || !ready}
                  title={`Drag onto the screen to throw ${dieLabel(sides)}`}
                  aria-label={dieLabel(sides)}
                  onPointerDown={(e) => beginThrowDrag(e, "die", sides)}
                  onPointerMove={onThrowPointerMove}
                  onPointerUp={onThrowPointerUp}
                  onPointerCancel={onThrowPointerUp}
                >
                  <DieIcon sides={sides} color={themeColor} />
                </button>
              ))}
            </div>

            <div className="dice-tray-pool" aria-live="polite">
              {poolDieCount(pool) === 0 ? (
                <span className="dice-tray-pool-empty">Pool empty</span>
              ) : (
                pool.map((item) => (
                  <button
                    key={item.sides}
                    type="button"
                    className="dice-tray-chip"
                    onClick={() => removeDie(item.sides)}
                    disabled={rolling}
                    title={`Remove one ${dieLabel(item.sides)}`}
                  >
                    <DieIcon
                      sides={item.sides}
                      color={themeColor}
                      className="dice-die-icon--chip"
                    />
                    <span>×{item.qty}</span>
                  </button>
                ))
              )}
            </div>

            <div className="dice-tray-controls">
              <label className="dice-tray-mod">
                <span>Mod</span>
                <input
                  type="number"
                  className="pc-sheet-input dice-tray-mod-input"
                  value={modifier === 0 ? "" : modifier}
                  placeholder="0"
                  disabled={rolling}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setModifier(raw === "" ? 0 : Number(raw));
                  }}
                />
              </label>
              <button
                type="button"
                className="tool-btn dice-tray-roll-btn"
                disabled={!ready || rolling || poolDieCount(pool) === 0}
                title="Click or drag onto the screen to throw the pool"
                onPointerDown={(e) => beginThrowDrag(e, "pool")}
                onPointerMove={onThrowPointerMove}
                onPointerUp={onThrowPointerUp}
                onPointerCancel={onThrowPointerUp}
              >
                {rolling ? "Rolling…" : "Roll pool"}
              </button>
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                onClick={() => {
                  clearDice();
                  clearPool();
                }}
                disabled={rolling}
              >
                Clear
              </button>
            </div>

            <div className="dice-tray-skin-row">
              <label className="dice-tray-skin">
                <span>Skin</span>
                <select
                  className="pc-sheet-input dice-tray-skin-select"
                  value={skinId}
                  disabled={rolling}
                  onChange={(e) => setSkinId(e.target.value)}
                >
                  {DICE_SKINS.map((skin) => (
                    <option key={skin.id} value={skin.id}>
                      {skin.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dice-tray-color">
                <span>Color</span>
                <input
                  type="color"
                  className="dice-tray-color-input"
                  value={themeColor}
                  disabled={rolling}
                  onChange={(e) => setThemeColor(e.target.value)}
                  title="Dice color"
                />
              </label>
            </div>

            {!ready ? <p className="dice-tray-status">Loading dice…</p> : null}
          </div>
        )}
      </div>

      {throwGhost ? (
        <div
          className={`dice-tray-throw-ghost${throwGhost.kind === "pool" ? " dice-tray-throw-ghost--pool" : ""}`}
          style={{ left: throwGhost.x, top: throwGhost.y }}
          aria-hidden="true"
        >
          {throwGhost.kind === "pool"
            ? pool.flatMap((item) =>
                Array.from({ length: item.qty }, (_, i) => (
                  <DieIcon
                    key={`${item.sides}-${i}`}
                    sides={item.sides}
                    color={themeColor}
                    className="dice-die-icon--chip"
                  />
                )),
              )
            : throwGhost.sides != null
              ? <DieIcon sides={throwGhost.sides} color={themeColor} />
              : null}
        </div>
      ) : null}
    </>
  );
}
