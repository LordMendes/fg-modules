"use client";

import type { ReactNode } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { buildNotation, createRollId } from "@/lib/dice/notation";
import type { DicePoolItem } from "@/lib/dice/types";

type RollableDiceProps = {
  label: string;
  dice: DicePoolItem[];
  modifier?: number;
  className?: string;
  children?: ReactNode;
};

/**
 * Clickable damage (or other non-d20) total that rolls through the dice tray.
 */
export function RollableDice({
  label,
  dice,
  modifier = 0,
  className,
  children,
}: RollableDiceProps) {
  const { roll, rolling, ready } = useDice();
  const notation = buildNotation(dice, modifier);
  const text = children ?? notation;
  const disabled = !ready || rolling || dice.every((d) => d.qty <= 0);

  return (
    <button
      type="button"
      className={["dice-rollable", className].filter(Boolean).join(" ")}
      onClick={() =>
        roll({
          id: createRollId(),
          label,
          dice,
          modifier,
        })
      }
      disabled={disabled}
      title={ready ? `Roll ${label}: ${notation}` : "Dice loading…"}
      aria-label={`Roll ${label}, ${notation}`}
    >
      {text}
    </button>
  );
}
