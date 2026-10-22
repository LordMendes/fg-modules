/**
 * Graceful shutdown for the custom HTTP server.
 *
 * Steps run in order: campaign WebSockets, HTTP listener, Redis, database.
 * A hard timer guarantees the process exits even if a socket never drains.
 * Repeated calls (SIGTERM followed by SIGINT, or a fatal error during drain)
 * share one run.
 */
import type { Server } from "http";

export type ShutdownDeps = {
  closeWs: () => void | Promise<void>;
  closeHttp: () => Promise<void>;
  closeRedis: () => Promise<void>;
  disconnectDb: () => Promise<void>;
  exit: (code: number) => void;
  log?: (message: string) => void;
  timeoutMs?: number;
};

export type Shutdown = (reason: string, exitCode: number) => Promise<void>;

const DEFAULT_TIMEOUT_MS = 8_000;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createShutdown(deps: ShutdownDeps): Shutdown {
  const log = deps.log ?? ((message: string) => console.log(message));
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let inFlight: Promise<void> | null = null;
  let exited = false;

  const exitOnce = (code: number) => {
    if (exited) return;
    exited = true;
    deps.exit(code);
  };

  return (reason, exitCode) => {
    if (inFlight) return inFlight;

    log(`[shutdown] ${reason}: draining`);
    const forced = setTimeout(() => {
      log(`[shutdown] still running after ${timeoutMs}ms, forcing exit`);
      exitOnce(exitCode);
    }, timeoutMs);

    inFlight = (async () => {
      const steps: [string, () => unknown][] = [
        ["ws", deps.closeWs],
        ["http", deps.closeHttp],
        ["redis", deps.closeRedis],
        ["db", deps.disconnectDb],
      ];
      for (const [name, step] of steps) {
        try {
          await step();
        } catch (err) {
          log(`[shutdown] ${name} close failed: ${errorMessage(err)}`);
        }
      }
      clearTimeout(forced);
      log("[shutdown] complete");
      exitOnce(exitCode);
    })();

    return inFlight;
  };
}

/**
 * Stop accepting connections, drop idle keep-alive sockets, and resolve once
 * in-flight requests finish. Resolves immediately if the server never started.
 */
export function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections();
  });
}
