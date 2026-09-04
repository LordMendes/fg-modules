"use client";

import type { ReactNode } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { formatModifier } from "@/lib/pc-planner/combatStats";

type RollableStatProps = {
  label: string;
  /** Modifier added to 1d20 (the check/attack/save total). */
  modifier: number;
  /** When false, render unsigned total (rare for checks). Default true. */
  signed?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Clickable sheet total that throws 1d20 + modifier through the dice tray.
 */
export function RollableStat({
  label,
  modifier,
  signed = true,
  className,
  children,
}: RollableStatProps) {
  const { rollCheck, rolling, ready } = useDice();
  const text = children ?? (signed ? formatModifier(modifier) : String(modifier));
  const disabled = !ready || rolling;

  return (
    <button
      type="button"
      className={["dice-rollable", className].filter(Boolean).join(" ")}
      onClick={() => rollCheck(label, modifier)}
      disabled={disabled}
      title={
        ready
          ? `Roll ${label}: 1d20 ${formatModifier(modifier)}`
          : "Dice loading…"
      }
      aria-label={`Roll ${label}, modifier ${formatModifier(modifier)}`}
    >
      {text}
    </button>
  );
}
