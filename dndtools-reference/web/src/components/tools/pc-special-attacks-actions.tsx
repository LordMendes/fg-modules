"use client";

import { RollableDice } from "@/components/dice/rollable-dice";
import { weaponDamageColor } from "@/lib/dice/damageTypeColors";
import { formatDamageType } from "@/lib/equipment-display";
import {
  formatSpecialAttackSummaryLine,
  listSpecialOnlyAttacks,
  specialAttackDamageDice,
} from "@/lib/pc-planner/specialAttacks";
import { isUnarmedStrikeEntry } from "@/lib/pc-planner/unarmedStrike";
import { parseDamageDice } from "@/lib/pc-planner/weaponAttacks";
import type { PcPlanState, PcSpecialAttackEntry } from "@/lib/pc-planner/types";

function SpecialAttackCard({
  entry,
  sizeMod,
  onRemove,
}: {
  entry: PcSpecialAttackEntry;
  sizeMod: number;
  onRemove?: (id: string) => void;
}) {
  const diceRaw = specialAttackDamageDice(entry, sizeMod);
  const color = weaponDamageColor(entry.damageType) ?? "#C9A227";
  const dice = parseDamageDice(diceRaw, color);
  const typeLabel = formatDamageType(entry.damageType);
  const save =
    entry.saveDc != null && entry.saveType
      ? `DC ${entry.saveDc} ${entry.saveType}`
      : null;

  return (
    <li className="pc-special-attack-action-card">
      <div className="pc-special-attack-action-main">
        <span className="pc-special-attack-action-name">{entry.name}</span>
        {dice.length > 0 ? (
          <RollableDice
            label={`${entry.name} damage`}
            dice={dice}
            modifier={entry.damageMisc ?? 0}
            className="pc-special-attack-action-damage"
          >
            {diceRaw}
            {(entry.damageMisc ?? 0) !== 0
              ? `${(entry.damageMisc ?? 0) > 0 ? "+" : ""}${entry.damageMisc}`
              : ""}
            {typeLabel ? ` ${typeLabel}` : ""}
          </RollableDice>
        ) : null}
        {save ? <span className="npc-sheet-sub">{save}</span> : null}
        {onRemove ? (
          <button
            type="button"
            className="pc-language-chip-remove pc-special-attack-action-remove"
            aria-label={`Remove ${entry.name}`}
            onClick={() => onRemove(entry.id)}
          >
            ×
          </button>
        ) : null}
      </div>
      {entry.notes?.trim() ? (
        <p className="pc-special-attack-action-notes">{entry.notes.trim()}</p>
      ) : null}
      {!dice.length && !save && !entry.notes?.trim() ? (
        <p className="npc-sheet-sub">{formatSpecialAttackSummaryLine(entry)}</p>
      ) : null}
    </li>
  );
}

export function PcSpecialAttacksActions({
  state,
  onRemove,
}: {
  state: PcPlanState;
  onRemove?: (id: string) => void;
}) {
  const specials = listSpecialOnlyAttacks(state.combat.specialAttacks).filter(
    (entry) => !isUnarmedStrikeEntry(entry),
  );
  if (specials.length === 0) return null;

  return (
    <ul className="pc-special-attack-action-list">
      {specials.map((entry) => (
        <SpecialAttackCard
          key={entry.id}
          entry={entry}
          sizeMod={state.combat.sizeMod}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
