"use client";

import { useContext } from "react";
import { DiceContext } from "@/components/dice/dice-provider";
import { createRollId } from "@/lib/dice/notation";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import type { SpellCastDetails } from "@/lib/spell-cast-details";

export function SpellCastDetailsView({
  details,
  spellName,
}: {
  details: SpellCastDetails;
  spellName?: string;
}) {
  const diceCtx = useContext(DiceContext);

  if (!details.save && !details.damage && !details.effect) {
    return <p className="pc-spell-cast-empty">No cast details available.</p>;
  }

  const labelBase = spellName?.trim() || "Spell";
  const parsedDamage = details.damage ? parseDiceNotation(details.damage) : null;

  function rollCast() {
    if (!diceCtx || !diceCtx.ready || diceCtx.rolling) return;
    diceCtx.roll({
      id: createRollId(),
      label: `${labelBase} cast`,
      dice: [{ qty: 1, sides: 20 }],
      modifier: 0,
      kind: "cast",
    });
  }

  function rollDamage() {
    if (!diceCtx || !diceCtx.ready || diceCtx.rolling || !parsedDamage) return;
    diceCtx.roll({
      id: createRollId(),
      label: `${labelBase} damage`,
      dice: parsedDamage.dice,
      modifier: parsedDamage.modifier,
      kind: "spell",
    });
  }

  return (
    <div className="pc-spell-cast-block">
      <dl className="pc-spell-cast-details">
        {details.save ? (
          <div>
            <dt>Save</dt>
            <dd>{details.save}</dd>
          </div>
        ) : null}
        {details.damage ? (
          <div>
            <dt>Dmg</dt>
            <dd>{details.damage}</dd>
          </div>
        ) : null}
        {details.effect ? (
          <div>
            <dt>Effect</dt>
            <dd>{details.effect}</dd>
          </div>
        ) : null}
      </dl>
      {diceCtx ? (
        <div className="pc-spell-cast-actions">
          <button
            type="button"
            className="tool-btn tool-btn--ghost dice-rollable"
            disabled={!diceCtx.ready || diceCtx.rolling}
            onClick={rollCast}
            title="Log a cast (1d20 for caster check / concentration)"
          >
            Cast
          </button>
          {parsedDamage ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost dice-rollable"
              disabled={!diceCtx.ready || diceCtx.rolling}
              onClick={rollDamage}
              title={`Roll ${details.damage}`}
            >
              Roll dmg
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
