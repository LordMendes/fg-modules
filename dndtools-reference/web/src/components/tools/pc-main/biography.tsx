"use client";

import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const PHYSICAL_FIELDS = [
  ["age", "Age", "text"],
  ["gender", "Gender", "text"],
  ["height", "Height", "text"],
  ["weight", "Weight", "text"],
] as const;

export function PcMainBiography({
  state,
  patch,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
}) {
  return (
    <PcSheetCard title="Character biography" className="pc-main-biography">
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
    </PcSheetCard>
  );
}
