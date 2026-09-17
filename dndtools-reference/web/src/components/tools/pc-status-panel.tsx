"use client";

import {
  PcCombatModesPanel,
  PcConditionsPanel,
} from "@/components/tools/pc-actions-extras";
import type { PcPlanState } from "@/lib/pc-planner/types";

export type PcStatusPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
};

export function PcStatusPanel({ state, patch }: PcStatusPanelProps) {
  return (
    <div className="npc-sheet-panel pc-sheet-section pc-status-panel" role="tabpanel">
      <PcCombatModesPanel state={state} patch={patch} />
      <PcConditionsPanel state={state} patch={patch} />
    </div>
  );
}
