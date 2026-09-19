"use client";

import {
  addPartyToCombat,
  combatClearEffects,
  combatClearTargets,
  combatEnd,
  combatReset,
  combatRollInitiative,
  combatRemoveDeadNpcs,
  combatStart,
} from "@/actions/combat";
import type { CampaignCombatView } from "@/lib/combat/types";
import {
  ChevronDown,
  Eraser,
  Menu,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Swords,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useCombatContext } from "./combat-context";

function ToolbarIconBtn({
  title,
  disabled,
  onClick,
  children,
  active,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tool-btn tool-btn-icon tool-btn--ghost${active ? " tool-btn--active" : ""}`}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CombatToolbar({
  combat,
  campaignId,
  isDm,
  unplacedCount,
}: {
  combat: CampaignCombatView | null;
  campaignId: string;
  isDm: boolean;
  unplacedCount: number;
}) {
  const ctx = useCombatContext();
  const [pending, startTransition] = useTransition();
  const [initMenuOpen, setInitMenuOpen] = useState(false);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const initRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setInitMenuOpen(false);
        setMainMenuOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (initRef.current && !initRef.current.contains(e.target as Node)) {
        setInitMenuOpen(false);
      }
      if (mainRef.current && !mainRef.current.contains(e.target as Node)) {
        setMainMenuOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  if (!isDm) return null;

  const started = combat?.state === "active";
  const ended = combat?.state === "ended";

  return (
    <div className="combat-toolbar">
      {!started && !ended ? (
        <ToolbarIconBtn
          title="Start combat"
          disabled={pending || !combat?.combatants.length}
          onClick={() => {
            startTransition(async () => {
              await combatStart(campaignId);
            });
          }}
        >
          <Play size={16} aria-hidden />
        </ToolbarIconBtn>
      ) : (
        <ToolbarIconBtn
          title="End combat"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await combatEnd(campaignId);
            });
          }}
        >
          <Square size={16} aria-hidden />
        </ToolbarIconBtn>
      )}

      <div className="combat-menu-wrap" ref={initRef}>
        <ToolbarIconBtn
          title="Roll initiative"
          disabled={pending || !combat?.combatants.length}
          active={initMenuOpen}
          onClick={() => {
            setInitMenuOpen((v) => !v);
            setMainMenuOpen(false);
          }}
        >
          <Swords size={16} aria-hidden />
          <ChevronDown size={12} aria-hidden />
        </ToolbarIconBtn>
        {initMenuOpen ? (
          <ul className="combat-menu" role="menu">
            {(["all", "npcs", "pcs"] as const).map((scope) => (
              <li key={scope} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="combat-menu-item"
                  disabled={pending}
                  onClick={() => {
                    setInitMenuOpen(false);
                    startTransition(async () => {
                      await combatRollInitiative(campaignId, scope);
                    });
                  }}
                >
                  Roll init {scope}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ToolbarIconBtn
        title="Next actor (N)"
        disabled={pending || !started || !ctx}
        onClick={() => {
          if (!ctx) return;
          startTransition(async () => {
            await ctx.nextActor();
          });
        }}
      >
        <SkipForward size={16} aria-hidden />
      </ToolbarIconBtn>

      <ToolbarIconBtn
        title="Clear targets"
        disabled={pending || !combat?.combatants.length}
        onClick={() => {
          startTransition(async () => {
            await combatClearTargets(campaignId, "all");
          });
        }}
      >
        <Eraser size={16} aria-hidden />
      </ToolbarIconBtn>

      <div className="combat-menu-wrap" ref={mainRef}>
        <ToolbarIconBtn
          title="Combat menu"
          disabled={pending}
          active={mainMenuOpen}
          onClick={() => {
            setMainMenuOpen((v) => !v);
            setInitMenuOpen(false);
          }}
        >
          <Menu size={16} aria-hidden />
        </ToolbarIconBtn>
        {mainMenuOpen ? (
          <ul className="combat-menu" role="menu">
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="combat-menu-item"
                disabled={pending}
                onClick={() => {
                  setMainMenuOpen(false);
                  if (
                    !window.confirm("Remove all dead NPCs from combat?")
                  ) {
                    return;
                  }
                  startTransition(async () => {
                    await combatRemoveDeadNpcs(campaignId);
                  });
                }}
              >
                Remove dead NPCs
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="combat-menu-item"
                disabled={pending}
                onClick={() => {
                  setMainMenuOpen(false);
                  if (!window.confirm("Clear all effects on every combatant?")) {
                    return;
                  }
                  startTransition(async () => {
                    await combatClearEffects(campaignId, "all");
                  });
                }}
              >
                Clear all effects
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="combat-menu-item"
                disabled={pending}
                onClick={() => {
                  setMainMenuOpen(false);
                  startTransition(async () => {
                    await combatEnd(campaignId);
                  });
                }}
              >
                End combat
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="combat-menu-item"
                disabled={pending}
                onClick={() => {
                  setMainMenuOpen(false);
                  if (!window.confirm("Reset combat to idle?")) return;
                  startTransition(async () => {
                    await combatReset(campaignId);
                  });
                }}
              >
                Reset
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      <button
        type="button"
        className="tool-btn tool-btn--ghost"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await addPartyToCombat(campaignId);
          });
        }}
      >
        Add party
      </button>

      {unplacedCount > 0 ? (
        <span className="combat-toolbar-meta">
          {unplacedCount} unplaced (right tray)
        </span>
      ) : null}
    </div>
  );
}
