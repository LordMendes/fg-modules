import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { combatantForToken, buildPcTokenMap } from "./combatantForToken";
import type { CampaignCombatView } from "./types";
import type { MapTokenView } from "@/lib/map/types";

describe("combatantForToken", () => {
  const mockCombat: CampaignCombatView = {
    id: "combat-1",
    state: "active",
    round: 1,
    currentCombatantId: null,
    combatants: [
      {
        id: "c1",
        kind: "pc",
        tokenId: "token-1",
        pcPlanId: "pc-plan-a",
        name: "Thorin",
        faction: "friend",
        init: 15,
        initMod: 2,
        hpMax: 50,
        hpCurrent: 50,
        hpTemp: 0,
        wounds: 0,
        nonlethal: 0,
        ac: 18,
        acTouch: 12,
        acFlat: 16,
        spaceSquares: 1,
        reachFeet: 5,
        attacks: [],
        targetIds: [],
        visibleToPlayers: true,
        identified: true,
        turnState: "normal",
        deathState: null,
        defenses: {},
        effects: [],
        stats: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8, cl: 0 },
        spells: [],
        spellUses: {},
        seq: 0,
      },
      {
        id: "c2",
        kind: "pc",
        tokenId: null,
        pcPlanId: "pc-plan-b",
        name: "Aria",
        faction: "friend",
        init: 10,
        initMod: 1,
        hpMax: 30,
        hpCurrent: 30,
        hpTemp: 0,
        wounds: 0,
        nonlethal: 0,
        ac: 15,
        acTouch: 13,
        acFlat: 12,
        spaceSquares: 1,
        reachFeet: 5,
        attacks: [],
        targetIds: [],
        visibleToPlayers: true,
        identified: true,
        turnState: "normal",
        deathState: null,
        defenses: {},
        effects: [],
        stats: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 14, cl: 0 },
        spells: [],
        spellUses: {},
        seq: 1,
      },
      {
        id: "c3",
        kind: "npc",
        tokenId: "token-3",
        pcPlanId: null,
        name: "Goblin",
        faction: "foe",
        init: 8,
        initMod: 2,
        hpMax: 10,
        hpCurrent: 10,
        hpTemp: 0,
        wounds: 0,
        nonlethal: 0,
        ac: 14,
        acTouch: 12,
        acFlat: 12,
        spaceSquares: 1,
        reachFeet: 5,
        attacks: [],
        targetIds: [],
        visibleToPlayers: true,
        identified: true,
        turnState: "normal",
        deathState: null,
        defenses: {},
        effects: [],
        stats: { str: 8, dex: 14, con: 10, int: 8, wis: 10, cha: 6, cl: 0 },
        spells: [],
        spellUses: {},
        seq: 2,
      },
    ],
    events: [],
    rollRequests: [],
  };

  const mockTokens: MapTokenView[] = [
    {
      id: "token-1",
      kind: "pc",
      pcPlanId: "pc-plan-a",
      name: "Thorin",
      imageUrl: null,
      x: 5,
      y: 5,
      width: 1,
      height: 1,
      rotation: 0,
      layer: "token",
      visibility: "always",
      ownerUserId: "user-1",
      visionRange: null,
      emitsLight: false,
      lightBright: 0,
      lightDim: 0,
      seq: 0,
    },
    {
      id: "token-2",
      kind: "pc",
      pcPlanId: "pc-plan-b",
      name: "Aria",
      imageUrl: null,
      x: 6,
      y: 5,
      width: 1,
      height: 1,
      rotation: 0,
      layer: "token",
      visibility: "always",
      ownerUserId: "user-2",
      visionRange: null,
      emitsLight: false,
      lightBright: 0,
      lightDim: 0,
      seq: 1,
    },
    {
      id: "token-3",
      kind: "npc",
      pcPlanId: null,
      name: "Goblin",
      imageUrl: null,
      x: 10,
      y: 10,
      width: 1,
      height: 1,
      rotation: 0,
      layer: "token",
      visibility: "always",
      ownerUserId: null,
      visionRange: null,
      emitsLight: false,
      lightBright: 0,
      lightDim: 0,
      seq: 2,
    },
  ];

  it("returns null when combat is null", () => {
    const result = combatantForToken(null, "token-1", mockTokens);
    assert.equal(result, null);
  });

  it("matches combatant by tokenId when linked", () => {
    const result = combatantForToken(mockCombat, "token-1", mockTokens);
    assert.ok(result);
    assert.equal(result.id, "c1");
    assert.equal(result.name, "Thorin");
    assert.equal(result.tokenId, "token-1");
  });

  it("matches PC combatant by pcPlanId when tokenId is null", () => {
    const result = combatantForToken(mockCombat, "token-2", mockTokens);
    assert.ok(result);
    assert.equal(result.id, "c2");
    assert.equal(result.name, "Aria");
    assert.equal(result.pcPlanId, "pc-plan-b");
    assert.equal(result.tokenId, null);
  });

  it("matches NPC by tokenId", () => {
    const result = combatantForToken(mockCombat, "token-3", mockTokens);
    assert.ok(result);
    assert.equal(result.id, "c3");
    assert.equal(result.kind, "npc");
  });

  it("returns null when token does not exist", () => {
    const result = combatantForToken(mockCombat, "nonexistent", mockTokens);
    assert.equal(result, null);
  });

  it("returns null when token exists but has no matching combatant", () => {
    const extraToken: MapTokenView = {
      id: "token-99",
      kind: "pc",
      pcPlanId: "pc-plan-z",
      name: "NoMatch",
      imageUrl: null,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      layer: "token",
      visibility: "always",
      ownerUserId: null,
      visionRange: null,
      emitsLight: false,
      lightBright: 0,
      lightDim: 0,
      seq: 3,
    };
    const result = combatantForToken(mockCombat, "token-99", [
      ...mockTokens,
      extraToken,
    ]);
    assert.equal(result, null);
  });
});

describe("buildPcTokenMap", () => {
  it("builds map of pcPlanId to tokenId for PC tokens", () => {
    const tokens = [
      { id: "token-1", kind: "pc", pcPlanId: "pc-plan-a" },
      { id: "token-2", kind: "pc", pcPlanId: "pc-plan-b" },
      { id: "token-3", kind: "npc", pcPlanId: null },
    ];
    const map = buildPcTokenMap(tokens);
    assert.equal(map.size, 2);
    assert.equal(map.get("pc-plan-a"), "token-1");
    assert.equal(map.get("pc-plan-b"), "token-2");
    assert.equal(map.has("pc-plan-c"), false);
  });

  it("returns empty map when no PC tokens", () => {
    const tokens = [
      { id: "token-1", kind: "npc", pcPlanId: null },
      { id: "token-2", kind: "object", pcPlanId: null },
    ];
    const map = buildPcTokenMap(tokens);
    assert.equal(map.size, 0);
  });

  it("ignores PC tokens without pcPlanId", () => {
    const tokens = [
      { id: "token-1", kind: "pc", pcPlanId: null },
      { id: "token-2", kind: "pc", pcPlanId: "pc-plan-a" },
    ];
    const map = buildPcTokenMap(tokens);
    assert.equal(map.size, 1);
    assert.equal(map.get("pc-plan-a"), "token-2");
  });
});
