"use client";

import type { CombatEventView } from "@/lib/combat/events/types";
import type { ItemizedModifier } from "@/lib/combat/events/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCombatContext } from "./combat-context";

function modifierTooltip(payload: unknown, isDm: boolean): string | undefined {
  if (!isDm || !payload || typeof payload !== "object") return undefined;
  const mods = (payload as { modifiers?: ItemizedModifier[] }).modifiers;
  if (!mods?.length) return undefined;
  return mods.map((m) => `${m.label}: ${m.value >= 0 ? "+" : ""}${m.value}`).join("\n");
}

function isRoundSeparator(event: CombatEventView): boolean {
  return event.kind === "roundStart" || event.kind === "turnStart";
}

export function CombatLog({
  events,
  isDm,
}: {
  events: CombatEventView[];
  isDm: boolean;
}) {
  const ctx = useCombatContext();
  const listRef = useRef<HTMLUListElement>(null);
  const [pinnedBottom, setPinnedBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setPinnedBottom(true);
    setShowJump(false);
  }, []);

  useEffect(() => {
    if (pinnedBottom) scrollToBottom();
  }, [events.length, pinnedBottom, scrollToBottom]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setPinnedBottom(atBottom);
    setShowJump(!atBottom);
  }

  function focusRows(event: CombatEventView) {
    const ids = [
      event.actorCombatantId,
      event.targetCombatantId,
    ].filter((id): id is string => Boolean(id));
    if (ids.length === 0) return;
    ctx?.setFocusedRowIds(ids);
    window.setTimeout(() => ctx?.setFocusedRowIds([]), 900);
  }

  if (events.length === 0) {
    return <p className="dice-tray-pool-empty">No combat events yet</p>;
  }

  return (
    <div className="combat-log-panel">
      {showJump ? (
        <button
          type="button"
          className="combat-log-jump"
          onClick={scrollToBottom}
        >
          Jump to latest
        </button>
      ) : null}
      <ul
        ref={listRef}
        className="dice-tray-history dice-log-tray-history combat-log-list"
        onScroll={onScroll}
      >
        {events.map((event) => {
          const tip = modifierTooltip(event.payload, isDm);
          const separator = isRoundSeparator(event);
          return (
            <li
              key={event.id}
              className={`combat-log-entry combat-log-entry--${event.kind}${separator ? " combat-log-entry--separator" : ""}`}
            >
              <button
                type="button"
                className="combat-log-entry-btn"
                title={tip}
                onClick={() => focusRows(event)}
              >
                <span className="combat-log-entry-meta">
                  R{event.round}
                  {event.actorName ? (
                    <span className="combat-log-who">{event.actorName}</span>
                  ) : null}
                </span>
                {event.lines.map((line, index) => (
                  <span
                    key={`${event.id}-${index}`}
                    className={`combat-log-line combat-log-line--${line.tone}`}
                  >
                    {line.text}
                  </span>
                ))}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
