import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminUser } from "./admin";

describe("isAdminUser", () => {
  it("returns false for null", () => {
    assert.equal(isAdminUser(null), false);
  });

  it("returns false for undefined", () => {
    assert.equal(isAdminUser(undefined), false);
  });

  it("returns false for empty email", () => {
    assert.equal(isAdminUser({ email: "" }), false);
  });

  it("returns false for other email", () => {
    assert.equal(isAdminUser({ email: "other@example.com" }), false);
  });

  it("returns true for admin email", () => {
    assert.equal(isAdminUser({ email: "lucasmendes.lx@gmail.com" }), true);
  });

  it("returns true for admin email with different casing and whitespace", () => {
    assert.equal(
      isAdminUser({ email: "  LucasMendes.LX@gmail.com  " }),
      true,
    );
  });
});
