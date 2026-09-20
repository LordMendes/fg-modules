"use client";

import { CombatLog } from "@/components/combat/combat-log";
import { useCombatContext } from "@/components/combat/combat-context";
import { EyeOff, ScrollText, Swords } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { useCampaignLiveOptional } from "@/components/tools/campaign-live-provider";
import { formatRollFormula, formatRollSummary } from "@/lib/dice/notation";
import { ROLL_KIND_LABELS } from "@/lib/dice/types";
import {
  bottomLeftTrayPos,
  LOG_TRAY_LEFT_OFFSET_PX,
  useFloatingTrayPos,
} from "@/components/dice/use-floating-tray-pos";

const LOG_POS_KEY = "pc-planner-dice-log-pos-bl";
const LOG_EXPANDED_KEY = "pc-planner-dice-log-expanded";
const LOG_TAB_KEY = "pc-planner-dice-log-tab";

type LogTab = "rolls" | "combat";

const EMPTY_COMBAT_EVENTS: never[] = [];

export function DiceLogTray() {
  const { lastResult, history, isCampaign } = useDice();
  const combatCtx = useCombatContext();
  const live = useCampaignLiveOptional();
  const combatEvents = useSyncExternalStore(
    (onStoreChange) => {
      if (!live?.store) return () => {};
      return live.store.subscribe(onStoreChange);
    },
    () => live?.store.getState().combatEvents ?? EMPTY_COMBAT_EVENTS,
    () => EMPTY_COMBAT_EVENTS,
  );
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<LogTab>("rolls");

  useEffect(() => {
    try {
      setExpanded(sessionStorage.getItem(LOG_EXPANDED_KEY) === "1");
      const storedTab = sessionStorage.getItem(LOG_TAB_KEY);
      if (storedTab === "rolls" || storedTab === "combat") {
        setTab(storedTab);
      }
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

  function selectTab(next: LogTab) {
    setTab(next);
    try {
      sessionStorage.setItem(LOG_TAB_KEY, next);
    } catch {
      // ignore
    }
  }

  function toggleLog() {
    setLogExpanded(!expanded);
  }

  const defaultPos = useCallback(
    (width: number, height: number) =>
      bottomLeftTrayPos(width, height, LOG_TRAY_LEFT_OFFSET_PX),
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
    layoutKey: expanded ? `${tab}-1` : "0",
  });

  const collapsedSummary =
    tab === "combat" && isCampaign
      ? combatEvents.length > 0
        ? combatEvents[combatEvents.length - 1]?.lines[0]?.text ?? "Combat"
        : "Combat"
      : lastResult
        ? `${lastResult.total}${lastResult.natural20 ? "!" : lastResult.natural1 ? "…" : ""}`
        : null;

  const showCombatTab = isCampaign;

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
              <span>Log</span>
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

          {showCombatTab ? (
            <div className="dice-log-tabs" role="tablist" aria-label="Log type">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "rolls"}
                className={`dice-log-tab${tab === "rolls" ? " dice-log-tab--active" : ""}`}
                onClick={() => selectTab("rolls")}
              >
                Rolls
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "combat"}
                className={`dice-log-tab${tab === "combat" ? " dice-log-tab--active" : ""}`}
                onClick={() => selectTab("combat")}
              >
                <Swords size={14} aria-hidden />
                Combat
              </button>
            </div>
          ) : null}

          {tab === "rolls" || !showCombatTab ? (
            <>
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
            </>
          ) : (
            <CombatLog
              events={combatEvents}
              isDm={combatCtx?.isDm ?? false}
              campaignId={combatCtx?.campaignId}
            />
          )}
        </div>
      )}
    </div>
  );
}
