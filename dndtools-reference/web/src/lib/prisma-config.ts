/**
 * Pure database configuration and error classification.
 *
 * No Prisma or pg runtime imports here, so these helpers can be unit tested
 * without the generated client. `lib/prisma.ts` consumes them.
 */
import type { PoolConfig } from "pg";

export const DEFAULT_POOL_MAX = 10;
export const POOL_CONNECTION_TIMEOUT_MS = 5_000;
export const POOL_IDLE_TIMEOUT_MS = 30_000;
export const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;
export const IDLE_IN_TRANSACTION_TIMEOUT_MS = 10_000;

/** Interactive transaction budget for combat, rolls and phase 3 mutations. */
export const COMBAT_TX_OPTIONS = { maxWait: 3_000, timeout: 10_000 } as const;

/** Postgres lock wait inside combat transactions. Fail fast instead of queueing. */
export const COMBAT_LOCK_TIMEOUT = "3s";

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * pg pool settings. The limits stop one stuck query or a burst of combat
 * transactions from holding every connection and freezing unrelated pages.
 */
export function poolConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: parsePositiveInt(env.DB_POOL_MAX, DEFAULT_POOL_MAX),
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    statement_timeout: parsePositiveInt(
      env.DB_STATEMENT_TIMEOUT_MS,
      DEFAULT_STATEMENT_TIMEOUT_MS,
    ),
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
  };
}

function prismaCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code);
}

/** Database is down or unreachable. Callers treat the request as anonymous. */
const UNAVAILABLE_CODES = new Set([
  "P1000",
  "P1001",
  "P1003",
  "P1008",
  "P1017",
  "P2021",
  "P2022",
  "P2024",
  "P2037",
]);

export function isUnavailableDatabaseError(error: unknown): boolean {
  return UNAVAILABLE_CODES.has(prismaCode(error));
}

/** Transient contention: a connection could not be acquired or a transaction could not start. */
const BUSY_CODES = new Set(["P2024", "P2028", "55P03"]);

/**
 * True when the error means "try again shortly": pool exhaustion, transaction
 * start timeout, or a Postgres lock timeout (55P03). Checks `code`, `meta.code`
 * and `cause`, since Prisma wraps driver errors.
 */
export function isBusyDatabaseError(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 3) return false;
  if (BUSY_CODES.has(prismaCode(error))) return true;
  if ("meta" in error && error.meta && typeof error.meta === "object") {
    const metaCode = "code" in error.meta ? String(error.meta.code) : "";
    if (BUSY_CODES.has(metaCode)) return true;
  }
  if ("cause" in error && error.cause !== error) {
    return isBusyDatabaseError(error.cause, depth + 1);
  }
  return false;
}
