import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import { closeHttpServer, createShutdown, type ShutdownDeps } from "./shutdown";

function recorder(overrides: Partial<ShutdownDeps> = {}) {
  const calls: string[] = [];
  const exits: number[] = [];
  const logs: string[] = [];
  const deps: ShutdownDeps = {
    closeWs: () => {
      calls.push("ws");
    },
    closeHttp: async () => {
      calls.push("http");
    },
    closeRedis: async () => {
      calls.push("redis");
    },
    disconnectDb: async () => {
      calls.push("db");
    },
    exit: (code) => {
      exits.push(code);
    },
    log: (message) => {
      logs.push(message);
    },
    timeoutMs: 1_000,
    ...overrides,
  };
  return { deps, calls, exits, logs };
}

describe("createShutdown", () => {
  it("closes ws, http, redis, db in order and exits once with the code", async () => {
    const { deps, calls, exits } = recorder();
    await createShutdown(deps)("SIGTERM", 0);
    assert.deepEqual(calls, ["ws", "http", "redis", "db"]);
    assert.deepEqual(exits, [0]);
  });

  it("runs the steps once when signalled repeatedly", async () => {
    const { deps, calls, exits } = recorder();
    const shutdown = createShutdown(deps);
    await Promise.all([shutdown("SIGTERM", 0), shutdown("SIGINT", 0)]);
    assert.deepEqual(calls, ["ws", "http", "redis", "db"]);
    assert.deepEqual(exits, [0]);
  });

  it("keeps going when one step throws and still exits with the code", async () => {
    const { deps, calls, exits, logs } = recorder({
      closeRedis: async () => {
        throw new Error("boom");
      },
    });
    await createShutdown(deps)("uncaught exception", 1);
    assert.deepEqual(calls, ["ws", "http", "db"]);
    assert.deepEqual(exits, [1]);
    assert.ok(logs.some((line) => line.includes("redis close failed: boom")));
  });

  it("forces exit when a step never finishes", async () => {
    const { deps, exits } = recorder({
      closeHttp: () => new Promise<void>(() => {}),
      timeoutMs: 20,
    });
    void createShutdown(deps)("SIGTERM", 0);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.deepEqual(exits, [0]);
  });
});

describe("closeHttpServer", () => {
  it("resolves for a listening server and for one that never started", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    await closeHttpServer(server);
    assert.equal(server.listening, false);

    await closeHttpServer(createServer());
  });
});
