import type { WallMaterialKey } from "./types";

export type WallMaterial = {
  key: WallMaterialKey;
  label: string;
  costPerSpace: number;
  notes?: string;
};

export const WALL_MATERIALS: WallMaterial[] = [
  { key: "wood", label: "Wood", costPerSpace: 1000, notes: "No cost for ground floor" },
  { key: "earth-packed", label: "Earth, packed", costPerSpace: 250 },
  { key: "masonry", label: "Masonry", costPerSpace: 2500 },
  { key: "masonry-superior", label: "Masonry, superior", costPerSpace: 3000 },
  { key: "masonry-reinforced", label: "Masonry, reinforced", costPerSpace: 4500 },
  { key: "glass", label: "Glass", costPerSpace: 3000 },
  { key: "living-wood", label: "Living wood", costPerSpace: 2000 },
  { key: "bone", label: "Bone", costPerSpace: 6000 },
  { key: "deep-coral", label: "Deep coral", costPerSpace: 2000, notes: "Underwater only" },
  { key: "iron", label: "Iron", costPerSpace: 6000 },
  { key: "ice", label: "Ice", costPerSpace: 10000, notes: "Half price in cold climate" },
  {
    key: "stone-hewn",
    label: "Stone, hewn",
    costPerSpace: 6000,
    notes: "Free if below ground; –5% in mountains",
  },
  {
    key: "stone-unworked",
    label: "Stone, unworked",
    costPerSpace: 1000,
    notes: "Underground only",
  },
  { key: "mithral", label: "Mithral", costPerSpace: 20000 },
  { key: "adamantine", label: "Adamantine", costPerSpace: 30000 },
  { key: "obdurium", label: "Obdurium", costPerSpace: 60000 },
  { key: "wall-of-force", label: "Wall of force", costPerSpace: 40000 },
];

export const WALL_MATERIAL_MAP = new Map(
  WALL_MATERIALS.map((m) => [m.key, m]),
);

export type WallPercentages = {
  interior: number;
  exterior: number;
};

/** Table 2-4: Interior and Exterior Walls */
export function getWallPercentages(totalSpaces: number): WallPercentages {
  if (totalSpaces <= 0) return { interior: 0, exterior: 0 };
  if (totalSpaces <= 5) return { interior: 0.2, exterior: 0.8 };
  if (totalSpaces <= 10) return { interior: 0.3, exterior: 0.7 };
  if (totalSpaces <= 20) return { interior: 0.4, exterior: 0.6 };
  if (totalSpaces <= 45) return { interior: 0.5, exterior: 0.5 };
  if (totalSpaces <= 120) return { interior: 0.6, exterior: 0.4 };
  if (totalSpaces <= 450) return { interior: 0.7, exterior: 0.3 };
  if (totalSpaces <= 3800) return { interior: 0.8, exterior: 0.2 };
  return { interior: 0.9, exterior: 0.1 };
}

export function getWallMaterialCost(key: WallMaterialKey): number {
  return WALL_MATERIAL_MAP.get(key)?.costPerSpace ?? 0;
}

export function getTerrainWallDiscountPercent(
  material: WallMaterialKey,
  terrain: string,
  climate: string | null,
): number {
  if (material === "wood" && terrain === "forest") return 10;
  if (material === "stone-hewn" && terrain === "mountains") return 5;
  if (material === "ice" && climate === "cold") return 50;
  if (material === "stone-hewn" && terrain === "underground") return 100;
  if (material === "wood") return 0;
  return 0;
}
