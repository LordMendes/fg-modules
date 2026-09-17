"use client";

import {
  addEncounterToCombatAction,
  addMonsterToNpcLibrary,
  addNpcToCombatAction,
  addTemplateToNpcLibrary,
  createEncounterAction,
  deleteEncounterAction,
  renameEncounterAction,
  searchMonstersForCombat,
  setEncounterEntryAction,
} from "@/actions/combat";
import { CampaignDrawerShell } from "@/components/combat/campaign-drawer-shell";
import { FgSheetTabs } from "@/components/fg-sheet-tabs";
import { loadUserTemplates } from "@/lib/npc-creator/storage";
import type {
  CampaignEncounterView,
  CampaignNpcView,
  CombatFaction,
} from "@/lib/combat/types";
import { Minus, Plus, Skull, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type NpcTab = "library" | "add" | "encounters";

const TABS = [
  { id: "library" as const, label: "Library" },
  { id: "add" as const, label: "Add NPC" },
  { id: "encounters" as const, label: "Encounters" },
];

export function CampaignNpcsDrawer({
  campaignId,
  npcLibrary,
  encounters,
  onClose,
  onOpenCombat,
}: {
  campaignId: string;
  npcLibrary: CampaignNpcView[];
  encounters: CampaignEncounterView[];
  onClose: () => void;
  onOpenCombat?: () => void;
}) {
  const [tab, setTab] = useState<NpcTab>("library");
  const [query, setQuery] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("");
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof searchMonstersForCombat>>
  >([]);
  const [searching, setSearching] = useState(false);
  const [faction, setFaction] = useState<CombatFaction>("foe");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<
    ReturnType<typeof loadUserTemplates>
  >([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(
    null,
  );
  const [newEncounterName, setNewEncounterName] = useState("");

  useEffect(() => {
    setTemplates(loadUserTemplates());
  }, []);

  useEffect(() => {
    if (encounters.length === 0) {
      setSelectedEncounterId(null);
      return;
    }
    if (
      !selectedEncounterId ||
      !encounters.some((e) => e.id === selectedEncounterId)
    ) {
      setSelectedEncounterId(encounters[0]!.id);
    }
  }, [encounters, selectedEncounterId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchMonstersForCombat(q)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const filteredLibrary = useMemo(() => {
    const q = libraryFilter.trim().toLowerCase();
    if (!q) return npcLibrary;
    return npcLibrary.filter((n) => n.name.toLowerCase().includes(q));
  }, [npcLibrary, libraryFilter]);

  const selectedEncounter =
    encounters.find((e) => e.id === selectedEncounterId) ?? null;

  function dragPayload(npcId: string): string {
    return JSON.stringify({ type: "campaign-npc", npcId });
  }

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.error ?? "Action failed");
    });
  }

  return (
    <CampaignDrawerShell
      title="NPCs"
      subtitle="Build the library, encounters, then add to combat"
      icon={<Skull size={18} aria-hidden />}
      onClose={onClose}
      closeLabel="Close NPCs menu"
      className="campaign-drawer--npcs"
    >
      <FgSheetTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        ariaLabel="NPC menu sections"
      />

      {error ? <p className="tool-error">{error}</p> : null}

      {tab === "library" ? (
        <section className="npc-drawer-section">
          <label className="tool-field">
            <span className="tool-label">Filter library</span>
            <input
              className="tool-input"
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              placeholder="Search saved NPCs…"
            />
          </label>

          {filteredLibrary.length === 0 ? (
            <p className="campaign-roster-hint">
              No NPCs yet. Use the Add NPC tab, then add them to combat or an
              encounter here.
            </p>
          ) : (
            <ul className="npc-library-list">
              {filteredLibrary.map((npc) => (
                <li
                  key={npc.id}
                  className="npc-library-card"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-campaign-npc",
                      dragPayload(npc.id),
                    );
                    e.dataTransfer.setData(
                      "text/plain",
                      `campaign-npc:${npc.id}`,
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <div className="npc-library-card-main">
                    {npc.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="npc-library-thumb"
                        src={npc.imageUrl}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <span className="npc-library-thumb npc-library-thumb--blank" />
                    )}
                    <div className="npc-library-card-text">
                      <span className="npc-library-name">{npc.name}</span>
                      <span className="npc-library-meta">
                        <span
                          className={`combat-faction combat-faction--${npc.faction}`}
                          aria-hidden
                        />
                        AC {npc.ac} · HP {npc.hpMax} · {npc.faction}
                      </span>
                    </div>
                  </div>
                  <div className="npc-library-card-actions">
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const r = await addNpcToCombatAction(
                            campaignId,
                            npc.id,
                          );
                          if (r.success) onOpenCombat?.();
                          return r;
                        })
                      }
                    >
                      To combat
                    </button>
                    {selectedEncounter ? (
                      <button
                        type="button"
                        className="tool-btn tool-btn--ghost"
                        disabled={pending}
                        onClick={() =>
                          run(() => {
                            const existing = selectedEncounter.entries.find(
                              (e) => e.campaignNpcId === npc.id,
                            );
                            return setEncounterEntryAction(
                              campaignId,
                              selectedEncounter.id,
                              npc.id,
                              (existing?.quantity ?? 0) + 1,
                            );
                          })
                        }
                      >
                        To encounter
                      </button>
                    ) : null}
                    <span className="npc-library-drag-hint">Drag to map</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "add" ? (
        <section className="npc-drawer-section">
          <div className="npc-faction-picker">
            <span>Faction when adding:</span>
            {(["foe", "neutral", "friend"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`tool-btn tool-btn--ghost${faction === f ? " tool-btn--active" : ""}`}
                onClick={() => setFaction(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <label className="tool-field">
            <span className="tool-label">Search monsters</span>
            <input
              className="tool-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Goblin, owlbear…"
            />
          </label>

          {searching ? (
            <p className="campaign-roster-hint">Searching…</p>
          ) : null}
          {!searching && query.trim().length >= 2 && results.length === 0 ? (
            <p className="campaign-roster-hint">No monsters match that name.</p>
          ) : null}

          {results.length > 0 ? (
            <ul className="npc-search-results">
              {results.map((m) => (
                <li key={m.slug}>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost npc-add-btn"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const r = await addMonsterToNpcLibrary(
                          campaignId,
                          m.slug,
                          faction,
                        );
                        if (r.success) setTab("library");
                        return r;
                      })
                    }
                  >
                    + {m.name}
                    {m.cr ? ` (CR ${m.cr})` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {templates.length > 0 ? (
            <div className="npc-drawer-subsection">
              <h3 className="npc-drawer-heading">NPC Creator templates</h3>
              <ul className="npc-search-results">
                {templates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost npc-add-btn"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const r = await addTemplateToNpcLibrary(
                            campaignId,
                            t.name,
                            t.state,
                            faction,
                          );
                          if (r.success) setTab("library");
                          return r;
                        })
                      }
                    >
                      + {t.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "encounters" ? (
        <section className="npc-drawer-section">
          <div className="npc-encounter-create">
            <label className="tool-field">
              <span className="tool-label">New encounter</span>
              <input
                className="tool-input"
                value={newEncounterName}
                onChange={(e) => setNewEncounterName(e.target.value)}
                placeholder="Goblin ambush"
              />
            </label>
            <button
              type="button"
              className="tool-btn"
              disabled={pending || !newEncounterName.trim()}
              onClick={() =>
                run(async () => {
                  const r = await createEncounterAction(
                    campaignId,
                    newEncounterName,
                  );
                  if (r.success) {
                    setNewEncounterName("");
                    if (r.encounterId) setSelectedEncounterId(r.encounterId);
                  }
                  return r;
                })
              }
            >
              Create
            </button>
          </div>

          {encounters.length === 0 ? (
            <p className="campaign-roster-hint">
              Create an encounter, then add library NPCs with quantities.
            </p>
          ) : (
            <>
              <label className="tool-field">
                <span className="tool-label">Select encounter</span>
                <select
                  className="tool-input"
                  value={selectedEncounterId ?? ""}
                  onChange={(e) => setSelectedEncounterId(e.target.value)}
                >
                  {encounters.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.creatureCount})
                    </option>
                  ))}
                </select>
              </label>

              {selectedEncounter ? (
                <div className="npc-encounter-detail">
                  <div className="npc-encounter-toolbar">
                    <label className="tool-field npc-encounter-rename">
                      <span className="tool-label">Name</span>
                      <input
                        className="tool-input"
                        defaultValue={selectedEncounter.name}
                        key={selectedEncounter.id}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (!next || next === selectedEncounter.name) return;
                          run(() =>
                            renameEncounterAction(
                              campaignId,
                              selectedEncounter.id,
                              next,
                            ),
                          );
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost tool-btn--danger"
                      disabled={pending}
                      aria-label="Delete encounter"
                      onClick={() =>
                        run(() =>
                          deleteEncounterAction(
                            campaignId,
                            selectedEncounter.id,
                          ),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="npc-encounter-summary">
                    {selectedEncounter.creatureCount} creature
                    {selectedEncounter.creatureCount === 1 ? "" : "s"}
                  </p>

                  {selectedEncounter.entries.length === 0 ? (
                    <p className="campaign-roster-hint">
                      Open Library and use &quot;To encounter&quot; on an NPC.
                    </p>
                  ) : (
                    <ul className="npc-encounter-entries">
                      {selectedEncounter.entries.map((entry) => (
                        <li key={entry.id} className="npc-encounter-entry">
                          <span className="npc-encounter-entry-name">
                            {entry.npcName}
                          </span>
                          <div className="npc-encounter-qty">
                            <button
                              type="button"
                              className="tool-btn tool-btn--ghost"
                              disabled={pending}
                              aria-label="Decrease quantity"
                              onClick={() =>
                                run(() =>
                                  setEncounterEntryAction(
                                    campaignId,
                                    selectedEncounter.id,
                                    entry.campaignNpcId,
                                    entry.quantity - 1,
                                  ),
                                )
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <span>{entry.quantity}</span>
                            <button
                              type="button"
                              className="tool-btn tool-btn--ghost"
                              disabled={pending}
                              aria-label="Increase quantity"
                              onClick={() =>
                                run(() =>
                                  setEncounterEntryAction(
                                    campaignId,
                                    selectedEncounter.id,
                                    entry.campaignNpcId,
                                    entry.quantity + 1,
                                  ),
                                )
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="tool-btn"
                    disabled={
                      pending || selectedEncounter.entries.length === 0
                    }
                    onClick={() =>
                      run(async () => {
                        const r = await addEncounterToCombatAction(
                          campaignId,
                          selectedEncounter.id,
                        );
                        if (r.success) onOpenCombat?.();
                        return r;
                      })
                    }
                  >
                    Add encounter to combat
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </CampaignDrawerShell>
  );
}
