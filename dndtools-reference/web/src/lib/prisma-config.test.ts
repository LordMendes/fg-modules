import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMBAT_TX_OPTIONS,
  DEFAULT_POOL_MAX,
  DEFAULT_STATEMENT_TIMEOUT_MS,
  IDLE_IN_TRANSACTION_TIMEOUT_MS,
  isBusyDatabaseError,
  isUnavailableDatabaseError,
  parsePositiveInt,
  poolConfigFromEnv,
} from "./prisma-config";

describe("poolConfigFromEnv", () => {
  it("applies bounded defaults when only DATABASE_URL is set", () => {
    const config = poolConfigFromEnv({ DATABASE_URL: "postgresql://u:p@h/db" });
    assert.equal(config.connectionString, "postgresql://u:p@h/db");
    assert.equal(config.max, DEFAULT_POOL_MAX);
    assert.equal(config.connectionTimeoutMillis, 5_000);
    assert.equal(config.statement_timeout, DEFAULT_STATEMENT_TIMEOUT_MS);
    assert.equal(config.idle_in_transaction_session_timeout, IDLE_IN_TRANSACTION_TIMEOUT_MS);
  });

  it("reads DB_POOL_MAX and DB_STATEMENT_TIMEOUT_MS overrides", () => {
    const config = poolConfigFromEnv({
      DB_POOL_MAX: "25",
      DB_STATEMENT_TIMEOUT_MS: "4000",
    });
    assert.equal(config.max, 25);
    assert.equal(config.statement_timeout, 4000);
  });

  it("falls back to defaults for invalid overrides", () => {
    const config = poolConfigFromEnv({ DB_POOL_MAX: "0", DB_STATEMENT_TIMEOUT_MS: "abc" });
    assert.equal(config.max, DEFAULT_POOL_MAX);
    assert.equal(config.statement_timeout, DEFAULT_STATEMENT_TIMEOUT_MS);
  });
});

describe("parsePositiveInt", () => {
  it("accepts positive integers and rejects everything else", () => {
    assert.equal(parsePositiveInt("7", 1), 7);
    assert.equal(parsePositiveInt("-2", 1), 1);
    assert.equal(parsePositiveInt("", 1), 1);
    assert.equal(parsePositiveInt(undefined, 1), 1);
  });
});

describe("isUnavailableDatabaseError", () => {
  it("recognises connection, pool and timeout codes", () => {
    for (const code of ["P1001", "P1008", "P1017", "P2024", "P2037"]) {
      assert.equal(isUnavailableDatabaseError({ code }), true, code);
    }
  });

  it("rejects ordinary request errors and non-objects", () => {
    assert.equal(isUnavailableDatabaseError({ code: "P2002" }), false);
    assert.equal(isUnavailableDatabaseError(null), false);
    assert.equal(isUnavailableDatabaseError("P1001"), false);
  });
});

describe("isBusyDatabaseError", () => {
  it("matches pool timeout, transaction start, and lock timeout", () => {
    assert.equal(isBusyDatabaseError({ code: "P2024" }), true);
    assert.equal(isBusyDatabaseError({ code: "P2028" }), true);
    assert.equal(isBusyDatabaseError({ code: "P2010", meta: { code: "55P03" } }), true);
  });

  it("follows cause chains with a depth limit", () => {
    assert.equal(isBusyDatabaseError({ message: "x", cause: { code: "55P03" } }), true);
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    assert.equal(isBusyDatabaseError(cyclic), false);
  });

  it("does not treat unrelated errors as busy", () => {
    assert.equal(isBusyDatabaseError({ code: "P2002" }), false);
    assert.equal(isBusyDatabaseError(new Error("boom")), false);
  });
});

describe("COMBAT_TX_OPTIONS", () => {
  it("keeps the wait short and the transaction budget bounded", () => {
    assert.equal(COMBAT_TX_OPTIONS.maxWait, 3_000);
    assert.equal(COMBAT_TX_OPTIONS.timeout, 10_000);
  });
});
