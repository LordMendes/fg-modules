import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { healAmountForRest, restPcPlanState } from "./restParty";
import { normalizePcPlanState } from "@/lib/pc-planner/normalizePlanState";

describe("restParty", () => {
  it("heals level hp overnight and double for full rest", () => {
    assert.equal(healAmountForRest(5, "night"), 5);
    assert.equal(healAmountForRest(5, "full"), 10);
  });

  it("resets spell slots used and clears temp hp tracker", () => {
    const base = normalizePcPlanState({
      identity: {
        name: "Test",
        race: "Human",
        alignment: "N",
        classLevels: [{ slug: "fighter", name: "Fighter", level: 3 }],
      },
      hitPoints: { rolls: [], current: 10, temporary: 2 },
      spellClasses: [
        {
          classSlug: "wizard",
          className: "Wizard",
          kind: "prepared",
          slotsUsed: [0, 1, 2, 0, 0, 0, 0, 0, 0, 0],
          spells: [],
        },
      ],
    } as never);
    const rested = restPcPlanState(base, "night");
    assert.equal(rested.hitPoints.temporary, 0);
    assert.equal(rested.spellClasses[0]?.slotsUsed?.every((n) => n === 0), true);
  });
});
