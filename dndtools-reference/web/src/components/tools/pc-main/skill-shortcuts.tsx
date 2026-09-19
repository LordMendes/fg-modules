"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { DieIcon } from "@/components/dice/die-icon";
import { RollableStat } from "@/components/dice/rollable-stat";
import type { EquippedBonuses } from "@/lib/pc-planner/itemBonuses";
import { skillItemBonus } from "@/lib/pc-planner/itemBonuses";
import { formatModifier } from "@/lib/pc-planner/combatStats";
import { deriveFeatEffects, featSkillBonus } from "@/lib/pc-planner/parseFeatEffects";
import { computeSkillTotal } from "@/lib/pc-planner/skillPoints";
import { skillRowKey } from "@/lib/pc-planner/syncSkills";
import type { PcPlanState, SkillRow } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

type PickerMenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const PICKER_MENU_WIDTH = 192;
const PICKER_MENU_MAX_HEIGHT = 160;
const PICKER_MENU_GAP = 6;
const PICKER_MENU_Z_INDEX = 250;

function resolveShortcutRow(skills: SkillRow[], key: string): SkillRow | undefined {
  return skills.find((row) => skillRowKey(row.name, row.slug) === key);
}

function SkillShortcutRollFace({ modifier }: { modifier: number | null }) {
  return (
    <span className="pc-main-skill-shortcut-roll-face">
      <DieIcon sides={20} color="#ffffff" labeled={false} className="pc-main-skill-shortcut-die" />
      <span className="pc-main-skill-shortcut-mod">
        {modifier == null ? "—" : formatModifier(modifier)}
      </span>
    </span>
  );
}

export function PcMainSkillShortcuts({
  state,
  patch,
  readOnly = false,
  skillAcp,
  featEffects,
  equippedItemBonuses,
}: {
  state: PcPlanState;
  patch: PatchFn;
  readOnly?: boolean;
  skillAcp: number;
  featEffects: ReturnType<typeof deriveFeatEffects>;
  equippedItemBonuses: EquippedBonuses;
}) {
  const shortcuts = state.skillShortcuts ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMenuPos, setPickerMenuPos] = useState<PickerMenuPos | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const skillsByKey = useMemo(() => {
    const map = new Map<string, SkillRow>();
    for (const row of state.skills) {
      map.set(skillRowKey(row.name, row.slug), row);
    }
    return map;
  }, [state.skills]);

  const shortcutEntries = useMemo(
    () =>
      shortcuts
        .map((key) => {
          const row = skillsByKey.get(key) ?? resolveShortcutRow(state.skills, key);
          if (!row) return null;
          const itemSkill = skillItemBonus(equippedItemBonuses, row);
          const featSkill = featSkillBonus(featEffects, row.name, row.slug);
          const total = computeSkillTotal(
            row,
            state.abilities,
            skillAcp,
            itemSkill.total + featSkill,
          );
          return { key, row, total };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null),
    [
      shortcuts,
      skillsByKey,
      state.skills,
      state.abilities,
      skillAcp,
      featEffects,
      equippedItemBonuses,
    ],
  );

  const availableSkills = useMemo(() => {
    const selected = new Set(shortcuts);
    return state.skills
      .filter((row) => !selected.has(skillRowKey(row.name, row.slug)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.skills, shortcuts]);

  useLayoutEffect(() => {
    if (!pickerOpen) {
      setPickerMenuPos(null);
      return;
    }

    function updateMenuPos() {
      const anchor = addButtonRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const width = PICKER_MENU_WIDTH;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      const spaceAbove = rect.top - PICKER_MENU_GAP;
      const spaceBelow = window.innerHeight - rect.bottom - PICKER_MENU_GAP;
      const openUp = spaceAbove >= spaceBelow;

      let top: number;
      let maxHeight: number;
      if (openUp) {
        maxHeight = Math.min(PICKER_MENU_MAX_HEIGHT, spaceAbove);
        top = rect.top - PICKER_MENU_GAP - maxHeight;
      } else {
        maxHeight = Math.min(PICKER_MENU_MAX_HEIGHT, spaceBelow);
        top = rect.bottom + PICKER_MENU_GAP;
      }

      top = Math.max(8, top);
      maxHeight = Math.min(maxHeight, window.innerHeight - top - 8);

      setPickerMenuPos({ top, left, width, maxHeight });
    }

    updateMenuPos();
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [pickerOpen, availableSkills.length]);

  useEffect(() => {
    if (!pickerOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setPickerOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [pickerOpen]);

  function addShortcut(key: string) {
    patch((draft) => {
      const list = draft.skillShortcuts ?? [];
      if (list.includes(key)) return;
      draft.skillShortcuts = [...list, key];
    });
    setPickerOpen(false);
  }

  function removeShortcut(key: string) {
    patch((draft) => {
      draft.skillShortcuts = (draft.skillShortcuts ?? []).filter((entry) => entry !== key);
    });
  }

  if (readOnly && shortcutEntries.length === 0) {
    return null;
  }

  return (
    <div className="pc-main-skill-shortcuts">
      <div className="pc-main-skill-shortcuts-row" aria-label="Skill check shortcuts">
        {shortcutEntries.map(({ key, row, total }) => (
          <div key={key} className="pc-main-skill-shortcut">
            <span className="pc-main-skill-shortcut-label">{row.name}</span>
            <div className="pc-main-skill-shortcut-roll-wrap">
              {total == null ? (
                <button
                  type="button"
                  className="pc-main-skill-shortcut-roll pc-main-skill-shortcut-roll--disabled"
                  disabled
                  title={`${row.name} requires ranks (trained only)`}
                  aria-label={`${row.name} requires ranks`}
                >
                  <SkillShortcutRollFace modifier={null} />
                </button>
              ) : (
                <RollableStat
                  label={row.name}
                  modifier={total}
                  kind="skill"
                  className="pc-main-skill-shortcut-roll"
                >
                  <SkillShortcutRollFace modifier={total} />
                </RollableStat>
              )}
              {!readOnly ? (
                <button
                  type="button"
                  className="pc-main-skill-shortcut-remove"
                  aria-label={`Remove ${row.name} shortcut`}
                  onClick={() => removeShortcut(key)}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {!readOnly && availableSkills.length > 0 ? (
          <div className="pc-main-skill-shortcut pc-main-skill-shortcut--add" ref={pickerRef}>
            <span className="pc-main-skill-shortcut-label">Add</span>
            <div className="pc-main-skill-shortcut-roll-wrap">
              <button
                ref={addButtonRef}
                type="button"
                className="pc-main-skill-shortcut-roll pc-main-skill-shortcut-roll--add"
                aria-expanded={pickerOpen}
                aria-controls={listId}
                aria-label="Add skill shortcut"
                onClick={() => setPickerOpen((open) => !open)}
              >
                <Plus aria-hidden className="pc-main-skill-shortcut-add-icon" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {pickerOpen && pickerMenuPos
        ? createPortal(
            <ul
              ref={menuRef}
              id={listId}
              className="pc-main-skill-shortcut-options pc-main-skill-shortcut-options--floating"
              role="listbox"
              style={{
                position: "fixed",
                top: pickerMenuPos.top,
                left: pickerMenuPos.left,
                width: pickerMenuPos.width,
                maxHeight: pickerMenuPos.maxHeight,
                zIndex: PICKER_MENU_Z_INDEX,
              }}
            >
              {availableSkills.map((row) => {
                const key = skillRowKey(row.name, row.slug);
                return (
                  <li key={key} role="presentation">
                    <button
                      type="button"
                      role="option"
                      className="pc-main-skill-shortcut-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addShortcut(key)}
                    >
                      {row.name}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
