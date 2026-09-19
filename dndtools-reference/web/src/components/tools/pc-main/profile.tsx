"use client";

import { PcImageSlot } from "@/components/tools/pc-image-slot";
import { PcMainRaceAlignmentFields } from "@/components/tools/pc-main/race-alignment";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import type { PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

function formatClassLine(classLevels: PcPlanState["identity"]["classLevels"]): string {
  return classLevels.map((cl) => `${cl.className} ${cl.level}`).join(" / ");
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
  const classLine = formatClassLine(state.identity.classLevels);

  return (
    <PcSheetCard title="Character profile" className="pc-main-profile">
      <div className="npc-sheet-header pc-main-header">
        {planId ? (
          <div className="pc-main-images" aria-label="Character images">
            <PcImageSlot
              planId={planId}
              kind="profile"
              imageKey={state.identity.profileImageKey}
              readOnly={readOnly}
              compact
              onKeyChange={(key) =>
                patch((s) => {
                  s.identity.profileImageKey = key;
                })
              }
            />
            <PcImageSlot
              planId={planId}
              kind="token"
              imageKey={state.identity.tokenImageKey}
              readOnly={readOnly}
              compact
              onKeyChange={(key) =>
                patch((s) => {
                  s.identity.tokenImageKey = key;
                })
              }
            />
          </div>
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
          {classLine ? (
            <p className="pc-main-identity">
              <span className="pc-main-identity-core">{classLine}</span>
            </p>
          ) : null}
        </div>
      </div>
      <PcMainRaceAlignmentFields state={state} patch={patch} />
    </PcSheetCard>
  );
}
