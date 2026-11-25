"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { previewLevelRestore, restorePcPlanLevel, type LevelRestorePreview } from "@/actions/pc-plans";
import { characterLevelFromPlan } from "@/lib/pc-planner/gestalt";
import {
  classSummaryForPlan,
  classSummaryParts,
  describeLevelRestore,
  type LevelRestoreChange,
} from "@/lib/pc-planner/levelHistory";
import type { PcPlanState } from "@/lib/pc-planner/types";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";

type Prompt =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; preview: LevelRestorePreview; lines: LevelRestoreChange[] };

export function PcRestoreLevelButton({
  state,
  planId,
  readOnly,
  onRestoreState,
}: {
  state: PcPlanState;
  planId?: string | null;
  readOnly?: boolean;
  onRestoreState?: (state: PcPlanState) => void;
}) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [confirming, setConfirming] = useState(false);
  const requestId = useRef(0);
  const confirmingRef = useRef(false);
  confirmingRef.current = confirming;

  const closePrompt = useCallback(() => {
    if (confirmingRef.current) return;
    requestId.current += 1;
    setPrompt(null);
  }, []);

  useEffect(() => {
    if (!prompt || prompt.kind === "loading") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePrompt();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prompt, closePrompt]);

  if (!planId || readOnly || !onRestoreState) return null;

  async function openPrompt() {
    if (!planId) return;
    const request = ++requestId.current;
    setPrompt({ kind: "loading" });
    setConfirming(false);
    try {
      const preview = await previewLevelRestore(planId, characterLevelFromPlan(state));
      if (requestId.current !== request) return;
      if (!preview) {
        setPrompt({ kind: "empty" });
        return;
      }
      setPrompt({
        kind: "ready",
        preview,
        lines: describeLevelRestore(state, preview.state),
      });
    } catch {
      if (requestId.current !== request) return;
      setPrompt({ kind: "error", message: "Could not load the previous level." });
    }
  }

  async function confirmRestore() {
    if (!planId || prompt?.kind !== "ready" || confirming) return;
    setConfirming(true);
    const result = await restorePcPlanLevel(planId, prompt.preview.characterLevel);
    setConfirming(false);
    if (!result.success || !result.state) {
      setPrompt({ kind: "error", message: result.error ?? "Could not restore that level." });
      return;
    }
    onRestoreState?.(result.state);
    setPrompt(null);
  }

  const titleId = "pc-restore-level-title";
  const currentLevel = characterLevelFromPlan(state);
  const currentClasses = classSummaryParts(classSummaryForPlan(state));

  return (
    <>
      <button type="button" className="pc-class-restore" onClick={() => void openPrompt()}>
        Restore previous level
      </button>
      {prompt ? (
        <div className="confirm-dialog-overlay" role="presentation">
          <button
            type="button"
            className="confirm-dialog-backdrop"
            aria-label="Close dialog"
            disabled={confirming}
            onClick={closePrompt}
          />
          <div
            className="confirm-dialog-panel confirm-dialog-panel--restore"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {prompt.kind === "loading" ? (
              <>
                <h3 id={titleId}>Restore previous level</h3>
                <p>Looking up the last saved level…</p>
              </>
            ) : null}
            {prompt.kind === "empty" ? (
              <>
                <h3 id={titleId}>No previous level yet</h3>
                <p>
                  A copy is saved each time this character gains a level. There is no earlier
                  copy to return to.
                </p>
              </>
            ) : null}
            {prompt.kind === "error" ? (
              <>
                <h3 id={titleId}>Could not restore</h3>
                <p>{prompt.message}</p>
              </>
            ) : null}
            {prompt.kind === "ready" ? (
              <>
                <h3 id={titleId}>Restore level {prompt.preview.characterLevel}?</h3>
                <p className="pc-restore-lead">
                  This replaces the sheet you are editing. The saved copy stays in the level list.
                </p>
                <div className="pc-restore-compare">
                  <RestoreSide
                    kicker="Now"
                    level={currentLevel}
                    name={state.identity.name}
                    classes={currentClasses}
                    imageKey={state.identity.profileImageKey}
                  />
                  <span className="pc-restore-arrow" aria-hidden="true">
                    →
                  </span>
                  <RestoreSide
                    kicker="Saved"
                    level={prompt.preview.characterLevel}
                    name={prompt.preview.state.identity.name}
                    classes={classSummaryParts(prompt.preview.classSummary)}
                    imageKey={prompt.preview.state.identity.profileImageKey}
                    target
                  />
                </div>
                {prompt.lines.length > 0 ? (
                  <ul className="pc-restore-changes">
                    {prompt.lines.map((line, index) => (
                      <li
                        key={`${index}:${line.label}:${line.detail}`}
                        className={`pc-restore-change is-${line.kind}`}
                      >
                        <span className="pc-restore-tag">
                          {line.kind === "remove"
                            ? "Remove"
                            : line.kind === "restore"
                              ? "Bring back"
                              : "Change"}
                        </span>
                        <span className="pc-restore-change-copy">
                          <span className="pc-restore-change-label">{line.label}</span>
                          <span className="pc-restore-change-detail">{line.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pc-restore-empty-changes">
                    No other stats, gear, or choices differ.
                  </p>
                )}
              </>
            ) : null}
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={confirming}
                onClick={closePrompt}
              >
                {prompt.kind === "ready" ? "Cancel" : "Close"}
              </button>
              {prompt.kind === "ready" ? (
                <button
                  type="button"
                  className="tool-btn tool-btn--danger"
                  disabled={confirming}
                  onClick={() => void confirmRestore()}
                >
                  {confirming
                    ? "Restoring…"
                    : `Restore level ${prompt.preview.characterLevel}`}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RestoreSide({
  kicker,
  level,
  name,
  classes,
  imageKey,
  target = false,
}: {
  kicker: string;
  level: number;
  name: string;
  classes: string[];
  imageKey?: string | null;
  target?: boolean;
}) {
  const photo = pcImagePublicUrl(imageKey);
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <div className={target ? "pc-restore-side pc-restore-side--target" : "pc-restore-side"}>
      <div className="pc-restore-side-head">
        {photo ? (
          <img src={photo} alt="" className="pc-restore-photo" />
        ) : (
          <span className="pc-restore-photo pc-restore-photo--empty" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="pc-restore-side-title">
          <span className="pc-restore-kicker">{kicker}</span>
          <span className="pc-restore-level">Level {level}</span>
        </div>
      </div>
      <ul className="pc-restore-classes">
        {classes.map((entry, index) => (
          <li key={`${index}:${entry}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
