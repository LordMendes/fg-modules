/**
 * Point costs by score. 8–18 match the DMG/SRD table (8 costs 0).
 * Scores 3–7 are house refunds.
 */
export const SCORE_COSTS: Record<number, number> = {
  3: -8,
  4: -6,
  5: -4,
  6: -2,
  7: -1,
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16,
};

/** Absolute lowest score the cost formula and UI allow. */
export const HARD_SCORE_MIN = 3;

/** Absolute highest score the cost formula and UI allow. */
export const HARD_SCORE_MAX = 45;

/** Last score with a fixed official table cost. */
export const OFFICIAL_POINT_BUY_MAX = 18;

/** Score that costs 0 points (DMG baseline). */
export const BASELINE_SCORE = 8;

export const DEFAULT_POINTS = 28;
export const DEFAULT_SCORE_MIN = 8;
export const DEFAULT_SCORE_MAX = 22;
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 999;

export type ScoreRange = {
  min: number;
  max: number;
};

/**
 * Cost of raising one point above 18: step 1 = 18→19, step 2 = 19→20, …
 * Continues 16→17 (+3) and 17→18 (+3) with +4, +4, +5, +5, +6, +6…
 */
function incrementCostAbove18(step: number): number {
  if (step < 1) return 0;
  return 4 + Math.floor((step - 1) / 2);
}

/**
 * Point cost for a purchased score. Baseline 8 costs 0.
 * Scores below 8 use house refunds: 7 −1, 6 −2, 5 −4, 4 −6, 3 −8.
 */
export function scoreCost(score: number): number {
  const s = Math.round(score);
  if (s < HARD_SCORE_MIN) return SCORE_COSTS[HARD_SCORE_MIN]!;
  if (s <= OFFICIAL_POINT_BUY_MAX) return SCORE_COSTS[s] ?? 0;

  let total = SCORE_COSTS[OFFICIAL_POINT_BUY_MAX]!;
  const capped = Math.min(s, HARD_SCORE_MAX);
  for (let n = OFFICIAL_POINT_BUY_MAX + 1; n <= capped; n++) {
    total += incrementCostAbove18(n - OFFICIAL_POINT_BUY_MAX);
  }
  return total;
}

/** D&D 3.5 ability modifier: floor((score − 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(m: number): string {
  if (m >= 0) return `+${m}`;
  return String(m);
}

export function totalSpent(scores: number[]): number {
  return scores.reduce((sum, s) => sum + scoreCost(s), 0);
}

/** Clamp min/max into hard bounds and ensure min ≤ max. */
export function normalizeRange(range: ScoreRange): ScoreRange {
  let min = Math.round(range.min);
  let max = Math.round(range.max);
  if (Number.isNaN(min)) min = DEFAULT_SCORE_MIN;
  if (Number.isNaN(max)) max = DEFAULT_SCORE_MAX;
  min = Math.max(HARD_SCORE_MIN, Math.min(HARD_SCORE_MAX, min));
  max = Math.max(HARD_SCORE_MIN, Math.min(HARD_SCORE_MAX, max));
  if (max < min) max = min;
  return { min, max };
}

export function clampBudget(points: number): number {
  const v = Math.round(points);
  if (Number.isNaN(v)) return DEFAULT_POINTS;
  return Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, v));
}

/**
 * Highest score allowed for this ability without exceeding the budget,
 * given the other scores, within the live min/max range.
 */
export function clampScoreToBudget(
  index: number,
  desired: number,
  scores: number[],
  budgetMax: number,
  range: ScoreRange,
): number {
  const { min, max } = normalizeRange(range);
  const want = Math.max(min, Math.min(max, Math.round(desired)));
  const rest = scores.reduce(
    (sum, s, i) => (i === index ? sum : sum + scoreCost(s)),
    0,
  );
  let best = min;
  for (let v = min; v <= max; v++) {
    if (rest + scoreCost(v) <= budgetMax) best = v;
  }
  return Math.min(want, best);
}

/** Clamp a score into the live purchase range (no budget check). */
export function clampScoreToRange(score: number, range: ScoreRange): number {
  const { min, max } = normalizeRange(range);
  const s = Math.round(score);
  if (Number.isNaN(s)) return min;
  return Math.max(min, Math.min(max, s));
}

/** Default starting score for a fresh ability, clamped into the live range. */
export function defaultPurchasedScore(range: ScoreRange): number {
  return clampScoreToRange(BASELINE_SCORE, range);
}
