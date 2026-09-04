"use client";

import {
  computeCombatStats,
  formatIterativeAttacks,
  formatModifier,
  abilityModifier,
  type ClassAdvancementMap,
} from "@/lib/pc-planner/combatStats";
import { DieIcon } from "@/components/dice/die-icon";
import { useDice } from "@/components/dice/dice-provider";
import { RollableStat } from "@/components/dice/rollable-stat";
import { createRollId } from "@/lib/dice/notation";
import type { DieSides } from "@/lib/dice/types";
import { computeEquippedGear } from "@/lib/pc-planner/equippedGear";
import {
  computeMaxHitPoints,
  formatHitDiceString,
  parseHitDieSides,
  resolveHitDie,
} from "@/lib/pc-planner/hitPoints";
import {
  formatBonusSources,
  type BonusSource,
} from "@/lib/pc-planner/itemBonuses";
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

const ROLLABLE_HIT_DIE_SIDES = new Set<number>([4, 6, 8, 10, 12, 20, 100]);

function asDieSides(sides: number): DieSides | null {
  return ROLLABLE_HIT_DIE_SIDES.has(sides) ? (sides as DieSides) : null;
}

function CombatItemHint({ sources }: { sources: BonusSource[] }) {
  if (sources.length === 0) return null;
  const lines = formatBonusSources(sources);
  return (
    <span className="pc-bonus-sources-wrap pc-combat-item-hint" tabIndex={0}>
      <span className="pc-ability-item-bonus" aria-hidden>
        ({sources.reduce((sum, s) => sum + s.amount, 0)})
      </span>
      <span className="pc-skill-tooltip pc-bonus-sources-tooltip" role="tooltip">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="pc-skill-tooltip-line">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

function CombatTotal({
  value,
  signed = true,
  rollLabel,
  itemSources,
}: {
  value: number;
  signed?: boolean;
  rollLabel?: string;
  itemSources?: BonusSource[];
}) {
  const text = signed ? formatModifier(value) : String(value);
  return (
    <div className="pc-combat-total pc-combat-value" aria-label={`Total ${text}`}>
      {rollLabel ? (
        <RollableStat label={rollLabel} modifier={value} signed={signed} />
      ) : (
        text
      )}
      {itemSources && itemSources.length > 0 ? (
        <CombatItemHint sources={itemSources} />
      ) : null}
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
  rollLabel,
  fields,
  patch,
}: {
  title: string;
  columns: string[];
  total: number;
  signedTotal?: boolean;
  rollLabel?: string;
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
          <CombatTotal value={total} signed={signedTotal} rollLabel={rollLabel} />
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

function AttackTotal({
  value,
  bab,
  iterative,
  rollLabel,
}: {
  value: number;
  bab: number;
  iterative?: boolean;
  rollLabel?: string;
}) {
  if (!iterative) return <CombatTotal value={value} rollLabel={rollLabel} />;
  const text = formatIterativeAttacks(bab, value - bab);
  return (
    <div className="pc-combat-total pc-combat-value pc-combat-iterative" aria-label={`Total ${text}`}>
      {rollLabel ? (
        <RollableStat label={rollLabel} modifier={value}>
          {text}
        </RollableStat>
      ) : (
        text
      )}
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
  const { roll, rolling, ready, themeColor } = useDice();
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
  const conScore = state.abilities.con;
  const conMod = abilityModifier(conScore);
  const gear = computeEquippedGear(state.inventory ?? [], combat.speedBase);
  const featEffects = deriveFeatEffects(state.feats);
  const speedDrivenByGear =
    gear.armorCategory !== "none" ||
    stats.speed.parts.armor !== combat.speedArmor ||
    (stats.speed.parts.class ?? 0) !== 0 ||
    (stats.speed.parts.feat ?? 0) !== 0;
  const speedExtraFields: {
    label: string;
    value: number;
    editable: CombatNumberKey | null;
    signed?: boolean;
  }[] = [];
  if ((stats.speed.parts.class ?? 0) !== 0) {
    speedExtraFields.push({
      label: "Class",
      value: stats.speed.parts.class,
      editable: null,
      signed: false,
    });
  }
  if ((stats.speed.parts.feat ?? 0) !== 0) {
    speedExtraFields.push({
      label: "Feat",
      value: stats.speed.parts.feat,
      editable: null,
      signed: false,
    });
  }
  const speedFields = [
    { label: "Base", value: combat.speedBase, editable: "speedBase" as CombatNumberKey, signed: false },
    {
      label: "Armor",
      value: stats.speed.parts.armor,
      editable: (speedDrivenByGear ? null : "speedArmor") as CombatNumberKey | null,
      signed: false,
    },
    ...speedExtraFields,
    { label: "Misc", value: combat.speedMisc, editable: "speedMisc" as CombatNumberKey, signed: false },
  ];
  const classNameBySlug = new Map(
    state.identity.classLevels.map((cl) => [cl.classSlug, cl.className]),
  );

  function rollHitDie(index: number, sides: number, label: string) {
    const dieSides = asDieSides(sides);
    if (!dieSides || !ready || rolling) return;
    roll(
      {
        id: createRollId(),
        label: `${label} HD`,
        dice: [{ qty: 1, sides: dieSides }],
        modifier: 0,
      },
      (result) => {
        const face = result.faces[0] ?? result.faceSum;
        if (!Number.isFinite(face)) return;
        patch((s) => {
          const row = s.hitPoints?.rolls?.[index];
          if (!row) return;
          row.rolled = Math.max(1, Math.min(sides, Math.trunc(face)));
        });
      },
    );
  }

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
              <span className="pc-combat-hp-label">Constitution</span>
              <span
                className="pc-combat-total pc-combat-value"
                aria-label={`Constitution ${conScore}, modifier ${formatModifier(conMod)}`}
              >
                {conScore} ({formatModifier(conMod)})
              </span>
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
            <div className="pc-combat-table pc-combat-hp-rolls" style={{ ["--combat-cols" as string]: 4 }}>
              <CombatTableHeader columns={["Die", "Roll", "Con", "HP"]} />
              {state.hitPoints.rolls.map((rollRow, index) => {
                const sides = parseHitDieSides(resolveHitDie(rollRow.classSlug, hitDice));
                const dieSides = asDieSides(sides);
                const label =
                  classNameBySlug.get(rollRow.classSlug) ?? rollRow.classSlug;
                const capped =
                  sides > 0
                    ? Math.min(Math.max(1, rollRow.rolled), sides)
                    : Math.max(0, rollRow.rolled);
                const levelHp = Math.max(1, capped + conMod);
                return (
                  <div
                    key={`${rollRow.classSlug}-${rollRow.classLevel}`}
                    className="pc-combat-row"
                    style={{ ["--combat-cols" as string]: 4 }}
                  >
                    <div className="pc-combat-row-label">
                      {label} {rollRow.classLevel}
                    </div>
                    <span className="pc-combat-value pc-combat-value--readonly">
                      {sides > 0 ? `d${sides}` : "—"}
                    </span>
                    <div className="pc-combat-hp-roll-cell">
                      <CombatNumberInput
                        value={rollRow.rolled}
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
                      <button
                        type="button"
                        className="pc-combat-hp-roll-btn"
                        disabled={!dieSides || !ready || rolling || sides <= 0}
                        title={
                          dieSides
                            ? `Roll d${sides} for ${label} level ${rollRow.classLevel}`
                            : "Cannot roll this die"
                        }
                        aria-label={`Roll hit die d${sides} for ${label} level ${rollRow.classLevel}`}
                        onClick={() => rollHitDie(index, sides, `${label} ${rollRow.classLevel}`)}
                      >
                        {dieSides ? (
                          <DieIcon
                            sides={dieSides}
                            color={themeColor}
                            className="dice-die-icon--chip"
                            labeled={false}
                          />
                        ) : (
                          <span className="pc-combat-hp-roll-fallback">Roll</span>
                        )}
                      </button>
                    </div>
                    <CombatReadonly value={conMod} />
                    <CombatTotal value={levelHp} signed={false} />
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
                <AttackTotal
                  value={key.total}
                  bab={stats.bab}
                  iterative={iterative}
                  rollLabel={label}
                />
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
            rollLabel="Initiative"
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
            columns={["Total", ...speedFields.map((field) => field.label)]}
            total={stats.speed.total}
            signedTotal={false}
            fields={speedFields}
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
                {
                  label: "Fortitude",
                  row: stats.fortitude,
                  misc: "fortMisc" as const,
                  itemSources: stats.itemBonuses.combat.fort.sources,
                },
                {
                  label: "Reflex",
                  row: stats.reflex,
                  misc: "refMisc" as const,
                  itemSources: stats.itemBonuses.combat.ref.sources,
                },
                {
                  label: "Will",
                  row: stats.will,
                  misc: "willMisc" as const,
                  itemSources: stats.itemBonuses.combat.will.sources,
                },
              ] as const
            ).map(({ label, row, misc, itemSources }) => (
              <div key={label} className="pc-combat-row" style={{ ["--combat-cols" as string]: 6 }}>
                <div className="pc-combat-row-label">{label}</div>
                <CombatTotal value={row.total} rollLabel={label} itemSources={itemSources} />
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
              const itemNatural = stats.itemBonuses.combat.naturalArmor.total;
              const itemDeflection = stats.itemBonuses.combat.deflection.total;
              const itemArmor = stats.itemBonuses.combat.armor.total;
              const acItemSources = [
                ...stats.itemBonuses.combat.naturalArmor.sources,
                ...stats.itemBonuses.combat.deflection.sources,
                ...stats.itemBonuses.combat.armor.sources,
                ...stats.itemBonuses.combat.dodge.sources,
              ];
              const acParts = [
                {
                  part: "armor",
                  field: gear.armor != null || itemArmor > 0 ? null : ("armor" as const),
                  value: computed.parts.armor ?? 0,
                },
                {
                  part: "shield",
                  field: gear.shield != null ? null : ("shield" as const),
                  value: computed.parts.shield ?? 0,
                },
                { part: "stat", field: null, value: computed.parts.stat ?? 0 },
                { part: "size", field: "sizeMod" as const, value: combat.sizeMod },
                {
                  part: "natural",
                  field: "natural" as const,
                  value: computed.parts.natural ?? 0,
                  itemOffset: itemNatural,
                },
                {
                  part: "deflection",
                  field: "deflection" as const,
                  value: computed.parts.deflection ?? 0,
                  itemOffset: itemDeflection,
                },
                {
                  part: "dodge",
                  field: featEffects.dodgeBonus || stats.itemBonuses.combat.dodge.total
                    ? null
                    : ("dodge" as const),
                  value: computed.parts.dodge ?? 0,
                },
              ] as const;

              return (
                <div key={key} className="pc-combat-row" style={{ ["--combat-cols" as string]: 9 }}>
                  <div className="pc-combat-row-label">{label}</div>
                  <CombatTotal
                    value={computed.total}
                    signed={false}
                    itemSources={key === "ac" ? acItemSources : undefined}
                  />
                  {acParts.map((entry) => {
                    const { part, field, value } = entry;
                    const itemOffset =
                      "itemOffset" in entry ? (entry.itemOffset as number) : 0;
                    if (na.includes(part)) return <CombatNa key={part} />;
                    if (field && itemOffset === 0) {
                      return (
                        <CombatNumberInput
                          key={part}
                          value={value}
                          onChange={(raw) =>
                            patch((s) => {
                              s.combat[field] = raw === "" ? 0 : Number(raw);
                            })
                          }
                        />
                      );
                    }
                    if (field && itemOffset !== 0) {
                      return (
                        <CombatNumberInput
                          key={part}
                          value={value}
                          onChange={(raw) =>
                            patch((s) => {
                              const desired = raw === "" ? 0 : Number(raw);
                              s.combat[field] = desired - itemOffset;
                            })
                          }
                        />
                      );
                    }
                    return <CombatReadonly key={part} value={value} />;
                  })}
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
        <label className="pc-actions-attacks">
          <span className="npc-sheet-sub">Special attacks</span>
          <textarea
            className="pc-sheet-input pc-sheet-textarea"
            rows={3}
            value={state.combat.attacks}
            placeholder="Special attacks, natural weapons…"
            onChange={(e) =>
              patch((s) => {
                s.combat.attacks = e.target.value;
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
