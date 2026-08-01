import { calculateEncounterEl } from "./encounterNumbers";
import { calculateTargetEl, type PartyConfig } from "./partyConfig";
import { parseCr } from "./parseCr";
import type { EncounterEntry, EncounterSummary } from "./types";
import { xpForCR } from "./xpTable";

export function calculateEncounterSummary(
  entries: EncounterEntry[],
  partyConfig?: PartyConfig,
): EncounterSummary {
  let totalXpPerPc = 0;
  let creatureCount = 0;
  let invalidCrCount = 0;

  for (const entry of entries) {
    if (entry.count <= 0) continue;
    creatureCount += entry.count;
    const crNum = parseCr(entry.cr);
    if (crNum === null) {
      invalidCrCount += entry.count;
      continue;
    }
    totalXpPerPc += xpForCR(crNum) * entry.count;
  }

  const el = calculateEncounterEl(entries);
  const targetEl = partyConfig ? calculateTargetEl(partyConfig) : null;
  const elDelta =
    el !== null && targetEl !== null ? el - targetEl : null;

  return {
    el,
    totalXpPerPc,
    creatureCount,
    invalidCrCount,
    targetEl,
    elDelta,
  };
}

export function defaultEncounterName(summary: EncounterSummary): string {
  if (summary.el === null || summary.creatureCount === 0) {
    return "Untitled encounter";
  }
  return `Encounter — EL ${formatElLabel(summary.el)}`;
}

function formatElLabel(el: number): string {
  const fractions: Record<number, string> = {
    0.125: "1/8",
    0.167: "1/6",
    0.25: "1/4",
    0.333: "1/3",
    0.5: "1/2",
  };
  return fractions[el] ?? (Number.isInteger(el) ? String(el) : el.toFixed(1));
}
