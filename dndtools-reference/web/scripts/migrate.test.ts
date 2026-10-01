import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  FailedMigrationError,
  MigrationChecksumError,
  MissingMigrationError,
  connectionString,
  listMigrationFiles,
  migrationChecksum,
  planMigrations,
  type AppliedMigration,
  type MigrationFile,
} from "./migrate.ts";

const ABC_SHA256 =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

function file(name: string, sql = `select '${name}';`): MigrationFile {
  return { name, sql, checksum: migrationChecksum(sql) };
}

describe("migrationChecksum", () => {
  it("matches sha256 hex of the file text", () => {
    assert.equal(migrationChecksum("abc"), ABC_SHA256);
    assert.equal(migrationChecksum("abc").length, 64);
  });
});

describe("listMigrationFiles", () => {
  it("orders migration directories by name", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "migrate-"));
    try {
      for (const name of ["20260201000000_b", "20260101000000_a"]) {
        mkdirSync(path.join(dir, name));
        writeFileSync(path.join(dir, name, "migration.sql"), `-- ${name}\n`);
      }
      const files = listMigrationFiles(dir);
      assert.deepEqual(
        files.map((entry) => entry.name),
        ["20260101000000_a", "20260201000000_b"],
      );
      assert.equal(files[0]?.checksum, migrationChecksum("-- 20260101000000_a\n"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("planMigrations", () => {
  const files = [file("001_init"), file("002_next")];

  it("skips a finished migration whose checksum matches", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "001_init",
        checksum: files[0]!.checksum,
        finishedAt: new Date(),
        rolledBackAt: null,
      },
    ];
    const plan = planMigrations(files, applied);
    assert.equal(plan[0]?.action, "skip");
    assert.equal(plan[1]?.action, "apply");
    assert.equal(plan[1] && plan[1].action === "apply" ? plan[1].name : "", "002_next");
  });

  it("skips a finished migration that was recorded without a checksum", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "001_init",
        checksum: "",
        finishedAt: new Date(),
        rolledBackAt: null,
      },
    ];
    const plan = planMigrations([files[0]!], applied);
    assert.equal(plan[0]?.action, "skip");
  });
  it("aborts when an applied checksum differs", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "001_init",
        checksum: "0".repeat(64),
        finishedAt: new Date(),
        rolledBackAt: null,
      },
    ];
    assert.throws(
      () => planMigrations(files, applied),
      MigrationChecksumError,
    );
  });

  it("aborts when a migration failed and was not rolled back", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "001_init",
        checksum: files[0]!.checksum,
        finishedAt: null,
        rolledBackAt: null,
      },
    ];
    assert.throws(() => planMigrations(files, applied), FailedMigrationError);
  });

  it("applies again after a rollback", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "001_init",
        checksum: files[0]!.checksum,
        finishedAt: new Date(),
        rolledBackAt: new Date(),
      },
    ];
    const plan = planMigrations([files[0]!], applied);
    assert.equal(plan[0]?.action, "apply");
  });

  it("aborts when the database has a finished migration that is not on disk", () => {
    const applied: AppliedMigration[] = [
      {
        migrationName: "999_removed",
        checksum: ABC_SHA256,
        finishedAt: new Date(),
        rolledBackAt: null,
      },
    ];
    assert.throws(() => planMigrations(files, applied), MissingMigrationError);
  });
});

describe("connectionString", () => {
  it("removes Prisma schema query param", () => {
    const url = connectionString(
      "postgresql://dndtools:dndtools@localhost:5432/dndtools?schema=public",
    );
    assert.equal(url.includes("schema="), false);
    assert.match(url, /^postgresql:\/\/dndtools:dndtools@localhost:5432\/dndtools/);
  });
});
