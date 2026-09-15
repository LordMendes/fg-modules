/**
 * Copy pnpm virtual-store dirs into /native-pkgs for the Docker runner.
 *
 * Next.js standalone tracing omits:
 * - Sharp native binaries (.node / libvips)
 * - Prisma CLI (a devDependency used for `migrate deploy` on startup)
 * - Custom-server / import-bundle externals (esbuild --packages=external)
 *
 * A shell `find` over a copied store misses symlink targets (effect, c12, etc.),
 * so this script walks the source .pnpm dirs and copies the full closure.
 *
 * Run AFTER `bundle:server` and `import:bundle` so server.mjs / import-dndtools.mjs
 * exist and their npm externals are discovered automatically.
 */
import fs from "node:fs";
import path from "node:path";

const DEST = process.env.NATIVE_PKGS_DIR || "/native-pkgs";
const STORES = (
  process.env.PNPM_STORES ||
  "/app/node_modules/.pnpm:/app/web/node_modules/.pnpm"
)
  .split(":")
  .filter((dir) => fs.existsSync(dir));

const BUNDLE_FILES = (
  process.env.BUNDLE_FILES ||
  "/app/web/server.mjs:/app/web/import-dndtools.mjs"
)
  .split(":")
  .filter((file) => fs.existsSync(file));

// Fixed roots not always present in esbuild bundles (native binaries, Prisma CLI).
const FIXED_SEED = [/^sharp@/, /^@img\+/, /^prisma@/];

// Standalone already ships these; do not copy their full pnpm closure into /native-pkgs.
const SKIP_CLOSURE_SEED = new Set(["next"]);

// Type packages are never required at runtime.
const SKIP = [/^@types\+/, /^typescript@/];

const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "querystring",
  "readline",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "worker_threads",
  "zlib",
]);

const MAX_CLOSURE = Number(process.env.NATIVE_PKGS_MAX || 350);

const FROM_RE = /\bfrom\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const SIDE_EFFECT_IMPORT_RE = /\bimport\s+["']([^"']+)["']/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

function isFixedSeed(name) {
  return FIXED_SEED.some((re) => re.test(name));
}

function isSkip(name) {
  return SKIP.some((re) => re.test(name));
}

function packageRoot(specifier) {
  if (specifier.startsWith("node:")) {
    return specifier.slice(5).split("/")[0];
  }
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split("/")[0];
}

function isExternalSpecifier(specifier) {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("@/")) {
    return false;
  }
  const root = packageRoot(specifier);
  if (NODE_BUILTINS.has(root)) return false;
  return true;
}

function scanBundleExternals(filePath) {
  const found = new Set();
  let source;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    return found;
  }
  for (const re of [FROM_RE, DYNAMIC_IMPORT_RE, SIDE_EFFECT_IMPORT_RE, REQUIRE_RE]) {
    re.lastIndex = 0;
    for (const match of source.matchAll(re)) {
      const spec = match[1];
      if (isExternalSpecifier(spec)) found.add(packageRoot(spec));
    }
  }
  return found;
}

function pkgStorePrefix(pkg) {
  return `${pkg.replace("/", "+")}@`;
}

function addPackageSeeds(pkg, needed) {
  const prefix = pkgStorePrefix(pkg);
  for (const store of STORES) {
    for (const name of fs.readdirSync(store)) {
      if (name.startsWith(prefix) && !isSkip(name)) needed.add(name);
    }
  }
}

function storeKeyFromAbs(absPath) {
  const normalized = absPath.replaceAll("\\", "/");
  for (const store of STORES) {
    const prefix = `${store.replaceAll("\\", "/")}/`;
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length).split("/")[0];
    }
  }
  return null;
}

function walkLinks(dir, onStore, seen = new Set()) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (seen.has(full)) continue;
    seen.add(full);
    let stat;
    try {
      stat = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) {
      let target;
      try {
        target = path.resolve(path.dirname(full), fs.readlinkSync(full));
      } catch {
        continue;
      }
      const key = storeKeyFromAbs(target);
      if (key && !isSkip(key)) onStore(key);
      continue;
    }
    if (stat.isDirectory()) walkLinks(full, onStore, seen);
  }
}

function hasNativeAddon(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.endsWith(".node")) return true;
    if (entry.isDirectory() && hasNativeAddon(full)) return true;
  }
  return false;
}

if (STORES.length === 0) {
  console.error("[collect-native-pkgs] no pnpm stores found");
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });

const linkPackages = new Set();
for (const file of BUNDLE_FILES) {
  for (const pkg of scanBundleExternals(file)) linkPackages.add(pkg);
}

const needed = new Set();
for (const store of STORES) {
  for (const name of fs.readdirSync(store)) {
    if (isFixedSeed(name) && !isSkip(name)) needed.add(name);
  }
}
for (const pkg of linkPackages) {
  if (!SKIP_CLOSURE_SEED.has(pkg)) addPackageSeeds(pkg, needed);
}

if (needed.size === 0) {
  console.error("[collect-native-pkgs] seed matched nothing");
  process.exit(1);
}

let prev = 0;
while (needed.size > prev) {
  prev = needed.size;
  for (const name of [...needed]) {
    for (const store of STORES) {
      const dir = path.join(store, name);
      if (!fs.existsSync(dir)) continue;
      walkLinks(dir, (key) => needed.add(key));
    }
  }
}

if (needed.size > MAX_CLOSURE) {
  console.error(
    `[collect-native-pkgs] closure too large (${needed.size} > ${MAX_CLOSURE}); refusing to copy`,
  );
  process.exit(1);
}

for (const name of needed) {
  const dest = path.join(DEST, name);
  if (fs.existsSync(dest)) continue;
  for (const store of STORES) {
    const src = path.join(store, name);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, dest, { recursive: true });
    break;
  }
}

const linkList = [...linkPackages].sort();
fs.writeFileSync(
  path.join(DEST, "link-packages.txt"),
  `${linkList.join("\n")}\n`,
  "utf8",
);

const copied = fs
  .readdirSync(DEST)
  .filter((name) => name !== "link-packages.txt");
console.log(
  `[collect-native-pkgs] copied ${copied.length} store dirs; link ${linkList.length} packages: ${linkList.join(", ")}`,
);

const requirePrefix = (prefix) => {
  if (!copied.some((name) => name.startsWith(prefix))) {
    console.error(`[collect-native-pkgs] missing ${prefix}*`);
    process.exit(1);
  }
};

requirePrefix("effect@");
requirePrefix("c12@");
requirePrefix("@prisma+client@");
requirePrefix("@prisma+dev@");
requirePrefix("@prisma+studio-core@");

if (linkPackages.has("@aws-sdk/client-s3")) {
  requirePrefix("@aws-sdk+client-s3@");
}
if (linkPackages.has("dotenv")) {
  requirePrefix("dotenv@");
}

if (!hasNativeAddon(DEST)) {
  console.error("[collect-native-pkgs] missing native .node (sharp)");
  process.exit(1);
}
