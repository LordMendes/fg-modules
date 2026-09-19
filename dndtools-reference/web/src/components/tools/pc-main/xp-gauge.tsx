"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function formatXp(value: number): string {
  return value.toLocaleString();
}

export function PcMainXpGauge({
  state,
  patch,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const xp = state.identity.xp ?? 0;
  const xpNecessary = state.identity.xpNecessary ?? 0;
  const xpPercent =
    xpNecessary > 0 ? Math.min(100, Math.round((xp / xpNecessary) * 100)) : 0;
  const gaugeLabel =
    xpNecessary > 0
      ? `${formatXp(xp)} / ${formatXp(xpNecessary)}`
      : `${formatXp(xp)} / —`;

  useEffect(() => {
    if (!settingsOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (settingsRef.current?.contains(target)) return;
      if ((event.target as Element).closest?.(".pc-xp-settings-toggle")) return;
      setSettingsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [settingsOpen]);

  return (
    <div className="pc-main-xp-bar">
      <div className="pc-main-xp-row">
        <span className="pc-main-xp-label">XP</span>
        <div
          className="pc-xp-gauge"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={xpNecessary > 0 ? xpNecessary : undefined}
          aria-valuenow={xp}
          aria-label={`Experience points ${gaugeLabel}`}
        >
          <div className="pc-xp-gauge-track">
            <div
              className="pc-xp-gauge-fill"
              style={{ width: `${xpPercent}%` }}
            />
            <span className="pc-xp-gauge-label">{gaugeLabel}</span>
          </div>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="pc-xp-settings-toggle"
            aria-expanded={settingsOpen}
            aria-label={settingsOpen ? "Close XP settings" : "XP settings"}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings aria-hidden className="pc-xp-settings-toggle-icon" />
          </button>
        ) : (
          <span className="pc-main-xp-spacer" aria-hidden />
        )}
      </div>
      {settingsOpen && !readOnly ? (
        <div className="pc-xp-settings" ref={settingsRef}>
          <label className="pc-identity-field">
            <span className="npc-sheet-sub">XP</span>
            <input
              type="number"
              className="pc-sheet-input pc-sheet-input--narrow"
              min={0}
              value={xp}
              onChange={(e) =>
                patch((s) => {
                  s.identity.xp = clampNonNegative(Number(e.target.value));
                })
              }
            />
          </label>
          <label className="pc-identity-field">
            <span className="npc-sheet-sub">Necessary</span>
            <input
              type="number"
              className="pc-sheet-input pc-sheet-input--narrow"
              min={0}
              value={xpNecessary}
              placeholder="Next level"
              onChange={(e) =>
                patch((s) => {
                  s.identity.xpNecessary = clampNonNegative(Number(e.target.value));
                })
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
