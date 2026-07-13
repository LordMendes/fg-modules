"use client";

import { useCallback, useState } from "react";
import type { ClassSpellLevelSummary, ClassSpellRef, SpellPreview } from "@/lib/entities";
import { fetchClassSpellsAtLevel, fetchSpellPreview } from "@/actions/data";
import { useSessionNonce } from "@/components/session-provider";
import { SpellPreviewModal } from "@/components/spell-preview-modal";
import { ClassSpellTable } from "@/components/class-spell-table";

type LevelState = {
  open: boolean;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  spells: ClassSpellRef[];
};

export function ClassSpellList({
  classSlug,
  levels,
}: {
  classSlug: string;
  levels: ClassSpellLevelSummary[];
}) {
  const nonce = useSessionNonce();
  const [levelState, setLevelState] = useState<Record<number, LevelState>>({});
  const [modalSpell, setModalSpell] = useState<SpellPreview | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadLevel = useCallback(
    async (level: number) => {
      setLevelState((prev) => ({
        ...prev,
        [level]: {
          open: true,
          loading: true,
          loaded: prev[level]?.loaded ?? false,
          error: null,
          spells: prev[level]?.spells ?? [],
        },
      }));

      const result = await fetchClassSpellsAtLevel({ classSlug, level, nonce });
      setLevelState((prev) => ({
        ...prev,
        [level]: {
          open: true,
          loading: false,
          loaded: true,
          error: result.success ? null : (result.error ?? "Failed to load spells"),
          spells: result.spells ?? [],
        },
      }));
    },
    [classSlug, nonce],
  );

  const toggleLevel = useCallback(
    (level: number) => {
      const current = levelState[level];
      if (current?.open) {
        setLevelState((prev) => ({
          ...prev,
          [level]: { ...prev[level], open: false },
        }));
        return;
      }

      if (current?.loaded) {
        setLevelState((prev) => ({
          ...prev,
          [level]: { ...current, open: true },
        }));
        return;
      }

      void loadLevel(level);
    },
    [levelState, loadLevel],
  );

  const openSpell = useCallback(
    async (spellSlug: string) => {
      setModalLoading(true);
      setModalError(null);
      setModalSpell(null);

      const result = await fetchSpellPreview({ spellSlug, nonce });
      setModalLoading(false);

      if (!result.success || !result.spell) {
        setModalError(result.error ?? "Failed to load spell");
        return;
      }

      setModalSpell(result.spell);
    },
    [nonce],
  );

  const closeModal = useCallback(() => {
    setModalSpell(null);
    setModalError(null);
    setModalLoading(false);
  }, []);

  const showModal = modalLoading || modalSpell !== null || modalError !== null;

  return (
    <>
      <section className="class-spells-section">
        <h2>Class Spells</h2>
        <div className="class-spell-levels">
          {levels.map((level) => {
            const state = levelState[level.level];
            const isOpen = state?.open ?? false;

            return (
              <div
                key={level.level}
                className={`class-spell-level${isOpen ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="class-spell-level-toggle"
                  aria-expanded={isOpen}
                  onClick={() => toggleLevel(level.level)}
                >
                  <span className="class-spell-level-title">{level.label}</span>
                  <span className="class-spell-level-count">{level.count} spells</span>
                  <span className="class-spell-level-icon" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="class-spell-level-body">
                    {state?.loading && (
                      <p className="class-spell-level-status">Loading spells…</p>
                    )}
                    {state?.error && (
                      <p className="class-spell-level-error">{state.error}</p>
                    )}
                    {state?.loaded && state.spells.length === 0 && (
                      <p className="class-spell-level-status">No spells at this level.</p>
                    )}
                    {state?.spells && state.spells.length > 0 && (
                      <ClassSpellTable spells={state.spells} onSpellClick={(slug) => void openSpell(slug)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {showModal && (
        <SpellPreviewModal
          spell={modalSpell}
          loading={modalLoading}
          error={modalError}
          onClose={closeModal}
        />
      )}
    </>
  );
}
