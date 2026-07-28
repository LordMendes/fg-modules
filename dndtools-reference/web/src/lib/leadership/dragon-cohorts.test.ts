import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustedDragonEcl,
  isDragonCohortEligible,
  selectDragonCohortOptions,
} from "./dragon-cohorts";

describe("dragon cohort selection", () => {
  it("applies the Dragon Cohort feat ECL adjustment", () => {
    assert.equal(adjustedDragonEcl(13), 10);
  });

  it("allows dragons up to listed ECL cohort level plus three", () => {
    assert.equal(isDragonCohortEligible(13, 10), true);
    assert.equal(isDragonCohortEligible(14, 10), false);
  });

  it("caps cohort level at 17 even when the table score is higher", () => {
    assert.equal(isDragonCohortEligible(20, 20), true);
    assert.equal(isDragonCohortEligible(21, 20), false);
  });

  it("returns the strongest eligible dragons at the cap", () => {
    const selection = selectDragonCohortOptions(10);
    assert.equal(selection.maxListedEcl, 13);
    assert.deepEqual(
      selection.best.map((option) => option.kind),
      [
        "Black dragon",
        "Blue dragon",
        "Bronze dragon",
        "Green dragon",
      ],
    );
  });

  it("returns no eligible dragons when cohort level is unavailable", () => {
    const selection = selectDragonCohortOptions(null);
    assert.equal(selection.eligible.length, 0);
    assert.equal(selection.best.length, 0);
  });
});
