"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useEncounter } from "@/components/encounter/encounter-provider";
import { calculateEncounterSummary } from "@/lib/encounter/calculateEl";
import { formatEl, formatXp } from "@/lib/encounter/formatEl";

export function EncounterSavedList() {
  const router = useRouter();
  const {
    savedEncounters,
    loadEncounter,
    renameEncounter,
    deleteEncounter,
    refreshSavedEncounters,
  } = useEncounter();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (savedEncounters.length === 0) {
    return (
      <section className="encounter-saved-empty">
        <p>No saved encounters yet.</p>
        <Link href="/monsters" className="tool-btn-primary">
          Build an encounter
        </Link>
      </section>
    );
  }

  function handleLoad(id: string) {
    if (loadEncounter(id)) {
      router.push("/monsters");
    }
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function commitRename(id: string) {
    if (editName.trim()) {
      renameEncounter(id, editName);
    }
    setEditingId(null);
    refreshSavedEncounters();
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete "${name}"?`)) {
      deleteEncounter(id);
    }
  }

  return (
    <section className="encounter-saved-list" aria-labelledby="saved-encounters-heading">
      <h2 id="saved-encounters-heading">Saved encounters</h2>
      <ul className="encounter-saved-cards">
        {savedEncounters.map((saved) => {
          const summary = calculateEncounterSummary(saved.entries);
          const expanded = expandedId === saved.id;
          const editing = editingId === saved.id;

          return (
            <li key={saved.id} className="encounter-saved-card">
              <div className="encounter-saved-card-header">
                <button
                  type="button"
                  className="encounter-saved-expand"
                  onClick={() => setExpandedId(expanded ? null : saved.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? (
                    <ChevronDown size={18} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={18} aria-hidden="true" />
                  )}
                </button>

                <div className="encounter-saved-card-info">
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitRename(saved.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(saved.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="encounter-saved-rename-input"
                      autoFocus
                    />
                  ) : (
                    <h3>{saved.name}</h3>
                  )}
                  <p className="encounter-saved-meta">
                    EL {formatEl(summary.el)} · {summary.creatureCount} creature
                    {summary.creatureCount !== 1 ? "s" : ""} ·{" "}
                    {formatXp(summary.totalXpPerPc)} XP/PC ·{" "}
                    {new Date(saved.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="encounter-saved-card-actions">
                  <button
                    type="button"
                    className="encounter-dock-btn"
                    onClick={() => handleLoad(saved.id)}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="encounter-saved-icon-btn"
                    onClick={() => startRename(saved.id, saved.name)}
                    aria-label={`Rename ${saved.name}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="encounter-saved-icon-btn encounter-saved-icon-btn--danger"
                    onClick={() => handleDelete(saved.id, saved.name)}
                    aria-label={`Delete ${saved.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="encounter-saved-detail">
                  <table className="entity-table">
                    <thead>
                      <tr>
                        <th>Creature</th>
                        <th>CR</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saved.entries.map((entry) => (
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
                          <td>{entry.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
