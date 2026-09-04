"use client";

import { RollableDice } from "@/components/dice/rollable-dice";
import { RollableStat } from "@/components/dice/rollable-stat";
import {
  formatCritSuffix,
  formatDamageWithModifier,
  type WeaponAttackRow,
} from "@/lib/pc-planner/weaponAttacks";

export type PcWeaponAttacksListProps = {
  weapons: WeaponAttackRow[];
};

function critLabel(weapon: WeaponAttackRow): string | null {
  const suffix = formatCritSuffix(weapon.critical);
  if (!suffix) return null;
  return suffix.replace(/^\//, "");
}

export function PcWeaponAttacksList({ weapons }: PcWeaponAttacksListProps) {
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
        const damageText = formatDamageWithModifier(
          weapon.damageDice,
          weapon.damageModifier,
        );
        const crit = critLabel(weapon);
        return (
          <li
            key={`${weapon.inventoryIndex}-${weapon.name}`}
            className="pc-weapon-attack-row"
          >
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
            </div>

            <div className="pc-weapon-attack-rolls">
              <div className="pc-weapon-attack-roll">
                <span className="pc-weapon-attack-label">Attack</span>
                <RollableStat
                  className="pc-weapon-roll-btn"
                  label={`${weapon.name} attack`}
                  modifier={weapon.attackBonus}
                >
                  <span className="pc-weapon-roll-value">{weapon.attackDisplay}</span>
                  <span className="pc-weapon-roll-hint" aria-hidden="true">
                    d20
                  </span>
                </RollableStat>
              </div>

              <div className="pc-weapon-attack-roll">
                <span className="pc-weapon-attack-label">Damage</span>
                <div className="pc-weapon-damage-group">
                  <RollableDice
                    className="pc-weapon-roll-btn"
                    label={`${weapon.name} damage`}
                    dice={weapon.damageDice}
                    modifier={weapon.damageModifier}
                  >
                    <span className="pc-weapon-roll-value">{damageText}</span>
                    <span className="pc-weapon-roll-hint" aria-hidden="true">
                      roll
                    </span>
                  </RollableDice>
                  {crit ? (
                    <span className="pc-weapon-attack-crit" title="Critical">
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
