"use client";

import { EyeOff, ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { formatRollFormula, formatRollSummary } from "@/lib/dice/notation";
import { ROLL_KIND_LABELS } from "@/lib/dice/types";
import {
  clampTrayPos,
  useFloatingTrayPos,
} from "@/components/dice/use-floating-tray-pos";

const LOG_POS_KEY = "pc-planner-dice-log-pos";
const LOG_EXPANDED_KEY = "pc-planner-dice-log-expanded";

export function DiceLogTray() {
  const { lastResult, history } = useDice();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      setExpanded(sessionStorage.getItem(LOG_EXPANDED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function setLogExpanded(open: boolean) {
    setExpanded(open);
    try {
      sessionStorage.setItem(LOG_EXPANDED_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function toggleLog() {
    setLogExpanded(!expanded);
  }

  const defaultPos = useCallback(
    (width: number, height: number) =>
      clampTrayPos(
        window.innerWidth - width - 16,
        window.innerHeight - height - 16,
        width,
        height,
      ),
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
    storageKey: LOG_POS_KEY,
    defaultPos,
    layoutKey: expanded,
  });

  const collapsedSummary = lastResult
    ? `${lastResult.total}${lastResult.natural20 ? "!" : lastResult.natural1 ? "…" : ""}`
    : null;

  return (
    <div
      ref={rootRef}
      className={`dice-log-tray${expanded ? " dice-log-tray--expanded" : ""}`}
      style={style}
    >
      {!expanded ? (
        <button
          type="button"
          className="dice-log-tray-collapsed"
          aria-expanded={false}
          aria-controls="dice-log-panel"
          title="Open dice log (drag to move)"
          onPointerDown={(e) => {
            if (!pos) return;
            beginMoveDrag(e, pos);
          }}
          onPointerMove={onMovePointerMove}
          onPointerUp={(e) => {
            const wasMove = movedRef.current;
            onMovePointerUp(e);
            if (!wasMove) toggleLog();
          }}
          onPointerCancel={onMovePointerUp}
        >
          <ScrollText className="dice-tray-icon" aria-hidden="true" />
          <span className="dice-tray-collapsed-label">Log</span>
          {collapsedSummary ? (
            <span className="dice-tray-collapsed-result" aria-live="polite">
              {collapsedSummary}
            </span>
          ) : null}
        </button>
      ) : (
        <div
          id="dice-log-panel"
          className="dice-log-tray-panel"
          role="region"
          aria-label="Dice log"
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
              <ScrollText className="dice-tray-icon" aria-hidden="true" />
              <span>Dice log</span>
              <span className="dice-tray-drag-hint" aria-hidden="true">
                drag to move
              </span>
            </div>
            <button
              type="button"
              className="tool-btn tool-btn--ghost dice-tray-collapse-btn"
              onClick={toggleLog}
              aria-label="Collapse dice log"
            >
              ▾
            </button>
          </header>

          {lastResult ? (
            <p className="dice-tray-last" aria-live="polite">
              {formatRollSummary(lastResult)}
            </p>
          ) : (
            <p className="dice-tray-pool-empty">No rolls yet</p>
          )}

          {history.length > 0 ? (
            <ul className="dice-tray-history dice-log-tray-history">
              {history.map((entry) => {
                const who =
                  entry.actor?.characterName?.trim() ||
                  entry.actor?.username ||
                  null;
                const kind = entry.kind ? ROLL_KIND_LABELS[entry.kind] : null;
                return (
                  <li key={`${entry.id}-${entry.at}`} className="dice-log-entry">
                    <span className="dice-log-entry-meta">
                      {who ? (
                        <span className="dice-log-who">{who}</span>
                      ) : null}
                      {kind ? (
                        <span className="dice-log-kind">{kind}</span>
                      ) : null}
                      {entry.hidden ? (
                        <EyeOff
                          className="dice-log-hidden-icon"
                          aria-label="Hidden roll"
                        />
                      ) : null}
                    </span>
                    <span className="dice-log-entry-summary">
                      {formatRollFormula(entry)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
