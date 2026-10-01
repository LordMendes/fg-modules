/**
 * Bundle the custom server, the data importer, and the SQL migrator.
 *
 * npm packages are inlined. next, sharp, and @prisma/client stay external:
 * next must be the standalone server factory, sharp is a native addon, and
 * the generated Prisma client loads its query compiler from @prisma/client.
 */
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const runtimeExternal = [
  "next",
  "sharp",
  "@prisma/client",
  "@prisma/client/*",
];

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  alias: { "@": path.join(webRoot, "src") },
  logLevel: "info",
  // dotenv and other CJS packages call require("fs") dynamically. The ESM
  // bundle has no require unless this banner creates one.
  banner: {
    js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);',
  },
};

const targets = {
  server: {
    entryPoints: [path.join(webRoot, "server.ts")],
    outfile: path.join(webRoot, "server.mjs"),
    external: runtimeExternal,
  },
  import: {
    entryPoints: [path.join(webRoot, "prisma", "import-dndtools.ts")],
    outfile: path.join(webRoot, "import-dndtools.mjs"),
    external: runtimeExternal,
  },
  migrate: {
    entryPoints: [path.join(webRoot, "scripts", "migrate.ts")],
    outfile: path.join(webRoot, "migrate.mjs"),
    external: [],
  },
};

const name = process.argv[2] ?? "all";
const selected = name === "all" ? Object.values(targets) : [targets[name]];
if (!selected[0]) {
  console.error(`[bundle-node] unknown target ${name}`);
  process.exit(1);
}

for (const target of selected) {
  await esbuild.build({ ...common, ...target });
}
