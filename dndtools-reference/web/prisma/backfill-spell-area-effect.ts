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
const BATCH_SIZE = 500;

type SpellRow = {
  slug: string;
  target?: string | null;
  area?: string | null;
  effect?: string | null;
};

async function main() {
  const records = JSON.parse(
    readFileSync(resolve(DATA_DIR, "spells.json"), "utf-8"),
  ) as SpellRow[];

  let updated = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((r) =>
        prisma.spell.updateMany({
          where: { slug: r.slug },
          data: {
            target: r.target ?? null,
            area: r.area ?? null,
            effect: r.effect ?? null,
          },
        }),
      ),
    );
    updated += batch.length;
    console.log(`  backfilled ${updated}/${records.length} spells…`);
  }

  console.log(`Backfill complete: ${updated} spells updated`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
