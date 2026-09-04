"use client";

import { useCallback, useEffect, useState } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { createRollId, iterativeD20Checks } from "@/lib/dice/notation";
import {
  applyCriticalDamage,
  formatCritSuffix,
  formatDamageWithModifier,
  isCriticalThreat,
  type WeaponAttackRow,
} from "@/lib/pc-planner/weaponAttacks";

export type PcWeaponAttacksListProps = {
  weapons: WeaponAttackRow[];
};

type PendingCrit = {
  multiplier: number;
  threatFace: number;
  /** Bumps to re-trigger the flash animation on repeated crits. */
  flashKey: number;
};

type RowFlash = {
  kind: "crit" | "fumble";
  key: number;
  face: number;
};

type RowFlashes = {
  crit?: RowFlash;
  fumble?: RowFlash;
};

function critRangeLabel(weapon: WeaponAttackRow): string | null {
  const suffix = formatCritSuffix(weapon.critical);
  if (!suffix) {
    return weapon.critMultiplier > 2 ? `×${weapon.critMultiplier}` : null;
  }
  return suffix.replace(/^\//, "");
}

export function PcWeaponAttacksList({ weapons }: PcWeaponAttacksListProps) {
  const { roll, rolling, ready } = useDice();
  const [pendingCrits, setPendingCrits] = useState<Record<number, PendingCrit>>(
    {},
  );
  const [flashing, setFlashing] = useState<Record<number, RowFlashes>>({});

  const clearPending = useCallback((inventoryIndex: number) => {
    setPendingCrits((prev) => {
      if (!(inventoryIndex in prev)) return prev;
      const next = { ...prev };
      delete next[inventoryIndex];
      return next;
    });
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    for (const [key, flashes] of Object.entries(flashing)) {
      const index = Number(key);
      const stamp = flashes.crit?.key ?? flashes.fumble?.key;
      if (stamp == null) continue;
      const timer = window.setTimeout(() => {
        setFlashing((prev) => {
          const current = prev[index];
          if (!current) return prev;
          if ((current.crit?.key ?? current.fumble?.key) !== stamp) return prev;
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }, 1400);
      timers.push(timer);
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [flashing]);

  function rollAttack(weapon: WeaponAttackRow) {
    if (!ready || rolling) return;
    const bonuses = weapon.attackBonuses;
    roll(iterativeD20Checks(`${weapon.name} attack`, bonuses), (result) => {
      const threatening = result.faces.filter((face) =>
        isCriticalThreat(face, weapon.threatMin),
      );
      const fumbled = result.faces.some((face) => face === 1);
      if (threatening.length === 0 && !fumbled) return;
      const flashKey = Date.now();
      if (threatening.length > 0) {
        setPendingCrits((prev) => ({
          ...prev,
          [weapon.inventoryIndex]: {
            multiplier: weapon.critMultiplier,
            threatFace: threatening[0] ?? 20,
            flashKey,
          },
        }));
      }
      const flashes: RowFlashes = {};
      if (threatening.length > 0) {
        flashes.crit = {
          kind: "crit",
          key: flashKey,
          face: threatening[0] ?? 20,
        };
      }
      if (fumbled) {
        flashes.fumble = { kind: "fumble", key: flashKey, face: 1 };
      }
      setFlashing((prev) => ({
        ...prev,
        [weapon.inventoryIndex]: flashes,
      }));
    });
  }

  function rollDamage(weapon: WeaponAttackRow) {
    if (!ready || rolling) return;
    const pending = pendingCrits[weapon.inventoryIndex];
    const scaled = pending
      ? applyCriticalDamage(
          weapon.damageDice,
          weapon.damageModifier,
          pending.multiplier,
        )
      : {
          dice: weapon.damageDice,
          modifier: weapon.damageModifier,
        };
    const label = pending
      ? `${weapon.name} critical damage (×${pending.multiplier})`
      : `${weapon.name} damage`;
    roll(
      {
        id: createRollId(),
        label,
        dice: scaled.dice,
        modifier: scaled.modifier,
      },
      () => {
        if (pending) clearPending(weapon.inventoryIndex);
      },
    );
  }

  if (weapons.length === 0) {
    return (
      <p className="pc-sheet-empty">
        Add a weapon from the Inventory tab to see attack and damage rolls here.
      </p>
    );
  }

  return (
    <ul className="pc-weapon-attacks-list">
      {weapons.map((weapon) => {
        const pending = pendingCrits[weapon.inventoryIndex];
        const flashes = flashing[weapon.inventoryIndex];
        const critFlash = flashes?.crit;
        const fumbleFlash = flashes?.fumble;
        const scaled = pending
          ? applyCriticalDamage(
              weapon.damageDice,
              weapon.damageModifier,
              pending.multiplier,
            )
          : null;
        const damageText = formatDamageWithModifier(
          scaled?.dice ?? weapon.damageDice,
          scaled?.modifier ?? weapon.damageModifier,
        );
        const attackCount = weapon.attackBonuses.length;
        const dieHint = `${attackCount}d20`;
        const crit = critRangeLabel(weapon);
        const disabled = !ready || rolling;

        return (
          <li
            key={`${weapon.inventoryIndex}-${weapon.name}`}
            className={[
              "pc-weapon-attack-row",
              pending ? "pc-weapon-attack-row--crit-armed" : "",
              critFlash ? "pc-weapon-attack-row--crit-flash" : "",
              fumbleFlash ? "pc-weapon-attack-row--fumble-flash" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {critFlash ? (
              <div className="pc-weapon-crit-banner" role="status" aria-live="assertive">
                <span className="pc-weapon-crit-banner-title">Critical!</span>
                <span className="pc-weapon-crit-banner-detail">
                  {pending?.threatFace ?? critFlash.face} threatens · next damage ×
                  {pending?.multiplier ?? weapon.critMultiplier}
                </span>
              </div>
            ) : null}
            {fumbleFlash ? (
              <div className="pc-weapon-fumble-banner" role="status" aria-live="assertive">
                <span className="pc-weapon-fumble-banner-title">Fumble!</span>
                <span className="pc-weapon-fumble-banner-detail">
                  Natural {fumbleFlash.face} · automatic miss
                </span>
              </div>
            ) : null}

            <div className="pc-weapon-attack-header">
              <span className="pc-weapon-attack-name">{weapon.name}</span>
              <span className="pc-weapon-attack-meta">
                <span className="pc-weapon-attack-mode">{weapon.mode}</span>
                {weapon.damageType ? (
                  <>
                    <span className="pc-weapon-attack-meta-sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="pc-weapon-attack-type">{weapon.damageType}</span>
                  </>
                ) : null}
              </span>
              {pending && !critFlash ? (
                <span className="pc-weapon-crit-armed-badge">
                  Crit armed ×{pending.multiplier}
                  <button
                    type="button"
                    className="pc-weapon-crit-clear"
                    onClick={() => clearPending(weapon.inventoryIndex)}
                    title="Clear critical"
                    aria-label={`Clear critical on ${weapon.name}`}
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </div>

            <div className="pc-weapon-attack-rolls">
              <div className="pc-weapon-attack-roll">
                <span className="pc-weapon-attack-label">Attack</span>
                <button
                  type="button"
                  className="dice-rollable pc-weapon-roll-btn"
                  onClick={() => rollAttack(weapon)}
                  disabled={disabled}
                  title={
                    ready
                      ? `Roll ${weapon.name} attack: ${dieHint} ${weapon.attackDisplay} (threat ${weapon.threatMin}-20)`
                      : "Dice loading…"
                  }
                  aria-label={`Roll ${weapon.name} attack`}
                >
                  <span className="pc-weapon-roll-value">{weapon.attackDisplay}</span>
                  <span className="pc-weapon-roll-hint" aria-hidden="true">
                    {dieHint}
                  </span>
                </button>
              </div>

              <div className="pc-weapon-attack-roll">
                <span className="pc-weapon-attack-label">
                  Damage{pending ? " (crit)" : ""}
                </span>
                <div className="pc-weapon-damage-group">
                  <button
                    type="button"
                    className={[
                      "dice-rollable pc-weapon-roll-btn",
                      pending ? "pc-weapon-roll-btn--crit" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => rollDamage(weapon)}
                    disabled={disabled}
                    title={
                      ready
                        ? pending
                          ? `Roll critical damage ×${pending.multiplier}: ${damageText}`
                          : `Roll ${weapon.name} damage: ${damageText}`
                        : "Dice loading…"
                    }
                    aria-label={
                      pending
                        ? `Roll ${weapon.name} critical damage`
                        : `Roll ${weapon.name} damage`
                    }
                  >
                    <span className="pc-weapon-roll-value">{damageText}</span>
                    <span className="pc-weapon-roll-hint" aria-hidden="true">
                      {pending ? `×${pending.multiplier}` : "roll"}
                    </span>
                  </button>
                  {crit ? (
                    <span className="pc-weapon-attack-crit" title="Critical range">
                      crit {crit}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
