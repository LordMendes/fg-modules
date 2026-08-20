import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSpellSchool, parseSpellSchool } from "./spell-utils";

describe("parseSpellSchool", () => {
  it("parses a single arcane school", () => {
    assert.deepEqual(parseSpellSchool("Evocation"), {
      schools: ["Evocation"],
      disciplines: [],
      subschool: null,
    });
  });

  it("parses school with subschool", () => {
    assert.deepEqual(parseSpellSchool("Conjuration (Creation)"), {
      schools: ["Conjuration"],
      disciplines: [],
      subschool: "Creation",
    });
  });

  it("parses dual-school spells", () => {
    assert.deepEqual(parseSpellSchool("Conjuration/Necromancy"), {
      schools: ["Conjuration", "Necromancy"],
      disciplines: [],
      subschool: null,
    });
  });

  it("parses dual-school with subschool", () => {
    assert.deepEqual(parseSpellSchool("Conjuration/Necromancy (Creation)"), {
      schools: ["Conjuration", "Necromancy"],
      disciplines: [],
      subschool: "Creation",
    });
  });

  it("parses dual-school with teleportation subschool", () => {
    assert.deepEqual(parseSpellSchool("Conjuration/Evocation (Teleportation)"), {
      schools: ["Conjuration", "Evocation"],
      disciplines: [],
      subschool: "Teleportation",
    });
  });

  it("parses martial discipline with maneuver type", () => {
    assert.deepEqual(parseSpellSchool("Iron Heart (Stance)"), {
      schools: [],
      disciplines: ["Iron Heart"],
      subschool: "Stance",
    });
  });

  it("parses bare martial discipline", () => {
    assert.deepEqual(parseSpellSchool("Iron Heart"), {
      schools: [],
      disciplines: ["Iron Heart"],
      subschool: null,
    });
  });

  it("parses abjuration shadow subschool", () => {
    assert.deepEqual(parseSpellSchool("Abjuration (Shadow)"), {
      schools: ["Abjuration"],
      disciplines: [],
      subschool: "Shadow",
    });
  });

  it("parses transmutation counter subschool", () => {
    assert.deepEqual(parseSpellSchool("Transmutation (Counter)"), {
      schools: ["Transmutation"],
      disciplines: [],
      subschool: "Counter",
    });
  });

  it("returns empty for null/blank input", () => {
    assert.deepEqual(parseSpellSchool(null), {
      schools: [],
      disciplines: [],
      subschool: null,
    });
    assert.deepEqual(parseSpellSchool("  "), {
      schools: [],
      disciplines: [],
      subschool: null,
    });
  });
});

describe("formatSpellSchool", () => {
  it("reconstructs dual-school with subschool", () => {
    assert.equal(
      formatSpellSchool({
        schools: ["Conjuration", "Necromancy"],
        disciplines: [],
        subschool: "Creation",
      }),
      "Conjuration/Necromancy (Creation)",
    );
  });

  it("reconstructs martial discipline with maneuver type", () => {
    assert.equal(
      formatSpellSchool({
        schools: [],
        disciplines: ["Iron Heart"],
        subschool: "Stance",
      }),
      "Iron Heart (Stance)",
    );
  });
});
