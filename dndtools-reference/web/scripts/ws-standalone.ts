/**
 * Standalone campaign WebSocket server (no Next).
 * Bundled to ws-standalone.mjs and run beside `next dev`.
 */

import { createServer } from "http";
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  requireRedisUrlInProduction,
} from "../src/lib/campaign/liveRedis";
import {
  createCampaignWebSocket,
  isCampaignWsPath,
} from "../src/lib/campaign/liveWsServer";

// Bundled output lives in web/. Next keeps secrets in web/.env.
// override so a parent-shell DATABASE_URL cannot shadow web/.env.
const here = path.dirname(fileURLToPath(import.meta.url));
const envFiles = [
  path.join(process.cwd(), ".env"),
  path.join(here, ".env"),
];
for (const file of envFiles) {
  loadEnv({ path: file, override: true });
}

function redactDbUrl(url: string | undefined): string {
  if (!url) return "missing";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "invalid";
  }
}

function main() {
  requireRedisUrlInProduction();
  console.log("[ws] database", redactDbUrl(process.env.DATABASE_URL));

  const hostname = process.env.HOSTNAME || "0.0.0.0";
  const port = parseInt(process.env.WS_PORT || "3001", 10);
  const campaignWs = createCampaignWebSocket();

  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("campaign-ws");
  });

  server.on("upgrade", (req, socket, head) => {
    if (isCampaignWsPath(req.url)) {
      campaignWs.handleUpgrade(req, socket, head);
      return;
    }
    socket.destroy();
  });

  server.listen(port, hostname, () => {
    console.log(`> Campaign WS on ws://${hostname}:${port}/ws/campaign/:id`);
  });
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
