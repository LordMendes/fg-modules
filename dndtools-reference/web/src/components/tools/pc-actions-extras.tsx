"use client";

import { useMemo } from "react";
import { RollableStat } from "@/components/dice/rollable-stat";
import { computeArcaneSpellFailure } from "@/lib/pc-planner/combatStats";
import { CONDITION_PRESETS } from "@/lib/pc-planner/conditions";
import { effectiveTurnLevel } from "@/lib/turn-undead";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

export function PcCombatModesPanel({
  state,
  patch,
}: {
  state: PcPlanState;
  patch: PatchFn;
}) {
  const modes = state.combatModes ?? {};
  const bab = state.identity.classLevels.reduce((s, cl) => s + cl.level, 0);

  return (
    <div className="npc-sheet-block pc-combat-modes">
      <h3>Combat modes</h3>
      <p className="npc-sheet-sub">Toggle optional modifiers. Missing feats still apply if enabled.</p>
      <div className="pc-combat-modes-grid">
        <label>
          <span className="npc-sheet-sub">Power Attack</span>
          <input
            type="number"
            className="pc-sheet-input pc-sheet-input--narrow"
            min={0}
            max={bab}
            value={modes.powerAttack ?? ""}
            placeholder="0"
            onChange={(e) =>
              patch((s) => {
                if (!s.combatModes) s.combatModes = {};
                const v = e.target.value === "" ? undefined : Number(e.target.value);
                s.combatModes.powerAttack = v;
              })
            }
          />
        </label>
        <label>
          <span className="npc-sheet-sub">Combat Expertise</span>
          <input
            type="number"
            className="pc-sheet-input pc-sheet-input--narrow"
            min={0}
            max={bab}
            value={modes.combatExpertise ?? ""}
            placeholder="0"
            onChange={(e) =>
              patch((s) => {
                if (!s.combatModes) s.combatModes = {};
                s.combatModes.combatExpertise = e.target.value === "" ? undefined : Number(e.target.value);
              })
            }
          />
        </label>
        {(
          [
            ["fightingDefensively", "Fight defensively"],
            ["charge", "Charge"],
            ["rapidShot", "Rapid Shot"],
            ["flurry", "Flurry of blows"],
            ["rage", "Rage"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="pc-checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(modes[key])}
              onChange={(e) =>
                patch((s) => {
                  if (!s.combatModes) s.combatModes = {};
                  s.combatModes[key] = e.target.checked || undefined;
                })
              }
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function PcConditionsPanel({ state, patch }: { state: PcPlanState; patch: PatchFn }) {
  const conditions = state.conditions ?? [];

  return (
    <div className="npc-sheet-block pc-conditions">
      <h3>Conditions</h3>
      <div className="pc-condition-add">
        <select
          className="pc-sheet-input pc-sheet-select"
          defaultValue=""
          onChange={(e) => {
            const preset = e.target.value;
            if (!preset) return;
            const def = CONDITION_PRESETS[preset];
            patch((s) => {
              s.conditions = [
                ...(s.conditions ?? []),
                {
                  id: crypto.randomUUID(),
                  name: def?.label ?? preset,
                  preset,
                },
              ];
            });
            e.target.value = "";
          }}
        >
          <option value="">Add preset…</option>
          {Object.entries(CONDITION_PRESETS).map(([id, def]) => (
            <option key={id} value={id}>
              {def.label}
            </option>
          ))}
        </select>
      </div>
      {conditions.length === 0 ? (
        <p className="pc-sheet-empty">No active conditions.</p>
      ) : (
        <ul className="pc-condition-list">
          {conditions.map((cond) => (
            <li key={cond.id} className="pc-sheet-editable-row">
              <span>{cond.name}</span>
              <button
                type="button"
                className="tool-btn tool-btn--ghost tool-btn--compact"
                onClick={() =>
                  patch((s) => {
                    s.conditions = (s.conditions ?? []).filter((c) => c.id !== cond.id);
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PcTurnUndeadCompact({ state }: { state: PcPlanState }) {
  const cleric = state.identity.classLevels.find(
    (cl) => cl.classSlug === "cleric" || cl.className.toLowerCase().includes("cleric"),
  );
  if (!cleric) return null;
  const effective = effectiveTurnLevel("cleric", cleric.level);
  return (
    <div className="pc-turn-undead-compact">
      <span className="npc-sheet-sub">Turn undead (CL {effective})</span>
      <RollableStat label="Turn undead" modifier={effective} kind="skill" />
    </div>
  );
}

export function PcResourcesPanel({ state, patch }: { state: PcPlanState; patch: PatchFn }) {
  const resources = state.resources ?? [];

  return (
    <div className="npc-sheet-block pc-resources">
      <h3>Resources</h3>
      <PcTurnUndeadCompact state={state} />
      {resources.length === 0 ? (
        <p className="pc-sheet-empty">Add a class with special abilities to seed resources.</p>
      ) : (
        <ul className="pc-resource-list">
          {resources.map((res) => (
            <li key={res.id} className="pc-resource-row">
              <span>{res.name}</span>
              <input
                type="number"
                className="pc-sheet-input pc-sheet-input--narrow"
                value={res.current}
                onChange={(e) =>
                  patch((s) => {
                    const row = s.resources?.find((r) => r.id === res.id);
                    if (row) row.current = Number(e.target.value);
                  })
                }
              />
              <span>/</span>
              <input
                type="number"
                className="pc-sheet-input pc-sheet-input--narrow"
                value={res.max}
                onChange={(e) =>
                  patch((s) => {
                    const row = s.resources?.find((r) => r.id === res.id);
                    if (row) row.max = Number(e.target.value);
                  })
                }
              />
              <button
                type="button"
                className="tool-btn tool-btn--ghost tool-btn--compact"
                onClick={() =>
                  patch((s) => {
                    s.resources = (s.resources ?? []).filter((r) => r.id !== res.id);
                  })
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="tool-btn tool-btn--ghost tool-btn--compact"
        onClick={() =>
          patch((s) => {
            s.resources = [
              ...(s.resources ?? []),
              {
                id: crypto.randomUUID(),
                name: "Custom",
                current: 1,
                max: 1,
              },
            ];
          })
        }
      >
        Add custom resource
      </button>
    </div>
  );
}

export function PcAsfDisplay({ state }: { state: PcPlanState }) {
  const asf = useMemo(() => computeArcaneSpellFailure(state), [state]);
  return (
    <div className="pc-combat-hp-stat">
      <span className="pc-combat-hp-label">ASF</span>
      <span className="pc-combat-value">{asf}%</span>
    </div>
  );
}
