import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDeathState } from "./death";
import { heal } from "./healing";

describe("rules/death (90-testing.md)", () => {
  it("hpMax 10 and wounds 13 is dying with Dying system effect", () => {
    const result = resolveDeathState({
      hpMax: 10,
      wounds: 13,
      nonlethal: 0,
    });
    assert.equal(result.deathState, "dying");
    assert.ok(result.systemEffects.add.includes("dying"));
  });

  it("wounds 20 on hpMax 10 is dead", () => {
    const result = resolveDeathState({
      hpMax: 10,
      wounds: 20,
      nonlethal: 0,
    });
    assert.equal(result.deathState, "dead");
    assert.equal(result.turnState, "dead");
    assert.ok(result.systemEffects.add.includes("dead"));
  });

  it("wounds 10 on hpMax 10 is disabled", () => {
    const result = resolveDeathState({
      hpMax: 10,
      wounds: 10,
      nonlethal: 0,
    });
    assert.equal(result.deathState, "disabled");
    assert.ok(result.systemEffects.add.includes("disabled"));
  });

  it("nonlethal 10 at hp 10 is staggered; nonlethal 11 is unconscious", () => {
    const staggered = resolveDeathState({
      hpMax: 10,
      wounds: 0,
      nonlethal: 10,
    });
    assert.ok(staggered.systemEffects.add.includes("staggered"));
    assert.equal(staggered.deathState, null);

    const unconscious = resolveDeathState({
      hpMax: 10,
      wounds: 0,
      nonlethal: 11,
    });
    assert.ok(unconscious.systemEffects.add.includes("unconscious"));
  });

  it("dying then heal 5 clears death state and removes Dying", () => {
    const healed = heal(5, {
      hpMax: 10,
      wounds: 13,
      hpTemp: 0,
      nonlethal: 0,
      deathState: "dying",
    });
    assert.equal(healed.wounds, 8);

    const result = resolveDeathState({
      hpMax: 10,
      wounds: healed.wounds,
      nonlethal: healed.nonlethal,
      deathState: "dying",
    });
    assert.equal(result.deathState, null);
    assert.ok(result.systemEffects.remove.includes("dying"));
    assert.ok(!result.systemEffects.add.includes("dying"));
  });
});
