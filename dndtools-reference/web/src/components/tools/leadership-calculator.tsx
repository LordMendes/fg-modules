"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LeadershipSummary } from "@/components/tools/leadership-summary";
import {
  buildLeadershipSearchParams,
  calculateLeadership,
  convertAbilityInputValue,
  COHORT_MODIFIERS,
  FOLLOWER_MODIFIERS,
  parseLeadershipSearchParams,
  REPUTATION_MODIFIERS,
  type LeadershipInput,
  type LeadershipTableRow,
} from "@/lib/leadership";

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

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        className="tool-input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function followerCell(count: number): string {
  return count > 0 ? String(count) : "—";
}

function LeadershipTable({
  table,
  cohortScore,
  followerScore,
  tableKind,
}: {
  table: LeadershipTableRow[];
  cohortScore: number;
  followerScore: number;
  tableKind: "phb" | "epic";
}) {
  const isEpic = tableKind === "epic";
  const maxFollowerLevel = isEpic ? 10 : 6;

  function resolveLookupScore(score: number): number {
    if (score <= 1) {
      return 1;
    }
    if (isEpic && score >= 40) {
      return 40;
    }
    if (isEpic && score >= 25) {
      return score;
    }
    if (!isEpic && score >= 25) {
      return 25;
    }
    return score;
  }

  function rowMatchesScore(row: LeadershipTableRow, score: number): boolean {
    const lookupScore = resolveLookupScore(score);
    return row.score === lookupScore;
  }

  return (
    <div className="leadership-table-wrap">
      <table className="leadership-table">
        <thead>
          <tr>
            <th rowSpan={2}>Leadership Score</th>
            <th rowSpan={2}>Cohort Level</th>
            <th colSpan={maxFollowerLevel}>Number of Followers by Level</th>
          </tr>
          <tr>
            {Array.from({ length: maxFollowerLevel }, (_, index) => {
              const labels = [
                "1st",
                "2nd",
                "3rd",
                "4th",
                "5th",
                "6th",
                "7th",
                "8th",
                "9th",
                "10th",
              ];
              return <th key={index + 1}>{labels[index]}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {table.map((row) => {
            const cohortMatch = rowMatchesScore(row, cohortScore);
            const followerMatch = rowMatchesScore(row, followerScore);
            const rowClass = [
              cohortMatch ? "leadership-row-cohort" : "",
              followerMatch ? "leadership-row-follower" : "",
            ]
              .filter(Boolean)
              .join(" ");

            const followerValues = [
              row.followers.level1,
              row.followers.level2,
              row.followers.level3,
              row.followers.level4,
              row.followers.level5,
              row.followers.level6,
              row.followers.level7 ?? 0,
              row.followers.level8 ?? 0,
              row.followers.level9 ?? 0,
              row.followers.level10 ?? 0,
            ].slice(0, maxFollowerLevel);

            return (
              <tr key={row.scoreLabel} className={rowClass || undefined}>
                <td>{row.scoreLabel}</td>
                <td>{row.cohortLabel}</td>
                {followerValues.map((count, index) => (
                  <td key={`${row.scoreLabel}-${index}`}>{followerCell(count)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="tool-step-desc leadership-table-legend">
        <span className="leadership-legend-cohort">Cohort row</span>
        <span className="leadership-legend-follower">Follower row</span>
        {cohortScore !== followerScore && (
          <span>Scores differ — cohort and follower rows may not match.</span>
        )}
      </p>
    </div>
  );
}

export function LeadershipCalculator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [input, setInput] = useState<LeadershipInput>(() =>
    parseLeadershipSearchParams(Object.fromEntries(searchParams.entries())),
  );
  const result = useMemo(() => calculateLeadership(input), [input]);

  useEffect(() => {
    const params = buildLeadershipSearchParams(input);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [input, pathname, router, searchParams]);

  function updateInput(patch: Partial<LeadershipInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function toggleReputation(key: keyof LeadershipInput["reputation"]) {
    setInput((prev) => ({
      ...prev,
      reputation: {
        ...prev.reputation,
        [key]: !prev.reputation[key],
      },
    }));
  }

  function toggleCohortModifier(
    key: keyof Omit<LeadershipInput["cohortModifiers"], "cohortDeaths">,
  ) {
    setInput((prev) => ({
      ...prev,
      cohortModifiers: {
        ...prev.cohortModifiers,
        [key]: !prev.cohortModifiers[key],
      },
    }));
  }

  function toggleFollowerModifier(
    key: keyof Omit<LeadershipInput["followerModifiers"], "followerDeaths">,
  ) {
    setInput((prev) => ({
      ...prev,
      followerModifiers: {
        ...prev.followerModifiers,
        [key]: !prev.followerModifiers[key],
      },
    }));
  }

  function toggleFeat(key: keyof LeadershipInput["feats"]) {
    setInput((prev) => ({
      ...prev,
      feats: {
        ...prev.feats,
        [key]: !prev.feats[key],
      },
    }));
  }

  return (
    <div className="tool-layout leadership-calculator">
      <div className="tool-steps">
        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">1</span> Character
          </h2>
          <div className="tool-field-row">
            <NumberField
              id="character-level"
              label="Character level"
              value={input.characterLevel}
              min={1}
              max={40}
              onChange={(value) =>
                updateInput({ characterLevel: Math.max(1, value) })
              }
            />
            <div className="tool-field">
              <Label htmlFor="charisma-mode">Charisma input</Label>
              <select
                id="charisma-mode"
                className="tool-select"
                value={input.charismaMode}
                onChange={(e) => {
                  const charismaMode = e.target
                    .value as LeadershipInput["charismaMode"];
                  setInput((prev) => ({
                    ...prev,
                    charismaMode,
                    charismaValue: convertAbilityInputValue(
                      prev.charismaValue,
                      prev.charismaMode,
                      charismaMode,
                    ),
                  }));
                }}
              >
                <option value="modifier">Modifier</option>
                <option value="score">Score</option>
              </select>
            </div>
            <NumberField
              id="charisma-value"
              label={
                input.charismaMode === "modifier"
                  ? "Charisma modifier"
                  : "Charisma score"
              }
              value={input.charismaValue}
              min={input.charismaMode === "modifier" ? -5 : 1}
              max={input.charismaMode === "modifier" ? 20 : 50}
              onChange={(value) => updateInput({ charismaValue: value })}
            />
          </div>
          {input.characterLevel < 6 && (
            <p className="tool-warning" role="status">
              Leadership requires character level 6 or higher.
            </p>
          )}
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">2</span> Reputation
          </h2>
          <p className="tool-step-desc">
            Reputation modifiers apply to both cohort and follower scores. Your
            DM adjudicates which apply.
          </p>
          <fieldset className="tool-checkbox-group">
            <legend className="sr-only">Reputation modifiers</legend>
            <div className="tool-checkbox-grid">
              {REPUTATION_MODIFIERS.map((modifier) => (
                <label key={modifier.key} className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(input.reputation[modifier.key])}
                    onChange={() =>
                      toggleReputation(
                        modifier.key as keyof LeadershipInput["reputation"],
                      )
                    }
                  />
                  <span>
                    {modifier.label} ({formatModifier(modifier.value)})
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">3</span> Circumstance Modifiers
          </h2>
          <div className="leadership-modifier-groups">
            <fieldset className="tool-checkbox-group">
              <legend>Cohort modifiers</legend>
              <div className="tool-checkbox-grid">
                {COHORT_MODIFIERS.filter(
                  (modifier) => modifier.key !== "cohortDeaths",
                ).map((modifier) => (
                  <label key={modifier.key} className="tool-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        input.cohortModifiers[
                          modifier.key as keyof Omit<
                            LeadershipInput["cohortModifiers"],
                            "cohortDeaths"
                          >
                        ],
                      )}
                      onChange={() =>
                        toggleCohortModifier(
                          modifier.key as keyof Omit<
                            LeadershipInput["cohortModifiers"],
                            "cohortDeaths"
                          >,
                        )
                      }
                    />
                    <span>
                      {modifier.label} ({formatModifier(modifier.value)})
                    </span>
                  </label>
                ))}
              </div>
              <NumberField
                id="cohort-deaths"
                label="Cohorts killed (× −2 each)"
                value={input.cohortModifiers.cohortDeaths}
                min={0}
                max={20}
                onChange={(value) =>
                  updateInput({
                    cohortModifiers: {
                      ...input.cohortModifiers,
                      cohortDeaths: Math.max(0, value),
                    },
                  })
                }
              />
            </fieldset>

            <fieldset className="tool-checkbox-group">
              <legend>Follower modifiers</legend>
              <div className="tool-checkbox-grid">
                {FOLLOWER_MODIFIERS.filter(
                  (modifier) => modifier.key !== "followerDeaths",
                ).map((modifier) => (
                  <label key={modifier.key} className="tool-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        input.followerModifiers[
                          modifier.key as keyof Omit<
                            LeadershipInput["followerModifiers"],
                            "followerDeaths"
                          >
                        ],
                      )}
                      onChange={() =>
                        toggleFollowerModifier(
                          modifier.key as keyof Omit<
                            LeadershipInput["followerModifiers"],
                            "followerDeaths"
                          >,
                        )
                      }
                    />
                    <span>
                      {modifier.label} ({formatModifier(modifier.value)})
                    </span>
                  </label>
                ))}
              </div>
              <NumberField
                id="follower-deaths"
                label="Follower deaths (× −1)"
                value={input.followerModifiers.followerDeaths}
                min={0}
                max={20}
                onChange={(value) =>
                  updateInput({
                    followerModifiers: {
                      ...input.followerModifiers,
                      followerDeaths: Math.max(0, value),
                    },
                  })
                }
              />
            </fieldset>
          </div>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">4</span> Feats
          </h2>
          <fieldset className="tool-checkbox-group">
            <legend className="sr-only">Leadership feats</legend>
            <div className="tool-checkbox-grid">
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.improvedCohort}
                  onChange={() => toggleFeat("improvedCohort")}
                />
                <span>
                  Improved Cohort (max cohort level = your level − 1)
                </span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.dragonCohort}
                  onChange={() => toggleFeat("dragonCohort")}
                />
                <span>Dragon Cohort (Draconomicon dragon ally)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.epicLeadership}
                  onChange={() => toggleFeat("epicLeadership")}
                />
                <span>Epic Leadership (use epic table at score 25+)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.naturalLeader}
                  onChange={() => toggleFeat("naturalLeader")}
                />
                <span>Natural Leader (+2 Leadership score, Dragon #346)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.extraFollowers}
                  onChange={() => toggleFeat("extraFollowers")}
                />
                <span>Extra Followers (double follower counts by level)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.improvedLeadership}
                  onChange={() => toggleFeat("improvedLeadership")}
                />
                <span>Improved Leadership (+2 Leadership score, Dragon #317)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.mightMakesRight}
                  onChange={() => toggleFeat("mightMakesRight")}
                />
                <span>Might Makes Right (+Str mod to follower score only)</span>
              </label>
              <label className="tool-checkbox">
                <input
                  type="checkbox"
                  checked={input.feats.legendaryCommander}
                  onChange={() => toggleFeat("legendaryCommander")}
                />
                <span>Legendary Commander (×10 follower counts)</span>
              </label>
            </div>
          </fieldset>
          {input.feats.extraFollowers && (
            <p className="tool-step-desc leadership-callout">
              Extra Followers doubles the number of followers at each level from
              the table. It does not affect cohort level. See{" "}
              <Link href="/feats/extra-followers-1020">Extra Followers</Link>.
            </p>
          )}
          {input.feats.mightMakesRight && (
            <>
              <div className="tool-field-row">
                <div className="tool-field">
                  <Label htmlFor="strength-mode">Strength input</Label>
                  <select
                    id="strength-mode"
                    className="tool-select"
                    value={input.strengthMode}
                    onChange={(e) => {
                      const strengthMode = e.target
                        .value as LeadershipInput["strengthMode"];
                      setInput((prev) => ({
                        ...prev,
                        strengthMode,
                        strengthValue: convertAbilityInputValue(
                          prev.strengthValue,
                          prev.strengthMode,
                          strengthMode,
                        ),
                      }));
                    }}
                  >
                    <option value="modifier">Modifier</option>
                    <option value="score">Score</option>
                  </select>
                </div>
                <NumberField
                  id="strength-value"
                  label={
                    input.strengthMode === "modifier"
                      ? "Strength modifier"
                      : "Strength score"
                  }
                  value={input.strengthValue}
                  min={input.strengthMode === "modifier" ? -5 : 1}
                  max={input.strengthMode === "modifier" ? 20 : 50}
                  onChange={(value) => updateInput({ strengthValue: value })}
                />
              </div>
              <p className="tool-step-desc leadership-callout">
                Might Makes Right adds your Strength modifier to your Leadership
                score when determining followers only. See{" "}
                <Link href="/feats/might-makes-right-1942">Might Makes Right</Link>
                .
              </p>
            </>
          )}
          {input.feats.legendaryCommander && (
            <p className="tool-step-desc leadership-callout">
              Legendary Commander multiplies follower counts by 10 and stacks
              with Extra Followers (×20 total). Requires Epic Leadership. See{" "}
              <Link href="/feats/legendary-commander-1750">
                Legendary Commander
              </Link>
              .
            </p>
          )}
          {input.feats.dragonCohort && (
            <p className="tool-step-desc leadership-callout">
              Dragon cohorts use Draconomicon Table 3-14. Treat the dragon&apos;s
              ECL as 3 lower than listed. See{" "}
              <Link href="/feats/dragon-cohort-3250">Dragon Cohort</Link>.
            </p>
          )}
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">5</span> Leadership Table
          </h2>
          <p className="tool-step-desc">
            {result.tableKind === "epic"
              ? "Epic Level Handbook Table 1-33 (scores 25+)."
              : "Player's Handbook / DMG Table 2-25."}
          </p>
          <LeadershipTable
            table={result.displayTable}
            cohortScore={result.cohortScore}
            followerScore={result.followerScore}
            tableKind={result.tableKind}
          />
        </section>
      </div>

      <LeadershipSummary result={result} />
    </div>
  );
}
