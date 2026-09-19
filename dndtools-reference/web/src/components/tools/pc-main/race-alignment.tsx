"use client";

import { useState } from "react";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { CategoryKey } from "@/lib/categories";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const RACE_SEARCH_CATEGORIES: CategoryKey[] = ["races"];

export function PcMainRaceAlignment({
  state,
  patch,
}: {
  state: PcPlanState;
  patch: PatchFn;
}) {
  const [racePickerOpen, setRacePickerOpen] = useState(false);
  const hasRace = Boolean(state.identity.raceSlug);
  const showRacePicker = !hasRace || racePickerOpen;

  return (
    <PcSheetCard title="Race and alignment" className="pc-main-race">
      <dl className="pc-main-meta">
        <div className="pc-main-meta-race">
          <dt>Race</dt>
          <dd>
            {showRacePicker ? (
              <div className="pc-sheet-race-picker">
                <EntitySearchCombobox
                  categories={RACE_SEARCH_CATEGORIES}
                  placeholder="Search races…"
                  label="Search races"
                  className="pc-meta-search"
                  onSelect={(hit) => {
                    patch((s) => {
                      s.identity.race = hit.name;
                      s.identity.raceSlug = hit.slug;
                    });
                    setRacePickerOpen(false);
                  }}
                />
                {hasRace ? (
                  <button
                    type="button"
                    className="pc-sheet-link-btn pc-sheet-link-btn--cancel"
                    onClick={() => setRacePickerOpen(false)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="pc-sheet-race-value">
                <span className="pc-main-race-name">{state.identity.race}</span>
                <button
                  type="button"
                  className="pc-sheet-link-btn"
                  onClick={() => setRacePickerOpen(true)}
                >
                  Change
                </button>
              </div>
            )}
          </dd>
        </div>
        <div className="pc-main-meta-align">
          <dt>Alignment</dt>
          <dd>
            <input
              type="text"
              className="pc-sheet-input"
              value={state.identity.alignment}
              onChange={(e) =>
                patch((s) => {
                  s.identity.alignment = e.target.value;
                })
              }
            />
          </dd>
        </div>
      </dl>
    </PcSheetCard>
  );
}
