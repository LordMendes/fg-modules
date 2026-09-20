"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PcLanguagePicker } from "@/components/tools/pc-language-picker";
import { PcSensePicker } from "@/components/tools/pc-sense-picker";
import { PcDefenseDialog } from "@/components/tools/pc-defense-dialog";
import { formatDerivedHint } from "@/lib/pc-planner/derivedField";
import {
  emptyDefenses,
  formatDefenseBadge,
  formatDefenseOriginTooltip,
} from "@/lib/pc-planner/pcDefenses";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { PcDefenseEntry, PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

export function PcSensesLanguagesBlock({
  state,
  patch,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
}) {
  const senses = state.identity.senses ?? { customized: false, lines: [] };
  const languages = state.identity.languages ?? { customized: false, lines: [] };

  return (
    <PcSheetCard title="Senses and languages" className="pc-identity-extra">
      <div className="pc-identity-extra-grid">
        <div className="pc-identity-field pc-sense-field">
          <span className="npc-sheet-sub">
            Senses{" "}
            <span className="pc-derived-hint">
              {formatDerivedHint(senses.customized, false)}
            </span>
          </span>
          <PcSensePicker
            senses={senses.lines}
            readOnly={readOnly}
            onChange={(lines) =>
              patch((s) => {
                if (!s.identity.senses) {
                  s.identity.senses = { customized: true, lines: [] };
                }
                s.identity.senses.customized = true;
                s.identity.senses.lines = lines;
              })
            }
          />
        </div>
        <div className="pc-identity-field pc-language-field">
          <span className="npc-sheet-sub">Languages</span>
          <PcLanguagePicker
            languages={languages.lines}
            readOnly={readOnly}
            onChange={(lines) =>
              patch((s) => {
                if (!s.identity.languages) {
                  s.identity.languages = { customized: true, lines: [] };
                }
                s.identity.languages.customized = true;
                s.identity.languages.lines = lines;
              })
            }
          />
        </div>
      </div>
    </PcSheetCard>
  );
}

export function PcDefensesBlock({
  state,
  patch,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const defenses = state.identity.defenses ?? emptyDefenses();
  const entries = defenses.entries ?? [];

  function setEntries(next: PcDefenseEntry[]) {
    patch((s) => {
      s.identity.defenses = { entries: next };
      s.identity.defensesCustomized = true;
    });
  }

  function addEntry(entry: PcDefenseEntry) {
    setEntries([...entries, entry]);
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  function confirmReset() {
    patch((s) => {
      s.identity.defensesCustomized = false;
    });
    setResetConfirmOpen(false);
  }

  useEffect(() => {
    if (!resetConfirmOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setResetConfirmOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetConfirmOpen]);

  return (
    <>
      <PcSheetCard
        title="Defenses"
        className="pc-combat-defenses-card"
        actions={
          !readOnly ? (
            <button
              type="button"
              className="pc-class-add-toggle"
              aria-label="Add defense"
              onClick={() => setDialogOpen(true)}
            >
              <Plus aria-hidden className="pc-class-add-toggle-icon" />
            </button>
          ) : null
        }
      >
        <div className="pc-defenses-body">
          {entries.length > 0 ? (
            <ul className="pc-language-list pc-defenses-list" aria-label="Defenses">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <span
                    className="pc-language-chip pc-defense-badge"
                    title={formatDefenseOriginTooltip(entry)}
                  >
                    {formatDefenseBadge(entry)}
                    {!readOnly ? (
                      <button
                        type="button"
                        className="pc-language-chip-remove"
                        aria-label={`Remove ${formatDefenseBadge(entry)}`}
                        onClick={() => removeEntry(entry.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pc-sheet-empty pc-defenses-empty">No defenses yet.</p>
          )}
          {!readOnly ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost tool-btn--compact pc-defenses-reset"
              onClick={() => setResetConfirmOpen(true)}
            >
              Reset
            </button>
          ) : null}
        </div>
      </PcSheetCard>
      <PcDefenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addEntry}
      />
      {resetConfirmOpen ? (
        <div className="confirm-dialog-overlay" role="presentation">
          <button
            type="button"
            className="confirm-dialog-backdrop"
            aria-label="Close dialog"
            onClick={() => setResetConfirmOpen(false)}
          />
          <div
            className="confirm-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pc-defenses-reset-title"
          >
            <h3 id="pc-defenses-reset-title">Reset defenses?</h3>
            <p>
              Custom defenses will be cleared and replaced with values imported from racial
              traits and class abilities.
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                onClick={() => setResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="tool-btn" onClick={confirmReset}>
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function PcPhysicalIdentityFields({
  state,
  patch,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
}) {
  return (
    <div className="pc-physical-grid">
      {(
        [
          ["age", "Age"],
          ["gender", "Gender"],
          ["height", "Height"],
          ["weight", "Weight"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="pc-identity-field">
          <span className="npc-sheet-sub">{label}</span>
          <input
            type="text"
            className="pc-sheet-input pc-sheet-input--narrow"
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
  );
}
