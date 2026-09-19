/**
 * Dev-only two-client combat stress harness.
 * Run: pnpm exec tsx scripts/combat-stress.ts
 *
 * Requires DATABASE_URL and a seeded campaign with combat.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const combat = await prisma.campaignCombat.findFirst({
    where: { state: "active" },
    include: { combatants: true, events: { where: { kind: "damage", revertedAt: null } } },
  });
  if (!combat) {
    console.log("No active combat found; stress script skipped.");
    return;
  }
  const target = combat.combatants.find((c) => c.kind === "npc");
  if (!target) {
    console.log("No NPC target; stress script skipped.");
    return;
  }
  const applied = combat.events.reduce((sum, e) => {
    const payload = e.payload as { applied?: number };
    return sum + (payload.applied ?? 0);
  }, 0);
  const hp = Math.max(0, target.hpMax - target.wounds);
  console.log(
    JSON.stringify({
      combatId: combat.id,
      target: target.name,
      hp,
      hpMax: target.hpMax,
      loggedDamage: applied,
      delta: target.hpMax - hp - applied,
    }),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
