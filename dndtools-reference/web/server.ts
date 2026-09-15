/**
 * Custom Next.js HTTP server with campaign WebSocket upgrade.
 *
 * Dev:  node --import tsx/esm server.ts
 * Prod: node server.mjs (esbuild bundle)
 *
 * Requires REDIS_URL (defaults to redis://127.0.0.1:6379 locally).
 * Production fails fast if REDIS_URL is unset.
 *
 * Next is loaded via createRequire AFTER campaign modules so Next's
 * require-hook does not break `@/` resolution under tsx.
 */

import { createServer } from "http";
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

async function main() {
  // Import campaign WS modules before Next patches require().
  const { requireRedisUrlInProduction } = await import(
    "./src/lib/campaign/liveRedis"
  );
  requireRedisUrlInProduction();

  const { createCampaignWebSocket, isCampaignWsPath } = await import(
    "./src/lib/campaign/liveWsServer"
  );

  const require = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const next = require("next") as typeof import("next");

  const app = next({ dev, hostname, port, dir });
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
