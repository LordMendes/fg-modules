"use client";

import type { TurnUndeadResult } from "@/lib/turn-undead";
import { stackOutcomeTone } from "@/lib/turn-undead";
import { TurnUndeadOutcomeBadge } from "@/components/tools/turn-undead-outcome-badge";

export function TurnUndeadSummary({
  result,
  diceReady,
  greaterTurnUndead,
}: {
  result: TurnUndeadResult | null;
  diceReady: boolean;
  greaterTurnUndead: boolean;
}) {
  if (!diceReady) {
    return (
      <aside className="tool-summary" aria-live="polite">
        <h2>Results</h2>
        <p className="tool-step-desc">
          Enter all three dice (d20 and both d6) to resolve turning.
        </p>
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="tool-summary" aria-live="polite">
        <h2>Results</h2>
        <p className="tool-step-desc">Dice values must be within valid ranges.</p>
      </aside>
    );
  }

  return (
    <aside className="tool-summary" aria-live="polite">
      <h2>Results</h2>

      <div className="tool-summary-total">
        <span className="tool-summary-label">Turning check</span>
        <span className="tool-summary-amount">{result.checkTotal}</span>
      </div>

      <dl className="tool-summary-stats">
        <div>
          <dt>Effective level</dt>
          <dd>{result.effectiveLevel}</dd>
        </div>
        <div>
          <dt>Max HD per creature</dt>
          <dd>{result.maxHdPerCreature}</dd>
        </div>
        <div>
          <dt>Damage pool</dt>
          <dd>
            {result.damageSpent} / {result.damagePool} HD spent
          </dd>
        </div>
        <div>
          <dt>Pool remaining</dt>
          <dd>{result.damageRemaining} HD</dd>
        </div>
        <div>
          <dt>Eligible HD total</dt>
          <dd>{result.eligibleHdTotal}</dd>
        </div>
        <div>
          <dt>All eligible affected</dt>
          <dd>{result.allEligibleAffected ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {result.stacks.length > 0 && (
        <section className="tool-summary-section">
          <h3>Targets</h3>
          <ul className="turn-undead-summary-targets">
            {result.stacks.map((stack, index) => (
              <li
                key={`${stack.label}-${stack.hd}-${index}`}
                className={`turn-undead-summary-target turn-undead-summary-target--${stackOutcomeTone(stack)}`}
              >
                <span className="turn-undead-summary-target-label">
                  {stack.label} ({stack.hd} HD × {stack.count})
                </span>
                <TurnUndeadOutcomeBadge stack={stack} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tool-summary-section">
        <h3>Rules reminder</h3>
        <p className="tool-step-desc">
          Damage pool is spent on the weakest eligible HD first.
          {greaterTurnUndead
            ? " Greater Turn Undead destroys all affected undead instead of turning them."
            : " Undead are destroyed (not just turned) when effective level is at least twice their HD."}
        </p>
      </section>
    </aside>
  );
}
