import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeAutoDefenses,
  formatDefenseBadge,
  formatDefenseOriginTooltip,
  normalizeDefensesState,
  parseDefenseEntriesFromText,
  parseDefensesFromClassAbilities,
} from "./pcDefenses";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import { syncPcPlanState } from "./syncState";

describe("parseDefenseEntriesFromText", () => {
  it("parses damage reduction with slash bypass", () => {
    const entries = parseDefenseEntriesFromText("Damage reduction 2/—", "class");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.kind, "dr");
    assert.equal(entries[0]?.amount, 2);
    assert.equal(entries[0]?.bypass, "-");
    assert.equal(formatDefenseBadge(entries[0]!), "DR: 2/-");
  });

  it("parses dwarf-style energy resistance and sleep immunity", () => {
    const text =
      "Dwarves have resistance to fire 5. Elves have immunity to sleep effects.";
    const entries = parseDefenseEntriesFromText(text, "race");
    const resist = entries.find((e) => e.kind === "resistance");
    const immune = entries.find((e) => e.kind === "immunity");
    assert.ok(resist);
    assert.equal(resist?.subject, "fire");
    assert.equal(resist?.amount, 5);
    assert.ok(immune);
    assert.match((immune?.subject ?? "").toLowerCase(), /sleep/);
  });

  it("keeps higher DR amount when merging duplicates", () => {
    const entries = parseDefenseEntriesFromText(
      "Damage reduction 1/-. Damage reduction 2/-.",
      "class",
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.amount, 2);
  });
});

describe("normalizeDefensesState", () => {
  it("migrates legacy string defenses into entries", () => {
    const next = normalizeDefensesState({
      dr: "5/magic",
      resistances: "fire 10",
      immunities: "sleep",
      vulnerabilities: "",
      extra: "",
    });
    assert.ok(next.entries.some((e) => e.kind === "dr" && e.amount === 5));
    assert.ok(next.entries.some((e) => e.kind === "resistance"));
    assert.ok(next.entries.some((e) => e.kind === "immunity"));
  });
});

describe("computeAutoDefenses / sync", () => {
  it("fills defenses from race and class when not customized", () => {
    const race: RaceDerivedFeatures = {
      traits: ["immunity to sleep"],
      abilityMods: {},
      skillBonuses: {},
      skillPointBonus: null,
      saveBonus: { fort: 0, ref: 0, will: 0 },
      naturalArmor: 0,
      sizeMod: 0,
      speed: 30,
      speedUnhinderedByEncumbrance: false,
      senses: { darkvisionFeet: 0, lowLight: true, scent: false, extra: "" },
      languages: ["Common"],
      defenses: {
        entries: parseDefenseEntriesFromText("immunity to sleep", "race"),
      },
    };
    const auto = computeAutoDefenses(race, [
      {
        className: "Barbarian",
        classSlug: "barbarian",
        level: 7,
        name: "Damage reduction 1/—",
      },
    ]);
    assert.ok(auto.entries.some((e) => e.kind === "immunity"));
    assert.ok(auto.entries.some((e) => e.kind === "dr" && e.amount === 1));

    const state = createDefaultPcPlanState();
    state.identity.defensesCustomized = false;
    const synced = syncPcPlanState(state, race, {
      classAbilities: [
        {
          className: "Barbarian",
          classSlug: "barbarian",
          level: 7,
          name: "Damage reduction 1/—",
        },
      ],
    });
    assert.ok(synced.identity.defenses?.entries.some((e) => e.kind === "dr"));
  });

  it("leaves customized defenses alone", () => {
    const state = createDefaultPcPlanState();
    state.identity.defensesCustomized = true;
    state.identity.defenses = {
      entries: [
        {
          id: "custom-1",
          kind: "dr",
          amount: 9,
          bypass: "magic",
          source: "custom",
        },
      ],
    };
    const synced = syncPcPlanState(state, null, {
      classAbilities: [
        {
          className: "Barbarian",
          classSlug: "barbarian",
          level: 7,
          name: "Damage reduction 1/—",
        },
      ],
    });
    assert.equal(synced.identity.defenses?.entries.length, 1);
    assert.equal(synced.identity.defenses?.entries[0]?.amount, 9);
  });

  it("parses class ability names for DR", () => {
    const entries = parseDefensesFromClassAbilities([
      {
        className: "Barbarian",
        classSlug: "barbarian",
        level: 10,
        name: "Damage reduction 2/—",
      },
    ]);
    assert.equal(entries[0]?.amount, 2);
    assert.equal(formatDefenseBadge(entries[0]!), "DR: 2/-");
    assert.equal(entries[0]?.sourceLabel, "Barbarian: Damage reduction 2/—");
    assert.equal(
      formatDefenseOriginTooltip(entries[0]!),
      "From Barbarian: Damage reduction 2/—",
    );
  });
});
