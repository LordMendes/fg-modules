import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterEventForViewer } from "./filter";
import type { CombatEventRecord, CombatFilterContext } from "./types";

const combat: CombatFilterContext = {
  combatants: [
    {
      id: "npc-hidden",
      name: "Hidden Goblin",
      pcPlanId: null,
      visibleToPlayers: false,
      identified: true,
    },
    {
      id: "pc-aria",
      name: "Aria",
      pcPlanId: "pc-aria",
      visibleToPlayers: true,
      identified: true,
    },
  ],
};

const attackEvent: CombatEventRecord = {
  id: "evt-1",
  seq: 1,
  round: 1,
  kind: "attack",
  at: "2026-09-18T00:00:00.000Z",
  actorCombatantId: "npc-hidden",
  targetCombatantId: "pc-aria",
  actorName: "Hidden Goblin",
  targetName: "Aria",
  payload: {
    attackName: "Scimitar",
    attackType: "melee",
    face: 15,
    bonus: 3,
    adhoc: 0,
    total: 18,
    acType: "normal",
    acValue: 16,
    hit: true,
    autoMiss: false,
    autoHit: false,
    threat: false,
    modifiers: [{ label: "Base", value: 3 }],
  },
  visibility: "all",
  rollId: null,
  reverted: false,
};

describe("events/filter (90-testing.md)", () => {
  it("hidden actor, player viewer yields actorName null", () => {
    const view = filterEventForViewer(
      attackEvent,
      { isDm: false, viewerPcPlanId: "pc-aria" },
      combat,
    );

    assert.ok(view);
    assert.equal(view!.actorName, null);
    assert.equal(view!.targetName, "Aria");
    assert.match(view!.lines[0]!.text, /vs Aria/);
  });

  it("hidden actor, DM viewer keeps actor name", () => {
    const view = filterEventForViewer(attackEvent, { isDm: true }, combat);

    assert.ok(view);
    assert.equal(view!.actorName, "Hidden Goblin");
    assert.equal(view!.targetName, "Aria");
  });
});
