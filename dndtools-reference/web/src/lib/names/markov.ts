import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { capitalizeWords } from "./capitalize";

export const MARKOV_STOP = "\0";

export type MarkovModel = {
  order: 2 | 3;
  sources: string[];
  sourceSet: Set<string>;
  transitions: Map<string, string[]>;
  bigrams: Set<string>;
};

export function parseSourceNames(sourceText: string): string[] {
  return sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function trainMarkovModel(names: string[], order: 2 | 3): MarkovModel {
  const sources = names.map((name) => name.trim()).filter(Boolean);
  const sourceSet = new Set(sources.map((name) => name.toLowerCase()));
  const transitions = new Map<string, string[]>();
  const bigrams = new Set<string>();

  for (const raw of sources) {
    const name = raw.toLowerCase();
    for (let i = 0; i < name.length - 1; i++) {
      bigrams.add(name.slice(i, i + 2));
    }
    for (let i = 0; i <= name.length - order; i++) {
      const state = name.slice(i, i + order);
      const isEnd = i + order >= name.length;
      const next = isEnd ? MARKOV_STOP : name[i + order]!;
      const bucket = transitions.get(state) ?? [];
      bucket.push(next);
      transitions.set(state, bucket);
    }
  }

  return { order, sources, sourceSet, transitions, bigrams };
}

function pickStartState(model: MarkovModel, rng: SeededRng): string {
  const name = rng.pick(model.sources.map((entry) => entry.toLowerCase())) ?? "";
  if (name.length >= model.order) {
    return name.slice(0, model.order);
  }
  return name.padEnd(model.order, name.charAt(0) ?? "a");
}

export function generateMarkovName(model: MarkovModel, rng: SeededRng): string {
  let state = pickStartState(model, rng);
  let out = state;

  while (out.length < 24) {
    const options = model.transitions.get(state);
    if (!options || options.length === 0) break;
    const next = rng.pick(options)!;
    if (next === MARKOV_STOP) break;
    out += next;
    state = out.slice(-model.order);
  }

  return capitalizeWords(out);
}

export function markovOutputUsesTrainingPairs(
  model: MarkovModel,
  value: string,
): boolean {
  const lower = value.toLowerCase();
  if (lower.length < 2) return true;
  for (let i = 0; i < lower.length - 1; i++) {
    const pair = lower.slice(i, i + 2);
    if (!model.bigrams.has(pair)) {
      return false;
    }
  }
  return true;
}

export function generateMarkovBatch(
  model: MarkovModel,
  count: number,
  rng: SeededRng,
): { names: string[]; note?: string } {
  const names: string[] = [];
  const seen = new Set<string>();
  let allCollisions = false;

  for (let slot = 0; slot < count; slot++) {
    let chosen: string | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = generateMarkovName(model, rng);
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;

      const collidesWithSource = model.sourceSet.has(key);
      if (collidesWithSource) {
        const hasAlternative = attempt < 39;
        if (hasAlternative) continue;
      }

      chosen = candidate;
      break;
    }

    if (!chosen) {
      const fallback = generateMarkovName(model, rng);
      chosen = fallback;
      allCollisions = model.sourceSet.has(fallback.toLowerCase());
    }

    seen.add(chosen.toLowerCase());
    names.push(chosen);
  }

  const everyNameIsSource = names.every((name) =>
    model.sourceSet.has(name.toLowerCase()),
  );

  if (everyNameIsSource && model.sources.length > 0) {
    return {
      names,
      note: "The list is too small to vary.",
    };
  }

  if (allCollisions && count === 1) {
    return { names, note: "The list is too small to vary." };
  }

  return { names };
}
