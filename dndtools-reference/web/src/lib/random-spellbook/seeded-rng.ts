export type SeededRng = {
  next: () => number;
  pick: <T>(items: T[]) => T | undefined;
  pickInt: (min: number, max: number) => number;
  shuffle: <T>(items: T[]) => T[];
  sample: <T>(items: T[], count: number) => T[];
};

/** Deterministic PRNG (mulberry32). */
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function pick<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(next() * items.length)];
  }

  function pickInt(min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  function sample<T>(items: T[], count: number): T[] {
    if (count <= 0 || items.length === 0) return [];
    return shuffle(items).slice(0, Math.min(count, items.length));
  }

  return { next, pick, pickInt, shuffle, sample };
}
