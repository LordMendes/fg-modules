import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import { characterLevelFromPlan } from "./gestalt";
import { classSummaryForPlan, describeLevelRestore, levelSnapshotCandidate } from "./levelHistory";
import { isMediaObjectKey } from "../storage/pc-image-url";
import { pcRevisionImageObjectKey } from "../storage/r2";

function atClassLevel(level: number) {
  const state = createDefaultPcPlanState("Ada");
  state.identity.classLevels = [{ classSlug: "fighter", className: "Fighter", level }];
  return state;
}

describe("levelSnapshotCandidate", () => {
  it("stores the sheet being left when level increases by 1", () => {
    const previous = atClassLevel(4);
    previous.identity.name = "Before";
    const next = atClassLevel(5);
    next.identity.name = "After";
    const snapshot = levelSnapshotCandidate(previous, next);
    assert.equal(snapshot, previous);
    assert.equal(characterLevelFromPlan(snapshot!), 4);
    assert.equal(snapshot!.identity.name, "Before");
  });

  it("stores only the departed level when the number jumps", () => {
    const previous = atClassLevel(4);
    const next = atClassLevel(7);
    const snapshot = levelSnapshotCandidate(previous, next);
    assert.equal(characterLevelFromPlan(snapshot!), 4);
    assert.equal(characterLevelFromPlan(next), 7);
  });

  it("stores nothing when level decreases or stays the same", () => {
    const previous = atClassLevel(4);
    assert.equal(levelSnapshotCandidate(previous, atClassLevel(3)), null);
    assert.equal(levelSnapshotCandidate(previous, atClassLevel(4)), null);
  });

  it("uses gestalt row count", () => {
    const previous = createDefaultPcPlanState("Ada");
    previous.identity.gestalt = true;
    previous.identity.gestaltLevels = [
      {
        a: { classSlug: "fighter", className: "Fighter" },
        b: { classSlug: "wizard", className: "Wizard" },
      },
    ];
    previous.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
      { classSlug: "wizard", className: "Wizard", level: 1 },
    ];
    const next = structuredClone(previous);
    next.identity.gestaltLevels = [
      ...previous.identity.gestaltLevels!,
      {
        a: { classSlug: "fighter", className: "Fighter" },
        b: { classSlug: "wizard", className: "Wizard" },
      },
    ];
    const snapshot = levelSnapshotCandidate(previous, next);
    assert.equal(characterLevelFromPlan(snapshot!), 1);
    assert.equal(characterLevelFromPlan(next), 2);
    assert.equal(classSummaryForPlan(previous), "Fighter 1 // Wizard 1");
  });
});

describe("describeLevelRestore", () => {
  it("lists the level drop and the fields that will be undone", () => {
    const current = atClassLevel(5);
    current.identity.name = "Ada";
    current.abilities.str = 16;
    current.hitPoints.current = 40;
    current.feats.push({ slug: "power-attack", name: "Power Attack" });
    current.skills.push({ name: "Climb", ranks: 4, misc: 0 });
    current.inventory.push({ name: "Longsword", quantity: 1, weight: 4 });
    current.notes = "Later notes";

    const previous = atClassLevel(4);
    previous.identity.name = "Ada";
    previous.abilities.str = 14;
    previous.hitPoints.current = 32;
    previous.skills.push({ name: "Climb", ranks: 2, misc: 0 });
    previous.notes = "Earlier notes";

    const lines = describeLevelRestore(current, previous);
    assert.ok(lines.some((line) => line.includes("level 5") && line.includes("level 4")));
    assert.ok(lines.some((line) => line.includes("Strength 16 returns to 14")));
    assert.ok(lines.some((line) => line.includes("Hit points 40 return to 32")));
    assert.ok(lines.some((line) => line.includes("Feat will be removed: Power Attack")));
    assert.ok(lines.some((line) => line.includes("Climb ranks 4 return to 2")));
    assert.ok(lines.some((line) => line.includes("Longsword will be removed")));
    assert.ok(lines.some((line) => line.includes("Notes return to the earlier text")));
  });
});

describe("revision image keys", () => {
  it("accepts frozen profile and token keys", () => {
    const profile = pcRevisionImageObjectKey("user1", "plan1", 4, "profile");
    const token = pcRevisionImageObjectKey("user1", "plan1", 4, "token");
    assert.equal(profile, "pc/user1/plan1/revisions/4/profile.webp");
    assert.equal(isMediaObjectKey(profile), true);
    assert.equal(isMediaObjectKey(token), true);
    assert.equal(isMediaObjectKey("pc/user1/plan1/profile.webp"), true);
    assert.equal(isMediaObjectKey("pc/user1/plan1/revisions/profile.webp"), false);
  });
});
