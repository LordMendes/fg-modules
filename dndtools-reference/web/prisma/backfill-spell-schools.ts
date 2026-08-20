import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseSpellSchool } from "../src/lib/spell-utils";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BATCH_SIZE = 500;

async function main() {
  let cursor: string | undefined;
  let updated = 0;

  for (;;) {
    const batch = await prisma.spell.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, school: true },
    });

    if (batch.length === 0) break;

    for (const spell of batch) {
      const parsed = parseSpellSchool(spell.school);
      await prisma.spell.update({
        where: { id: spell.id },
        data: {
          schools: parsed.schools,
          disciplines: parsed.disciplines,
          subschool: parsed.subschool,
        },
      });
      updated += 1;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < BATCH_SIZE) break;
    console.log(`  backfilled ${updated} spells…`);
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
