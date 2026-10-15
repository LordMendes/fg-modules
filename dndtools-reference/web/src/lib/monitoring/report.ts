const REPORTER_KEY = Symbol.for("fg.monitoring.reporter");

const PER_KEY_WINDOW_MS = 60_000;
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX_PER_WINDOW = 30;

export type ErrorSource =
  | "process"
  | "ws"
  | "redis"
  | "action"
  | "client"
  | "admin-test";

export type ReportContext = {
  source: ErrorSource;
  level?: "fatal" | "error" | "warning";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  dedupeKey?: string;
};

export type Reporter = {
  capture(error: unknown, ctx: ReportContext): void;
  flush(timeoutMs: number): Promise<boolean>;
};

export type ReportRateLimiter = {
  shouldAllow(dedupeKey: string): boolean;
  reset(): void;
};

export function createReportRateLimiter(
  now: () => number = () => Date.now(),
): ReportRateLimiter {
  const lastByKey = new Map<string, number>();
  const globalTimes: number[] = [];

  function pruneGlobal(nowMs: number): void {
    while (
      globalTimes.length > 0 &&
      nowMs - globalTimes[0]! >= GLOBAL_WINDOW_MS
    ) {
      globalTimes.shift();
    }
  }

  return {
    shouldAllow(dedupeKey: string): boolean {
      const nowMs = now();
      const last = lastByKey.get(dedupeKey);
      if (last !== undefined && nowMs - last < PER_KEY_WINDOW_MS) {
        return false;
      }
      pruneGlobal(nowMs);
      if (globalTimes.length >= GLOBAL_MAX_PER_WINDOW) {
        return false;
      }
      lastByKey.set(dedupeKey, nowMs);
      globalTimes.push(nowMs);
      return true;
    },
    reset(): void {
      lastByKey.clear();
      globalTimes.length = 0;
    },
  };
}

let rateLimiter: ReportRateLimiter = createReportRateLimiter();

export function setReportRateLimiter(limiter: ReportRateLimiter): void {
  rateLimiter = limiter;
}

function getReporter(): Reporter | undefined {
  return (globalThis as Record<symbol, Reporter | undefined>)[REPORTER_KEY];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function registerReporter(r: Reporter): void {
  (globalThis as Record<symbol, Reporter>)[REPORTER_KEY] = r;
}

export function reportError(error: unknown, ctx: ReportContext): void {
  try {
    const message = errorMessage(error);
    const dedupeKey = ctx.dedupeKey ?? `${ctx.source}:${message}`;
    if (!rateLimiter.shouldAllow(dedupeKey)) {
      return;
    }

    const reporter = getReporter();
    if (!reporter) {
      console.error(`[${ctx.source}]`, message, error);
      return;
    }

    try {
      reporter.capture(error, ctx);
    } catch {
      // Reporter failures must not propagate.
    }
  } catch {
    // reportError must never throw.
  }
}

export async function flushReports(timeoutMs = 2000): Promise<boolean> {
  const reporter = getReporter();
  if (!reporter) {
    return true;
  }
  try {
    return await reporter.flush(timeoutMs);
  } catch {
    return false;
  }
}
