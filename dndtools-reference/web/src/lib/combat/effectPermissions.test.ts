import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRemoveEffect } from "./combatMutations";

describe("Effect removal permissions", () => {
  const dmUserId = "dm-user";
  const playerUserId = "player-user";
  const otherPlayerUserId = "other-player";

  it("DM can remove any non-system effect", () => {
    const result = canRemoveEffect({
      isDm: true,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: playerUserId,
      actorUserId: dmUserId,
    });
    assert.ok(result.canRemove);
  });

  it("DM can remove legacy effects (null applier)", () => {
    const result = canRemoveEffect({
      isDm: true,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: null,
      actorUserId: dmUserId,
    });
    assert.ok(result.canRemove);
  });

  it("DM cannot remove system effects", () => {
    const result = canRemoveEffect({
      isDm: true,
      effectIsSystem: true,
      effectVisibility: "visible",
      effectApplierUserId: null,
      actorUserId: dmUserId,
    });
    assert.ok(!result.canRemove);
    assert.equal(result.error, "Cannot remove system effect");
  });

  it("Player can remove effects they applied", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: playerUserId,
      actorUserId: playerUserId,
    });
    assert.ok(result.canRemove);
  });

  it("Player can remove own-applied effect even on NPC target", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: playerUserId,
      actorUserId: playerUserId,
    });
    assert.ok(result.canRemove);
  });

  it("Player cannot remove effects applied by others", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: otherPlayerUserId,
      actorUserId: playerUserId,
    });
    assert.ok(!result.canRemove);
    assert.equal(result.error, "Only the effect's applier or DM can remove it");
  });

  it("Player cannot remove legacy effects (null applier)", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: false,
      effectVisibility: "visible",
      effectApplierUserId: null,
      actorUserId: playerUserId,
    });
    assert.ok(!result.canRemove);
    assert.equal(result.error, "Only the effect's applier or DM can remove it");
  });

  it("Player cannot remove GM-visibility effects", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: false,
      effectVisibility: "gm",
      effectApplierUserId: playerUserId,
      actorUserId: playerUserId,
    });
    assert.ok(!result.canRemove);
    assert.equal(result.error, "Not allowed");
  });

  it("Player cannot remove system effects", () => {
    const result = canRemoveEffect({
      isDm: false,
      effectIsSystem: true,
      effectVisibility: "visible",
      effectApplierUserId: playerUserId,
      actorUserId: playerUserId,
    });
    assert.ok(!result.canRemove);
    assert.equal(result.error, "Cannot remove system effect");
  });
});
