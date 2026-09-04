import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCustomTreasureRow,
  createDefaultTreasure,
  ensureTreasure,
  formatTreasureSummary,
} from "./treasure";

describe("createDefaultTreasure", () => {
  it("seeds PP GP SP CP at zero", () => {
    const rows = createDefaultTreasure();
    assert.deepEqual(
      rows.map((row) => [row.builtin, row.name, row.amount]),
      [
        ["pp", "PP", 0],
        ["gp", "GP", 0],
        ["sp", "SP", 0],
        ["cp", "CP", 0],
      ],
    );
  });
});

describe("ensureTreasure", () => {
  it("restores missing default coins and keeps custom rows", () => {
    const custom = createCustomTreasureRow("Electrum");
    custom.amount = 12;
    const rows = ensureTreasure([
      { id: "treasure-gp", name: "GP", amount: 40, builtin: "gp" },
      custom,
    ]);
    assert.equal(rows.map((row) => row.builtin).filter(Boolean).join(","), "pp,gp,sp,cp");
    assert.equal(rows.find((row) => row.builtin === "gp")?.amount, 40);
    assert.equal(rows.some((row) => row.name === "Electrum" && row.amount === 12), true);
  });

  it("fills empty or invalid state", () => {
    const rows = ensureTreasure(undefined);
    assert.equal(rows.length, 4);
    assert.equal(rows.every((row) => row.amount === 0), true);
  });
});

describe("formatTreasureSummary", () => {
  it("omits zero coins", () => {
    const rows = createDefaultTreasure();
    rows[1].amount = 25;
    rows.push({ id: "x", name: "Pearls", amount: 3 });
    assert.equal(formatTreasureSummary(rows), "25 GP, 3 Pearls");
  });
});
