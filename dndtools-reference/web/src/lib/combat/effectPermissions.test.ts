import assert from "node:assert/strict";
import { describe, it } from "node:test";

export type EffectRemovalPermission = {
  canRemove: boolean;
  reason?: string;
};

export function canRemoveEffect(
  isDm: boolean,
  effectApplierUserId: string | null,
  effectVisibility: "visible" | "hidden" | "gm",
  effectIsSystem: boolean,
  actorUserId: string,
): EffectRemovalPermission {
  if (effectIsSystem) {
    return { canRemove: false, reason: "System effects cannot be removed" };
  }

  if (isDm) {
    return { canRemove: true };
  }

  if (effectVisibility === "gm") {
    return { canRemove: false, reason: "Cannot remove GM-only effects" };
  }

  if (effectApplierUserId === null) {
    return { canRemove: false, reason: "Legacy effects (no applier) are DM-only" };
  }

  if (effectApplierUserId === actorUserId) {
    return { canRemove: true };
  }

  return { canRemove: false, reason: "Can only remove effects you applied" };
}

describe("Effect removal permissions", () => {
  const dmUserId = "dm-user";
  const playerUserId = "player-user";
  const otherPlayerUserId = "other-player";

  it("DM can remove any non-system effect", () => {
    const perm = canRemoveEffect(true, playerUserId, "visible", false, dmUserId);
    assert.ok(perm.canRemove);
  });

  it("DM can remove legacy effects (null applier)", () => {
    const perm = canRemoveEffect(true, null, "visible", false, dmUserId);
    assert.ok(perm.canRemove);
  });

  it("DM cannot remove system effects", () => {
    const perm = canRemoveEffect(true, null, "visible", true, dmUserId);
    assert.ok(!perm.canRemove);
    assert.equal(perm.reason, "System effects cannot be removed");
  });

  it("Player can remove effects they applied", () => {
    const perm = canRemoveEffect(false, playerUserId, "visible", false, playerUserId);
    assert.ok(perm.canRemove);
  });

  it("Player can remove own-applied effect even on NPC target", () => {
    const perm = canRemoveEffect(false, playerUserId, "visible", false, playerUserId);
    assert.ok(perm.canRemove);
  });

  it("Player cannot remove effects applied by others", () => {
    const perm = canRemoveEffect(false, otherPlayerUserId, "visible", false, playerUserId);
    assert.ok(!perm.canRemove);
    assert.equal(perm.reason, "Can only remove effects you applied");
  });

  it("Player cannot remove legacy effects (null applier)", () => {
    const perm = canRemoveEffect(false, null, "visible", false, playerUserId);
    assert.ok(!perm.canRemove);
    assert.equal(perm.reason, "Legacy effects (no applier) are DM-only");
  });

  it("Player cannot remove GM-visibility effects", () => {
    const perm = canRemoveEffect(false, playerUserId, "gm", false, playerUserId);
    assert.ok(!perm.canRemove);
    assert.equal(perm.reason, "Cannot remove GM-only effects");
  });

  it("Player cannot remove system effects", () => {
    const perm = canRemoveEffect(false, playerUserId, "visible", true, playerUserId);
    assert.ok(!perm.canRemove);
    assert.equal(perm.reason, "System effects cannot be removed");
  });
});
