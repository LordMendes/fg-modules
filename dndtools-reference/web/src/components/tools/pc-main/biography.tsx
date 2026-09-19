"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const PHYSICAL_FIELDS = [
  ["age", "Age", "text"],
  ["gender", "Gender", "text"],
  ["height", "Height", "text"],
  ["weight", "Weight", "text"],
] as const;

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function formatXp(value: number): string {
  return value.toLocaleString();
}

export function PcMainBiography({
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
    <PcSheetCard title="Character biography" className="pc-main-biography">
      <div className="pc-biography-grid">
        <div className="pc-biography-xp">
          <div className="pc-biography-xp-head">
            <span className="npc-sheet-sub">XP</span>
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
            ) : null}
          </div>
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

        <div className="pc-biography-physical">
          {PHYSICAL_FIELDS.map(([key, label, type]) => (
            <label key={key} className="pc-identity-field">
              <span className="npc-sheet-sub">{label}</span>
              <input
                type={type}
                className="pc-sheet-input"
                value={String(state.identity[key] ?? "")}
                readOnly={readOnly}
                onChange={(e) =>
                  patch((s) => {
                    s.identity[key] = e.target.value;
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </PcSheetCard>
  );
}
