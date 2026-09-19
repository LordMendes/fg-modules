"use client";

import { useContext, useMemo, useState } from "react";
import { combatSetCombatantSpells } from "@/actions/combat";
import { CombatSpellEditor } from "@/components/combat/combat-spell-editor";
import { useCombatContext } from "@/components/combat/combat-context";
import { DiceContext } from "@/components/dice/dice-provider";
import { spellSaveDc } from "@/lib/combat/spells/dc";
import { spellCastDicePool } from "@/lib/combat/spells/spellAction";
import { createRollId } from "@/lib/dice/notation";
import type { SpellCastDetails } from "@/lib/spell-cast-details";
import type { CombatSpellEntry } from "@/lib/combat/types";

export function SpellCastDetailsView({
  details,
  spellName,
  spellKey,
  spellLevel,
  casterLevel,
  castingStatMod,
  dcModifier = 0,
}: {
  details: SpellCastDetails;
  spellName?: string;
  spellKey?: string;
  spellLevel?: number;
  casterLevel?: number;
  castingStatMod?: number;
  dcModifier?: number;
}) {
  const diceCtx = useContext(DiceContext);
  const combatCtx = useCombatContext();
  const [editing, setEditing] = useState(false);

  const labelBase = spellName?.trim() || "Spell";
  const combatant = combatCtx?.combatantByPcPlanId(combatCtx.viewerPcPlanId ?? "");
  const mirroredSpell = useMemo(() => {
    if (!combatant || !spellKey) return null;
    return combatant.spells.find((s) => s.key === spellKey) ?? null;
  }, [combatant, spellKey]);

  const dc =
    spellLevel != null && castingStatMod != null
      ? spellSaveDc({
          spellLevel,
          castingStatMod,
          featMods: dcModifier,
        })
      : null;

  const slotKey = spellLevel != null ? `slot:${spellLevel}` : null;
  const slotsLeft = slotKey && combatant ? combatant.spellUses[slotKey] : null;
  const targets = combatant?.targetIds ?? [];
  const needsTargets =
    mirroredSpell?.areaShape != null ||
    Boolean(mirroredSpell?.actions.cast.savetype || mirroredSpell?.actions.cast.atktype);
  const canCast =
    Boolean(combatCtx && mirroredSpell && spellKey) &&
    (slotsLeft == null || slotsLeft > 0) &&
    (!needsTargets || targets.length > 0);

  if (!details.save && !details.damage && !details.effect && !mirroredSpell) {
    return <p className="pc-spell-cast-empty">No cast details available.</p>;
  }

  async function persistSpell(entry: CombatSpellEntry) {
    if (!combatCtx || !combatant) return;
    const next = combatant.spells.map((spell) =>
      spell.key === entry.key ? entry : spell,
    );
    await combatSetCombatantSpells(combatCtx.campaignId, combatant.id, next);
  }

  function rollCombatCast(overrideSlots = false) {
    if (!diceCtx || !diceCtx.ready || diceCtx.rolling || !combatCtx || !combatant || !mirroredSpell || !spellKey) {
      return;
    }
    if (slotsLeft === 0 && !overrideSlots) return;

    const targetRows = (combatCtx.combat?.combatants ?? []).filter((c) =>
      targets.includes(c.id),
    );
    const pool = spellCastDicePool(
      mirroredSpell,
      targetRows.map((t) => ({ defenses: t.defenses })),
      casterLevel ?? mirroredSpell.casterLevel ?? 1,
    );

    diceCtx.roll({
      id: createRollId(),
      label: `${labelBase} cast`,
      dice: pool,
      modifier: 0,
      kind: "cast",
      combat: {
        kind: "cast",
        casterId: combatant.id,
        spellKey,
        targetIds: targets,
        casterLevel: casterLevel ?? mirroredSpell.casterLevel ?? undefined,
        spellLevel: spellLevel ?? mirroredSpell.level ?? undefined,
        castingStatMod,
        dmOverrideSlots: overrideSlots,
      },
    });
  }

  if (combatCtx && mirroredSpell) {
    return (
      <div className="pc-spell-cast-block">
        <div className="pc-spell-cast-combat-meta">
          {dc != null ? <span className="pc-spell-dc-chip">DC {dc}</span> : null}
          {!mirroredSpell.actions.cast.srnotallowed ? (
            <span className="pc-spell-sr-chip">SR</span>
          ) : (
            <span className="pc-spell-sr-chip pc-spell-sr-chip--no">No SR</span>
          )}
          {slotsLeft != null ? (
            <span className="pc-spell-slots-chip">{slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left</span>
          ) : null}
        </div>
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
        {editing ? (
          <CombatSpellEditor
            entry={mirroredSpell}
            onChange={(next) => {
              void persistSpell(next);
            }}
          />
        ) : null}
        {diceCtx ? (
          <div className="pc-spell-cast-actions">
            <button
              type="button"
              className="tool-btn tool-btn--ghost dice-rollable"
              disabled={!diceCtx.ready || diceCtx.rolling || !canCast}
              title={
                slotsLeft === 0
                  ? "No slots remaining"
                  : needsTargets && targets.length === 0
                    ? "Select targets on the map or tracker first"
                    : "Cast at selected targets"
              }
              onClick={() => rollCombatCast(false)}
            >
              Cast at targets
            </button>
            {slotsLeft === 0 && combatCtx.isDm ? (
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={!diceCtx.ready || diceCtx.rolling}
                onClick={() => rollCombatCast(true)}
              >
                DM override
              </button>
            ) : null}
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done" : "Edit actions"}
            </button>
          </div>
        ) : null}
      </div>
    );
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
            onClick={() =>
              diceCtx.roll({
                id: createRollId(),
                label: `${labelBase} cast`,
                dice: [{ qty: 1, sides: 20 }],
                modifier: 0,
                kind: "cast",
              })
            }
            title="Log a cast (1d20 for caster check / concentration)"
          >
            Cast
          </button>
        </div>
      ) : null}
    </div>
  );
}
