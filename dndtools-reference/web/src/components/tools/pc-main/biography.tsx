"use client";

import { PcPhysicalIdentityFields } from "@/components/tools/pc-identity-extra";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

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
      <PcPhysicalIdentityFields state={state} patch={patch} readOnly={readOnly} />
    </PcSheetCard>
  );
}
