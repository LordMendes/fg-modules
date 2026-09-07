/**
 * Custom Next.js HTTP server with campaign WebSocket upgrade.
 *
 * Dev:  pnpm --filter @fg-modules/web dev  (tsx server.ts)
 * Prod: node server.mjs (esbuild bundle) or tsx server.ts
 *
 * Requires REDIS_URL (defaults to redis://127.0.0.1:6379 locally).
 * Production fails fast if REDIS_URL is unset.
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
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
  const { requireRedisUrlInProduction } = await import(
    "./src/lib/campaign/liveRedis"
  );
  requireRedisUrlInProduction();

  const { createCampaignWebSocket, isCampaignWsPath } = await import(
    "./src/lib/campaign/liveWsServer"
  );

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
