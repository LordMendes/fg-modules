import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDefenses } from "./damage";
import type { DamagePacket } from "../types";

function target(
  overrides: Partial<Parameters<typeof applyDefenses>[1]> = {},
): Parameters<typeof applyDefenses>[1] {
  return {
    hpMax: 20,
    wounds: 0,
    hpTemp: 0,
    nonlethal: 0,
    defenses: {},
    ...overrides,
  };
}

function packet(
  amount: number,
  types: DamagePacket["types"],
  extra: Partial<DamagePacket> = {},
): DamagePacket {
  return { amount, types, source: "test", ...extra };
}

describe("rules/damage (90-testing.md)", () => {
  it("9 slashing vs DR 5/magic applies 4", () => {
    const result = applyDefenses(
      [packet(9, ["slashing"])],
      target({ defenses: { dr: [{ amount: 5, bypass: ["magic"] }] } }),
    );
    assert.equal(result.applied, 4);
  });

  it("9 slashing,magic vs DR 5/magic applies 9", () => {
    const result = applyDefenses(
      [packet(9, ["slashing", "magic"])],
      target({ defenses: { dr: [{ amount: 5, bypass: ["magic"] }] } }),
    );
    assert.equal(result.applied, 9);
  });

  it("9 slashing vs DR 5/- and DR 10/magic applies 0", () => {
    const result = applyDefenses(
      [packet(9, ["slashing"])],
      target({
        defenses: {
          dr: [
            { amount: 5, bypass: [] },
            { amount: 10, bypass: ["magic"] },
          ],
        },
      }),
    );
    assert.equal(result.applied, 0);
  });

  it("9 slashing,magic vs DR 5/- and DR 10/magic applies 4", () => {
    const result = applyDefenses(
      [packet(9, ["slashing", "magic"])],
      target({
        defenses: {
          dr: [
            { amount: 5, bypass: [] },
            { amount: 10, bypass: ["magic"] },
          ],
        },
      }),
    );
    assert.equal(result.applied, 4);
  });

  it("10 fire vs RESIST 10 fire applies 0", () => {
    const result = applyDefenses(
      [packet(10, ["fire"])],
      target({ defenses: { resist: { fire: 10 } } }),
    );
    assert.equal(result.applied, 0);
  });

  it("10 fire vs IMMUNE fire applies 0 with immune adjustment", () => {
    const result = applyDefenses(
      [packet(10, ["fire"])],
      target({ defenses: { immune: ["fire"] } }),
    );
    assert.equal(result.applied, 0);
    assert.ok(result.adjustments.some((a) => a.kind === "immune"));
  });

  it("10 cold vs VULN cold applies 15", () => {
    const result = applyDefenses(
      [packet(10, ["cold"])],
      target({ defenses: { vuln: ["cold"] } }),
    );
    assert.equal(result.applied, 15);
    assert.ok(result.adjustments.some((a) => a.kind === "vuln"));
  });

  it("7 fire half applies 3", () => {
    const result = applyDefenses(
      [packet(7, ["fire"])],
      target(),
      { half: true },
    );
    assert.equal(result.applied, 3);
  });

  it("1 fire half applies 1 (minimum 1)", () => {
    const result = applyDefenses(
      [packet(1, ["fire"])],
      target(),
      { half: true },
    );
    assert.equal(result.applied, 1);
  });

  it("6 precision vs IMMUNE precision applies 0", () => {
    const result = applyDefenses(
      [packet(6, [], { precision: true })],
      target({ defenses: { immune: ["precision"] } }),
    );
    assert.equal(result.applied, 0);
    assert.ok(result.adjustments.some((a) => a.kind === "precisionImmune"));
  });

  it("8 vs temp 5 and wounds 0 leaves temp 0 and wounds 3", () => {
    const result = applyDefenses(
      [packet(8, ["slashing"])],
      target({ hpTemp: 5, wounds: 0 }),
    );
    assert.equal(result.hpTemp, 0);
    assert.equal(result.wounds, 3);
    assert.equal(result.toTemp, 5);
  });

  it("5 nonlethal adds nonlethal without changing wounds", () => {
    const result = applyDefenses(
      [packet(5, ["bludgeoning"])],
      target({ wounds: 2 }),
      { nonlethal: true },
    );
    assert.equal(result.nonlethal, 5);
    assert.equal(result.wounds, 2);
    assert.equal(result.toNonlethal, 5);
  });
});
