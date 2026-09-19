"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { paginateEntities } from "@/actions/data";
import { useSessionNonce } from "@/components/session-provider";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

type ClassOption = {
  slug: string;
  name: string;
  sourceAbbrev?: string | null;
};

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
  const nonce = useSessionNonce();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [options, setOptions] = useState<ClassOption[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const addClass = useCallback(
    (hit: ClassOption) => {
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
      setAddOpen(false);
      setFilter("");
    },
    [patch],
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
          if (result.error === "Invalid session") router.refresh();
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
    [nonce, router],
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
      setAddOpen(false);
      setFilter("");
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [addOpen]);

  const addedSlugs = new Set(classLevels.map((cl) => cl.classSlug));

  return (
    <PcSheetCard
      title="Classes"
      className="pc-main-classes"
      actions={
        <button
          type="button"
          className="pc-class-add-toggle"
          aria-expanded={addOpen}
          aria-label={addOpen ? "Close class list" : "Add class"}
          onClick={() =>
            setAddOpen((open) => {
              if (open) setFilter("");
              return !open;
            })
          }
        >
          <Plus aria-hidden className="pc-class-add-toggle-icon" />
        </button>
      }
    >
      {addOpen ? (
        <div className="pc-class-add-panel" ref={panelRef}>
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
                const alreadyAdded = addedSlugs.has(option.slug);
                return (
                  <li key={option.slug} role="presentation">
                    <button
                      type="button"
                      role="option"
                      className="pc-class-add-option"
                      disabled={alreadyAdded}
                      aria-disabled={alreadyAdded}
                      onClick={() => addClass(option)}
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

      {classLevels.length === 0 ? (
        <p className="pc-sheet-empty">Add a class with + above.</p>
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
                      1st
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
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PcSheetCard>
  );
}
