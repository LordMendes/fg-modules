import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAcString } from "./parseAc";
import { applyDamageToHp, parseHpFromText } from "./parseHp";
import { parseAttackLines } from "./parseAttacks";
import {
  parseSpaceReachString,
  sizeCategoryToSquares,
} from "./parseSpaceReach";
import {
  expandEncounterNames,
  snapshotCombatStats,
} from "./combatView";
import { uniqueCombatName } from "./combatMutations";
import { unplacedNpcCombatants, type CampaignCombatView } from "./types";

describe("parseSpaceReach", () => {
  it("maps size categories to squares", () => {
    assert.equal(sizeCategoryToSquares("Large"), 2);
    assert.equal(sizeCategoryToSquares("Huge"), 3);
    assert.equal(sizeCategoryToSquares("Medium"), 1);
  });

  it("parses space/reach strings", () => {
    const parsed = parseSpaceReachString("5 ft./10 ft.");
    assert.equal(parsed.spaceSquares, 1);
    assert.equal(parsed.reachFeet, 10);
  });
});

describe("parseAc", () => {
  it("extracts primary AC", () => {
    assert.equal(parseAcString("18 (+1 size, +3 Dex, +5 natural)").ac, 18);
  });
});

describe("parseHp", () => {
  it("parses parenthetical hp", () => {
    assert.equal(parseHpFromText("3d8+3 (16 hp)"), 16);
  });

  it("applies temp hp before wounds", () => {
    const next = applyDamageToHp(20, 0, 5, 8);
    assert.equal(next.hpTemp, 0);
    assert.equal(next.wounds, 3);
  });
});

describe("parseAttacks", () => {
  it("parses FG-style melee line", () => {
    const lines = parseAttackLines(
      "Longsword +9 melee (1d8+5/19-20)",
      null,
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.bonus, 9);
    assert.equal(lines[0]?.damage, "1d8+5");
    assert.equal(lines[0]?.threatMin, 19);
  });
});

describe("encounter expansion", () => {
  it("expands quantities into unique names", () => {
    const names = expandEncounterNames(
      [
        { name: "Goblin", quantity: 3 },
        { name: "Orc", quantity: 1 },
      ],
      ["Goblin"],
    );
    assert.deepEqual(names, ["Goblin 2", "Goblin 3", "Goblin 4", "Orc"]);
  });

  it("uniqueCombatName suffixes duplicates", () => {
    assert.equal(uniqueCombatName(["Wolf"], "Wolf"), "Wolf 2");
    assert.equal(uniqueCombatName(["Wolf", "Wolf 2"], "Wolf"), "Wolf 3");
  });
});

describe("snapshotCombatStats", () => {
  it("reads flattened library snapshot fields", () => {
    const stats = snapshotCombatStats({
      hpMax: 22,
      ac: 15,
      spaceSquares: 2,
      reachFeet: 10,
      initMod: 3,
      attacks: [{ name: "Claw", bonus: 4, mode: "melee", damage: "1d4+2" }],
    });
    assert.equal(stats.hpMax, 22);
    assert.equal(stats.ac, 15);
    assert.equal(stats.spaceSquares, 2);
    assert.equal(stats.attacks[0]?.name, "Claw");
  });
});

describe("unplacedNpcCombatants", () => {
  it("returns only NPCs without tokens", () => {
    const combat: CampaignCombatView = {
      id: "c1",
      round: 1,
      currentCombatantId: null,
      active: true,
      combatants: [
        {
          id: "1",
          kind: "npc",
          tokenId: null,
          pcPlanId: null,
          campaignNpcId: "n1",
          name: "Goblin",
          faction: "foe",
          init: 10,
          initMod: 1,
          hpMax: 5,
          hpTemp: 0,
          wounds: 0,
          ac: 15,
          acTouch: null,
          acFlat: null,
          spaceSquares: 1,
          reachFeet: 5,
          attacks: [],
          targetIds: [],
          visibleToPlayers: true,
          identified: true,
          snapshot: {},
          hpCurrent: 5,
          status: "healthy",
          isCurrentTurn: false,
          tokenImageUrl: null,
        },
        {
          id: "2",
          kind: "npc",
          tokenId: "t1",
          pcPlanId: null,
          campaignNpcId: "n1",
          name: "Goblin 2",
          faction: "foe",
          init: 8,
          initMod: 1,
          hpMax: 5,
          hpTemp: 0,
          wounds: 0,
          ac: 15,
          acTouch: null,
          acFlat: null,
          spaceSquares: 1,
          reachFeet: 5,
          attacks: [],
          targetIds: [],
          visibleToPlayers: true,
          identified: true,
          snapshot: {},
          hpCurrent: 5,
          status: "healthy",
          isCurrentTurn: false,
          tokenImageUrl: null,
        },
        {
          id: "3",
          kind: "pc",
          tokenId: null,
          pcPlanId: "p1",
          campaignNpcId: null,
          name: "Hero",
          faction: "friend",
          init: 12,
          initMod: 2,
          hpMax: 20,
          hpTemp: 0,
          wounds: 0,
          ac: 16,
          acTouch: null,
          acFlat: null,
          spaceSquares: 1,
          reachFeet: 5,
          attacks: [],
          targetIds: [],
          visibleToPlayers: true,
          identified: true,
          snapshot: {},
          hpCurrent: 20,
          status: "healthy",
          isCurrentTurn: false,
          tokenImageUrl: null,
        },
      ],
    };
    const unplaced = unplacedNpcCombatants(combat);
    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0]?.name, "Goblin");
  });
});
