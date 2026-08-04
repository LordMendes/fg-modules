"use client";

import {
  computeCombatStats,
  formatModifier,
} from "@/lib/pc-planner/combatStats";
import type { ClassDerivedFeatures } from "@/lib/pc-planner/parseClassAbilityEffects";
import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import type { CombatState, PcPlanState } from "@/lib/pc-planner/types";

type PcCombatPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  raceFeatures?: RaceDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
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

export function PcCombatPanel({
  state,
  patch,
  raceFeatures = null,
  classFeatures = null,
}: PcCombatPanelProps) {
  const stats = computeCombatStats(state, raceFeatures, classFeatures);
  const { combat } = state;

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-combat-panel" role="tabpanel">
      <div className="pc-combat-grid">
        <section className="pc-combat-block">
          <h3 className="pc-combat-block-title">Base Attack Bonus</h3>
          <div className="pc-combat-bab-highlight">
            <span className="pc-combat-bab-highlight-label">BAB</span>
            <CombatTotal value={stats.bab} />
          </div>
          <div className="pc-combat-table" style={{ ["--combat-cols" as string]: 5 }}>
            <CombatTableHeader columns={["Total", "BAB", "Stat", "Size", "Misc"]} />
            {(
              [
                { label: "Melee", key: stats.melee, misc: "meleeMisc" as const },
                { label: "Ranged", key: stats.ranged, misc: "rangedMisc" as const },
                { label: "Grapple", key: stats.grapple, misc: "grappleMisc" as const },
              ] as const
            ).map(({ label, key, misc }) => (
              <div key={label} className="pc-combat-row" style={{ ["--combat-cols" as string]: 5 }}>
                <div className="pc-combat-row-label">{label}</div>
                <CombatTotal value={key.total} />
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
              { label: "Misc", value: combat.initMisc, editable: "initMisc" },
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
              { label: "Armor", value: combat.speedArmor, editable: "speedArmor", signed: false },
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
          <div className="pc-combat-table" style={{ ["--combat-cols" as string]: 5 }}>
            <CombatTableHeader columns={["Total", "Class", "Stat", "Abil", "Misc"]} />
            {(
              [
                { label: "Fortitude", row: stats.fortitude, misc: "fortMisc" as const },
                { label: "Reflex", row: stats.reflex, misc: "refMisc" as const },
                { label: "Will", row: stats.will, misc: "willMisc" as const },
              ] as const
            ).map(({ label, row, misc }) => (
              <div key={label} className="pc-combat-row" style={{ ["--combat-cols" as string]: 5 }}>
                <div className="pc-combat-row-label">{label}</div>
                <CombatTotal value={row.total} />
                <CombatReadonly value={row.parts.class} />
                <CombatReadonly value={row.parts.stat} />
                <CombatReadonly value={row.parts.ability ?? 0} />
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
                { part: "armor", field: "armor" as const, value: combat.armor },
                { part: "shield", field: "shield" as const, value: combat.shield },
                { part: "stat", field: null, value: computed.parts.stat ?? 0 },
                { part: "size", field: "sizeMod" as const, value: combat.sizeMod },
                { part: "natural", field: "natural" as const, value: combat.natural },
                { part: "deflection", field: "deflection" as const, value: combat.deflection },
                { part: "dodge", field: "dodge" as const, value: combat.dodge },
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
