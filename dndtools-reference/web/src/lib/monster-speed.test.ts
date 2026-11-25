import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatMonsterSpeed, parseMonsterSpeed } from "./monster-speed";

describe("formatMonsterSpeed", () => {
  it("shows the eagle fly speed from the SRD line", () => {
    assert.equal(
      formatMonsterSpeed("10 ft. (2 squares), fly 80 ft. (average)"),
      "Land 10 ft., Fly 80 ft. (average)",
    );
  });

  it("keeps a land-only eagle speed", () => {
    assert.equal(formatMonsterSpeed("Land 10 ft"), "Land 10 ft.");
  });

  it("shows the gargoyle fly speed", () => {
    assert.equal(
      formatMonsterSpeed("40 ft. , Fly 60 ft. (Average)"),
      "Land 40 ft., Fly 60 ft. (average)",
    );
  });

  it("drops a duplicated land prefix and keeps fly", () => {
    assert.equal(
      formatMonsterSpeed("land 20 ft, 20 ft., fly 90 ft. (average)"),
      "Land 20 ft., Fly 90 ft. (average)",
    );
  });

  it("keeps a land-only creature such as a baboon", () => {
    assert.equal(formatMonsterSpeed("Land 40 ft"), "Land 40 ft.");
    assert.deepEqual(
      parseMonsterSpeed("Land 40 ft").map((mode) => mode.mode),
      ["land"],
    );
  });

  it("keeps swim, climb, burrow, and perfect fly", () => {
    assert.equal(formatMonsterSpeed("Swim 60 ft, Swim 60 ft."), "Swim 60 ft.");
    assert.equal(formatMonsterSpeed("40 ft, 40 ft., climb 20 ft."), "Land 40 ft., Climb 20 ft.");
    assert.equal(
      formatMonsterSpeed("30 ft. (6 squares), burrow 10 ft."),
      "Land 30 ft., Burrow 10 ft.",
    );
    assert.equal(formatMonsterSpeed("Fly (Perfect) 100 ft"), "Fly 100 ft. (perfect)");
  });
});
