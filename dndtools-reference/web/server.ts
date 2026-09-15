/**
 * Custom Next.js HTTP server with campaign WebSocket upgrade.
 *
 * Dev:  node --import tsx/esm server.ts
 * Prod: node server.mjs (esbuild bundle)
 *
 * Requires REDIS_URL (defaults to redis://127.0.0.1:6379 locally).
 * Production fails fast if REDIS_URL is unset.
 *
 * Production with `output: "standalone"` must set
 * `__NEXT_PRIVATE_STANDALONE_CONFIG` before `require("next")`.
 *
 * Next is loaded via createRequire AFTER campaign modules so Next's
 * require-hook does not break `@/` resolution under tsx.
 */

import { createServer } from "http";
import { readFileSync } from "fs";
import { parse } from "url";
import { createRequire } from "module";
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv({ path: path.join(__dirname, ".env") });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
const dir = __dirname;

/**
 * Standalone output traces a slim Next tree that omits webpack-lib.
 * `require("next")` then crashes unless the baked config is injected first,
 * which is what `.next/standalone/server.js` does.
 */
function applyStandaloneConfig(appDir: string): void {
  if (process.env.__NEXT_PRIVATE_STANDALONE_CONFIG) return;
  const manifestPath = path.join(
    appDir,
    ".next",
    "required-server-files.json",
  );
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      config?: unknown;
    };
    if (manifest.config && typeof manifest.config === "object") {
      process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(
        manifest.config,
      );
    }
  } catch {
    // Dev and full node_modules installs load next.config themselves.
  }
}

async function main() {
  // Import campaign WS modules before Next patches require().
  const { requireRedisUrlInProduction } = await import(
    "./src/lib/campaign/liveRedis"
  );
  requireRedisUrlInProduction();

  const { createCampaignWebSocket, isCampaignWsPath } = await import(
    "./src/lib/campaign/liveWsServer"
  );

  if (!dev) {
    applyStandaloneConfig(dir);
    if (!process.env.__NEXT_PRIVATE_STANDALONE_CONFIG) {
      throw new Error(
        `Missing ${path.join(dir, ".next", "required-server-files.json")}. The standalone custom server cannot start.`,
      );
    }
    process.chdir(dir);
  }

  const require = createRequire(import.meta.url);
  // Next 16: `typeof import("next")` is the module namespace (not callable).
  // CJS `require("next")` is the server factory function.
  type NextServer = {
    prepare: () => Promise<void>;
    getRequestHandler: () => (
      req: import("http").IncomingMessage,
      res: import("http").ServerResponse,
      parsedUrl?: import("url").UrlWithParsedQuery,
    ) => unknown;
    getUpgradeHandler?: () => (
      req: import("http").IncomingMessage,
      socket: import("stream").Duplex,
      head: Buffer,
    ) => unknown;
  };
  type CreateNextServer = (options: {
    dev?: boolean;
    hostname?: string;
    port?: number;
    dir?: string;
  }) => NextServer;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const createNextServer = require("next") as CreateNextServer;

  const app = createNextServer({ dev, hostname, port, dir });
  const handle = app.getRequestHandler();
  await app.prepare();

  const campaignWs = createCampaignWebSocket();
  const nextUpgrade = app.getUpgradeHandler?.();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  server.on("upgrade", (req, socket, head) => {
    if (isCampaignWsPath(req.url)) {
      campaignWs.handleUpgrade(req, socket, head);
      return;
    }
    if (nextUpgrade) {
      void nextUpgrade(req, socket, head);
      return;
    }
    socket.destroy();
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Ready on http://${hostname}:${port} (${dev ? "dev" : "prod"}) [ws /ws/campaign/:id]`,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
