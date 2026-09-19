import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heal, tempHp } from "./healing";

describe("rules/healing (90-testing.md)", () => {
  it("heal 4 with wounds 6 and nonlethal 3 leaves wounds 2 and nonlethal 0", () => {
    const result = heal(4, {
      hpMax: 10,
      wounds: 6,
      hpTemp: 0,
      nonlethal: 3,
    });
    assert.equal(result.wounds, 2);
    assert.equal(result.nonlethal, 0);
    assert.equal(result.healed, 4);
  });

  it("temp 5 then temp 3 keeps temp 5", () => {
    const first = tempHp(5, { hpTemp: 0 });
    assert.equal(first.hpTemp, 5);

    const second = tempHp(3, { hpTemp: first.hpTemp });
    assert.equal(second.hpTemp, 5);
  });
});
