import { parseCr } from "./parseCr";
import type { EncounterEntry } from "./types";

/** DMG Table 3-1: EL offset from CR based on creature count (same CR per group). */
const COUNT_OFFSETS: ReadonlyArray<[maxCount: number, offset: number]> = [
  [1, 0],
  [2, 2],
  [3, 3],
  [4, 4],
  [6, 5],
  [9, 6],
  [12, 7],
  [16, 8],
  [20, 9],
  [24, 10],
  [28, 11],
  [32, 12],
];

export function elOffsetForCount(count: number): number {
  if (count <= 0) return 0;
  for (const [maxCount, offset] of COUNT_OFFSETS) {
    if (count <= maxCount) return offset;
  }
  const last = COUNT_OFFSETS[COUNT_OFFSETS.length - 1];
  const extra = count - last[0];
  return last[1] + Math.ceil(extra / 4);
}

export function elForSameCrGroup(cr: number, count: number): number {
  return cr + elOffsetForCount(count);
}

export function combinePair(elHigh: number, elLow: number): number {
  if (elHigh === elLow) return elHigh + 2;
  const diff = elHigh - elLow;
  if (diff <= 2) return elHigh + 1;
  if (diff <= 4) return elHigh + 2;
  return elHigh + Math.ceil(diff / 2);
}

export function combineGroupEls(els: number[]): number | null {
  if (els.length === 0) return null;
  if (els.length === 1) return els[0];

  const sorted = [...els].sort((a, b) => b - a);
  let combined = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    combined = combinePair(combined, sorted[i]);
  }
  return combined;
}

export function calculateEncounterEl(entries: EncounterEntry[]): number | null {
  const groups = new Map<number, number>();

  for (const entry of entries) {
    if (entry.count <= 0) continue;
    const crNum = parseCr(entry.cr);
    if (crNum === null) continue;
    groups.set(crNum, (groups.get(crNum) ?? 0) + entry.count);
  }

  if (groups.size === 0) return null;

  const groupEls: number[] = [];
  for (const [cr, count] of groups) {
    groupEls.push(elForSameCrGroup(cr, count));
  }

  return combineGroupEls(groupEls);
}
