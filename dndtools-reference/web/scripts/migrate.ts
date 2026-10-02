/**
 * Apply prisma/migrations SQL files and record them in _prisma_migrations.
 * Compatible with databases already migrated by `prisma migrate deploy`.
 *
 * Each file is one script (DO $$ blocks must not be split on semicolons).
 * postgres.js sends that script with the simple query protocol; node-pg does not.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export type MigrationFile = {
  name: string;
  sql: string;
  checksum: string;
};

export type AppliedMigration = {
  migrationName: string;
  checksum: string;
  finishedAt: Date | string | null;
  rolledBackAt: Date | string | null;
};

export type PlannedMigration =
  | { action: "skip"; name: string }
  | { action: "apply"; name: string; checksum: string; sql: string };

export class MigrationChecksumError extends Error {
  constructor(name: string) {
    super(
      `Migration ${name} was modified after it was applied. Checksum does not match _prisma_migrations.`,
    );
    this.name = "MigrationChecksumError";
  }
}

export class FailedMigrationError extends Error {
  constructor(name: string) {
    super(
      `Migration ${name} is recorded as failed and has not been rolled back.`,
    );
    this.name = "FailedMigrationError";
  }
}

export class MissingMigrationError extends Error {
  constructor(name: string) {
    super(
      `Migration ${name} is applied in the database but missing from the migrations directory.`,
    );
    this.name = "MissingMigrationError";
  }
}

/** SHA-256 hex of the migration file text, same algorithm as Prisma. */
export function migrationChecksum(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

/** Prisma stores the hash of the bytes it applied. One committed rewrite
 *  changed only line endings, so a finished row matches the raw file, the
 *  LF form, or the CRLF form. A real SQL edit still fails the check. */
export function migrationChecksumCandidates(sql: string): Set<string> {
  const lf = sql.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  return new Set([
    migrationChecksum(sql),
    migrationChecksum(lf),
    migrationChecksum(crlf),
  ]);
}

export function listMigrationFiles(migrationsDir: string): MigrationFile[] {
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return names.map((name) => {
    const sql = readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
    return { name, sql, checksum: migrationChecksum(sql) };
  });
}

function isFinished(row: AppliedMigration): boolean {
  return row.finishedAt != null && row.rolledBackAt == null;
}

function isFailed(row: AppliedMigration): boolean {
  return row.finishedAt == null && row.rolledBackAt == null;
}

export function planMigrations(
  files: MigrationFile[],
  applied: AppliedMigration[],
): PlannedMigration[] {
  const byName = new Map<string, AppliedMigration[]>();
  for (const row of applied) {
    const list = byName.get(row.migrationName) ?? [];
    list.push(row);
    byName.set(row.migrationName, list);
  }

  const fileNames = new Set(files.map((file) => file.name));
  for (const name of byName.keys()) {
    if (fileNames.has(name)) continue;
    const rows = byName.get(name) ?? [];
    if (rows.some(isFinished)) {
      throw new MissingMigrationError(name);
    }
  }

  const plan: PlannedMigration[] = [];
  for (const file of files) {
    const rows = byName.get(file.name) ?? [];
    const finished = rows.filter(isFinished);
    if (finished.length > 0) {
      const recorded = finished.filter((row) => row.checksum.length > 0);
      // Some applied rows have an empty checksum. Prisma still treats them as applied.
      // Line-ending rewrites of the same SQL also match.
      const candidates = migrationChecksumCandidates(file.sql);
      if (
        recorded.length > 0 &&
        !recorded.some((row) => candidates.has(row.checksum))
      ) {
        throw new MigrationChecksumError(file.name);
      }
      plan.push({ action: "skip", name: file.name });
      continue;
    }
    if (rows.some(isFailed)) {
      throw new FailedMigrationError(file.name);
    }
    plan.push({
      action: "apply",
      name: file.name,
      checksum: file.checksum,
      sql: file.sql,
    });
  }
  return plan;
}

/** Drop Prisma's `schema` query param. postgres.js does not accept it. */
export function connectionString(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("schema");
  return url.toString();
}

export function defaultMigrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "prisma", "migrations"),
    path.join(here, "..", "prisma", "migrations"),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[0];
}

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
)
`;

type Sql = postgres.Sql;

async function loadApplied(sql: Sql): Promise<AppliedMigration[]> {
  const rows = await sql<
    {
      migration_name: string;
      checksum: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }[]
  >`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
  `;
  return rows.map((row) => ({
    migrationName: row.migration_name,
    checksum: row.checksum,
    finishedAt: row.finished_at,
    rolledBackAt: row.rolled_back_at,
  }));
}

export async function applyMigrations(sql: Sql, migrationsDir: string): Promise<void> {
  await sql.unsafe(CREATE_MIGRATIONS_TABLE);
  const files = listMigrationFiles(migrationsDir);
  const applied = await loadApplied(sql);
  const plan = planMigrations(files, applied);

  let appliedCount = 0;
  let skippedCount = 0;
  for (const step of plan) {
    if (step.action === "skip") {
      skippedCount += 1;
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(step.sql);
      await tx`
        INSERT INTO "_prisma_migrations" (
          id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
        ) VALUES (
          ${randomUUID()},
          ${step.checksum},
          NOW(),
          ${step.name},
          ${null},
          ${null},
          NOW(),
          ${1}
        )
      `;
    });
    appliedCount += 1;
    console.log(`[migrate] applied ${step.name}`);
  }
  console.log(`[migrate] applied ${appliedCount}, skipped ${skippedCount}`);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const migrationsDir = process.env.MIGRATIONS_DIR || defaultMigrationsDir();
  const sql = postgres(connectionString(databaseUrl), {
    max: 1,
    onnotice: () => {},
  });
  try {
    await applyMigrations(sql, migrationsDir);
  } finally {
    await sql.end();
  }
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
