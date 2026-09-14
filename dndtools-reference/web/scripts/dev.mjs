/**
 * Dev orchestrator: Next.js HTTP + standalone campaign WebSocket.
 * Avoids tsx+Next AsyncLocalStorage breakage on Node 22.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

async function bundleWs() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, "ws-standalone.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: path.join(webRoot, "ws-standalone.mjs"),
    packages: "external",
    alias: { "@": path.join(webRoot, "src") },
    banner: {
      js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);',
    },
    logLevel: "info",
  });
}

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: webRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NEXT_PUBLIC_WS_URL:
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
      WS_PORT: process.env.WS_PORT || "3001",
    },
  });
  child.on("exit", (code, signal) => {
    console.error(`[${name}] exited`, { code, signal });
    process.exit(code ?? 1);
  });
  return child;
}

await bundleWs();
const ws = run(process.execPath, ["ws-standalone.mjs"], "ws");
const next = run("pnpm", ["exec", "next", "dev"], "next");

function shutdown() {
  ws.kill();
  next.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
