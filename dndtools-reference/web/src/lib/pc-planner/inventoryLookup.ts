import { prisma } from "@/lib/prisma";
import { gearStatsFromEquipmentIndex, parseWeightPounds } from "./equippedGear";
import type { InventoryRow } from "./types";

export type InventoryItemLookup = {
  slug: string;
  name: string;
  source: "equipment" | "item";
  row: Omit<InventoryRow, "quantity" | "equipped">;
};

export async function lookupInventoryItem(
  source: "equipment" | "item",
  slug: string,
): Promise<InventoryItemLookup | null> {
  if (source === "equipment") {
    const row = await prisma.equipment.findUnique({
      where: { slug },
      select: { slug: true, name: true, kind: true, weight: true, indexData: true },
    });
    if (!row) return null;
    const stats = gearStatsFromEquipmentIndex({
      kind: row.kind,
      weight: row.weight,
      indexData: row.indexData,
    });
    return {
      slug: row.slug,
      name: row.name,
      source: "equipment",
      row: {
        name: row.name,
        weight: stats.weight,
        slug: row.slug,
        source: "equipment",
        kind: stats.kind,
        armorBonus: stats.armorBonus,
        maxDex: stats.maxDex,
        acp: stats.acp,
        speed30: stats.speed30,
        speed20: stats.speed20,
      },
    };
  }

  const item = await prisma.item.findUnique({
    where: { slug },
    select: { slug: true, name: true, indexData: true },
  });
  if (!item) return null;
  const index = (item.indexData ?? {}) as Record<string, unknown>;
  const weightRaw = typeof index.weight === "string" ? index.weight : null;
  return {
    slug: item.slug,
    name: item.name,
    source: "item",
    row: {
      name: item.name,
      weight: parseWeightPounds(weightRaw),
      slug: item.slug,
      source: "item",
      kind: typeof index.kind === "string" ? index.kind : null,
    },
  };
}
