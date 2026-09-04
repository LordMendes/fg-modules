import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDieToPool,
  buildNotation,
  consolidatePool,
  d20Check,
  formatRollSummary,
  iterativeD20Checks,
  poolDieCount,
  removeOneDieFromPool,
  resultFromEngineGroups,
  toEngineNotation,
} from "./notation";
import { DEFAULT_SKIN_ID, DICE_SKINS, getDiceSkin } from "./skins";
import type { RollRequest } from "./types";

describe("dice notation", () => {
  it("consolidates matching sides", () => {
    assert.deepEqual(
      consolidatePool([
        { qty: 1, sides: 6 },
        { qty: 2, sides: 6 },
        { qty: 1, sides: 20 },
      ]),
      [
        { qty: 3, sides: 6 },
        { qty: 1, sides: 20 },
      ],
    );
  });

  it("builds notation with modifier", () => {
    assert.equal(buildNotation([{ qty: 2, sides: 6 }], 3), "2d6+3");
    assert.equal(buildNotation([{ qty: 1, sides: 20 }], -2), "1d20-2");
    assert.equal(
      buildNotation(
        [
          { qty: 1, sides: 8 },
          { qty: 1, sides: 20 },
        ],
        0,
      ),
      "1d8+1d20",
    );
  });

  it("builds mixed-pool engine groups instead of a joined string", () => {
    assert.deepEqual(
      toEngineNotation([
        { qty: 1, sides: 20 },
        { qty: 2, sides: 8 },
      ]),
      [
        { qty: 2, sides: 8 },
        { qty: 1, sides: 20 },
      ],
    );
  });

  it("keeps differently tinted dice separate for the engine", () => {
    assert.deepEqual(
      toEngineNotation([
        { qty: 2, sides: 6, themeColor: "#A8B4C0" },
        { qty: 1, sides: 6, themeColor: "#E85D04" },
      ]),
      [
        { qty: 2, sides: 6, themeColor: "#A8B4C0" },
        { qty: 1, sides: 6, themeColor: "#E85D04" },
      ],
    );
  });

  it("returns empty notation for empty pool without modifier", () => {
    assert.equal(buildNotation([], 0), "");
  });

  it("adds and removes dice from pool", () => {
    let pool = addDieToPool([], 20);
    pool = addDieToPool(pool, 20);
    pool = addDieToPool(pool, 6);
    assert.equal(poolDieCount(pool), 3);
    pool = removeOneDieFromPool(pool, 20);
    assert.deepEqual(pool, [
      { qty: 1, sides: 6 },
      { qty: 1, sides: 20 },
    ]);
  });

  it("builds a d20 check request", () => {
    const req = d20Check("Fortitude", 4);
    assert.equal(req.label, "Fortitude");
    assert.equal(req.modifier, 4);
    assert.deepEqual(req.dice, [{ qty: 1, sides: 20 }]);
  });

  it("parses engine groups into a roll result", () => {
    const request: RollRequest = {
      id: "r1",
      label: "Fortitude",
      dice: [{ qty: 1, sides: 20 }],
      modifier: 4,
    };
    const result = resultFromEngineGroups(request, [
      {
        value: 22,
        modifier: 4,
        sides: 20,
        rolls: [{ value: 18, sides: 20 }],
      },
    ]);
    assert.equal(result.faceSum, 18);
    assert.equal(result.total, 22);
    assert.equal(result.natural20, false);
    assert.equal(result.natural1, false);
    assert.match(formatRollSummary(result), /Fortitude: 18 \+ 4 = 22/);
  });

  it("flags natural 20 and natural 1", () => {
    const base: RollRequest = {
      id: "r2",
      label: "Attack",
      dice: [{ qty: 1, sides: 20 }],
      modifier: 5,
    };
    const nat20 = resultFromEngineGroups(base, [
      { rolls: [{ value: 20, sides: 20 }] },
    ]);
    assert.equal(nat20.natural20, true);
    assert.equal(nat20.total, 25);

    const nat1 = resultFromEngineGroups(base, [
      { rolls: [{ value: 1, sides: 20 }] },
    ]);
    assert.equal(nat1.natural1, true);
    assert.equal(nat1.total, 6);
  });

  it("applies a bonus per iterative d20", () => {
    const req = iterativeD20Checks("Longsword attack", [9, 4]);
    assert.deepEqual(req.dice, [{ qty: 2, sides: 20 }]);
    assert.deepEqual(req.iterativeModifiers, [9, 4]);
    const result = resultFromEngineGroups(req, [
      {
        rolls: [
          { value: 18, sides: 20 },
          { value: 12, sides: 20 },
        ],
      },
    ]);
    assert.deepEqual(result.attackTotals, [27, 16]);
    assert.equal(result.total, 27);
    assert.match(
      formatRollSummary(result),
      /Longsword attack: 18\+9=27, 12\+4=16/,
    );
  });
});

describe("dice skins", () => {
  it("has built-in skins with color themes", () => {
    assert.ok(DICE_SKINS.length >= 3);
    assert.equal(getDiceSkin(DEFAULT_SKIN_ID).id, DEFAULT_SKIN_ID);
    assert.equal(getDiceSkin("missing").id, DEFAULT_SKIN_ID);
    for (const skin of DICE_SKINS) {
      assert.ok(skin.themeColor.startsWith("#"));
      assert.equal(skin.engineTheme, "default");
    }
  });
});
