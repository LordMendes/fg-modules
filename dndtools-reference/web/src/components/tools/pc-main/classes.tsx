"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Star } from "lucide-react";
import { paginateEntities } from "@/actions/data";
import { useRefreshSession, useSessionNonce } from "@/components/session-provider";
import {
  ClassActionConfirmDialog,
  type PendingClassAction,
} from "@/components/tools/pc-main/class-action-confirm";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import {
  classLevelsFromGestaltSideA,
  expandClassLevelsToGestaltRows,
} from "@/lib/pc-planner/gestalt";
import { pickGestaltHitDieSide, resolveHitDie } from "@/lib/pc-planner/hitPoints";
import { effectiveFirstClassSlug } from "@/lib/pc-planner/skillPoints";
import type { GestaltLevelRow, PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

type ClassOption = {
  slug: string;
  name: string;
  sourceAbbrev?: string | null;
};

type PickerTarget =
  | { kind: "add-class" }
  | { kind: "gestalt-cell"; rowIndex: number; side: "a" | "b" };

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
  const gestalt = Boolean(state.identity.gestalt);
  const gestaltLevels = state.identity.gestaltLevels ?? [];
  const nonce = useSessionNonce();
  const refreshSession = useRefreshSession();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [filter, setFilter] = useState("");
  const [options, setOptions] = useState<ClassOption[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<PendingClassAction | null>(null);

  const addOpen = pickerTarget != null;

  function confirmPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.kind === "first") {
      patch((s) => {
        s.identity.firstClassSlug = pendingAction.classSlug;
      });
    } else if (pendingAction.kind === "disable-gestalt") {
      patch((s) => {
        const rows = s.identity.gestaltLevels ?? [];
        s.identity.classLevels = classLevelsFromGestaltSideA(rows);
        s.identity.gestalt = false;
        s.identity.gestaltLevels = [];
        if (s.identity.classLevels[0]) {
          s.identity.firstClassSlug = s.identity.classLevels[0].classSlug;
        }
      });
    } else {
      patch((s) => {
        s.identity.classLevels.splice(pendingAction.index, 1);
      });
    }
    setPendingAction(null);
  }

  const closePicker = useCallback(() => {
    setPickerTarget(null);
    setFilter("");
  }, []);

  const applyClassPick = useCallback(
    (hit: ClassOption) => {
      if (!pickerTarget) return;
      if (pickerTarget.kind === "add-class") {
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
        });
      } else {
        const { rowIndex, side } = pickerTarget;
        patch((s) => {
          const rows = s.identity.gestaltLevels ?? [];
          if (!rows[rowIndex]) return;
          rows[rowIndex][side] = { classSlug: hit.slug, className: hit.name };
          if (rowIndex === 0 && side === "a") {
            s.identity.firstClassSlug = hit.slug;
          }
        });
      }
      closePicker();
    },
    [closePicker, patch, pickerTarget],
  );

  const loadClasses = useCallback(
    (search: string, cursor?: string, append = false) => {
      const id = ++requestId.current;
      startTransition(async () => {
        const result = await paginateEntities({
          category: "classes",
          nonce,
          search: search.trim() || undefined,
          cursor,
        });
        if (id !== requestId.current) return;
        if (!result.success) {
          if (result.error === "Invalid session") void refreshSession();
          setLoadError(result.error ?? "Could not load classes");
          if (!append) setOptions([]);
          setNextCursor(null);
          return;
        }
        setLoadError(null);
        const hits =
          result.items?.map((item) => ({
            slug: item.slug,
            name: item.name,
            sourceAbbrev: item.sourceAbbrev,
          })) ?? [];
        setOptions((prev) => (append ? [...prev, ...hits] : hits));
        setNextCursor(result.nextCursor ?? null);
      });
    },
    [nonce, refreshSession],
  );

  useEffect(() => {
    if (!addOpen) return;
    const timer = window.setTimeout(() => {
      loadClasses(filter);
    }, filter.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [addOpen, filter, loadClasses]);

  useEffect(() => {
    if (!addOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((event.target as Element).closest?.(".pc-class-add-toggle")) return;
      if ((event.target as Element).closest?.(".pc-gestalt-cell-pick")) return;
      closePicker();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [addOpen, closePicker]);

  const addedSlugs = new Set(classLevels.map((cl) => cl.classSlug));
  const firstClassSlug = effectiveFirstClassSlug(
    classLevels,
    state.identity.firstClassSlug,
  );
  const previousFirstClass = classLevels.find((cl) => cl.classSlug === firstClassSlug);

  function enableGestalt() {
    patch((s) => {
      s.identity.gestalt = true;
      s.identity.gestaltLevels = expandClassLevelsToGestaltRows(s.identity.classLevels);
    });
  }

  function requestDisableGestalt() {
    const rows = gestaltLevels;
    const sideBNames = [
      ...new Set(
        rows
          .map((r) => r.b?.className)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    setPendingAction({
      kind: "disable-gestalt",
      characterLevel: rows.length,
      sideBClassNames: sideBNames,
    });
  }

  function addGestaltLevel() {
    const rows = gestaltLevels;
    if (rows.length >= 20) return;
    const prev = rows[rows.length - 1];
    const next: GestaltLevelRow = prev
      ? {
          a: prev.a ? { ...prev.a } : null,
          b: prev.b ? { ...prev.b } : null,
        }
      : { a: null, b: null };
    const newIndex = rows.length;
    patch((s) => {
      s.identity.gestaltLevels = [...(s.identity.gestaltLevels ?? []), next];
    });
    // First level (or a blank copy) needs a class pick; open side A immediately.
    if (!next.a) {
      setPickerTarget({ kind: "gestalt-cell", rowIndex: newIndex, side: "a" });
    }
  }

  function removeGestaltLevel(index: number) {
    patch((s) => {
      const rows = [...(s.identity.gestaltLevels ?? [])];
      if (index < 0 || index >= rows.length) return;
      rows.splice(index, 1);
      s.identity.gestaltLevels = rows;
    });
  }

  function clearGestaltCell(rowIndex: number, side: "a" | "b") {
    patch((s) => {
      const rows = s.identity.gestaltLevels ?? [];
      if (!rows[rowIndex]) return;
      rows[rowIndex][side] = null;
    });
  }

  const pickerLabel =
    pickerTarget?.kind === "gestalt-cell"
      ? `Pick class for level ${pickerTarget.rowIndex + 1} side ${pickerTarget.side.toUpperCase()}`
      : "Add class";

  return (
    <>
      {pendingAction ? (
        <ClassActionConfirmDialog
          action={pendingAction}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
      <PcSheetCard
        title="Classes"
        className="pc-main-classes"
        actions={
          <div className="pc-class-card-actions">
            <label className="pc-gestalt-toggle">
              <input
                type="checkbox"
                checked={gestalt}
                onChange={(e) => {
                  if (e.target.checked) enableGestalt();
                  else requestDisableGestalt();
                }}
              />
              <span>Gestalt</span>
            </label>
            <button
              type="button"
              className="pc-class-add-toggle"
              aria-expanded={gestalt ? undefined : addOpen}
              aria-label={
                gestalt
                  ? "Add gestalt level"
                  : addOpen
                    ? "Close class list"
                    : "Add class"
              }
              disabled={gestalt && gestaltLevels.length >= 20}
              onClick={() => {
                if (gestalt) {
                  addGestaltLevel();
                  return;
                }
                setPickerTarget((prev) => {
                  if (prev?.kind === "add-class") {
                    setFilter("");
                    return null;
                  }
                  return { kind: "add-class" };
                });
              }}
            >
              <Plus aria-hidden className="pc-class-add-toggle-icon" />
            </button>
          </div>
        }
      >
        {addOpen ? (
          <div className="pc-class-add-panel" ref={panelRef}>
            <p className="pc-class-picker-label">{pickerLabel}</p>
            <input
              type="search"
              className="pc-sheet-input pc-class-add-filter"
              value={filter}
              placeholder="Filter classes…"
              aria-label="Filter classes"
              onChange={(event) => setFilter(event.target.value)}
            />
            {loadError ? <p className="pc-sheet-empty">{loadError}</p> : null}
            {isPending && options.length === 0 ? (
              <p className="pc-sheet-empty">Loading classes…</p>
            ) : null}
            {!isPending && !loadError && options.length === 0 ? (
              <p className="pc-sheet-empty">No classes found.</p>
            ) : null}
            {options.length > 0 ? (
              <ul className="pc-class-add-list" role="listbox" aria-label="Classes">
                {options.map((option) => {
                  const alreadyAdded =
                    pickerTarget?.kind === "add-class" && addedSlugs.has(option.slug);
                  return (
                    <li key={option.slug} role="presentation">
                      <button
                        type="button"
                        role="option"
                        className="pc-class-add-option"
                        disabled={alreadyAdded}
                        aria-disabled={alreadyAdded}
                        onClick={() => applyClassPick(option)}
                      >
                        <span className="pc-class-add-option-name">{option.name}</span>
                        {option.sourceAbbrev ? (
                          <span className="pc-class-add-option-meta">{option.sourceAbbrev}</span>
                        ) : null}
                        {alreadyAdded ? (
                          <span className="pc-class-add-option-added">Added</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {nextCursor ? (
              <button
                type="button"
                className="pc-sheet-link-btn pc-class-add-more"
                disabled={isPending}
                onClick={() => loadClasses(filter, nextCursor, true)}
              >
                {isPending ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        ) : null}

        {gestalt ? (
          gestaltLevels.length === 0 ? (
            <p className="pc-sheet-empty">Add a level with + above.</p>
          ) : (
            <ul className="pc-class-list pc-gestalt-list">
              {gestaltLevels.map((row, index) => {
                const sameClass =
                  row.a?.classSlug != null &&
                  row.b?.classSlug != null &&
                  row.a.classSlug === row.b.classSlug;
                const dieSide = pickGestaltHitDieSide(row, null);
                const dieLabel = dieSide
                  ? resolveHitDie(dieSide.classSlug, null)
                  : "—";
                return (
                  <li key={`gestalt-${index}`} className="pc-gestalt-row">
                    <span className="pc-gestalt-level" aria-label={`Character level ${index + 1}`}>
                      {index + 1}
                    </span>
                    <div className="pc-gestalt-sides">
                      {(["a", "b"] as const).map((side) => {
                        const cell = row[side];
                        return (
                          <div key={side} className="pc-gestalt-side">
                            {cell ? (
                              <>
                                <button
                                  type="button"
                                  className="pc-gestalt-cell-pick pc-class-name pc-feat-link"
                                  onClick={() =>
                                    setPickerTarget({
                                      kind: "gestalt-cell",
                                      rowIndex: index,
                                      side,
                                    })
                                  }
                                >
                                  {cell.className}
                                </button>
                                <button
                                  type="button"
                                  className="pc-class-remove"
                                  aria-label={`Clear ${side.toUpperCase()} on level ${index + 1}`}
                                  onClick={() => clearGestaltCell(index, side)}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="pc-gestalt-cell-pick pc-gestalt-cell-empty"
                                onClick={() =>
                                  setPickerTarget({
                                    kind: "gestalt-cell",
                                    rowIndex: index,
                                    side,
                                  })
                                }
                              >
                                Pick…
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="pc-gestalt-die" title="Hit die for this level">
                      {dieLabel}
                    </span>
                    <button
                      type="button"
                      className="pc-class-remove"
                      aria-label={`Remove character level ${index + 1}`}
                      onClick={() => removeGestaltLevel(index)}
                    >
                      ×
                    </button>
                    {sameClass ? (
                      <p className="pc-gestalt-warn">
                        Same class on both sides counts once.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : classLevels.length === 0 ? (
          <p className="pc-sheet-empty">Add a class with + above.</p>
        ) : (
          <ul
            className="pc-class-list"
            {...(classLevels.length > 1
              ? { role: "radiogroup" as const, "aria-label": "1st character level class" }
              : {})}
          >
            {classLevels.map((cl, index) => {
              const info = getClassCastingInfo(cl.classSlug, cl.className);
              const castingLabel = info
                ? `${info.dcAbility.toUpperCase()}${info.progression === "half" ? " · half caster" : ""}`
                : null;
              const isFirstClass = firstClassSlug === cl.classSlug;
              const canPickFirst = classLevels.length > 1;
              return (
                <li key={`${cl.classSlug}-${index}`} className="pc-class-row">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isFirstClass}
                    aria-label={`${cl.className} as 1st character level class`}
                    title="×4 skill points and maximum first hit die at level 1"
                    className={
                      isFirstClass
                        ? "pc-class-first-star is-checked"
                        : "pc-class-first-star"
                    }
                    disabled={!canPickFirst}
                    onClick={() => {
                      if (isFirstClass || !previousFirstClass) return;
                      setPendingAction({
                        kind: "first",
                        classSlug: cl.classSlug,
                        className: cl.className,
                        previousFirstName: previousFirstClass.className,
                      });
                    }}
                  >
                    <Star
                      aria-hidden
                      className="pc-class-first-star-icon"
                      fill={isFirstClass ? "currentColor" : "none"}
                    />
                  </button>
                  <div className="pc-class-identity">
                    {castingLabel ? (
                      <span className="pc-bonus-sources-wrap pc-class-name-wrap" tabIndex={0}>
                        <a
                          href={`/classes/${cl.classSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pc-class-name pc-feat-link"
                        >
                          {cl.className}
                        </a>
                        <span className="pc-skill-tooltip pc-bonus-sources-tooltip" role="tooltip">
                          <span className="pc-skill-tooltip-line">{castingLabel}</span>
                        </span>
                      </span>
                    ) : (
                      <a
                        href={`/classes/${cl.classSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pc-class-name pc-feat-link"
                      >
                        {cl.className}
                      </a>
                    )}
                  </div>
                  <div className="pc-class-level-controls">
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
                    <div className="pc-class-level-steps">
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
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pc-class-remove"
                    aria-label={`Remove ${cl.className}`}
                    onClick={() =>
                      setPendingAction({
                        kind: "remove",
                        index,
                        classSlug: cl.classSlug,
                        className: cl.className,
                        level: cl.level,
                        isFirstClass,
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PcSheetCard>
    </>
  );
}
