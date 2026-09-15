"use client";

import { formatDerivedHint } from "@/lib/pc-planner/derivedField";
import { formatDefensesLine, formatSensesLine } from "@/lib/pc-planner/parseRaceFeatures";
import type { PcPlanState } from "@/lib/pc-planner/types";

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
  const senses = state.identity.senses ?? {
    darkvisionFeet: 0,
    lowLight: false,
    scent: false,
    extra: "",
  };
  const autoSenses = formatSensesLine(senses);
  const languages = state.identity.languages ?? { customized: false, lines: [] };
  const langText = languages.lines.join(", ");

  return (
    <div className="npc-sheet-block pc-identity-extra">
      <h3>Senses and languages</h3>
      <div className="pc-identity-extra-grid">
        <label className="pc-identity-field">
          <span className="npc-sheet-sub">
            Senses{" "}
            <span className="pc-derived-hint">
              {formatDerivedHint(Boolean(state.identity.sensesOverride), Boolean(state.identity.sensesOverride))}
            </span>
          </span>
          <input
            className="pc-sheet-input"
            value={state.identity.sensesOverride ?? autoSenses}
            placeholder={autoSenses || "Normal"}
            readOnly={readOnly}
            onChange={(e) =>
              patch((s) => {
                s.identity.sensesOverride = e.target.value;
              })
            }
          />
        </label>
        <div className="pc-senses-structured">
          <label>
            <span className="npc-sheet-sub">Darkvision (ft)</span>
            <input
              type="number"
              className="pc-sheet-input pc-sheet-input--narrow"
              value={senses.darkvisionFeet || ""}
              readOnly={readOnly}
              onChange={(e) =>
                patch((s) => {
                  if (!s.identity.senses) {
                    s.identity.senses = { darkvisionFeet: 0, lowLight: false, scent: false, extra: "" };
                  }
                  s.identity.senses!.darkvisionFeet = Number(e.target.value) || 0;
                })
              }
            />
          </label>
          <label className="pc-checkbox-label">
            <input
              type="checkbox"
              checked={senses.lowLight}
              disabled={readOnly}
              onChange={(e) =>
                patch((s) => {
                  if (!s.identity.senses) {
                    s.identity.senses = { darkvisionFeet: 0, lowLight: false, scent: false, extra: "" };
                  }
                  s.identity.senses!.lowLight = e.target.checked;
                })
              }
            />
            Low-light
          </label>
          <label className="pc-checkbox-label">
            <input
              type="checkbox"
              checked={senses.scent}
              disabled={readOnly}
              onChange={(e) =>
                patch((s) => {
                  if (!s.identity.senses) {
                    s.identity.senses = { darkvisionFeet: 0, lowLight: false, scent: false, extra: "" };
                  }
                  s.identity.senses!.scent = e.target.checked;
                })
              }
            />
            Scent
          </label>
        </div>
        <label className="pc-identity-field">
          <span className="npc-sheet-sub">
            Languages{" "}
            <span className="pc-derived-hint">
              {formatDerivedHint(languages.customized, languages.customized)}
            </span>
          </span>
          <input
            className="pc-sheet-input"
            value={langText}
            placeholder="Common"
            readOnly={readOnly}
            onChange={(e) =>
              patch((s) => {
                if (!s.identity.languages) {
                  s.identity.languages = { customized: true, lines: [] };
                }
                s.identity.languages.customized = true;
                s.identity.languages.lines = e.target.value
                  .split(/[,;]+/)
                  .map((x) => x.trim())
                  .filter(Boolean);
              })
            }
          />
          {!readOnly ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost tool-btn--compact"
              onClick={() =>
                patch((s) => {
                  s.identity.languages = { customized: false, lines: [] };
                })
              }
            >
              Reset languages to auto
            </button>
          ) : null}
        </label>
      </div>
    </div>
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
  const defenses = state.identity.defenses ?? {
    dr: "",
    resistances: "",
    immunities: "",
    vulnerabilities: "",
    extra: "",
  };

  return (
    <div className="npc-sheet-block pc-defenses-block">
      <div className="pc-skills-header">
        <h3>Defenses</h3>
        <span className="npc-sheet-sub pc-defenses-preview">
          {formatDefensesLine(defenses) || "None"}
        </span>
      </div>
      <div className="pc-defenses-grid">
        {(
          [
            ["dr", "Damage reduction"],
            ["resistances", "Resistances"],
            ["immunities", "Immunities"],
            ["vulnerabilities", "Vulnerabilities"],
            ["extra", "Extra"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="pc-identity-field">
            <span className="npc-sheet-sub">{label}</span>
            <input
              className="pc-sheet-input"
              value={defenses[key]}
              readOnly={readOnly}
              onChange={(e) =>
                patch((s) => {
                  if (!s.identity.defenses) {
                    s.identity.defenses = {
                      dr: "",
                      resistances: "",
                      immunities: "",
                      vulnerabilities: "",
                      extra: "",
                    };
                  }
                  s.identity.defenses[key] = e.target.value;
                  s.identity.defensesCustomized = true;
                })
              }
            />
          </label>
        ))}
      </div>
      {!readOnly ? (
        <button
          type="button"
          className="tool-btn tool-btn--ghost tool-btn--compact"
          onClick={() =>
            patch((s) => {
              s.identity.defensesCustomized = false;
            })
          }
        >
          Reset defenses to auto
        </button>
      ) : null}
    </div>
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
          ["xp", "XP", "number"],
          ["age", "Age", "text"],
          ["gender", "Gender", "text"],
          ["height", "Height", "text"],
          ["weight", "Weight", "text"],
        ] as const
      ).map(([key, label, type]) => (
        <label key={key} className="pc-identity-field">
          <span className="npc-sheet-sub">{label}</span>
          <input
            type={type}
            className="pc-sheet-input pc-sheet-input--narrow"
            value={String(state.identity[key] ?? (type === "number" ? 0 : ""))}
            readOnly={readOnly}
            onChange={(e) =>
              patch((s) => {
                if (type === "number") {
                  s.identity[key] = Number(e.target.value) || 0;
                } else {
                  s.identity[key] = e.target.value;
                }
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
