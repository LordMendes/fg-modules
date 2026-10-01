import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env") });

const { getEntityDetail } = await import("../src/lib/entities.ts");

for (const [category, slug] of [
  ["spells", "abate-dracorage-1094"],
  ["items", "aberrant-sphere-212"],
]) {
  try {
    const e = await getEntityDetail(category, slug);
    console.log(category, slug, {
      found: Boolean(e),
      name: e?.name,
      updatedAt: e?.updatedAt,
      type: typeof e?.updatedAt,
      isDate: e?.updatedAt instanceof Date,
      ctor: e?.updatedAt?.constructor?.name,
      hasToISO: typeof e?.updatedAt?.toISOString === "function",
    });
    if (e?.updatedAt) {
      try {
        console.log("  toISOString:", e.updatedAt.toISOString());
      } catch (err) {
        console.error("  toISOString threw:", err);
      }
    }
  } catch (err) {
    console.error("getEntityDetail threw", category, slug, err);
  }
}

process.exit(0);
