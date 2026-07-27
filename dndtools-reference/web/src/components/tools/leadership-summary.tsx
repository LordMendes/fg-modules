"use client";

import type { FollowerCounts, LeadershipResult } from "@/lib/leadership";
import { formatOrdinalLevel } from "@/lib/leadership";

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function totalFollowers(followers: FollowerCounts): number {
  return Object.values(followers).reduce((sum, count) => sum + count, 0);
}

function FollowerBreakdown({ followers }: { followers: FollowerCounts }) {
  const entries = [
    { label: "1st", count: followers.level1 },
    { label: "2nd", count: followers.level2 },
    { label: "3rd", count: followers.level3 },
    { label: "4th", count: followers.level4 },
    { label: "5th", count: followers.level5 },
    { label: "6th", count: followers.level6 },
    { label: "7th", count: followers.level7 ?? 0 },
    { label: "8th", count: followers.level8 ?? 0 },
    { label: "9th", count: followers.level9 ?? 0 },
    { label: "10th", count: followers.level10 ?? 0 },
  ].filter((entry) => entry.count > 0);

  if (entries.length === 0) {
    return <p className="tool-step-desc">None</p>;
  }

  return (
    <ul className="leadership-follower-list">
      {entries.map((entry) => (
        <li key={entry.label}>
          <span>{entry.count}× level {entry.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function LeadershipSummary({ result }: { result: LeadershipResult }) {
  return (
    <aside className="tool-summary" aria-live="polite">
      <h2>Results</h2>

      <div className="tool-summary-total">
        <span className="tool-summary-label">Base Leadership Score</span>
        <span className="tool-summary-amount">
          {result.baseScore}
          <span className="leadership-score-detail">
            {" "}
            (level + Cha {formatModifier(result.charismaModifier)}
            {result.featScoreBonus > 0
              ? ` + Natural Leader ${formatModifier(result.featScoreBonus)}`
              : ""}
            )
          </span>
        </span>
      </div>

      <dl className="tool-summary-stats">
        <div>
          <dt>Cohort score</dt>
          <dd>{result.cohortScore}</dd>
        </div>
        <div>
          <dt>Follower score</dt>
          <dd>{result.followerScore}</dd>
        </div>
        <div>
          <dt>Table cohort level</dt>
          <dd>
            {result.tableCohortLevel !== null
              ? formatOrdinalLevel(result.tableCohortLevel)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Effective cohort level</dt>
          <dd>
            {result.effectiveCohortLevel !== null
              ? formatOrdinalLevel(result.effectiveCohortLevel)
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Total followers</dt>
          <dd>
            {result.followers ? totalFollowers(result.followers) : 0}
          </dd>
        </div>
      </dl>

      {result.followers && (
        <section className="tool-summary-section">
          <h3>Followers by Level</h3>
          {result.followersMultiplier > 1 && (
            <p className="tool-step-desc">
              Table values ×{result.followersMultiplier} (Extra Followers).
            </p>
          )}
          <FollowerBreakdown followers={result.followers} />
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="tool-summary-section">
          <h3>Notes</h3>
          <ul className="tool-warnings">
            {result.warnings.map((warning) => (
              <li key={warning.message} className="tool-warning">
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
