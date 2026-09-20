import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import {
  SPECIAL_ATTACK_CATALOG,
  entryFromTemplate,
  filterSpecialAttackCatalog,
  getSpecialAttackTemplate,
} from "./specialAttackCatalog";
import {
  applySpecialAttacksNormalization,
  computeNaturalAttackRows,
  createSpecialAttackId,
  formatSpecialAttackChip,
  formatSpecialAttacksString,
  formatSpecialAttackPreview,
  normalizeSpecialAttacks,
  specialAttackDamageDice,
  specialAttackDisplayName,
} from "./specialAttacks";
import { computeCombatStats, abilityModifier } from "./combatStats";
import type { PcSpecialAttackEntry } from "./types";

function biteEntry(overrides: Partial<PcSpecialAttackEntry> = {}): PcSpecialAttackEntry {
  const template = getSpecialAttackTemplate("bite")!;
  return {
    ...entryFromTemplate(template, createSpecialAttackId()),
    ...overrides,
  };
}

function clawEntry(overrides: Partial<PcSpecialAttackEntry> = {}): PcSpecialAttackEntry {
  const template = getSpecialAttackTemplate("claw")!;
  return {
    ...entryFromTemplate(template, createSpecialAttackId()),
    ...overrides,
  };
}

describe("specialAttackCatalog", () => {
  it("includes natural weapons, special templates, and custom", () => {
    const ids = SPECIAL_ATTACK_CATALOG.map((t) => t.id);
    assert.ok(ids.includes("bite"));
    assert.ok(ids.includes("claw"));
    assert.ok(ids.includes("breath"));
    assert.ok(ids.includes("rend"));
    assert.ok(ids.includes("custom"));
  });

  it("filters by name and kind", () => {
    const claws = filterSpecialAttackCatalog("claw");
    assert.ok(claws.some((t) => t.id === "claw"));
    assert.ok(claws.every((t) =>
      t.id.includes("claw") ||
      t.name.toLowerCase().includes("claw") ||
      t.blurb.toLowerCase().includes("claw"),
    ));
    const specials = filterSpecialAttackCatalog("breath");
    assert.equal(specials.length, 1);
    assert.equal(specials[0]?.id, "breath");
  });
});

describe("normalizeSpecialAttacks", () => {
  it("migrates legacy free-text attacks into a custom special row", () => {
    const entries = normalizeSpecialAttacks(undefined, "Breath weapon (fire)");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.kind, "special");
    assert.equal(entries[0]?.templateId, "custom");
    assert.equal(entries[0]?.notes, "Breath weapon (fire)");
  });

  it("keeps structured list and rebuilds attacks string", () => {
    const combat = {
      attacks: "old text",
      specialAttacks: [biteEntry({ name: "Bite", damageM: "1d8" })],
    };
    applySpecialAttacksNormalization(combat);
    assert.equal(combat.specialAttacks.length, 1);
    assert.match(combat.attacks, /Bite/);
    assert.doesNotMatch(combat.attacks, /old text/);
  });

  it("formats chips and FG summary lines", () => {
    const claws = clawEntry();
    assert.equal(formatSpecialAttackChip(claws), "2 Claws 1d4");
    assert.match(formatSpecialAttacksString([claws]), /2 Claws/);
  });
});

describe("computeNaturalAttackRows", () => {
  it("uses full Str for primary and half Str for secondary", () => {
    const state = createDefaultPcPlanState("Test");
    state.abilities.str = 18; // +4
    state.combat.sizeMod = 0;
    state.combat.specialAttacks = [
      biteEntry({ primary: true, count: 1, damageM: "1d8", damageS: "1d6" }),
      clawEntry({ primary: false, count: 2, damageM: "1d4", damageS: "1d3" }),
    ];
    const stats = computeCombatStats(state);
    // Force BAB for predictable math
    Object.assign(stats, { bab: 5 });
    const rows = computeNaturalAttackRows(state, { ...stats, bab: 5 });
    assert.equal(rows.length, 2);
    const bite = rows[0]!;
    const claws = rows[1]!;
    assert.equal(bite.attackBonus, 5 + 4); // BAB + Str, primary
    assert.equal(bite.damageModifier, 4);
    assert.equal(claws.attackBonus, 5 + 4 - 5); // secondary -5
    assert.equal(claws.damageModifier, 2); // half Str
    assert.deepEqual(claws.fullAttackBonuses, [4, 4]);
    assert.equal(claws.showFullAttack, true);
  });

  it("applies Multiattack secondary penalty of -2", () => {
    const state = createDefaultPcPlanState("Test");
    state.abilities.str = 10;
    state.feats = [{ slug: "multiattack", name: "Multiattack" }];
    state.combat.specialAttacks = [clawEntry({ primary: false, count: 1 })];
    const stats = computeCombatStats(state);
    const rows = computeNaturalAttackRows(state, { ...stats, bab: 3 });
    assert.equal(rows[0]?.attackBonus, 3 + 0 - 2);
  });

  it("picks Small damage dice when sizeMod > 0", () => {
    const entry = biteEntry({ damageM: "1d8", damageS: "1d6" });
    assert.equal(specialAttackDamageDice(entry, 0), "1d8");
    assert.equal(specialAttackDamageDice(entry, 1), "1d6");
  });

  it("builds a preview line with attack bonus", () => {
    const line = formatSpecialAttackPreview(biteEntry({ damageM: "1d8" }), {
      bab: 5,
      strMod: 2,
      sizeMod: 0,
      multiattack: false,
    });
    assert.match(line, /Bite \+7 melee \(1d8\+2\)/);
  });
});

describe("specialAttackDisplayName", () => {
  it("pluralizes count labels", () => {
    assert.equal(specialAttackDisplayName(clawEntry({ name: "Claw", count: 2 })), "2 Claws");
    assert.equal(specialAttackDisplayName(biteEntry({ name: "Bite", count: 1 })), "Bite");
  });
});

describe("abilityModifier sanity", () => {
  it("matches expected Str mods used above", () => {
    assert.equal(abilityModifier(18), 4);
    assert.equal(abilityModifier(10), 0);
  });
});
