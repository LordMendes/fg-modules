"use client";

import {
  computeCombatStats,
  formatIterativeAttacks,
  formatModifier,
  type ClassAdvancementMap,
} from "@/lib/pc-planner/combatStats";
import { computeEquippedGear } from "@/lib/pc-planner/equippedGear";
import {
  computeMaxHitPoints,
  formatHitDiceString,
  parseHitDieSides,
  resolveHitDie,
} from "@/lib/pc-planner/hitPoints";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import type { ClassDerivedFeatures } from "@/lib/pc-planner/parseClassAbilityEffects";
import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import type { CombatState, PcPlanState } from "@/lib/pc-planner/types";

type PcCombatPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  raceFeatures?: RaceDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
  classAdvancement?: ClassAdvancementMap | null;
  classHitDice?: Record<string, string> | null;
};

type CombatNumberKey = Exclude<keyof CombatState, "attacks">;

function CombatTotal({ value, signed = true }: { value: number; signed?: boolean }) {
  const text = signed ? formatModifier(value) : String(value);
  return (
    <div className="pc-combat-total pc-combat-value" aria-label={`Total ${text}`}>
      {text}
    </div>
  );
}

function CombatReadonly({ value, signed = true }: { value: number; signed?: boolean }) {
  const text = signed ? formatModifier(value) : String(value);
  return <span className="pc-combat-value pc-combat-value--readonly">{text}</span>;
}

function CombatNa() {
  return <span className="pc-combat-value pc-combat-value--na">—</span>;
}

function CombatNumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (raw: string) => void;
}) {
  return (
    <input
      type="number"
      className="pc-sheet-input pc-combat-value pc-combat-input"
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CombatTableHeader({
  columns,
  labeled = true,
}: {
  columns: string[];
  labeled?: boolean;
}) {
  return (
    <div
      className={`pc-combat-header${labeled ? "" : " pc-combat-header--no-label"}`}
      style={{ ["--combat-cols" as string]: columns.length }}
    >
      {labeled ? <span className="pc-combat-header-spacer" aria-hidden="true" /> : null}
      {columns.map((col) => (
        <span key={col}>{col}</span>
      ))}
    </div>
  );
}

function SideStatBlock({
  title,
  columns,
  total,
  signedTotal = true,
  fields,
  patch,
}: {
  title: string;
  columns: string[];
  total: number;
  signedTotal?: boolean;
  fields: { label: string; value: number; editable: CombatNumberKey | null; signed?: boolean }[];
  patch: PcCombatPanelProps["patch"];
}) {
  return (
    <section className="pc-combat-side-block">
      <h3 className="pc-combat-block-title">{title}</h3>
      <div
        className="pc-combat-table pc-combat-table--side"
        style={{ ["--combat-cols" as string]: columns.length }}
      >
        <CombatTableHeader columns={columns} labeled={false} />
        <div className="pc-combat-row pc-combat-row--no-label">
          <CombatTotal value={total} signed={signedTotal} />
          {fields.map(({ label, value, editable, signed = true }) =>
            editable ? (
              <CombatNumberInput
                key={label}
                value={value}
                onChange={(raw) =>
                  patch((s) => {
                    s.combat[editable] = raw === "" ? 0 : Number(raw);
                  })
                }
              />
            ) : (
              <CombatReadonly key={label} value={value} signed={signed} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

function AttackTotal({ value, iterative }: { value: number; iterative?: boolean }) {
  if (!iterative) return <CombatTotal value={value} />;
  const text = formatIterativeAttacks(value);
  return (
    <div className="pc-combat-total pc-combat-value pc-combat-iterative" aria-label={`Total ${text}`}>
      {text}
    </div>
  );
}

export function PcCombatPanel({
  state,
  patch,
  raceFeatures = null,
  classFeatures = null,
  classAdvancement = null,
  classHitDice = null,
}: PcCombatPanelProps) {
  const stats = computeCombatStats(
    state,
    raceFeatures,
    classFeatures,
    classAdvancement,
    deriveFeatEffects(state.feats),
  );
  const { combat } = state;
  const hitDice = classHitDice ?? {};
  const maxHp = computeMaxHitPoints(state, hitDice);
  const hdString = formatHitDiceString(state.hitPoints?.rolls ?? [], hitDice);
  const gear = computeEquippedGear(state.inventory ?? [], combat.speedBase);
  const featEffects = deriveFeatEffects(state.feats);
  const classNameBySlug = new Map(
    state.identity.classLevels.map((cl) => [cl.classSlug, cl.className]),
  );

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-combat-panel" role="tabpanel">
      <div className="pc-combat-grid">
        <section className="pc-combat-block pc-combat-block--full">
          <h3 className="pc-combat-block-title">Hit Points</h3>
          <div className="pc-combat-hp-summary">
            <div className="pc-combat-hp-stat">
              <span className="pc-combat-hp-label">Hit Dice</span>
              <span className="pc-combat-value pc-combat-value--readonly">{hdString}</span>
            </div>
            <div className="pc-combat-hp-stat">
              <span className="pc-combat-hp-label">Max HP</span>
              <span className="pc-combat-total pc-combat-value" aria-label={`Max HP ${maxHp}`}>
                {maxHp}
              </span>
            </div>
            <div className="pc-combat-hp-stat">
              <span className="pc-combat-hp-label">Current</span>
              <input
                type="number"
                className="pc-sheet-input pc-combat-value pc-combat-input"
                value={state.hitPoints?.current ?? ""}
                placeholder={String(maxHp)}
                onChange={(e) =>
                  patch((s) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      s.hitPoints = { rolls: s.hitPoints?.rolls ?? [] };
                      return;
                    }
                    s.hitPoints = {
                      ...(s.hitPoints ?? { rolls: [] }),
                      current: Number(raw),
                    };
                  })
                }
              />
            </div>
          </div>
          {(state.hitPoints?.rolls?.length ?? 0) > 0 ? (
            <div className="pc-combat-table pc-combat-hp-rolls" style={{ ["--combat-cols" as string]: 3 }}>
              <CombatTableHeader columns={["Class", "Die", "Roll"]} />
              {state.hitPoints.rolls.map((roll, index) => {
                const sides = parseHitDieSides(resolveHitDie(roll.classSlug, hitDice));
                const label =
                  classNameBySlug.get(roll.classSlug) ?? roll.classSlug;
                return (
                  <div
                    key={`${roll.classSlug}-${roll.classLevel}`}
                    className="pc-combat-row"
                    style={{ ["--combat-cols" as string]: 3 }}
                  >
                    <div className="pc-combat-row-label">
                      {label} {roll.classLevel}
                    </div>
                    <CombatReadonly value={sides} signed={false} />
                    <CombatNumberInput
                      value={roll.rolled}
                      onChange={(raw) =>
                        patch((s) => {
                          const next = Math.max(
                            1,
                            Math.min(sides || 99, raw === "" ? 1 : Number(raw)),
                          );
                          if (!s.hitPoints?.rolls?.[index]) return;
                          s.hitPoints.rolls[index].rolled = next;
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="pc-sheet-empty">Add a class on the Main tab to generate hit dice.</p>
          )}
        </section>

        <section className="pc-combat-block">
          <h3 className="pc-combat-block-title">Base Attack Bonus</h3>
          <div className="pc-combat-bab-highlight">
            <span className="pc-combat-bab-highlight-label">BAB</span>
            <div
              className="pc-combat-total pc-combat-value pc-combat-iterative"
              aria-label={`BAB ${formatIterativeAttacks(stats.bab)}`}
            >
              {formatIterativeAttacks(stats.bab)}
            </div>
          </div>
          <div className="pc-combat-table" style={{ ["--combat-cols" as string]: 5 }}>
            <CombatTableHeader columns={["Total", "BAB", "Stat", "Size", "Misc"]} />
            {(
              [
                {
                  label: "Melee",
                  key: stats.melee,
                  misc: "meleeMisc" as const,
                  iterative: true,
                },
                {
                  label: "Ranged",
                  key: stats.ranged,
                  misc: "rangedMisc" as const,
                  iterative: true,
                },
                {
                  label: "Grapple",
                  key: stats.grapple,
                  misc: "grappleMisc" as const,
                  iterative: false,
                },
              ] as const
            ).map(({ label, key, misc, iterative }) => (
              <div key={label} className="pc-combat-row" style={{ ["--combat-cols" as string]: 5 }}>
                <div className="pc-combat-row-label">{label}</div>
                <AttackTotal value={key.total} iterative={iterative} />
                <CombatReadonly value={key.parts.bab} />
                <CombatReadonly value={key.parts.stat} />
                <CombatReadonly value={key.parts.size} />
                <CombatNumberInput
                  value={combat[misc]}
                  onChange={(raw) =>
                    patch((s) => {
                      s.combat[misc] = raw === "" ? 0 : Number(raw);
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="pc-combat-block pc-combat-block--side">
          <SideStatBlock
            title="Initiative"
            columns={["Total", "Stat", "Misc"]}
            total={stats.initiative.total}
            fields={[
              { label: "Stat", value: stats.initiative.parts.stat, editable: null },
              {
                label: "Misc",
                value: stats.initiative.parts.misc,
                editable: featEffects.initBonus ? null : "initMisc",
              },
            ]}
            patch={patch}
          />
          <SideStatBlock
            title="Speed"
            columns={["Total", "Base", "Armor", "Misc"]}
            total={stats.speed.total}
            signedTotal={false}
            fields={[
              { label: "Base", value: combat.speedBase, editable: "speedBase", signed: false },
              {
                label: "Armor",
                value: stats.speed.parts.armor,
                editable: gear.speedArmorDelta != null ? null : "speedArmor",
                signed: false,
              },
              { label: "Misc", value: combat.speedMisc, editable: "speedMisc", signed: false },
            ]}
            patch={patch}
          />
          <SideStatBlock
            title="SR — Spell Resistance"
            columns={["Total", "Base", "Misc"]}
            total={stats.spellResistance.total}
            signedTotal={false}
            fields={[
              { label: "Base", value: combat.srBase, editable: "srBase", signed: false },
              { label: "Misc", value: combat.srMisc, editable: "srMisc", signed: false },
            ]}
            patch={patch}
          />
        </section>

        <section className="pc-combat-block pc-combat-block--full">
          <h3 className="pc-combat-block-title">Saving Throws</h3>
          <div className="pc-combat-table" style={{ ["--combat-cols" as string]: 6 }}>
            <CombatTableHeader columns={["Total", "Class", "Stat", "Abil", "Racial", "Misc"]} />
            {(
              [
                { label: "Fortitude", row: stats.fortitude, misc: "fortMisc" as const },
                { label: "Reflex", row: stats.reflex, misc: "refMisc" as const },
                { label: "Will", row: stats.will, misc: "willMisc" as const },
              ] as const
            ).map(({ label, row, misc }) => (
              <div key={label} className="pc-combat-row" style={{ ["--combat-cols" as string]: 6 }}>
                <div className="pc-combat-row-label">{label}</div>
                <CombatTotal value={row.total} />
                <CombatReadonly value={row.parts.class} />
                <CombatReadonly value={row.parts.stat} />
                <CombatReadonly value={row.parts.ability ?? 0} />
                <CombatReadonly value={row.parts.racial ?? 0} />
                <CombatNumberInput
                  value={combat[misc]}
                  onChange={(raw) =>
                    patch((s) => {
                      s.combat[misc] = raw === "" ? 0 : Number(raw);
                    })
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="pc-combat-block pc-combat-block--full">
          <h3 className="pc-combat-block-title">Armor Class</h3>
          <div className="pc-combat-table pc-combat-table--ac" style={{ ["--combat-cols" as string]: 9 }}>
            <CombatTableHeader
              columns={["Total", "Armor", "Shield", "Stat", "Size", "Nat", "Def", "Dodge", "Misc"]}
            />
            {(
              [
                { label: "Armor Class", key: "ac" as const, na: [] as string[] },
                { label: "Flat-Footed AC", key: "flatFooted" as const, na: ["stat", "dodge"] as string[] },
                { label: "Touch AC", key: "touch" as const, na: ["armor", "shield", "natural"] as string[] },
              ]
            ).map(({ label, key, na }) => {
              const computed = stats[key];
              const acParts = [
                {
                  part: "armor",
                  field: gear.armor != null ? null : ("armor" as const),
                  value: computed.parts.armor ?? 0,
                },
                {
                  part: "shield",
                  field: gear.shield != null ? null : ("shield" as const),
                  value: computed.parts.shield ?? 0,
                },
                { part: "stat", field: null, value: computed.parts.stat ?? 0 },
                { part: "size", field: "sizeMod" as const, value: combat.sizeMod },
                { part: "natural", field: "natural" as const, value: combat.natural },
                { part: "deflection", field: "deflection" as const, value: combat.deflection },
                {
                  part: "dodge",
                  field: featEffects.dodgeBonus ? null : ("dodge" as const),
                  value: computed.parts.dodge ?? 0,
                },
              ] as const;

              return (
                <div key={key} className="pc-combat-row" style={{ ["--combat-cols" as string]: 9 }}>
                  <div className="pc-combat-row-label">{label}</div>
                  <CombatTotal value={computed.total} signed={false} />
                  {acParts.map(({ part, field, value }) =>
                    na.includes(part) ? (
                      <CombatNa key={part} />
                    ) : field ? (
                      <CombatNumberInput
                        key={part}
                        value={value}
                        onChange={(raw) =>
                          patch((s) => {
                            s.combat[field] = raw === "" ? 0 : Number(raw);
                          })
                        }
                      />
                    ) : (
                      <CombatReadonly key={part} value={value} />
                    ),
                  )}
                  <CombatNumberInput
                    value={combat.acMisc}
                    onChange={(raw) =>
                      patch((s) => {
                        s.combat.acMisc = raw === "" ? 0 : Number(raw);
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="npc-sheet-block pc-combat-attacks">
        <h3>Attacks</h3>
        <textarea
          className="pc-sheet-input pc-sheet-textarea"
          rows={4}
          value={state.combat.attacks}
          placeholder="Weapon attacks, special attacks…"
          onChange={(e) =>
            patch((s) => {
              s.combat.attacks = e.target.value;
            })
          }
        />
      </div>
    </div>
  );
}
