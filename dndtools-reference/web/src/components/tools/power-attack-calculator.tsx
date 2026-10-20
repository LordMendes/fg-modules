"use client";

import { useMemo, useState } from "react";
import { averageExpression, RollExpressionError } from "@/lib/dice/roll-expression";
import {
  buildPowerAttackTable,
  DEFAULT_POWER_ATTACK_INPUT,
  formatPowerAttackDamage,
  iterativeAttackCount,
  type PowerAttackInput,
} from "@/lib/power-attack/expected";

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

const THREAT_OPTIONS = [
  { label: "20", value: 20 },
  { label: "19-20", value: 19 },
  { label: "18-20", value: 18 },
  { label: "17-20", value: 17 },
  { label: "16-20", value: 16 },
  { label: "15-20", value: 15 },
  { label: "14-20", value: 14 },
  { label: "13-20", value: 13 },
  { label: "12-20", value: 12 },
  { label: "11-20", value: 11 },
] as const;

const CRIT_OPTIONS = [2, 3, 4, 5] as const;

function applyDiceAverage(
  expr: string,
  onAverage: (value: number) => void,
): void {
  const trimmed = expr.trim();
  if (!trimmed) return;
  try {
    onAverage(averageExpression(trimmed));
  } catch (error) {
    if (!(error instanceof RollExpressionError)) {
      throw error;
    }
  }
}

export function PowerAttackCalculator() {
  const [input, setInput] = useState<PowerAttackInput>(DEFAULT_POWER_ATTACK_INPUT);
  const [weaponDice, setWeaponDice] = useState("");
  const [extraDice, setExtraDice] = useState("");

  const iterCount = iterativeAttackCount(input.bab);
  const attackCount =
    input.action === "single" ? 1 : iterCount + input.extraAttacks;

  const table = useMemo(() => buildPowerAttackTable(input), [input]);

  function patch(partial: Partial<PowerAttackInput>) {
    setInput((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="power-attack">
      <div className="power-attack-fields">
        <div className="tool-field">
          <Label htmlFor="pa-bab">Base attack bonus</Label>
          <select
            id="pa-bab"
            className="tool-input"
            value={input.bab}
            onChange={(event) => patch({ bab: Number(event.target.value) })}
          >
            {Array.from({ length: 21 }, (_, bab) => (
              <option key={bab} value={bab}>
                +{bab}
              </option>
            ))}
          </select>
          <p className="power-attack-note">Attacks: {attackCount}</p>
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-attack-mod">Additional attack modifiers</Label>
          <input
            id="pa-attack-mod"
            type="number"
            className="tool-input"
            step={1}
            min={-20}
            max={20}
            value={input.attackMod}
            onChange={(event) =>
              patch({ attackMod: Number(event.target.value) })
            }
          />
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-action">Action</Label>
          <select
            id="pa-action"
            className="tool-input"
            value={input.action}
            disabled={iterCount === 1}
            onChange={(event) =>
              patch({
                action: event.target.value as PowerAttackInput["action"],
              })
            }
          >
            <option value="single">Single attack</option>
            <option value="full">Full attack</option>
          </select>
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-extra-attacks">Extra attacks (full BAB)</Label>
          <input
            id="pa-extra-attacks"
            type="number"
            className="tool-input"
            min={0}
            max={4}
            value={input.extraAttacks}
            disabled={input.action === "single"}
            onChange={(event) =>
              patch({ extraAttacks: Number(event.target.value) })
            }
          />
        </div>

        <div className="tool-field power-attack-dice-row">
          <Label htmlFor="pa-weapon-average">Weapon damage (average)</Label>
          <div className="power-attack-dice-pair">
            <input
              id="pa-weapon-average"
              type="number"
              className="tool-input"
              step={0.5}
              min={0}
              value={input.weaponAverage}
              onChange={(event) =>
                patch({ weaponAverage: Number(event.target.value) })
              }
            />
            <input
              id="pa-weapon-dice"
              type="text"
              className="tool-input"
              aria-label="Weapon damage dice expression"
              placeholder="1d8+3"
              value={weaponDice}
              onChange={(event) => {
                const value = event.target.value;
                setWeaponDice(value);
                applyDiceAverage(value, (weaponAverage) =>
                  patch({ weaponAverage }),
                );
              }}
            />
          </div>
        </div>

        <div className="tool-field power-attack-dice-row">
          <Label htmlFor="pa-extra-average">
            Extra damage (not multiplied on a crit)
          </Label>
          <div className="power-attack-dice-pair">
            <input
              id="pa-extra-average"
              type="number"
              className="tool-input"
              step={0.5}
              min={0}
              value={input.extraAverage}
              onChange={(event) =>
                patch({ extraAverage: Number(event.target.value) })
              }
            />
            <input
              id="pa-extra-dice"
              type="text"
              className="tool-input"
              aria-label="Extra damage dice expression"
              placeholder="1d6"
              value={extraDice}
              onChange={(event) => {
                const value = event.target.value;
                setExtraDice(value);
                applyDiceAverage(value, (extraAverage) => patch({ extraAverage }));
              }}
            />
          </div>
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-threat">Critical threat</Label>
          <select
            id="pa-threat"
            className="tool-input"
            value={input.threatMin}
            onChange={(event) =>
              patch({ threatMin: Number(event.target.value) })
            }
          >
            {THREAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-crit">Critical multiplier</Label>
          <select
            id="pa-crit"
            className="tool-input"
            value={input.critMultiplier}
            onChange={(event) =>
              patch({ critMultiplier: Number(event.target.value) })
            }
          >
            {CRIT_OPTIONS.map((mult) => (
              <option key={mult} value={mult}>
                x{mult}
              </option>
            ))}
          </select>
        </div>

        <div className="tool-field">
          <Label htmlFor="pa-target-ac">Target AC</Label>
          <input
            id="pa-target-ac"
            type="number"
            className="tool-input"
            min={1}
            max={50}
            value={input.targetAc}
            onChange={(event) =>
              patch({ targetAc: Number(event.target.value) })
            }
          />
        </div>

        <div className="tool-field power-attack-checkboxes">
          <label className="power-attack-checkbox">
            <input
              type="checkbox"
              checked={input.twoHanded}
              onChange={(event) => patch({ twoHanded: event.target.checked })}
            />
            <span>Two-handed weapon</span>
          </label>
          <label className="power-attack-checkbox">
            <input
              type="checkbox"
              checked={input.immuneToCrits}
              onChange={(event) =>
                patch({ immuneToCrits: event.target.checked })
              }
            />
            <span>Immune to critical hits</span>
          </label>
        </div>
      </div>

      <div className="power-attack-table-wrap">
        <table className="power-attack-table">
          <thead>
            <tr>
              <th colSpan={1} scope="colgroup">
                Power Attack
              </th>
              <th colSpan={table.acColumns.length} scope="colgroup">
                Target AC
              </th>
            </tr>
            <tr>
              <th scope="col">Penalty</th>
              {table.acColumns.map((ac) => (
                <th key={ac} scope="col">
                  {ac}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.penalty}>
                <th scope="row">-{row.penalty}</th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.ac}
                    className={
                      cell.isOptimum ? "power-attack-opt" : undefined
                    }
                  >
                    {formatPowerAttackDamage(cell.expected)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
