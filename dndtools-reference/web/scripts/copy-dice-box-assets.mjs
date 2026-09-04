/**
 * Copy @3d-dice/dice-box static assets into public/dice-box/.
 * Runs non-interactively (the package postinstall prompts and is unreliable in CI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const source = path.join(webRoot, "node_modules", "@3d-dice", "dice-box", "dist", "assets");
const dest = path.join(webRoot, "public", "dice-box");

if (!fs.existsSync(source)) {
  console.warn(
    "[copy-dice-box-assets] Source not found (is @3d-dice/dice-box installed?):",
    source,
  );
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(source, dest, { recursive: true });
console.log("[copy-dice-box-assets] Copied dice-box assets to public/dice-box/");
