"use client";

import { useEffect, useMemo, useState } from "react";
import { DraftNumberInput } from "@/components/draft-number-input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HARD_SCORE_MAX,
  HARD_SCORE_MIN,
  abilityModifier,
  clampBudget,
  clampScoreToBudget,
  clampScoreToRange,
  defaultPurchasedScore,
  formatModifier,
  normalizeRange,
  scoreCost,
  totalSpent,
  type ScoreRange,
} from "@/lib/point-buy";
import {
  buildPointBuySearchParams,
  parsePointBuySearchParams,
  type PointBuyUrlState,
} from "@/lib/point-buy/url-state";

const ABILITIES: { short: string; name: string }[] = [
  { short: "STR", name: "Strength" },
  { short: "DEX", name: "Dexterity" },
  { short: "CON", name: "Constitution" },
  { short: "INT", name: "Intelligence" },
  { short: "WIS", name: "Wisdom" },
  { short: "CHA", name: "Charisma" },
];

type AgingEffectKey = "adult" | "middle" | "old" | "venerable";

const AGING_EFFECTS: {
  key: AgingEffectKey;
  label: string;
  physical: number;
  mental: number;
  note: string;
}[] = [
  {
    key: "adult",
    label: "Adult / no adjustment",
    physical: 0,
    mental: 0,
    note: "No age adjustment.",
  },
  {
    key: "middle",
    label: "Middle age",
    physical: -1,
    mental: 1,
    note: "-1 physical, +1 mental.",
  },
  {
    key: "old",
    label: "Old",
    physical: -3,
    mental: 2,
    note: "Cumulative: -3 physical, +2 mental.",
  },
  {
    key: "venerable",
    label: "Venerable",
    physical: -6,
    mental: 3,
    note: "Cumulative: -6 physical, +3 mental.",
  },
];

function isPhysicalAbility(index: number) {
  return index <= 2;
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

function clampScoresToRange(scores: number[], range: ScoreRange): number[] {
  return scores.map((score) => clampScoreToRange(score, range));
}

export function PointBuyCalculator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [urlState, setUrlState] = useState<PointBuyUrlState>(() =>
    parsePointBuySearchParams(Object.fromEntries(searchParams.entries())),
  );
  const [agingEffectKey, setAgingEffectKey] =
    useState<AgingEffectKey>("adult");
  const [scores, setScores] = useState<number[]>(() => {
    const initial = parsePointBuySearchParams(
      Object.fromEntries(searchParams.entries()),
    );
    const range = { min: initial.min, max: initial.max };
    const start = defaultPurchasedScore(range);
    return Array.from({ length: 6 }, () => start);
  });

  const range = useMemo(
    () => normalizeRange({ min: urlState.min, max: urlState.max }),
    [urlState.min, urlState.max],
  );
  const budget = urlState.points;
  const agingEffect =
    AGING_EFFECTS.find((effect) => effect.key === agingEffectKey) ??
    AGING_EFFECTS[0]!;
  const spent = useMemo(() => totalSpent(scores), [scores]);
  const remaining = budget - spent;
  const overspent = remaining < 0;

  const tableRows = useMemo(() => {
    const entries: { score: number; cost: number }[] = [];
    const tableMax = Math.max(range.max, range.min);
    for (let s = HARD_SCORE_MIN; s <= tableMax; s++) {
      entries.push({ score: s, cost: scoreCost(s) });
    }
    return entries;
  }, [range.min, range.max]);

  useEffect(() => {
    const params = buildPointBuySearchParams(urlState);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;
    router.replace(`${pathname}?${nextQuery}`, { scroll: false });
  }, [urlState, pathname, router, searchParams]);

  function patchUrlState(partial: Partial<PointBuyUrlState>) {
    setUrlState((prev) => {
      const next = { ...prev, ...partial };
      const normalized = normalizeRange({ min: next.min, max: next.max });
      return {
        points: clampBudget(next.points),
        min: normalized.min,
        max: normalized.max,
      };
    });
  }

  useEffect(() => {
    setScores((prevScores) => {
      const next = clampScoresToRange(prevScores, range);
      if (next.every((value, index) => value === prevScores[index])) {
        return prevScores;
      }
      return next;
    });
  }, [range]);

  function handleScore(index: number, raw: number) {
    setScores((prev) => {
      const next = [...prev];
      next[index] = clampScoreToBudget(index, raw, prev, budget, range);
      return next;
    });
  }

  function resetScores() {
    const start = defaultPurchasedScore(range);
    setScores(Array.from({ length: 6 }, () => start));
  }

  return (
    <div className="tool-layout point-buy-calculator">
      <div className="point-buy-main">
        <section className="point-buy-preset" aria-label="Table preset">
          <div className="point-buy-preset-fields">
            <div className="tool-field">
              <Label htmlFor="pb-points">Points</Label>
              <DraftNumberInput
                id="pb-points"
                className="tool-input"
                min={0}
                max={999}
                step={1}
                value={budget}
                onValueChange={(points) => patchUrlState({ points })}
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="pb-min">Min</Label>
              <DraftNumberInput
                id="pb-min"
                className="tool-input"
                min={HARD_SCORE_MIN}
                max={HARD_SCORE_MAX}
                step={1}
                value={range.min}
                onValueChange={(min) => patchUrlState({ min })}
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="pb-max">Max</Label>
              <DraftNumberInput
                id="pb-max"
                className="tool-input"
                min={HARD_SCORE_MIN}
                max={HARD_SCORE_MAX}
                step={1}
                value={range.max}
                onValueChange={(max) => patchUrlState({ max })}
              />
            </div>
            <div className="tool-field point-buy-aging-field">
              <Label htmlFor="pb-aging">Age</Label>
              <select
                id="pb-aging"
                className="tool-input"
                value={agingEffectKey}
                onChange={(event) =>
                  setAgingEffectKey(event.target.value as AgingEffectKey)
                }
              >
                {AGING_EFFECTS.map((effect) => (
                  <option key={effect.key} value={effect.key}>
                    {effect.label}
                  </option>
                ))}
              </select>
            </div>
            <dl className="point-buy-summary-stats">
              <div>
                <dt>Spent</dt>
                <dd>{spent}</dd>
              </div>
              <div>
                <dt>Left</dt>
                <dd
                  className={
                    overspent ? "point-buy-summary-bad" : "point-buy-summary-ok"
                  }
                >
                  {remaining}
                </dd>
              </div>
              <div className="point-buy-summary-status">
                <dt>Status</dt>
                <dd
                  className={
                    overspent ? "point-buy-summary-bad" : "point-buy-summary-ok"
                  }
                >
                  {overspent
                    ? `Over by ${Math.abs(remaining)}`
                    : "OK"}
                </dd>
              </div>
            </dl>
          </div>
          {agingEffectKey !== "adult" && (
            <p className="point-buy-note">{agingEffect.note}</p>
          )}
        </section>

        <section className="point-buy-abilities" aria-label="Abilities">
          <div className="point-buy-abilities-header">
            <h2>Abilities</h2>
            <button
              type="button"
              className="tool-btn-secondary"
              onClick={resetScores}
            >
              Reset
            </button>
          </div>
          <ul
            className={
              agingEffectKey === "adult"
                ? "point-buy-ability-list"
                : "point-buy-ability-list point-buy-ability-list--aging"
            }
          >
            {ABILITIES.map((ab, i) => {
              const adjustment = isPhysicalAbility(i)
                ? agingEffect.physical
                : agingEffect.mental;
              const adjustedScore = Math.max(0, scores[i]! + adjustment);

              return (
                <li key={ab.short} className="point-buy-ability-row">
                  <div className="point-buy-ability-meta" title={ab.name}>
                    <span className="point-buy-ability-short">{ab.short}</span>
                  </div>
                  <label className="point-buy-slider-wrap">
                    <span className="sr-only">
                      {ab.short} score {range.min} to {range.max}
                    </span>
                    <input
                      type="range"
                      className="tool-range"
                      min={range.min}
                      max={range.max}
                      step={1}
                      value={scores[i]}
                      onChange={(event) =>
                        handleScore(
                          i,
                          Number.parseInt(event.target.value, 10),
                        )
                      }
                    />
                  </label>
                  <DraftNumberInput
                    className="tool-input tool-input-sm point-buy-score-input"
                    min={range.min}
                    max={range.max}
                    step={1}
                    value={scores[i]!}
                    aria-label={`${ab.short} score`}
                    onValueChange={(score) => handleScore(i, score)}
                  />
                  <span
                    className="point-buy-mod-display"
                    aria-label={`${ab.short} modifier`}
                  >
                    {formatModifier(abilityModifier(scores[i]!))}
                  </span>
                  {adjustment !== 0 && (
                    <span className="point-buy-aging-adjustment">
                      {formatModifier(adjustment)}→{adjustedScore} (
                      {formatModifier(abilityModifier(adjustedScore))})
                    </span>
                  )}
                  <span className="point-buy-row-cost">
                    {scoreCost(scores[i]!)} p
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="tool-summary point-buy-table-summary">
        <h2>Cost table</h2>
        <p className="point-buy-note">
          {HARD_SCORE_MIN}–{Math.max(range.max, range.min)} · 8 = 0
        </p>
        <div className="point-buy-table-wrap">
          <table className="point-buy-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr
                  key={row.score}
                  className={
                    row.cost < 0
                      ? "point-buy-table-row--refund"
                      : row.score < range.min || row.score > range.max
                        ? "point-buy-table-row--out"
                        : undefined
                  }
                >
                  <td>{row.score}</td>
                  <td>{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}
