/**
 * Regenerate the checked-in base/prestige catalog for all class slugs.
 * Run: pnpm exec tsx scripts/generate-class-type-map.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import {
  buildClassTypeMap,
  serializeClassTypeMap,
  type ClassTypeInput,
} from "../src/lib/class-type";

const DATA_DIR = resolve(__dirname, "../../data/dndtools");
const OUTPUT_FILE = join(DATA_DIR, ".index", "class_type_map.json");
const SUPPLEMENTAL_CLASS_FILES = ["warcraft_rpg_classes.json"] as const;

type ClassRecord = { slug: string } & ClassTypeInput;

function loadJson(path: string): ClassRecord[] {
  return JSON.parse(readFileSync(path, "utf-8")) as ClassRecord[];
}

function loadAllClassRecords(): ClassRecord[] {
  const records = loadJson(join(DATA_DIR, "classes.json"));
  for (const file of SUPPLEMENTAL_CLASS_FILES) {
    records.push(...loadJson(join(DATA_DIR, "supplemental", file)));
  }
  return records;
}

function main() {
  const records = loadAllClassRecords();
  const map = buildClassTypeMap(records);

  const missingSlug = records.find((record) => !record.slug);
  if (missingSlug) {
    throw new Error("Encountered class record without slug");
  }

  const baseCount = Object.values(map).filter((type) => type === "base").length;
  const prestigeCount = Object.values(map).filter((type) => type === "prestige").length;

  writeFileSync(OUTPUT_FILE, serializeClassTypeMap(map), "utf-8");
  console.log(
    `Wrote ${OUTPUT_FILE}: total=${records.length} base=${baseCount} prestige=${prestigeCount}`,
  );
}

main();
