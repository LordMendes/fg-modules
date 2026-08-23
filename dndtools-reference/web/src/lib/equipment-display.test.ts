import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEquipmentViewToFilters,
  buildEquipmentListExtras,
  buildEquipmentSummary,
  equipmentDescriptionSnippet,
  formatDamageType,
  mergeEquipmentViewIntoFields,
  parseEquipmentStats,
  parseEquipmentView,
  resolveEquipmentKindFilter,
} from "./equipment-display";

describe("equipment view resolution", () => {
  it("maps single kind filter to weapon view", () => {
    assert.equal(parseEquipmentView({ kind: ["weapon"] }), "weapon");
  });

  it("maps single kind filter to armor view", () => {
    assert.equal(parseEquipmentView({ kind: ["armor"] }), "armor");
  });

  it("defaults to all for missing or multi kind filters", () => {
    assert.equal(parseEquipmentView({}), "all");
    assert.equal(parseEquipmentView({ kind: ["weapon", "armor"] }), "all");
    assert.equal(parseEquipmentView({ kind: ["shield"] }), "all");
  });

  it("expands armor tab to armor and shield kinds", () => {
    assert.deepEqual(resolveEquipmentKindFilter({ kind: ["armor"] }), ["armor", "shield"]);
    assert.deepEqual(resolveEquipmentKindFilter({ kind: ["weapon"] }), ["weapon"]);
    assert.equal(resolveEquipmentKindFilter({}), null);
  });
});

describe("equipment display formatting", () => {
  it("expands damage type abbreviations", () => {
    assert.equal(formatDamageType("S"), "Slashing");
    assert.equal(formatDamageType("P"), "Piercing");
    assert.equal(formatDamageType("B"), "Bludgeoning");
  });

  it("truncates description snippets", () => {
    const long = "A".repeat(120);
    const snippet = equipmentDescriptionSnippet(long, 80);
    assert.ok(snippet);
    assert.equal(snippet.length, 81);
    assert.ok(snippet.endsWith("…"));
  });

  it("parses weapon stats fallback from index.stats", () => {
    const parsed = parseEquipmentStats("1d10 · 19-20/x2");
    assert.equal(parsed.damage, "1d10");
    assert.equal(parsed.critical, "19-20/x2");
  });

  it("parses armor stats fallback from index.stats", () => {
    const parsed = parseEquipmentStats("AC 6 · Max Dex 1 · ACP -6");
    assert.equal(parsed.ac, "6");
    assert.equal(parsed.maxDex, "1");
    assert.equal(parsed.acp, "-6");
  });

  it("builds weapon extras from indexData with stats fallback", () => {
    const extras = buildEquipmentListExtras(
      {
        kind: "weapon",
        category: "martial",
        cost: "10 gp",
        descriptionText: null,
        indexData: { stats: "1d8 · x3", damage_type: "S" },
      },
      "weapon",
    );
    assert.equal(extras.damage, "1d8");
    assert.equal(extras.critical, "x3");
    assert.equal(extras.damageType, "Slashing");
    assert.equal(extras.category, "Martial");
  });

  it("builds armor extras including speed when present", () => {
    const extras = buildEquipmentListExtras(
      {
        kind: "armor",
        category: "heavy",
        cost: "250 gp",
        descriptionText: "Heavy armor.",
        indexData: {
          ac_bonus: "6",
          max_dex: "1",
          armor_check_penalty: "-6",
          speed_30: "20",
          speed_20: "15",
        },
      },
      "armor",
    );
    assert.equal(extras.ac, "6");
    assert.equal(extras.maxDex, "1");
    assert.equal(extras.acp, "-6");
    assert.equal(extras.speed, "20 ft.");
    assert.equal(extras.description, "Heavy armor.");
  });

  it("builds all-view summary from structured fields", () => {
    const summary = buildEquipmentSummary({
      damage_m: "1d10",
      critical: "19-20/x2",
    });
    assert.equal(summary, "1d10 · 19-20/x2");
  });
});

describe("equipment view filter helpers", () => {
  it("applyEquipmentViewToFilters sets or clears kind", () => {
    const base = {
      search: "",
      description: "",
      sources: [],
      editions: [],
      fields: { category: ["martial"] },
      ranges: {},
      sort: null,
    };
    const weaponFilters = applyEquipmentViewToFilters(base, "weapon");
    assert.deepEqual(weaponFilters.fields.kind, ["weapon"]);
    const allFilters = applyEquipmentViewToFilters(weaponFilters, "all");
    assert.equal(allFilters.fields.kind, undefined);
  });

  it("mergeEquipmentViewIntoFields mirrors tab selection", () => {
    assert.deepEqual(mergeEquipmentViewIntoFields({}, "armor"), { kind: ["armor"] });
    assert.deepEqual(mergeEquipmentViewIntoFields({ category: ["heavy"] }, "all"), {
      category: ["heavy"],
    });
  });
});
