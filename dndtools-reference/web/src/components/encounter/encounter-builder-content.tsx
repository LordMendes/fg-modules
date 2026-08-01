"use client";

import Link from "next/link";
import {
  EncounterPartyConfig,
  elDeltaClassName,
  formatElDelta,
} from "@/components/encounter/encounter-party-config";
import { EncounterSavedList } from "@/components/encounter/encounter-saved-list";
import { useEncounter } from "@/components/encounter/encounter-provider";
import { formatEl, formatXp } from "@/lib/encounter/formatEl";

export function EncounterBuilderContent() {
  const { entries, summary, partyConfig, setPartyConfig } = useEncounter();
  const deltaLabel = formatElDelta(summary.elDelta);

  return (
    <>
      <section className="encounter-builder-panel">
        <h2>Party &amp; difficulty</h2>
        <p className="encounter-builder-panel-desc">
          Set your party size, average level, and desired difficulty. The target
          EL is the goal while you add creatures from the monster compendium.
        </p>
        <EncounterPartyConfig
          config={partyConfig}
          targetEl={summary.targetEl}
          onChange={setPartyConfig}
        />

        {entries.length > 0 && (
          <div className="encounter-builder-draft">
            <h3>Current draft</h3>
            <p>
              EL {formatEl(summary.el)}
              {summary.targetEl !== null && (
                <> · Target {formatEl(summary.targetEl)}</>
              )}
              {deltaLabel && (
                <>
                  {" "}
                  ·{" "}
                  <span className={elDeltaClassName(summary.elDelta)}>
                    {deltaLabel}
                  </span>
                </>
              )}
              {" "}
              · {summary.creatureCount} creature
              {summary.creatureCount !== 1 ? "s" : ""} ·{" "}
              {formatXp(summary.totalXpPerPc)} XP/PC
            </p>
            <Link href="/monsters" className="tool-btn-primary">
              Continue building
            </Link>
          </div>
        )}
      </section>

      <EncounterSavedList />
    </>
  );
}
