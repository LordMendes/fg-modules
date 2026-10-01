/**
 * Copy the runtime packages the standalone image cannot trace.
 *
 * Sharp's musl addon, libvips, and the small JS packages Sharp loads
 * (detect-libc, semver, @img/colour), plus @prisma/client.
 * Fixed names only. This is not a dependency-closure walk.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const destRoot = process.env.RUNTIME_PKGS_DIR || "/runtime-pkgs";

const sharpEntry = require.resolve("sharp");
const sharpRequire = createRequire(sharpEntry);
const detectLibc = sharpRequire("detect-libc");

function fail(message) {
  console.error(`[stage-runtime-packages] ${message}`);
  process.exit(1);
}

/** Same id Sharp uses: linux-x64, linuxmusl-x64, win32-x64, ... */
function runtimePlatformArch() {
  const libc = detectLibc.isNonGlibcLinuxSync() ? detectLibc.familySync() : "";
  return `${process.platform}${libc}-${process.arch}`;
}

function packageRoot(resolvedFile) {
  let dir = path.dirname(resolvedFile);
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`package.json not found above ${resolvedFile}`);
    }
    dir = parent;
  }
  return dir;
}

function copyResolved(name, specifier, fromRequire) {
  const resolved = fromRequire.resolve(specifier);
  const src = packageRoot(resolved);
  const dest = path.join(destRoot, "node_modules", name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  return dest;
}

function hasNodeAddon(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasNodeAddon(full)) return true;
      continue;
    }
    if (entry.name.endsWith(".node")) return true;
  }
  return false;
}

const platform = runtimePlatformArch();
const clientRequire = createRequire(require.resolve("@prisma/client"));
const copies = [
  ["sharp", "sharp", require],
  ["detect-libc", "detect-libc", sharpRequire],
  ["semver", "semver", sharpRequire],
  ["@img/colour", "@img/colour", sharpRequire],
  [`@img/sharp-${platform}`, `@img/sharp-${platform}/sharp.node`, sharpRequire],
  ["@prisma/client", "@prisma/client", require],
  ["@prisma/client-runtime-utils", "@prisma/client-runtime-utils", clientRequire],
];

fs.mkdirSync(destRoot, { recursive: true });
for (const [name, specifier, fromRequire] of copies) {
  try {
    copyResolved(name, specifier, fromRequire);
  } catch (error) {
    fail(`cannot resolve ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

const libvipsName = `@img/sharp-libvips-${platform}`;
try {
  copyResolved(libvipsName, `${libvipsName}/lib`, sharpRequire);
  copies.push([libvipsName, "", sharpRequire]);
} catch (error) {
  if (platform.startsWith("linux")) {
    fail(`cannot resolve ${libvipsName}: ${error instanceof Error ? error.message : error}`);
  }
}

if (!hasNodeAddon(path.join(destRoot, "node_modules"))) {
  fail(`missing native .node addon for ${platform}`);
}

const wasm = path.join(
  destRoot,
  "node_modules",
  "@prisma",
  "client",
  "runtime",
  "query_compiler_fast_bg.postgresql.wasm-base64.mjs",
);
if (!fs.existsSync(wasm)) {
  fail(`missing ${wasm}`);
}

console.log(
  `[stage-runtime-packages] staged ${copies.map(([name]) => name).join(", ")} (${platform}) into ${destRoot}`,
);
