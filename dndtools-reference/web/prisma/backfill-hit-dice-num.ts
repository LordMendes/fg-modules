import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { parseHitDice } from "../src/lib/encounter/parseCr";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rows = await prisma.monster.findMany({ select: { id: true, hitDice: true } });
  for (const row of rows) {
    await prisma.monster.update({
      where: { id: row.id },
      data: { hitDiceNum: parseHitDice(row.hitDice) },
    });
  }
  console.log(`Updated hitDiceNum for ${rows.length} monsters`);
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
