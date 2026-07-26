import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateStronghold } from "./calculate";
import type { StrongholdInput } from "./types";

const defaultInput: StrongholdInput = {
  components: [],
  climate: "temperate",
  terrain: "plains",
  settlement: "small-town",
  settlementDistance: "less-than-1",
  nearbyFeatures: [],
  interiorWall: "wood",
  exteriorWall: "masonry",
  storiesAboveGround: 2,
  subterraneanLayers: 1,
  spellDiscounts: {},
  staff: {},
  rushPercent: 0,
  extrasCost: 0,
};

describe("calculateStronghold", () => {
  it("returns zero for empty stronghold", () => {
    const result = calculateStronghold(defaultInput);
    assert.equal(result.grandTotal, 0);
    assert.equal(result.totalSpaces, 0);
  });

  it("calculates single guard post", () => {
    const result = calculateStronghold({
      ...defaultInput,
      components: [{ componentId: "guard-post", quantity: 1 }],
    });
    assert.equal(result.componentCost, 300);
    assert.equal(result.totalSpaces, 0.5);
  });

  it("applies height surcharge for third story", () => {
    const result = calculateStronghold({
      ...defaultInput,
      components: [{ componentId: "barracks", quantity: 1 }],
      storiesAboveGround: 3,
    });
    assert.equal(result.heightDepthCost, 400);
  });

  it("calculates guard tower cluster components", () => {
    const result = calculateStronghold({
      ...defaultInput,
      components: [{ componentId: "guard-post", quantity: 1 }],
      staff: { guard: 6 },
    });
    assert.equal(result.componentCost, 300);
    assert.equal(result.monthlyUpkeep, 36);
  });

  it("calculates Brightstone Keep walls", () => {
    const brightstoneComponents = [
      { componentId: "bedroom-suite-basic", quantity: 1 },
      { componentId: "bedrooms-basic", quantity: 2 },
      { componentId: "bath-basic", quantity: 1 },
      { componentId: "kitchen-basic", quantity: 1 },
      { componentId: "dining-hall", quantity: 1 },
      { componentId: "barracks", quantity: 3 },
      { componentId: "guard-post", quantity: 3 },
      { componentId: "library-basic", quantity: 1 },
      { componentId: "magic-lab-basic", quantity: 1 },
      { componentId: "armory-basic", quantity: 1 },
      { componentId: "smithy-basic", quantity: 1 },
      { componentId: "storage-basic", quantity: 1 },
      { componentId: "barbican", quantity: 1 },
      { componentId: "servants-quarters", quantity: 1 },
    ];

    const result = calculateStronghold({
      ...defaultInput,
      components: brightstoneComponents,
      terrain: "mountains",
      settlement: "small-city",
      settlementDistance: "49-112",
      nearbyFeatures: ["lawless", "controls-income", "easier-attack"],
      interiorWall: "wood",
      exteriorWall: "stone-hewn",
      spellDiscounts: { "wall-of-stone-12": true },
    });

    assert.equal(result.componentCost, 12350);
    assert.equal(result.totalSpaces, 17.5);
    assert.equal(result.wallCost, 28350);
    assert.equal(result.siteModifierPercent, -1);
  });

  it("applies rush build cost", () => {
    const result = calculateStronghold({
      ...defaultInput,
      components: [{ componentId: "barracks", quantity: 100 }],
      interiorWall: "wood",
      exteriorWall: "wood",
      rushPercent: 20,
    });
    assert.ok(result.rushCost > 0);
    assert.ok(result.buildWeeksRushed < result.buildWeeks);
  });

  it("warns on missing dining hall prerequisite", () => {
    const result = calculateStronghold({
      ...defaultInput,
      components: [{ componentId: "dining-hall", quantity: 1 }],
    });
    assert.ok(
      result.warnings.some((w) => w.type === "prerequisite" && w.message.includes("kitchen")),
    );
  });
});
