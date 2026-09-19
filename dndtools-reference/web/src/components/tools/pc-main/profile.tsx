"use client";

import { useState } from "react";
import { PcImageDialog } from "@/components/tools/pc-image-dialog";
import { PcImageSlot } from "@/components/tools/pc-image-slot";
import { PcMainRaceAlignmentFields } from "@/components/tools/pc-main/race-alignment";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { totalCharacterLevel } from "@/lib/pc-planner/skillPoints";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

function formatClassSummary(classLevels: PcPlanState["identity"]["classLevels"]): string | null {
  if (classLevels.length === 0) return null;
  const classes = classLevels.map((cl) => `${cl.className} ${cl.level}`).join(" / ");
  return `${classes} · Level ${totalCharacterLevel(classLevels)}`;
}

export function PcMainProfile({
  state,
  patch,
  planId,
  readOnly,
  onNameBlur,
}: {
  state: PcPlanState;
  patch: PatchFn;
  planId?: string | null;
  readOnly?: boolean;
  onNameBlur: () => void;
}) {
  const classSummary = formatClassSummary(state.identity.classLevels);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);

  return (
    <PcSheetCard title="Character profile" className="pc-main-profile">
      <div
        className={
          planId ? "pc-main-header-block pc-main-header-block--with-images" : "pc-main-header-block"
        }
      >
        {planId ? (
          <>
            <div className="pc-main-images" aria-label="Character images">
              <PcImageSlot
                planId={planId}
                kind="profile"
                imageKey={state.identity.profileImageKey}
                readOnly={readOnly}
                compact
                onActivate={readOnly ? undefined : () => setImagesDialogOpen(true)}
                onKeyChange={(key) =>
                  patch((s) => {
                    s.identity.profileImageKey = key;
                  })
                }
              />
            </div>
            <PcImageDialog
              open={imagesDialogOpen}
              onClose={() => setImagesDialogOpen(false)}
              planId={planId}
              profileImageKey={state.identity.profileImageKey}
              tokenImageKey={state.identity.tokenImageKey}
              onProfileKeyChange={(key) =>
                patch((s) => {
                  s.identity.profileImageKey = key;
                })
              }
              onTokenKeyChange={(key) =>
                patch((s) => {
                  s.identity.tokenImageKey = key;
                })
              }
              readOnly={readOnly}
            />
          </>
        ) : null}
        <div className="pc-main-header-text">
          <input
            type="text"
            className="pc-sheet-input pc-sheet-input--title npc-sheet-name"
            value={state.identity.name}
            placeholder="Character name"
            aria-label="Character name"
            onChange={(e) =>
              patch((s) => {
                s.identity.name = e.target.value;
              })
            }
            onBlur={onNameBlur}
          />
          {classSummary ? <p className="pc-main-class-summary">{classSummary}</p> : null}
        </div>
      </div>
      <PcMainRaceAlignmentFields state={state} patch={patch} />
    </PcSheetCard>
  );
}
