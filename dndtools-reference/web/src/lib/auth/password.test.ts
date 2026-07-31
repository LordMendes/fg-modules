import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies password", async () => {
    const hash = await hashPassword("test-password-123");
    assert.notEqual(hash, "test-password-123");
    assert.equal(await verifyPassword("test-password-123", hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });

  it("returns false for empty hash", async () => {
    assert.equal(await verifyPassword("test-password-123", ""), false);
  });
});
