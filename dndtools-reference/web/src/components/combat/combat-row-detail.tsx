"use client";



import {

  attackTypeBadge,

  formatDefensesSummary,

  formatIterativeBonuses,

  formatThreatRange,

} from "@/components/combat/combat-utils";

import { CombatSpellEditor } from "@/components/combat/combat-spell-editor";

import {

  makeDamageDragPayload,

  setCombatDragData,

} from "@/components/combat/combat-roll-drop";

import { useDice } from "@/components/dice/dice-provider";

import { useCombatContext } from "@/components/combat/combat-context";

import { combatSetCombatantSpells } from "@/actions/combat";

import { spellSaveDc } from "@/lib/combat/spells/dc";

import { spellCastDicePool } from "@/lib/combat/spells/spellAction";

import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";


import type { CombatantView, CombatSpellEntry } from "@/lib/combat/types";

import { formatModifier } from "@/lib/pc-planner/combatStats";

import { useState } from "react";

import { CombatRowEffectsSection } from "./combat-row-effects";



const LAST_SAVE_DC_KEY = "combat-last-save-dc";



function readLastSaveDc(): number {

  try {

    const raw = sessionStorage.getItem(LAST_SAVE_DC_KEY);

    const value = raw ? Number(raw) : 15;

    return Number.isFinite(value) ? value : 15;

  } catch {

    return 15;

  }

}



function DefenseSection({ c, isDm }: { c: CombatantView; isDm: boolean }) {

  const ctx = useCombatContext();

  const { rolling: pending } = useDice();

  const [lastDc, setLastDc] = useState(readLastSaveDc);



  const saves = [

    { type: "fort" as const, label: "Fort", value: c.snapshot.fort },

    { type: "ref" as const, label: "Ref", value: c.snapshot.ref },

    { type: "will" as const, label: "Will", value: c.snapshot.will },

  ].filter((row) => row.value != null);



  const defenseParts = formatDefensesSummary(c.defenses);



  function rollSave(saveType: "fort" | "ref" | "will") {

    if (!ctx) return;

    const input = window.prompt(`${saveType.toUpperCase()} save DC`, String(lastDc));

    if (input == null) return;

    const dc = Number(input);

    if (!Number.isFinite(dc)) return;

    setLastDc(dc);

    sessionStorage.setItem(LAST_SAVE_DC_KEY, String(dc));

    ctx.rollSave({

      targetIds: [c.id],

      saveType,

      dc,

      source: `Save DC ${dc}`,

      label: `${c.name} ${saveType} save DC ${dc}`,

    });

  }



  return (

    <section className="combat-detail-section">

      <h4 className="combat-detail-heading">Defense</h4>

      <div className="combat-detail-grid">

        <span>AC {c.ac}</span>

        {c.acTouch != null ? <span>T {c.acTouch}</span> : null}

        {c.acFlat != null ? <span>FF {c.acFlat}</span> : null}

        {defenseParts.map((part) => (

          <span key={part}>{part}</span>

        ))}

        <span>

          Space {c.spaceSquares} · Reach {c.reachFeet} ft.

        </span>

        {c.snapshot.speed ? <span>Spd {c.snapshot.speed}</span> : null}

      </div>

      {saves.length > 0 ? (

        <div className="combat-saves-row">

          <span className="combat-detail-subheading">Saves</span>

          {saves.map((row) => (

            <button

              key={row.type}

              type="button"

              className="tool-btn tool-btn--ghost dice-rollable combat-save-btn"

              disabled={pending || !ctx}

              draggable

              onDragStart={(e) => {

                setCombatDragData(e, {

                  kind: "save",

                  targetIds: [c.id],

                  saveType: row.type,

                  dc: lastDc,

                  label: `${row.label} +${formatModifier(row.value!)} vs DC ${lastDc}`,

                  source: `Save DC ${lastDc}`,

                } as never);

              }}

              onClick={() => rollSave(row.type)}

            >

              {row.label} {formatModifier(row.value!)}

            </button>

          ))}

        </div>

      ) : null}

      {isDm ? (

        <div className="combat-save-dc-chip-row">

          <span

            className="combat-save-dc-chip"

            draggable

            onDragStart={(e) => {

              setCombatDragData(e, {

                kind: "save",

                targetIds: [c.id],

                saveType: "fort",

                dc: lastDc,

                label: `Fort save DC ${lastDc}`,

                source: `Save: Fort DC ${lastDc}`,

              } as never);

            }}

          >

            Save: Fort DC {lastDc}

          </span>

        </div>

      ) : null}

    </section>

  );

}



function SpellsSection({ c, campaignId }: { c: CombatantView; campaignId: string }) {

  const ctx = useCombatContext();

  const { rolling: pending } = useDice();

  const [editingKey, setEditingKey] = useState<string | null>(null);



  if (c.spells.length === 0) return null;



  async function saveSpells(next: CombatSpellEntry[]) {

    await combatSetCombatantSpells(campaignId, c.id, next);

  }



  return (

    <section className="combat-detail-section">

      <h4 className="combat-detail-heading">Spells</h4>

      <ul className="combat-spells">

        {c.spells.map((spell) => {

          const dc =

            spell.level != null

              ? spellSaveDc({

                  spellLevel: spell.level,

                  castingStatMod: c.stats.int ?? c.stats.wis ?? c.stats.cha ?? 0,

                })

              : null;

          const useKey =

            spell.kind === "sla" ? spell.key : spell.level != null ? `slot:${spell.level}` : null;

          const usesLeft = useKey != null ? c.spellUses[useKey] : null;



          return (

            <li key={spell.key} className="combat-spell-line">

              <span className="combat-spell-name">{spell.name}</span>

              {spell.level != null ? (

                <span className="combat-spell-level">L{spell.level}</span>

              ) : null}

              {dc != null ? <span className="combat-spell-dc">DC {dc}</span> : null}

              {!spell.actions.cast.srnotallowed ? (

                <span className="combat-spell-sr">SR</span>

              ) : null}

              {usesLeft != null ? (

                <span className="combat-spell-uses">{usesLeft} left</span>

              ) : null}

              <button

                type="button"

                className="tool-btn tool-btn--ghost dice-rollable combat-spell-cast-btn"

                disabled={pending || !ctx || (usesLeft === 0)}

                draggable

                onDragStart={(e) => {

                  if (!ctx) return;

                  setCombatDragData(e, {

                    kind: "cast",

                    casterId: c.id,

                    spellKey: spell.key,

                    label: `${c.name} ${spell.name}`,

                  } as never);

                }}

                onClick={() => {

                  if (!ctx) return;

                  const targetRows = (ctx.combat?.combatants ?? []).filter((t) =>

                    c.targetIds.includes(t.id),

                  );

                  const pool = spellCastDicePool(

                    spell,

                    targetRows.map((t) => ({ defenses: t.defenses })),

                    spell.casterLevel ?? c.stats.cl ?? 1,

                  );

                  ctx.rollCast({

                    casterId: c.id,

                    spellKey: spell.key,

                    targetIds: c.targetIds,

                    label: `${c.name} ${spell.name}`,

                    dice: pool,

                    casterLevel: spell.casterLevel ?? c.stats.cl ?? undefined,

                    spellLevel: spell.level ?? undefined,

                    castingStatMod:

                      c.stats.int ?? c.stats.wis ?? c.stats.cha ?? undefined,

                  });

                }}

              >

                Cast

              </button>

              <button

                type="button"

                className="tool-btn tool-btn--ghost combat-spell-edit-btn"

                aria-label={`Edit ${spell.name}`}

                onClick={() =>

                  setEditingKey((key) => (key === spell.key ? null : spell.key))

                }

              >

                ✎

              </button>

              {editingKey === spell.key ? (

                <CombatSpellEditor

                  entry={spell}

                  onChange={(next) => {

                    void saveSpells(

                      c.spells.map((row) => (row.key === next.key ? next : row)),

                    );

                  }}

                />

              ) : null}

            </li>

          );

        })}

      </ul>

    </section>

  );

}



function OffenseSection({ c }: { c: CombatantView }) {

  const ctx = useCombatContext();

  const { rolling: pending } = useDice();

  const targets = (ctx?.combat?.combatants ?? []).filter((t) =>

    c.targetIds.includes(t.id),

  );

  const pendingCrit = ctx?.pendingCritFor(c.id) ?? null;



  if (c.attacks.length === 0) return null;



  return (

    <section className="combat-detail-section">

      <h4 className="combat-detail-heading">Offense</h4>

      <ul className="combat-attacks">

        {c.attacks.map((atk, i) => {

          const bonuses = atk.iterativeBonuses ?? [atk.bonus];

          const attackType = atk.attackType ?? atk.mode;

          const isGrapple = attackType === "grapple";

          const critForAttack =

            pendingCrit?.attackName === atk.name ? pendingCrit : null;

          const threatLabel = formatThreatRange(atk);



          return (

            <li key={`${atk.name}-${i}`} className="combat-attack-line">

              <span className="combat-attack-name">{atk.name}</span>

              <span className="combat-attack-badge" title={attackType}>

                {attackTypeBadge(attackType)}

              </span>

              <span className="combat-attack-bonus">

                {formatIterativeBonuses(bonuses)}

              </span>

              {atk.damage ? (

                <span className="combat-attack-damage">{atk.damage}</span>

              ) : null}

              {threatLabel ? (

                <span className="combat-attack-threat">{threatLabel}</span>

              ) : null}



              <button

                type="button"

                className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"

                disabled={pending || !ctx}

                draggable

                onDragStart={(e) => {

                  if (!ctx) return;

                  setCombatDragData(e, {

                    kind: "attack",

                    attackerId: c.id,

                    attackIndex: i,

                    label: `${c.name} ${atk.name} attack`,

                    bonuses,

                    attackType,

                  });

                }}

                onClick={() => {

                  if (!ctx) return;

                  ctx.rollAttack({

                    attackerId: c.id,

                    attackIndex: i,

                    targetIds: c.targetIds,

                    attackType,

                    label: `${c.name} ${atk.name} attack`,

                    bonuses,

                  });

                }}

              >

                Attack

              </button>



              {critForAttack && !isGrapple ? (

                <button

                  type="button"

                  className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"

                  disabled={pending || !ctx || targets.length === 0}

                  onClick={() => {

                    if (!ctx || targets.length === 0) return;

                    ctx.rollConfirm({

                      attackerId: c.id,

                      attackIndex: i,

                      targetId: targets[0]!.id,

                      attackType,

                      label: `${c.name} ${atk.name} confirm critical`,

                      bonus: bonuses[0] ?? atk.bonus,

                    });

                  }}

                >

                  Confirm

                </button>

              ) : null}



              {atk.damage && !isGrapple ? (

                <button

                  type="button"

                  className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"

                  disabled={pending || !ctx}

                  draggable

                  onDragStart={(e) => {

                    const payload = makeDamageDragPayload(

                      c.id,

                      i,

                      critForAttack

                        ? `${c.name} ${atk.name} critical damage`

                        : `${c.name} ${atk.name} damage`,

                      atk.damage,

                      attackType,

                      critForAttack

                        ? { multiplier: critForAttack.multiplier }

                        : undefined,

                    );

                    if (payload) setCombatDragData(e, payload);

                  }}

                  onClick={() => {

                    if (!ctx) return;

                    const parsed = parseDiceNotation(atk.damage);

                    if (!parsed) return;

                    const targetIds = c.pendingTargetIds.length

                      ? c.pendingTargetIds

                      : targets.map((t) => t.id);

                    ctx.rollDamage({

                      attackerId: c.id,

                      attackIndex: i,

                      targetIds,

                      attackType,

                      label: critForAttack

                        ? `${c.name} ${atk.name} critical damage`

                        : `${c.name} ${atk.name} damage`,

                      dice: parsed.dice,

                      modifier: parsed.modifier,

                      ...(critForAttack

                        ? {

                            crit: true,

                            multiplier: critForAttack.multiplier,

                          }

                        : {}),

                    });

                  }}

                >

                  {critForAttack

                    ? `Crit damage x${critForAttack.multiplier}`

                    : "Damage"}

                </button>

              ) : null}

            </li>

          );

        })}

      </ul>

    </section>

  );

}



export function CombatRowDetail({

  c,

  isDm,

  viewerPcPlanId,

  campaignId,

}: {

  c: CombatantView;

  isDm: boolean;

  viewerPcPlanId: string | null;

  campaignId: string;

}) {

  const showDefense = isDm || (c.kind === "pc" && c.pcPlanId === viewerPcPlanId);

  const showOffense =

    (isDm || c.attacks.length > 0) && c.identified;

  const showSpells =

    c.spells.length > 0 &&

    (isDm || (c.kind === "pc" && c.pcPlanId === viewerPcPlanId) || c.identified);



  return (

    <div className="combat-row-detail">

      {showDefense && (c.ac || c.defenses) ? (

        <DefenseSection c={c} isDm={isDm} />

      ) : null}

      {showOffense ? <OffenseSection c={c} /> : null}

      {showSpells ? <SpellsSection c={c} campaignId={campaignId} /> : null}

      <CombatRowEffectsSection

        c={c}

        isDm={isDm}

        viewerPcPlanId={viewerPcPlanId}

        campaignId={campaignId}

      />

    </div>

  );

}


