"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TurnUndeadSummary } from "@/components/tools/turn-undead-summary";
import {
  TurnUndeadOutcomeBadge,
  turnUndeadTargetRowClassName,
} from "@/components/tools/turn-undead-outcome-badge";
import {
  DEFAULT_TURN_UNDEAD_INPUT,
  effectiveTurnLevel,
  resolveTurnUndead,
  type TurnUndeadClass,
  type TurnUndeadInput,
  type TurnUndeadTarget,
} from "@/lib/turn-undead";

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

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        className="tool-input"
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function OptionalDieField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        className="tool-input"
        value={value ?? ""}
        min={min}
        max={max}
        placeholder="—"
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }

          const parsed = Number.parseInt(raw, 10);
          onChange(Number.isNaN(parsed) ? null : parsed);
        }}
      />
    </div>
  );
}

function createTarget(): TurnUndeadTarget {
  return {
    label: "Undead",
    hd: 1,
    count: 1,
  };
}

export function TurnUndeadCalculator() {
  const [input, setInput] = useState<TurnUndeadInput>(DEFAULT_TURN_UNDEAD_INPUT);

  const effectiveLevel = useMemo(
    () => effectiveTurnLevel(input.class, input.level),
    [input.class, input.level],
  );

  const diceReady =
    input.d20 !== null && input.d6First !== null && input.d6Second !== null;

  const result = useMemo(() => resolveTurnUndead(input), [input]);

  function updateInput(patch: Partial<TurnUndeadInput>) {
    setInput((previous) => ({ ...previous, ...patch }));
  }

  function updateTarget(index: number, patch: Partial<TurnUndeadTarget>) {
    setInput((previous) => ({
      ...previous,
      targets: previous.targets.map((target, targetIndex) =>
        targetIndex === index ? { ...target, ...patch } : target,
      ),
    }));
  }

  function addTarget() {
    setInput((previous) => ({
      ...previous,
      targets: [...previous.targets, createTarget()],
    }));
  }

  function removeTarget(index: number) {
    setInput((previous) => ({
      ...previous,
      targets: previous.targets.filter((_, targetIndex) => targetIndex !== index),
    }));
  }

  return (
    <div className="tool-layout turn-undead-calculator">
      <div className="tool-steps">
        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">1</span> Character
          </h2>
          <div className="tool-field-row">
            <div className="tool-field">
              <Label htmlFor="turn-class">Class</Label>
              <select
                id="turn-class"
                className="tool-select"
                value={input.class}
                onChange={(event) =>
                  updateInput({ class: event.target.value as TurnUndeadClass })
                }
              >
                <option value="cleric">Cleric</option>
                <option value="paladin">Paladin</option>
              </select>
            </div>
            <NumberField
              id="turn-level"
              label="Level"
              value={input.level}
              min={1}
              max={40}
              onChange={(value) => updateInput({ level: Math.max(1, value) })}
            />
            <NumberField
              id="turn-cha"
              label="Charisma modifier"
              value={input.chaMod}
              min={-5}
              max={20}
              onChange={(value) => updateInput({ chaMod: value })}
            />
          </div>
          <p className="tool-step-desc">
            Effective turning level: {effectiveLevel}
            {input.class === "paladin" ? " (paladin level − 3, minimum 1)" : ""}
          </p>
          <label className="tool-checkbox">
            <input
              type="checkbox"
              checked={input.religionBonus}
              onChange={(event) =>
                updateInput({ religionBonus: event.target.checked })
              }
            />
            <span>
              Knowledge (religion) 5+ ranks (+2 to turning check only)
            </span>
          </label>
          <label className="tool-checkbox">
            <input
              type="checkbox"
              checked={input.greaterTurnUndead}
              onChange={(event) =>
                updateInput({ greaterTurnUndead: event.target.checked })
              }
            />
            <span>
              Greater Turn Undead (Sun domain — affected undead are destroyed
              instead of turned)
            </span>
          </label>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">2</span> Dice
          </h2>
          <p className="tool-step-desc">
            Enter the dice you rolled at the table. This tool does not roll for
            you.
          </p>
          <div className="tool-field-row">
            <OptionalDieField
              id="turn-d20"
              label="Turning check (d20)"
              value={input.d20}
              min={1}
              max={20}
              onChange={(value) => updateInput({ d20: value })}
            />
            <OptionalDieField
              id="turn-d6-first"
              label="Damage die 1 (d6)"
              value={input.d6First}
              min={1}
              max={6}
              onChange={(value) => updateInput({ d6First: value })}
            />
            <OptionalDieField
              id="turn-d6-second"
              label="Damage die 2 (d6)"
              value={input.d6Second}
              min={1}
              max={6}
              onChange={(value) => updateInput({ d6Second: value })}
            />
          </div>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">3</span> Undead targets
          </h2>
          <p className="tool-step-desc">
            List undead within 60 ft. The turning check sets the max HD per
            creature; the damage pool determines how many HD you can affect
            (weakest first).
          </p>

          {input.targets.length === 0 ? (
            <p className="tool-step-desc">No targets added yet.</p>
          ) : (
            <ul className="turn-undead-target-list">
              {input.targets.map((target, index) => {
                const stack = result?.stacks[index] ?? null;

                return (
                <li
                  key={index}
                  className={turnUndeadTargetRowClassName(
                    diceReady ? stack : null,
                  )}
                >
                  <div className="turn-undead-target-fields">
                    <div className="tool-field turn-undead-target-label">
                      <Label htmlFor={`target-label-${index}`}>Label</Label>
                      <input
                        id={`target-label-${index}`}
                        type="text"
                        className="tool-input"
                        value={target.label}
                        onChange={(event) =>
                          updateTarget(index, { label: event.target.value })
                        }
                      />
                    </div>
                    <div className="tool-field turn-undead-target-number">
                      <Label htmlFor={`target-hd-${index}`}>HD</Label>
                      <input
                        id={`target-hd-${index}`}
                        type="number"
                        className="tool-input"
                        value={target.hd}
                        min={0}
                        max={100}
                        onChange={(event) =>
                          updateTarget(index, {
                            hd: Math.max(0, Number(event.target.value)),
                          })
                        }
                      />
                    </div>
                    <div className="tool-field turn-undead-target-number">
                      <Label htmlFor={`target-count-${index}`}>Count</Label>
                      <input
                        id={`target-count-${index}`}
                        type="number"
                        className="tool-input"
                        value={target.count}
                        min={0}
                        max={999}
                        onChange={(event) =>
                          updateTarget(index, {
                            count: Math.max(0, Number(event.target.value)),
                          })
                        }
                      />
                    </div>
                  </div>
                  <TurnUndeadOutcomeBadge
                    stack={stack}
                    pending={!diceReady}
                  />
                  <button
                    type="button"
                    className="tool-btn-icon turn-undead-target-remove"
                    aria-label={`Remove ${target.label}`}
                    onClick={() => removeTarget(index)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className="tool-btn-secondary turn-undead-add-target"
            onClick={addTarget}
          >
            <Plus size={16} aria-hidden="true" />
            Add target
          </button>
        </section>
      </div>

      <TurnUndeadSummary
        result={result}
        diceReady={diceReady}
        greaterTurnUndead={input.greaterTurnUndead}
      />
    </div>
  );
}
