"use client";

import {
  formatStackOutcome,
  stackOutcomeTone,
  type TurnUndeadStackResult,
} from "@/lib/turn-undead";

export function TurnUndeadOutcomeBadge({
  stack,
  pending = false,
}: {
  stack?: TurnUndeadStackResult | null;
  pending?: boolean;
}) {
  if (pending || !stack) {
    return (
      <span
        className="turn-undead-outcome turn-undead-outcome--pending"
        aria-label="Outcome pending dice entry"
      >
        —
      </span>
    );
  }

  const tone = stackOutcomeTone(stack);

  return (
    <span className={`turn-undead-outcome turn-undead-outcome--${tone}`}>
      {formatStackOutcome(stack)}
    </span>
  );
}

export function turnUndeadTargetRowClassName(
  stack?: TurnUndeadStackResult | null,
): string {
  if (!stack) {
    return "turn-undead-target-row";
  }

  return `turn-undead-target-row turn-undead-target-row--${stackOutcomeTone(stack)}`;
}
