"use client";

import type { CombatantView } from "@/lib/combat/types";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useState } from "react";

export const UNPLACED_COMBATANT_MIME = "application/x-unplaced-combatant";

export function UnplacedCombatTray({
  combatants,
}: {
  combatants: CombatantView[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (combatants.length === 0) return null;

  return (
    <aside
      className={`unplaced-combat-tray${collapsed ? " unplaced-combat-tray--collapsed" : ""}`}
      aria-label="Unplaced combatants"
    >
      <div className="unplaced-combat-tray-header">
        <button
          type="button"
          className="tool-btn tool-btn--ghost unplaced-combat-tray-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand tray" : "Collapse tray"}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        {!collapsed ? (
          <div className="unplaced-combat-tray-title">
            <Users size={16} aria-hidden />
            <span>Unplaced</span>
            <span className="unplaced-combat-tray-count">{combatants.length}</span>
          </div>
        ) : (
          <span className="unplaced-combat-tray-count unplaced-combat-tray-count--solo">
            {combatants.length}
          </span>
        )}
      </div>

      {!collapsed ? (
        <ul className="unplaced-combat-tray-list">
          {combatants.map((c) => (
            <li
              key={c.id}
              className="unplaced-combat-tray-item"
              draggable
              onDragStart={(e) => {
                const payload = JSON.stringify({ combatantId: c.id });
                e.dataTransfer.setData(UNPLACED_COMBATANT_MIME, payload);
                // text/plain fallback: Chromium hides custom MIME types in dragover.
                e.dataTransfer.setData(
                  "text/plain",
                  `unplaced-combatant:${c.id}`,
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              title="Drag onto the map to place"
            >
              {c.tokenImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="unplaced-combat-tray-thumb"
                  src={c.tokenImageUrl}
                  alt=""
                  draggable={false}
                />
              ) : (
                <span
                  className={`unplaced-combat-tray-thumb unplaced-combat-tray-thumb--blank combat-faction--${c.faction}`}
                />
              )}
              <span className="unplaced-combat-tray-name">{c.name}</span>
              <span className="unplaced-combat-tray-meta">
                AC {c.ac} · HP {c.hpMax - c.wounds}/{c.hpMax}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
