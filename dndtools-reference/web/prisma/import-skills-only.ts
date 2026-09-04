/**
 * Upsert skill descriptions from data/dndtools/skills.json into Prisma.
 * Faster than a full import:dndtools run when only skills changed.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DATA_DIR = process.env.DATA_DIR ?? resolve(__dirname, "../../data/dndtools");

type SkillRecord = {
  slug: string;
  name: string;
  description_html?: string | null;
  description_text?: string | null;
  index?: {
    key_ability?: string;
    trained_only?: boolean;
    armor_check_penalty?: boolean;
  };
};

async function main() {
  const path = resolve(DATA_DIR, "skills.json");
  const records = JSON.parse(readFileSync(path, "utf8")) as SkillRecord[];
  let updated = 0;
  let missing = 0;

  for (const r of records) {
    const result = await prisma.skill.updateMany({
      where: { slug: r.slug },
      data: {
        name: r.name,
        descriptionHtml: r.description_html ?? null,
        descriptionText: r.description_text ?? null,
        keyAbility: r.index?.key_ability ?? null,
        trainedOnly: r.index?.trained_only ?? null,
        armorCheckPenalty: r.index?.armor_check_penalty ?? null,
        indexData: (r.index ?? {}) as object,
      },
    });
    if (result.count === 0) {
      missing += 1;
      console.log(`  missing in DB: ${r.slug}`);
    } else {
      updated += 1;
    }
  }

  console.log(`Updated ${updated} skills (${missing} not found in DB)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
