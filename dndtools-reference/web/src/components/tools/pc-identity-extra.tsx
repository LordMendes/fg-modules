"use client";

import { PcLanguagePicker } from "@/components/tools/pc-language-picker";
import { PcSensePicker } from "@/components/tools/pc-sense-picker";
import { formatDerivedHint } from "@/lib/pc-planner/derivedField";
import { formatDefensesLine } from "@/lib/pc-planner/parseRaceFeatures";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
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
