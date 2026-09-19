import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEffect } from "../effects/parseEffect";
import { resolveSave } from "./saves";

describe("rules/saves (90-testing.md)", () => {
  it("+5 face 10 vs DC 15 succeeds on equal total", () => {
    const result = resolveSave(
      { saves: { fort: 5, ref: 5, will: 5 }, effects: [] },
      "fort",
      15,
      10,
    );
    assert.equal(result.total, 15);
    assert.equal(result.success, true);
  });

  it("SAVE vs fear applies only when the source descriptor matches", () => {
    const parsed = parseEffect("SAVE: 2 morale vs fear");
    const withFear = resolveSave(
      {
        saves: { fort: 0, ref: 0, will: 0 },
        effects: [{ label: "Bless", components: parsed.components, active: true }],
      },
      "will",
      15,
      10,
      { descriptor: "fear", label: "Cause Fear" },
    );
    assert.equal(withFear.bonus, 2);

    const withPoison = resolveSave(
      {
        saves: { fort: 0, ref: 0, will: 0 },
        effects: [{ label: "Bless", components: parsed.components, active: true }],
      },
      "will",
      15,
      10,
      { descriptor: "poison", label: "Poison" },
    );
    assert.equal(withPoison.bonus, 0);
  });

  it("FORT on a Reflex save does not apply", () => {
    const parsed = parseEffect("FORT: 2");
    const result = resolveSave(
      {
        saves: { fort: 0, ref: 0, will: 0 },
        effects: [{ label: "Bear's Endurance", components: parsed.components, active: true }],
      },
      "ref",
      15,
      10,
    );
    assert.equal(result.bonus, 0);
  });

  it("natural 1 does not auto-fail and natural 20 does not auto-succeed", () => {
    const low = resolveSave(
      { saves: { fort: 20, ref: 0, will: 0 }, effects: [] },
      "fort",
      30,
      1,
    );
    assert.equal(low.success, false);

    const high = resolveSave(
      { saves: { fort: 0, ref: 0, will: 0 }, effects: [] },
      "fort",
      30,
      20,
    );
    assert.equal(high.success, false);
  });
});
