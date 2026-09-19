"use client";

import type { SpellActionSet } from "@/lib/fg-spell-actions/types";
import type { CombatSpellEntry } from "@/lib/combat/types";

export function CombatSpellEditor({
  entry,
  onChange,
  disabled = false,
}: {
  entry: CombatSpellEntry;
  onChange: (next: CombatSpellEntry) => void;
  disabled?: boolean;
}) {
  const cast = entry.actions.cast;
  const followUp = entry.actions.followUps?.[0] ?? entry.actions.action2;

  function updateCast(patch: Partial<typeof cast>) {
    onChange({
      ...entry,
      actions: {
        ...entry.actions,
        cast: { ...cast, ...patch },
      },
    });
  }

  function updateFollowUpLabel(label: string) {
    if (!followUp) return;
    const nextFollowUp = { ...followUp, label } as typeof followUp;
    onChange({
      ...entry,
      actions: {
        ...entry.actions,
        followUps: [nextFollowUp],
        action2: nextFollowUp,
      },
    });
  }

  return (
    <div className="combat-spell-editor">
      <label className="combat-spell-editor-field">
        <span>Save</span>
        <select
          value={cast.savetype ?? ""}
          disabled={disabled}
          onChange={(e) =>
            updateCast({
              savetype: e.target.value as "" | "fort" | "reflex" | "will",
            })
          }
        >
          <option value="">None</option>
          <option value="fort">Fortitude</option>
          <option value="reflex">Reflex</option>
          <option value="will">Will</option>
        </select>
      </label>
      <label className="combat-spell-editor-field">
        <span>Attack</span>
        <select
          value={cast.atktype ?? ""}
          disabled={disabled}
          onChange={(e) =>
            updateCast({
              atktype: e.target.value as "" | "rtouch" | "mtouch" | "ranged",
            })
          }
        >
          <option value="">None</option>
          <option value="rtouch">Ranged touch</option>
          <option value="mtouch">Melee touch</option>
          <option value="ranged">Ranged</option>
        </select>
      </label>
      <label className="combat-spell-editor-field">
        <span>Half on save</span>
        <input
          type="checkbox"
          checked={cast.onmissdamage === "half"}
          disabled={disabled}
          onChange={(e) =>
            updateCast({ onmissdamage: e.target.checked ? "half" : "" })
          }
        />
      </label>
      <label className="combat-spell-editor-field">
        <span>SR allowed</span>
        <input
          type="checkbox"
          checked={!cast.srnotallowed}
          disabled={disabled}
          onChange={(e) => updateCast({ srnotallowed: !e.target.checked })}
        />
      </label>
      {followUp?.type === "effect" ? (
        <label className="combat-spell-editor-field combat-spell-editor-field--wide">
          <span>Effect</span>
          <input
            type="text"
            value={followUp.label}
            disabled={disabled}
            onChange={(e) => updateFollowUpLabel(e.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}

export function cloneSpellActionSet(set: SpellActionSet): SpellActionSet {
  return structuredClone(set);
}
