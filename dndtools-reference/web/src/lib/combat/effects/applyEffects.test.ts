import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EffectComponent } from "../types";
import { collect, sumTag, type ActiveEffect } from "./applyEffects";
import { parseEffect } from "./parseEffect";

function effectFromString(label: string, input: string): ActiveEffect {
  const { components } = parseEffect(input);
  return { label, components, active: true };
}

function sumValues(parts: { value: number }[]): number {
  return parts.reduce((s, p) => s + p.value, 0);
}

describe("applyEffects stacking (90-testing.md parseEffect rows)", () => {
  it("collects ATK = +2 from duplicate morale bonuses (highest)", () => {
    const ctx = {
      effects: [effectFromString("Morale", "ATK: +2 morale; ATK: +1 morale")],
    };
    const parts = collect(ctx, "ATK");
    assert.equal(sumValues(parts), 2);
    assert.equal(parts.length, 1);
  });

  it("collects AC = +2 from duplicate dodge bonuses (stack)", () => {
    const ctx = {
      effects: [effectFromString("Dodge stack", "AC: 1 dodge; AC: 1 dodge")],
    };
    const parts = collect(ctx, "AC");
    assert.equal(sumValues(parts), 2);
    assert.equal(parts.length, 2);
  });

  it("collects ATK = -4 from duplicate penalties (stack)", () => {
    const ctx = {
      effects: [effectFromString("Penalties", "ATK: -2; ATK: -2 morale")],
    };
    const parts = collect(ctx, "ATK");
    assert.equal(sumValues(parts), -4);
    assert.equal(parts.length, 2);
  });

  it("names Bless in tooltip for morale attack bonus", () => {
    const ctx = {
      effects: [effectFromString("Bless", "Bless; ATK: 1 morale")],
    };
    const parts = collect(ctx, "ATK");
    assert.equal(parts.length, 1);
    assert.equal(parts[0]!.label, "Bless (morale)");
    assert.equal(parts[0]!.value, 1);
  });

  it("filters melee ATK components by attack type", () => {
    const components: EffectComponent[] = [
      { tag: "ATK", value: -2, descriptors: ["melee"] },
      { tag: "ATK", value: 1, descriptors: ["ranged"] },
    ];
    const ctx = { effects: [{ label: "Power Attack", components, active: true }] };

    assert.equal(sumTag(ctx, "ATK", { attackType: "melee" }), -2);
    assert.equal(sumTag(ctx, "ATK", { attackType: "ranged" }), 1);
  });

  it("filters SAVE vs descriptor", () => {
    const ctx = {
      effects: [
        effectFromString("Bless", "SAVE: 2 morale vs fear"),
      ],
    };
    assert.equal(sumTag(ctx, "SAVE", { saveDescriptor: "fear" }), 2);
    assert.equal(sumTag(ctx, "SAVE", { saveDescriptor: "poison" }), 0);
  });

  it("FORT tag does not apply to Reflex saves", () => {
    const ctx = {
      effects: [effectFromString("Fort boost", "FORT: 2")],
    };
    assert.equal(sumTag(ctx, "FORT", { saveType: "fort" }), 2);
    assert.equal(sumTag(ctx, "FORT", { saveType: "ref" }), 0);
  });

  it("SAVE applies to any save type", () => {
    const ctx = {
      effects: [effectFromString("Resistance", "SAVE: 1 morale")],
    };
    assert.equal(sumTag(ctx, "SAVE", { saveType: "fort" }), 1);
    assert.equal(sumTag(ctx, "SAVE", { saveType: "will" }), 1);
  });

  it("excludes crit-only ATK on normal attacks", () => {
    const components: EffectComponent[] = [
      { tag: "ATK", value: 2, descriptors: [] },
      { tag: "ATK", value: 1, descriptors: ["crit"] },
    ];
    const ctx = { effects: [{ label: "Crit feat", components, active: true }] };

    assert.equal(sumTag(ctx, "ATK", { crit: false }), 2);
    assert.equal(sumTag(ctx, "ATK"), 2);
    assert.equal(sumTag(ctx, "ATK", { crit: true }), 3);
  });

  it("skips inactive effects", () => {
    const ctx = {
      effects: [{ ...effectFromString("Bless", "ATK: 5 morale"), active: false }],
    };
    assert.equal(sumTag(ctx, "ATK"), 0);
  });
});
