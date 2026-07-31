"use client";

import type { ConflictChoice, FieldConflict } from "@/lib/npc-creator/conflicts";

export function TemplateConflictModal({
  templateName,
  conflicts,
  choices,
  onChoice,
  onChooseAll,
  onConfirm,
  onCancel,
}: {
  templateName: string;
  conflicts: FieldConflict[];
  choices: Record<string, ConflictChoice>;
  onChoice: (path: string, choice: ConflictChoice) => void;
  onChooseAll: (choice: ConflictChoice) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="npc-conflict-overlay" role="dialog" aria-modal="true">
      <div className="npc-conflict-modal">
        <h3>Resolve conflicts — {templateName}</h3>
        <p className="tool-step-desc">
          This template overlaps fields you already set. Keep the current value
          or take the template&apos;s value for each field.
        </p>
        <div className="tool-button-row">
          <button
            type="button"
            className="tool-btn-secondary"
            onClick={() => onChooseAll("keep")}
          >
            Keep all current
          </button>
          <button
            type="button"
            className="tool-btn-secondary"
            onClick={() => onChooseAll("take")}
          >
            Take all from template
          </button>
        </div>
        <ul className="npc-conflict-list">
          {conflicts.map((c) => {
            const choice = choices[c.path] ?? "take";
            return (
              <li key={c.path}>
                <div className="npc-conflict-label">{c.label}</div>
                <div className="npc-conflict-values">
                  <button
                    type="button"
                    className={
                      choice === "keep"
                        ? "npc-conflict-option npc-conflict-option-active"
                        : "npc-conflict-option"
                    }
                    onClick={() => onChoice(c.path, "keep")}
                  >
                    <span>Keep</span>
                    <code>{String(c.current)}</code>
                  </button>
                  <button
                    type="button"
                    className={
                      choice === "take"
                        ? "npc-conflict-option npc-conflict-option-active"
                        : "npc-conflict-option"
                    }
                    onClick={() => onChoice(c.path, "take")}
                  >
                    <span>Take</span>
                    <code>{String(c.incoming)}</code>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="tool-button-row">
          <button type="button" className="tool-btn-primary" onClick={onConfirm}>
            Apply with choices
          </button>
          <button type="button" className="tool-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
