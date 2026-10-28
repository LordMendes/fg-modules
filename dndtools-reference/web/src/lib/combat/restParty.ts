import type { PcPlanState } from "@/lib/pc-planner/types";
import { characterLevelFromPlan } from "@/lib/pc-planner/gestalt";
import { normalizePcPlanState } from "@/lib/pc-planner/normalizePlanState";

export type RestKind = "night" | "full";

export function healAmountForRest(level: number, kind: RestKind): number {
  const lv = Math.max(1, Math.trunc(level));
  return kind === "full" ? lv * 2 : lv;
}

export function restPcPlanState(
  state: PcPlanState,
  kind: RestKind,
): PcPlanState {
  const normalized = normalizePcPlanState(state);
  const level = Math.max(1, characterLevelFromPlan(normalized));
  const healAmt = healAmountForRest(level, kind);
  const current = normalized.hitPoints.current ?? 0;

  const nextConditions = (normalized.conditions ?? []).filter((c) => {
    const preset = c.preset ?? "";
    return !preset.includes("day") && !preset.includes("rest");
  });

  const nextSpellClasses = normalized.spellClasses.map((sc) => ({
    ...sc,
    slotsUsed: Array.from({ length: 10 }, () => 0),
  }));

  return {
    ...normalized,
    hitPoints: {
      ...normalized.hitPoints,
      current: current + healAmt,
      temporary: 0,
    },
    conditions: nextConditions,
    spellClasses: nextSpellClasses,
  };
}
