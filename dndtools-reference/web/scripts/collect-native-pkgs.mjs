/**
 * Copy pnpm virtual-store dirs into /native-pkgs for the Docker runner.
 *
 * Next.js standalone tracing omits:
 * - Sharp native binaries (.node / libvips)
 * - Prisma CLI (a devDependency used for `migrate deploy` on startup)
 * - Custom-server externals (ioredis, ws, pg)
 *
 * A shell `find` over a copied store misses symlink targets (effect, c12, etc.),
 * so this script walks the source .pnpm dirs and copies the full closure.
 *
 * Do not maintain a hand-picked skip list for Prisma: Prisma 7 loads studio-core,
 * @prisma/dev, mysql2, and more at CLI startup even for `migrate deploy`.
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

// Roots whose full dependency closure must exist in the runner image.
const SEED = [
  /^sharp@/,
  /^@img\+/,
  /^prisma@/,
  /^@prisma\+client@/,
  /^@prisma\+adapter-pg@/,
  /^ioredis@/,
  /^ws@/,
  /^pg@/,
];

// Type packages are never required at runtime.
const SKIP = [/^@types\+/, /^typescript@/];

const MAX_CLOSURE = Number(process.env.NATIVE_PKGS_MAX || 250);

function isSeed(name) {
  return SEED.some((re) => re.test(name));
}

function isSkip(name) {
  return SKIP.some((re) => re.test(name));
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

const needed = new Set();
for (const store of STORES) {
  for (const name of fs.readdirSync(store)) {
    if (isSeed(name) && !isSkip(name)) needed.add(name);
  }
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

const copied = fs.readdirSync(DEST);
console.log(`[collect-native-pkgs] copied ${copied.length} store dirs`);

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

if (!hasNativeAddon(DEST)) {
  console.error("[collect-native-pkgs] missing native .node (sharp)");
  process.exit(1);
}
