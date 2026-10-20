import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  dsnIngestOrigin,
  getDsn,
  getEnvironment,
  getRelease,
  sentryUploadUrl,
} from "./config";

const envKeys = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "NODE_ENV",
  "SENTRY_RELEASE",
  "SOURCE_COMMIT",
] as const;

const saved: Partial<Record<(typeof envKeys)[number], string | undefined>> =
  {};

function saveEnv(): void {
  for (const key of envKeys) {
    saved[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const key of envKeys) {
    const value = saved[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("monitoring config", () => {
  afterEach(() => {
    restoreEnv();
  });

  describe("getDsn", () => {
    it("returns undefined when unset", () => {
      saveEnv();
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      assert.equal(getDsn(), undefined);
    });

    it("trims whitespace and returns undefined for empty", () => {
      saveEnv();
      process.env.NEXT_PUBLIC_SENTRY_DSN = "  ";
      assert.equal(getDsn(), undefined);
      process.env.NEXT_PUBLIC_SENTRY_DSN = "  https://k@host/1  ";
      assert.equal(getDsn(), "https://k@host/1");
    });
  });

  describe("getEnvironment", () => {
    it("prefers SENTRY_ENVIRONMENT then NODE_ENV then development", () => {
      saveEnv();
      delete process.env.SENTRY_ENVIRONMENT;
      delete process.env.NODE_ENV;
      assert.equal(getEnvironment(), "development");

      process.env.NODE_ENV = "test";
      assert.equal(getEnvironment(), "test");

      process.env.SENTRY_ENVIRONMENT = "staging";
      assert.equal(getEnvironment(), "staging");
    });
  });

  describe("getRelease", () => {
    it("prefers SENTRY_RELEASE then SOURCE_COMMIT", () => {
      saveEnv();
      delete process.env.SENTRY_RELEASE;
      delete process.env.SOURCE_COMMIT;
      assert.equal(getRelease(), undefined);

      process.env.SOURCE_COMMIT = "abc123";
      assert.equal(getRelease(), "abc123");

      process.env.SENTRY_RELEASE = "app@1.0.0";
      assert.equal(getRelease(), "app@1.0.0");
    });
  });

  describe("sentryUploadUrl", () => {
    it("upgrades public http hosts to https", () => {
      assert.equal(
        sentryUploadUrl("http://tracker.example.com"),
        "https://tracker.example.com",
      );
      assert.equal(
        sentryUploadUrl("http://tracker.example.com:80/"),
        "https://tracker.example.com",
      );
    });

    it("keeps https, localhost, and docker hosts", () => {
      assert.equal(
        sentryUploadUrl("https://tracker.example.com"),
        "https://tracker.example.com",
      );
      assert.equal(
        sentryUploadUrl("http://localhost:9999"),
        "http://localhost:9999",
      );
      assert.equal(
        sentryUploadUrl("http://glitchtip:8000"),
        "http://glitchtip:8000",
      );
      assert.equal(
        sentryUploadUrl("http://10.0.1.9:8000"),
        "http://10.0.1.9:8000",
      );
    });

    it("returns undefined when unset or invalid", () => {
      assert.equal(sentryUploadUrl(undefined), undefined);
      assert.equal(sentryUploadUrl("  "), undefined);
      assert.equal(sentryUploadUrl("not-a-url"), undefined);
    });
  });

  describe("dsnIngestOrigin", () => {
    it("returns scheme and host for a valid dsn", () => {
      assert.equal(
        dsnIngestOrigin("https://public@o123.ingest.sentry.io/456"),
        "https://o123.ingest.sentry.io",
      );
      assert.equal(
        dsnIngestOrigin("http://k@localhost:9999/1"),
        "http://localhost:9999",
      );
    });

    it("returns undefined for missing or invalid dsn", () => {
      assert.equal(dsnIngestOrigin(undefined), undefined);
      assert.equal(dsnIngestOrigin(""), undefined);
      assert.equal(dsnIngestOrigin("not-a-dsn"), undefined);
    });
  });
});
