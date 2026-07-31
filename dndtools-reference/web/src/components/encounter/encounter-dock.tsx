"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useEncounter } from "@/components/encounter/encounter-provider";
import { formatEl, formatXp } from "@/lib/encounter/formatEl";

const DOCK_EXPANDED_KEY = "arcane-archives-encounter-dock-expanded";

export function EncounterDock() {
  const pathname = usePathname();
  const {
    entries,
    summary,
    setCount,
    removeEntry,
    clearEncounter,
    saveCurrentEncounter,
    defaultSaveName,
  } = useEncounter();

  const [expanded, setExpanded] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isMonsterPage =
    pathname === "/monsters" || pathname.startsWith("/monsters/");

  useEffect(() => {
    try {
      setExpanded(sessionStorage.getItem(DOCK_EXPANDED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    if (isMonsterPage && entries.length > 0) {
      main.classList.add("has-encounter-dock");
      main.classList.toggle("has-encounter-dock-expanded", expanded);
    } else {
      main.classList.remove("has-encounter-dock", "has-encounter-dock-expanded");
    }
    return () => {
      main.classList.remove("has-encounter-dock", "has-encounter-dock-expanded");
    };
  }, [isMonsterPage, entries.length, expanded]);

  if (!isMonsterPage || entries.length === 0) return null;

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    try {
      sessionStorage.setItem(DOCK_EXPANDED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function openSave() {
    setSaveName(defaultSaveName);
    setSaveMessage(null);
    setSaveOpen(true);
    if (!expanded) toggleExpanded();
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const result = saveCurrentEncounter(saveName);
    if (result.ok) {
      setSaveMessage("Encounter saved.");
      setSaveOpen(false);
    } else {
      setSaveMessage(result.error ?? "Could not save.");
    }
  }

  return (
    <aside
      className={`encounter-dock${expanded ? " encounter-dock--expanded" : ""}`}
      aria-label="Encounter builder"
    >
      <div className="encounter-dock-bar">
        <button
          type="button"
          className="encounter-dock-toggle"
          onClick={toggleExpanded}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronUp size={18} aria-hidden="true" />
          )}
          <span className="encounter-dock-title">Encounter</span>
          <span className="encounter-dock-summary">
            {summary.creatureCount} creature
            {summary.creatureCount !== 1 ? "s" : ""}
            {summary.el !== null && (
              <>
                {" "}
                · EL {formatEl(summary.el)}
              </>
            )}
            {summary.totalXpPerPc > 0 && (
              <>
                {" "}
                · {formatXp(summary.totalXpPerPc)} XP/PC
              </>
            )}
          </span>
        </button>
        <div className="encounter-dock-bar-actions">
          <Link href="/tools/encounter-builder" className="encounter-dock-link">
            Saved
          </Link>
          <button type="button" className="encounter-dock-btn" onClick={openSave}>
            Save
          </button>
          <button
            type="button"
            className="encounter-dock-btn encounter-dock-btn--ghost"
            onClick={clearEncounter}
          >
            Clear
          </button>
        </div>
      </div>

      {expanded && (
        <div className="encounter-dock-body">
          {summary.invalidCrCount > 0 && (
            <p className="encounter-dock-warning" role="status">
              {summary.invalidCrCount} creature
              {summary.invalidCrCount !== 1 ? "s have" : " has"} unknown CR and
              are excluded from EL.
            </p>
          )}

          {saveOpen && (
            <form className="encounter-save-form" onSubmit={handleSave}>
              <label htmlFor="encounter-save-name">Encounter name</label>
              <div className="encounter-save-row">
                <input
                  id="encounter-save-name"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  maxLength={120}
                />
                <button type="submit" className="encounter-dock-btn">
                  Save
                </button>
                <button
                  type="button"
                  className="encounter-dock-btn encounter-dock-btn--ghost"
                  onClick={() => setSaveOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {saveMessage && (
            <p className="encounter-dock-message" role="status">
              {saveMessage}
            </p>
          )}

          <div className="table-wrap">
            <table className="entity-table encounter-dock-table">
              <thead>
                <tr>
                  <th>Creature</th>
                  <th>CR</th>
                  <th>Qty</th>
                  <th>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.slug}>
                    <td>
                      <Link
                        href={`/monsters/${entry.slug}`}
                        className="entity-link"
                      >
                        {entry.name}
                      </Link>
                    </td>
                    <td>{entry.cr || "—"}</td>
                    <td>
                      <div className="encounter-qty-control">
                        <button
                          type="button"
                          className="encounter-qty-btn"
                          onClick={() => setCount(entry.slug, entry.count - 1)}
                          aria-label={`Decrease ${entry.name} count`}
                        >
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={entry.count}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!Number.isNaN(n)) setCount(entry.slug, n);
                          }}
                          className="encounter-qty-input"
                          aria-label={`${entry.name} count`}
                        />
                        <button
                          type="button"
                          className="encounter-qty-btn"
                          onClick={() => setCount(entry.slug, entry.count + 1)}
                          aria-label={`Increase ${entry.name} count`}
                        >
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="encounter-remove-btn"
                        onClick={() => removeEntry(entry.slug)}
                        aria-label={`Remove ${entry.name}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="encounter-dock-footer">
            <span>
              EL {formatEl(summary.el)} · {formatXp(summary.totalXpPerPc)} XP
              per PC
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

export function EncounterDockHost() {
  return <EncounterDock />;
}
