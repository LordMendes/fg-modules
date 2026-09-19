import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEngineContext } from "@/lib/combat/rules/engineContext";
import { spellToActionSet } from "@/lib/spell-to-action-set";
import type { CombatSpellEntry } from "@/lib/combat/types";
import { resolveSpellCast, spellCastDicePool } from "@/lib/combat/spells/spellAction";

function entry(name: string, level: number | null = null): CombatSpellEntry {
  const converted = spellToActionSet(name);
  return {
    key: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    level,
    kind: "spell",
    actions: converted.actions,
    usesPerDay: null,
    casterLevel: 8,
    source: "compendium",
    confidence: converted.confidence,
  };
}

function target(id: string, opts: { sr?: number; acTouch?: number; saves?: Partial<{ fort: number; ref: number; will: number }> } = {}) {
  const fields = {
    id,
    name: id,
    kind: "npc" as const,
    ac: 15,
    acTouch: opts.acTouch ?? 12,
    acFlat: 13,
    fort: opts.saves?.fort ?? 2,
    ref: opts.saves?.ref ?? 2,
    will: opts.saves?.will ?? 2,
    initMod: 1,
    hpMax: 20,
    hpTemp: 0,
    wounds: 0,
    nonlethal: 0,
    defenses: { sr: opts.sr ?? null },
    reachFeet: 5,
    stats: {},
    effects: [],
  };
  return {
    id,
    name: id,
    engine: buildEngineContext(fields),
    defenses: fields.defenses,
  };
}

function caster(spellUses: Record<string, number> = { "slot:3": 2 }) {
  const fields = {
    id: "wizard",
    name: "Wizard",
    kind: "pc" as const,
    ac: 14,
    acTouch: 12,
    acFlat: 12,
    fort: 3,
    ref: 4,
    will: 5,
    initMod: 4,
    hpMax: 24,
    hpTemp: 0,
    wounds: 0,
    nonlethal: 0,
    defenses: {},
    reachFeet: 5,
    stats: { cl: 8, int: 4 },
    effects: [],
  };
  return {
    id: "wizard",
    name: "Wizard",
    init: 18,
    effects: [],
    spellUses,
    engine: buildEngineContext(fields),
    attackBonus: 6,
  };
}

describe("resolveSpellCast", () => {
  it("Fireball: SR, saves, halved damage, slot consumed", () => {
    const spell = entry("Fireball", 3);
    const faces = [
      11, // SR target 1: 8+11=19 vs 18 pass
      5, 18, 5, // saves (fail, success, fail)
      6, 6, 6, 6, 6, 6, 6, 6, // 8d6 = 48
    ];
    const resolution = resolveSpellCast(
      caster(),
      [
        target("g1", { sr: 18 }),
        target("g2"),
        target("g3"),
      ],
      spell,
      faces,
      { casterLevel: 8, spellLevel: 3, castingStatMod: 4 },
    );

    assert.equal(resolution.blocked, undefined);
    assert.ok(resolution.events.some((e) => e.kind === "sr"));
    assert.equal(resolution.events.filter((e) => e.kind === "save").length, 3);
    assert.equal(resolution.damagePlans.filter((p) => !p.skip).length, 3);
    assert.equal(resolution.damagePlans[1]?.half, true);
    assert.equal(resolution.consumeUseKey, "slot:3");
  });

  it("Cure Light Wounds heals 1d8 + min(CL, 5)", () => {
    const spell = entry("Cure Light Wounds", 1);
    const faces = [6]; // 1d8=6 + min(CL,5)=5 -> 11
    const resolution = resolveSpellCast(
      caster({ "slot:1": 3 }),
      [target("fighter")],
      spell,
      faces,
      { casterLevel: 8, spellLevel: 1, castingStatMod: 3 },
    );
    assert.equal(resolution.healPlans[0]?.amount, 11);
  });

  it("Bless applies one effect per target with CL minutes duration", () => {
    const spell = entry("Bless", 1);
    const resolution = resolveSpellCast(
      caster({ "slot:1": 2 }),
      [target("a"), target("b")],
      spell,
      [1],
      { casterLevel: 5, spellLevel: 1, castingStatMod: 2 },
    );
    assert.equal(resolution.effectPlans.length, 2);
    assert.equal(resolution.effectPlans[0]?.duration, 5);
    assert.equal(resolution.effectPlans[0]?.durationUnit, "minute");
  });

  it("Hold Person: failed Will applies Paralyzed; success applies nothing", () => {
    const spell = entry("Hold Person", 2);
    const fail = resolveSpellCast(
      caster({ "slot:2": 1 }),
      [target("cleric", { saves: { will: 1 } })],
      spell,
      [3],
      { casterLevel: 5, spellLevel: 2, castingStatMod: 3 },
    );
    assert.equal(fail.effectPlans.length, 1);
    assert.match(fail.effectPlans[0]?.label ?? "", /Paralyzed/i);

    const success = resolveSpellCast(
      caster({ "slot:2": 1 }),
      [target("cleric", { saves: { will: 10 } })],
      spell,
      [10],
      { casterLevel: 5, spellLevel: 2, castingStatMod: 3 },
    );
    assert.equal(success.effectPlans.length, 0);
  });

  it("Scorching Ray: ranged touch hit deals 4d6, miss deals none", () => {
    const spell = entry("Scorching Ray", 2);
    const hit = resolveSpellCast(
      caster({ "slot:2": 2 }),
      [target("goblin", { acTouch: 10 })],
      spell,
      [15, 4, 4, 4, 4, 4, 4], // hit + 4d6
      { casterLevel: 7, spellLevel: 2, castingStatMod: 4, attackBonus: 6 },
    );
    assert.equal(hit.damagePlans[0]?.skip, false);
    assert.equal(hit.damagePlans[0]?.packets[0]?.amount, 16);

    const miss = resolveSpellCast(
      caster({ "slot:2": 2 }),
      [target("goblin", { acTouch: 25 })],
      spell,
      [5, 4, 4, 4, 4],
      { casterLevel: 7, spellLevel: 2, castingStatMod: 4, attackBonus: 6 },
    );
    assert.equal(miss.damagePlans[0]?.skip, true);
  });

  it("spellCastDicePool sizes Fireball at three saves plus eight d6", () => {
    const spell = entry("Fireball", 3);
    const pool = spellCastDicePool(
      spell,
      [target("a"), target("b"), target("c")].map((t) => ({ defenses: t.defenses })),
      8,
    );
    const d20 = pool.find((p) => p.sides === 20)?.qty ?? 0;
    const d6 = pool.find((p) => p.sides === 6)?.qty ?? 0;
    assert.equal(d20, 3);
    assert.equal(d6, 8);
  });
});
