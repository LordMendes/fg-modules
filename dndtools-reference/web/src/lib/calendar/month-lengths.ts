import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export function distributeMonthLengths(
  yearLength: number,
  monthCount: number,
  rng: SeededRng,
): number[] {
  const base = Math.floor(yearLength / monthCount);
  let remainder = yearLength % monthCount;
  const lengths = Array.from({ length: monthCount }, () => base);
  for (let i = 0; i < monthCount && remainder > 0; i += 1, remainder -= 1) {
    lengths[i]! += 1;
  }

  if (yearLength >= monthCount * 4) {
    const allSame = lengths.every((length) => length === lengths[0]);
    if (allSame && monthCount > 1) {
      const passes = rng.pickInt(1, 3);
      for (let pass = 0; pass < passes; pass += 1) {
        const from = rng.pickInt(0, monthCount - 2);
        const maxMove = Math.min(2, lengths[from]! - 2);
        if (maxMove <= 0) continue;
        const move = rng.pickInt(1, maxMove);
        lengths[from]! -= move;
        lengths[from + 1]! += move;
      }
    }
  }

  return lengths;
}

export function maxMonthsForYear(yearLength: number): number {
  return Math.max(2, Math.floor(yearLength / 2));
}
