import { parseCr } from "./parseCr";
import type { EncounterEntry, EncounterSummary } from "./types";
import { elFromTotalXp, xpForCR } from "./xpTable";

export function calculateEncounterSummary(
  entries: EncounterEntry[],
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

  return {
    el: elFromTotalXp(totalXpPerPc),
    totalXpPerPc,
    creatureCount,
    invalidCrCount,
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
