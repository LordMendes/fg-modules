import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "./validation";

describe("validateEmail", () => {
  it("accepts valid email", () => {
    assert.equal(validateEmail("user@example.com").ok, true);
  });

  it("rejects invalid email", () => {
    const result = validateEmail("not-an-email");
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /invalid/i);
  });

  it("normalizes email", () => {
    assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  });
});

describe("validateUsername", () => {
  it("accepts valid username", () => {
    assert.equal(validateUsername("pc_one").ok, true);
  });

  it("rejects short username", () => {
    assert.equal(validateUsername("ab").ok, false);
  });

  it("rejects invalid characters", () => {
    assert.equal(validateUsername("bad name").ok, false);
  });

  it("normalizes username", () => {
    assert.equal(normalizeUsername("  pc_one "), "pc_one");
  });
});

describe("validatePassword", () => {
  it("accepts password with 8+ chars", () => {
    assert.equal(validatePassword("password1").ok, true);
  });

  it("rejects short password", () => {
    assert.equal(validatePassword("short").ok, false);
  });
});
