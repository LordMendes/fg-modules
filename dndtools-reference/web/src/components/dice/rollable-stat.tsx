"use client";

import type { ReactNode, MouseEvent } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { formatModifier } from "@/lib/pc-planner/combatStats";
import type { RollKind } from "@/lib/dice/types";

type RollableStatProps = {
  label: string;
  /** Modifier added to 1d20 (the check/attack/save total). */
  modifier: number;
  /** When false, render unsigned total (rare for checks). Default true. */
  signed?: boolean;
  className?: string;
  children?: ReactNode;
  kind?: RollKind;
};

/**
 * Clickable sheet total that throws 1d20 + modifier through the dice tray.
 * Hold Shift in a campaign to make the roll DM-only (hidden).
 */
export function RollableStat({
  label,
  modifier,
  signed = true,
  className,
  children,
  kind = "other",
}: RollableStatProps) {
  const { rollCheck, ready, canRoll, secretModifierHeld, isCampaign } = useDice();
  const text = children ?? (signed ? formatModifier(modifier) : String(modifier));
  const disabled = !canRoll;

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    void (isCampaign && (e.shiftKey || secretModifierHeld));
    rollCheck(label, modifier, kind);
  }

  return (
    <button
      type="button"
      className={["dice-rollable", className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
      title={
        ready
          ? `Roll ${label}: 1d20 ${formatModifier(modifier)}${
              isCampaign ? " (Shift+click to hide from players)" : ""
            }`
          : "Dice loading…"
      }
      aria-label={`Roll ${label}, modifier ${formatModifier(modifier)}`}
    >
      {text}
    </button>
  );
}
