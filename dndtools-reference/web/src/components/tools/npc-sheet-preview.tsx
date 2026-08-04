"use client";

import { FgSheetTabs } from "@/components/fg-sheet-tabs";
import { NpcMediaSlot } from "@/components/tools/npc-media-slot";
import { buildMergedSpecialQualities } from "@/lib/npc-creator/buildXml";
import type { NpcFgExportState } from "@/lib/npc-creator/types";

const NPC_SHEET_TABS = [
  { id: "main" as const, label: "Main" },
  { id: "spells" as const, label: "Spells" },
  { id: "other" as const, label: "Other" },
];

export type SheetTab = (typeof NPC_SHEET_TABS)[number]["id"];

export function NpcSheetPreview({
  state,
  tab,
  onTabChange,
  portraitSource,
  tokenSource,
  onPortraitSourceChange,
  onTokenSourceChange,
  onPortraitChange,
  onTokenChange,
}: {
  state: NpcFgExportState;
  tab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  portraitSource: string;
  tokenSource: string;
  onPortraitSourceChange: (url: string) => void;
  onTokenSourceChange: (url: string) => void;
  onPortraitChange: (dataUrl: string) => void;
  onTokenChange: (dataUrl: string) => void;
}) {
  const sq = buildMergedSpecialQualities(state);
  const abilityMod = (score: number) => {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  return (
    <aside className="tool-summary npc-sheet" aria-label="NPC sheet preview">
      <h2>Fantasy Grounds Preview</h2>
      <p className="npc-sheet-media-hint">
        Choose an image, then drag to pan and scroll/slider to zoom.
      </p>

      <div className="npc-sheet-media">
        <NpcMediaSlot
          kind="portrait"
          value={state.media.portraitDataUrl}
          sourceUrl={portraitSource}
          onSourceChange={onPortraitSourceChange}
          onChange={onPortraitChange}
        />
        <NpcMediaSlot
          kind="token"
          value={state.media.tokenDataUrl}
          sourceUrl={tokenSource}
          onSourceChange={onTokenSourceChange}
          onChange={onTokenChange}
        />
      </div>

      <FgSheetTabs tabs={NPC_SHEET_TABS} value={tab} onChange={onTabChange} />

      {tab === "main" && (
        <div className="npc-sheet-panel" role="tabpanel">
          <div className="npc-sheet-header">
            <div className="npc-sheet-name">{state.identity.name || "Unnamed"}</div>
            <div className="npc-sheet-sub">
              {state.identity.creatureTypeTag || "—"} · {state.identity.alignment}
            </div>
            <div className="npc-sheet-cr">CR {state.identity.cr}</div>
          </div>

          <dl className="npc-sheet-stats">
            <div>
              <dt>Init</dt>
              <dd>
                {state.defense.init >= 0
                  ? `+${state.defense.init}`
                  : state.defense.init}
              </dd>
            </div>
            <div>
              <dt>AC</dt>
              <dd>{state.defense.ac}</dd>
            </div>
            <div>
              <dt>HP</dt>
              <dd>
                {state.defense.hp} ({state.defense.hd})
              </dd>
            </div>
            <div>
              <dt>Fort / Ref / Will</dt>
              <dd>
                {state.defense.fort} / {state.defense.ref} / {state.defense.will}
              </dd>
            </div>
          </dl>

          <div className="npc-sheet-abilities">
            {(
              [
                ["Str", state.abilities.str],
                ["Dex", state.abilities.dex],
                ["Con", state.abilities.con],
                ["Int", state.abilities.int],
                ["Wis", state.abilities.wis],
                ["Cha", state.abilities.cha],
              ] as const
            ).map(([label, score]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {score} ({abilityMod(score)})
                </strong>
              </div>
            ))}
          </div>

          <section className="npc-sheet-block">
            <h3>Offense</h3>
            <p>
              <strong>Speed</strong> {state.offense.speed}
            </p>
            <p>
              <strong>BAB</strong> {state.offense.babgrp}
            </p>
            <p>
              <strong>Atk</strong> {state.offense.atk}
            </p>
            <p>
              <strong>Full</strong> {state.offense.fullatk}
            </p>
            <p>
              <strong>SA</strong>{" "}
              {state.specialattacksOverride || state.offense.specialattacks}
            </p>
          </section>

          <section className="npc-sheet-block">
            <h3>Defense / SQ</h3>
            <p>{sq}</p>
            {state.senses ? (
              <p>
                <strong>Senses</strong> {state.senses}
              </p>
            ) : null}
            {state.aura ? (
              <p>
                <strong>Aura</strong> {state.aura}
              </p>
            ) : null}
          </section>

          <section className="npc-sheet-block">
            <h3>Feats / Skills</h3>
            <p>
              <strong>Feats</strong> {state.feats || "—"}
            </p>
            <p>
              <strong>Skills</strong> {state.skills || "—"}
            </p>
            <p>
              <strong>Languages</strong> {state.languages || "—"}
            </p>
          </section>
        </div>
      )}

      {tab === "spells" && (
        <div className="npc-sheet-panel" role="tabpanel">
          {!state.spellcasting.enabled ? (
            <p className="npc-sheet-empty">Spellcasting disabled.</p>
          ) : (
            <>
              <p>
                <strong>{state.spellcasting.label}</strong> CL{" "}
                {state.spellcasting.casterLevel} · {state.spellcasting.mode}
              </p>
              <p className="npc-sheet-slots">
                Slots:{" "}
                {state.spellcasting.slots
                  .map((n, i) => (n > 0 ? `${i}:${n}` : null))
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              <ul className="npc-sheet-spell-list">
                {state.spellcasting.spells.map((sp, i) => (
                  <li key={`${sp.level}-${sp.name}-${i}`}>
                    <span className="npc-sheet-spell-lvl">L{sp.level}</span>{" "}
                    {sp.name}
                    {sp.prepared > 1 ? ` ×${sp.prepared}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === "other" && (
        <div className="npc-sheet-panel" role="tabpanel">
          <dl className="npc-sheet-ecology">
            <div>
              <dt>Advancement</dt>
              <dd>{state.identity.advancement}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{state.identity.organization}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>{state.identity.environment}</dd>
            </div>
            <div>
              <dt>Treasure</dt>
              <dd>{state.identity.treasure}</dd>
            </div>
            <div>
              <dt>LA</dt>
              <dd>{state.identity.levelAdjustment}</dd>
            </div>
          </dl>
          <section className="npc-sheet-block">
            <h3>Notes</h3>
            <div
              className="npc-sheet-notes"
              dangerouslySetInnerHTML={{
                __html: state.notesFormattedHtml || "<p>—</p>",
              }}
            />
            {state.magicalEffectsNotes ? (
              <p>
                <strong>Magical effects:</strong> {state.magicalEffectsNotes}
              </p>
            ) : null}
          </section>
        </div>
      )}
    </aside>
  );
}
