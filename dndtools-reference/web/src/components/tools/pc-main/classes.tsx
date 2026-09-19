"use client";

import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { CategoryKey } from "@/lib/categories";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const CLASS_SEARCH_CATEGORIES: CategoryKey[] = ["classes"];

function clampClassLevel(level: number): number {
  return Math.max(1, Math.min(20, level));
}

export function PcMainClasses({
  state,
  patch,
}: {
  state: PcPlanState;
  patch: PatchFn;
}) {
  const classLevels = state.identity.classLevels;

  return (
    <PcSheetCard title="Classes" className="pc-main-classes">
      {classLevels.length === 0 ? (
        <p className="pc-sheet-empty">Add a class below.</p>
      ) : (
        <ul className="pc-class-list">
          {classLevels.map((cl, index) => {
            const info = getClassCastingInfo(cl.classSlug, cl.className);
            const isFirstClass = state.identity.firstClassSlug === cl.classSlug;
            const showFirstSlot = classLevels.length > 1;
            return (
              <li
                key={`${cl.classSlug}-${index}`}
                className={showFirstSlot ? "pc-class-row pc-class-row--multiclass" : "pc-class-row"}
              >
                <div className="pc-class-identity">
                  <a
                    href={`/classes/${cl.classSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pc-class-name pc-feat-link"
                  >
                    {cl.className}
                  </a>
                  {info ? (
                    <span className="pc-class-casting">
                      {info.dcAbility.toUpperCase()}
                      {info.progression === "half" ? " · half caster" : ""}
                    </span>
                  ) : null}
                </div>
                {showFirstSlot ? (
                  isFirstClass ? (
                    <span className="pc-class-first-badge" title="Skill points ×4 at 1st level">
                      1st · ×4 skills
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pc-class-first-btn"
                      title="Use this class for ×4 skill points at 1st level"
                      onClick={() =>
                        patch((s) => {
                          s.identity.firstClassSlug = cl.classSlug;
                        })
                      }
                    >
                      Make 1st
                    </button>
                  )
                ) : null}
                <div className="pc-class-level-controls">
                  <span className="npc-sheet-sub">Lvl</span>
                  <button
                    type="button"
                    className="pc-class-level-step"
                    aria-label={`Decrease ${cl.className} level`}
                    disabled={cl.level <= 1}
                    onClick={() =>
                      patch((s) => {
                        if (!s.identity.classLevels[index]) return;
                        s.identity.classLevels[index].level = clampClassLevel(cl.level - 1);
                      })
                    }
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="pc-sheet-input pc-sheet-input--narrow"
                    min={1}
                    max={20}
                    value={cl.level}
                    aria-label={`${cl.className} level`}
                    onChange={(e) =>
                      patch((s) => {
                        if (!s.identity.classLevels[index]) return;
                        s.identity.classLevels[index].level = clampClassLevel(
                          Number(e.target.value),
                        );
                      })
                    }
                  />
                  <button
                    type="button"
                    className="pc-class-level-step"
                    aria-label={`Increase ${cl.className} level`}
                    disabled={cl.level >= 20}
                    onClick={() =>
                      patch((s) => {
                        if (!s.identity.classLevels[index]) return;
                        s.identity.classLevels[index].level = clampClassLevel(cl.level + 1);
                      })
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="pc-class-remove"
                  aria-label={`Remove ${cl.className}`}
                  onClick={() =>
                    patch((s) => {
                      s.identity.classLevels.splice(index, 1);
                    })
                  }
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <EntitySearchCombobox
        categories={CLASS_SEARCH_CATEGORIES}
        placeholder="Search classes to add…"
        label="Add class"
        onSelect={(hit) =>
          patch((s) => {
            if (s.identity.classLevels.some((cl) => cl.classSlug === hit.slug)) {
              return;
            }
            if (s.identity.classLevels.length === 0) {
              s.identity.firstClassSlug = hit.slug;
            }
            s.identity.classLevels.push({
              classSlug: hit.slug,
              className: hit.name,
              level: 1,
            });
          })
        }
      />
    </PcSheetCard>
  );
}
