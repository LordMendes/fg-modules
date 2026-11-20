import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

const connectionString = process.env.DATABASE_URL || "postgresql://dndtools:dndtools@localhost:5432/dndtools?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateJoinCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create DM user
  const dmPassword = await hash("password123", 10);
  const dm = await prisma.user.upsert({
    where: { email: "dm@example.com" },
    update: {},
    create: {
      email: "dm@example.com",
      username: "dm_user",
      name: "DM User",
      passwordHash: dmPassword,
    },
  });
  console.log("✅ Created DM user:", dm.email);

  // Create player user
  const playerPassword = await hash("password123", 10);
  const player = await prisma.user.upsert({
    where: { email: "player@example.com" },
    update: {},
    create: {
      email: "player@example.com",
      username: "player_user",
      name: "Player User",
      passwordHash: playerPassword,
    },
  });
  console.log("✅ Created Player user:", player.email);

  // Create a PC plan for the player
  const pcPlan = await prisma.pcPlan.upsert({
    where: { userId_name: { userId: player.id, name: "Thorin Stonehammer" } },
    update: {},
    create: {
      userId: player.id,
      name: "Thorin Stonehammer",
      shortcut: "thorin",
      state: {
        name: "Thorin Stonehammer",
        race: { slug: "dwarf" },
        classes: [{ slug: "fighter", level: 5 }],
        abilities: { str: 16, dex: 12, con: 16, int: 10, wis: 12, cha: 8 },
        hitPoints: { max: 48, current: 48, temporary: 0 },
        skills: {},
        feats: [],
        equipment: [],
        spells: [],
        treasure: { pp: 0, gp: 100, sp: 0, cp: 0 },
      },
    },
  });
  console.log("✅ Created PC:", pcPlan.name);

  // Create campaign
  const campaign = await prisma.campaign.upsert({
    where: { joinCode: "TEST1234" },
    update: {},
    create: {
      name: "Test Campaign",
      joinCode: "TEST1234",
      dmUserId: dm.id,
      settings: { combat: { strictTurns: false, askPlayersToRoll: false } },
    },
  });
  console.log("✅ Created Campaign:", campaign.name, "with join code:", campaign.joinCode);

  // Add DM as member
  await prisma.campaignMember.upsert({
    where: { campaignId_userId: { campaignId: campaign.id, userId: dm.id } },
    update: {},
    create: {
      campaignId: campaign.id,
      userId: dm.id,
      role: "dm",
      status: "active",
    },
  });

  // Add player as member
  await prisma.campaignMember.upsert({
    where: { campaignId_userId: { campaignId: campaign.id, userId: player.id } },
    update: {},
    create: {
      campaignId: campaign.id,
      userId: player.id,
      role: "player",
      status: "active",
    },
  });
  console.log("✅ Added members to campaign");

  // Add PC to campaign roster
  await prisma.campaignPc.upsert({
    where: { campaignId_pcPlanId: { campaignId: campaign.id, pcPlanId: pcPlan.id } },
    update: {},
    create: {
      campaignId: campaign.id,
      pcPlanId: pcPlan.id,
      userId: player.id,
    },
  });
  console.log("✅ Added PC to campaign roster");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Test Credentials:");
  console.log("  DM:     dm@example.com / password123");
  console.log("  Player: player@example.com / password123");
  console.log("\n🔗 Campaign Join Code: TEST1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
