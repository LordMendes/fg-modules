"use client";

import { useContext, useMemo, useState } from "react";
import { combatSetCombatantSpells } from "@/actions/combat";
import { useAreaSpellBridge } from "@/components/combat/area-spell-bridge";
import { CombatSpellEditor } from "@/components/combat/combat-spell-editor";
import { useCombatContext } from "@/components/combat/combat-context";
import { DiceContext } from "@/components/dice/dice-provider";
import { spellSaveDc } from "@/lib/combat/spells/dc";
import { spellCastDicePool } from "@/lib/combat/spells/spellAction";
import { createRollId } from "@/lib/dice/notation";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import type { DicePoolItem } from "@/lib/dice/types";
import type { SpellCastDetails } from "@/lib/spell-cast-details";
import type { CombatSpellEntry, CombatantView } from "@/lib/combat/types";

type SpellActionKind = "Save" | "Dmg" | "Effect";

function spellActionDice(text: string): { dice: DicePoolItem[]; modifier: number } | null {
  const times = text.match(/^(\d+)\s*[×x]\s*(.+)$/i);
  const count = times ? Number(times[1]) : 1;
  const formula = (times?.[2] ?? text).replace(/\([^)]*\)/g, " ");
  const parsed = parseDiceNotation(formula);
  if (!parsed || count < 1) return null;
  return {
    dice: parsed.dice.map((die) => ({ ...die, qty: die.qty * count })),
    modifier: parsed.modifier * count,
  };
}

function SpellActionRows({
  save,
  damage,
  effect,
  canRoll,
  onRoll,
}: {
  save: string | null;
  damage: string | null;
  effect: string | null;
  canRoll: boolean;
  onRoll: (kind: SpellActionKind, text: string) => void;
}) {
  const rows = [
    save ? { kind: "Save" as const, text: save, hint: "1d20", roll: true } : null,
    damage
      ? { kind: "Dmg" as const, text: damage, hint: "roll", roll: spellActionDice(damage) != null }
      : null,
    effect
      ? {
          kind: "Effect" as const,
          text: effect,
          hint: "roll",
          roll: spellActionDice(effect) != null,
        }
      : null,
  ].filter((row): row is { kind: SpellActionKind; text: string; hint: string; roll: boolean } =>
    Boolean(row),
  );

  if (rows.length === 0) {
    return <p className="pc-spell-cast-empty">No cast actions for this spell.</p>;
  }

  return (
    <ul className="pc-spell-actions">
      {rows.map((row) => (
        <li key={row.kind} className="pc-spell-action">
          <span className={`pc-spell-action-kind pc-spell-action-kind--${row.kind.toLowerCase()}`}>
            {row.kind}
          </span>
          {row.roll ? (
            <button
              type="button"
              className={`dice-rollable pc-spell-roll-btn pc-spell-roll-btn--${row.kind.toLowerCase()}`}
              disabled={!canRoll}
              title={`Roll ${row.kind.toLowerCase()}: ${row.text}`}
              onClick={() => onRoll(row.kind, row.text)}
            >
              <span className="pc-spell-roll-value">{row.text}</span>
              <span className="pc-spell-roll-hint" aria-hidden="true">
                {row.hint}
              </span>
            </button>
          ) : (
            <span className="pc-spell-action-value">{row.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function isAreaSpell(entry: CombatSpellEntry | null): boolean {
  return (
    entry?.areaShape === "circle" ||
    entry?.areaShape === "square" ||
    entry?.areaShape === "cone" ||
    entry?.areaShape === "ray"
  );
}

function findMirroredSpell(
  combatant: CombatantView | null | undefined,
  spellKey: string | undefined,
  spellName: string | undefined,
  spellLevel: number | undefined,
): CombatSpellEntry | null {
  if (!combatant) return null;
  const spells = combatant.spells;
  const levelMatches = (entry: CombatSpellEntry) =>
    spellLevel == null || entry.level === spellLevel;
  if (spellKey) {
    const byKey =
      spells.find((entry) => entry.key === spellKey && levelMatches(entry)) ??
      spells.find((entry) => entry.key === spellKey);
    if (byKey) return byKey;
  }
  const name = spellName?.trim().toLowerCase();
  if (!name) return null;
  return (
    spells.find(
      (entry) => entry.name.trim().toLowerCase() === name && levelMatches(entry),
    ) ??
    spells.find((entry) => entry.name.trim().toLowerCase() === name) ??
    null
  );
}

export function SpellCastDetailsView({
  details,
  spellName,
  spellKey,
  spellLevel,
  casterLevel,
  castingStatMod,
  dcModifier = 0,
  casterPcPlanId = null,
}: {
  details: SpellCastDetails;
  spellName?: string;
  spellKey?: string;
  spellLevel?: number;
  casterLevel?: number;
  castingStatMod?: number;
  dcModifier?: number;
  casterPcPlanId?: string | null;
}) {
  const diceCtx = useContext(DiceContext);
  const combatCtx = useCombatContext();
  const { startPlacement: startAreaSpellPlacement } = useAreaSpellBridge();
  const [editing, setEditing] = useState(false);

  const labelBase = spellName?.trim() || "Spell";
  const combatant = useMemo(() => {
    if (!combatCtx) return null;
    const fromSheet = casterPcPlanId
      ? combatCtx.combatantByPcPlanId(casterPcPlanId)
      : null;
    if (fromSheet) return fromSheet;
    const fromViewer = combatCtx.viewerPcPlanId
      ? combatCtx.combatantByPcPlanId(combatCtx.viewerPcPlanId)
      : null;
    return fromViewer ?? null;
  }, [casterPcPlanId, combatCtx]);
  const mirroredSpell = useMemo(
    () => findMirroredSpell(combatant, spellKey, spellName, spellLevel),
    [combatant, spellKey, spellLevel, spellName],
  );

  const dc =
    spellLevel != null && castingStatMod != null
      ? spellSaveDc({
          spellLevel,
          castingStatMod,
          featMods: dcModifier,
        })
      : null;

  const slotKey =
    spellLevel != null
      ? mirroredSpell?.spellClassKey
        ? `slot:${mirroredSpell.spellClassKey}:${spellLevel}`
        : `slot:${spellLevel}`
      : null;
  const slotsLeft =
    slotKey && combatant
      ? combatant.spellUses[slotKey] ??
        (spellLevel != null ? combatant.spellUses[`slot:${spellLevel}`] : undefined) ??
        null
      : null;
  const targets = combatant?.targetIds ?? [];
  const areaSpell = isAreaSpell(mirroredSpell);
  const needsTargets = Boolean(
    mirroredSpell &&
      (areaSpell ||
        mirroredSpell.actions.cast.savetype ||
        mirroredSpell.actions.cast.atktype ||
        mirroredSpell.actions.action2 ||
        mirroredSpell.actions.followUps?.length),
  );
  const canCast =
    Boolean(combatCtx && mirroredSpell) &&
    (slotsLeft == null || slotsLeft > 0) &&
    (!needsTargets || targets.length > 0 || areaSpell);

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

  function rollAction(kind: SpellActionKind, text: string) {
    if (!diceCtx || !diceCtx.canRoll) return;
    if (kind === "Save") {
      const qty = Math.max(1, targets.length);
      diceCtx.roll({
        id: createRollId(),
        label: `${labelBase} save`,
        dice: [{ qty, sides: 20 }],
        modifier: 0,
        kind: "save",
      });
      return;
    }
    const parsed = spellActionDice(text);
    if (!parsed) return;
    diceCtx.roll({
      id: createRollId(),
      label: `${labelBase} ${kind === "Dmg" ? "damage" : "effect"}`,
      dice: parsed.dice,
      modifier: parsed.modifier,
      kind: kind === "Dmg" ? "damage" : "spell",
    });
  }

  function rollCombatCast(overrideSlots = false) {
    if (!diceCtx || !diceCtx.canRoll || !combatCtx || !combatant || !mirroredSpell) {
      return;
    }
    if (slotsLeft === 0 && !overrideSlots) return;

    const level = casterLevel ?? mirroredSpell.casterLevel ?? 1;
    if (areaSpell && targets.length === 0) {
      startAreaSpellPlacement({
        spell: mirroredSpell,
        casterId: combatant.id,
        casterTokenId: combatant.tokenId ?? null,
        label: `${labelBase} cast`,
        dice: spellCastDicePool(mirroredSpell, [], level),
        casterLevel: level,
        spellLevel: spellLevel ?? mirroredSpell.level ?? undefined,
        castingStatMod,
      });
      return;
    }

    const targetRows = (combatCtx.combat?.combatants ?? []).filter((c) =>
      targets.includes(c.id),
    );
    const pool = spellCastDicePool(
      mirroredSpell,
      targetRows.map((t) => ({ defenses: t.defenses })),
      level,
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
        spellKey: mirroredSpell.key,
        targetIds: targets,
        casterLevel: level,
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
        <SpellActionRows
          save={details.save}
          damage={details.damage}
          effect={details.effect}
          canRoll={Boolean(diceCtx?.canRoll)}
          onRoll={rollAction}
        />
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
              disabled={!diceCtx.canRoll || !canCast}
              title={
                slotsLeft === 0
                  ? "No slots remaining"
                  : areaSpell && targets.length === 0
                    ? "Place the area on the map. Targeted foes are included when you cast with targets selected."
                    : needsTargets && targets.length === 0
                      ? "Select targets on the map or tracker first"
                      : "Cast at selected targets"
              }
              onClick={() => rollCombatCast(false)}
            >
              {areaSpell && targets.length === 0 ? "Place area" : "Cast at targets"}
            </button>
            {slotsLeft === 0 && combatCtx.isDm ? (
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={!diceCtx.canRoll}
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
      <SpellActionRows
        save={details.save}
        damage={details.damage}
        effect={details.effect}
        canRoll={Boolean(diceCtx?.canRoll)}
        onRoll={rollAction}
      />
    </div>
  );
}
