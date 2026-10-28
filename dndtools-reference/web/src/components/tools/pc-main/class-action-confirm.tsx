"use client";

import { useEffect } from "react";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";

export type PendingFirstClassAction = {
  kind: "first";
  classSlug: string;
  className: string;
  previousFirstName: string;
};

export type PendingRemoveClassAction = {
  kind: "remove";
  index: number;
  classSlug: string;
  className: string;
  level: number;
  isFirstClass: boolean;
};

export type PendingDisableGestaltAction = {
  kind: "disable-gestalt";
  characterLevel: number;
  sideBClassNames: string[];
};

export type PendingClassAction =
  | PendingFirstClassAction
  | PendingRemoveClassAction
  | PendingDisableGestaltAction;

function firstClassChangeLines(action: PendingFirstClassAction): string[] {
  const lines = [
    `${action.className} becomes the class taken at 1st character level.`,
    `${action.className} level 1 will grant ×4 skill points (PHB multiclass rule).`,
    `${action.className} level 1 hit die will use the maximum roll when hit dice sync.`,
    `${action.previousFirstName} will no longer receive ×4 skill points or a maximum first hit die for its level 1.`,
    "Skill point budget and hit points will recalculate on the next sheet sync.",
  ];
  return lines;
}

function removeClassChangeLines(action: PendingRemoveClassAction): string[] {
  const lines = [
    `Remove ${action.className} and all ${action.level} level${action.level === 1 ? "" : "s"} from this character.`,
    `Character level drops by ${action.level}.`,
    "Base attack bonus, saves, and class-derived combat stats will recalculate.",
    "Skill point budget will recalculate from remaining classes.",
    "Hit dice rolls for this class will be removed on the next sheet sync.",
  ];

  const casting = getClassCastingInfo(action.classSlug, action.className);
  if (casting) {
    lines.push(
      casting.progression === "spontaneous"
        ? "Known spells and daily slots for this class will be removed."
        : "Prepared spells, spellbook entries, and daily slots for this class will be removed.",
    );
  }

  if (action.isFirstClass) {
    lines.push("Another remaining class will become the 1st character level class automatically.");
  }

  return lines;
}

function disableGestaltChangeLines(action: PendingDisableGestaltAction): string[] {
  const lines = [
    "Gestalt planning will turn off.",
    `Side A classes become a normal multiclass list (${action.characterLevel} character level${action.characterLevel === 1 ? "" : "s"} from side A).`,
  ];
  if (action.sideBClassNames.length > 0) {
    lines.push(
      `Side B classes will be dropped: ${action.sideBClassNames.join(", ")}.`,
    );
  } else {
    lines.push("Side B is empty, so no classes are dropped.");
  }
  lines.push("Base attack bonus, saves, skill points, and hit dice will use normal multiclass stacking again.");
  return lines;
}

export function ClassActionConfirmDialog({
  action,
  onConfirm,
  onCancel,
}: {
  action: PendingClassAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const title =
    action.kind === "first"
      ? `Make ${action.className} your 1st level class?`
      : action.kind === "disable-gestalt"
        ? "Turn off Gestalt planning?"
        : `Remove ${action.className}?`;

  const intro =
    action.kind === "first"
      ? "This affects which class gets the special 1st character level benefits:"
      : action.kind === "disable-gestalt"
        ? "This cannot be undone without rebuilding side B. The following will change:"
        : "This cannot be undone without re-adding the class. The following will change:";

  const lines =
    action.kind === "first"
      ? firstClassChangeLines(action)
      : action.kind === "disable-gestalt"
        ? disableGestaltChangeLines(action)
        : removeClassChangeLines(action);

  const titleId =
    action.kind === "first"
      ? "pc-class-first-confirm-title"
      : action.kind === "disable-gestalt"
        ? "pc-class-gestalt-confirm-title"
        : "pc-class-remove-confirm-title";

  const confirmLabel =
    action.kind === "first"
      ? "Make 1st"
      : action.kind === "disable-gestalt"
        ? "Turn off Gestalt"
        : "Remove class";

  return (
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div className="confirm-dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h3 id={titleId}>{title}</h3>
        <p>{intro}</p>
        <ul className="confirm-dialog-details">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="confirm-dialog-actions">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={
              action.kind === "remove" || action.kind === "disable-gestalt"
                ? "tool-btn tool-btn--danger"
                : "tool-btn"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
