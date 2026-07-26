import type { StrongholdComponent } from "./types";

function comp(
  id: string,
  name: string,
  size: number,
  cost: number,
  opts: Partial<
    Pick<StrongholdComponent, "quality" | "family" | "prerequisites">
  > = {},
): StrongholdComponent {
  return {
    id,
    name,
    size,
    cost,
    prerequisites: opts.prerequisites ?? [],
    quality: opts.quality,
    family: opts.family,
  };
}

export const STRONGHOLD_COMPONENTS: StrongholdComponent[] = [
  comp("alchemical-lab-basic", "Alchemical laboratory, basic", 1, 700, {
    family: "alchemical-lab",
    quality: "basic",
  }),
  comp("alchemical-lab-fancy", "Alchemical laboratory, fancy", 1, 3000, {
    family: "alchemical-lab",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "alchemist", count: 1 }],
  }),
  comp("armory-basic", "Armory, basic", 1, 500, {
    family: "armory",
    quality: "basic",
  }),
  comp("armory-fancy", "Armory, fancy", 1, 2000, {
    family: "armory",
    quality: "fancy",
  }),
  comp("auditorium-fancy", "Auditorium, fancy", 1, 2000, {
    family: "auditorium",
    quality: "fancy",
  }),
  comp("auditorium-luxury", "Auditorium, luxury", 1, 10000, {
    family: "auditorium",
    quality: "luxury",
  }),
  comp("barbican", "Barbican", 0.5, 1000, {
    prerequisites: [{ type: "staff", role: "guard", count: 2 }],
  }),
  comp("barracks", "Barracks", 1, 400),
  comp("bath-basic", "Bath, basic", 0.5, 400, {
    family: "bath",
    quality: "basic",
  }),
  comp("bath-fancy", "Bath, fancy", 1, 2000, {
    family: "bath",
    quality: "fancy",
  }),
  comp("bath-luxury", "Bath, luxury", 2, 10000, {
    family: "bath",
    quality: "luxury",
    prerequisites: [
      { type: "staff", role: "servant", count: 1 },
      { type: "staff", role: "valet", count: 1 },
    ],
  }),
  comp("bedroom-suite-basic", "Bedroom suite, basic", 1, 800, {
    family: "bedroom-suite",
    quality: "basic",
  }),
  comp("bedroom-suite-fancy", "Bedroom suite, fancy", 1, 5000, {
    family: "bedroom-suite",
    quality: "fancy",
  }),
  comp("bedroom-suite-luxury", "Bedroom suite, luxury", 2, 25000, {
    family: "bedroom-suite",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "valet", count: 1 }],
  }),
  comp("bedrooms-basic", "Bedrooms, basic", 1, 700, {
    family: "bedrooms",
    quality: "basic",
  }),
  comp("bedrooms-fancy", "Bedrooms, fancy", 1, 4000, {
    family: "bedrooms",
    quality: "fancy",
  }),
  comp("bedrooms-luxury", "Bedrooms, luxury", 2, 20000, {
    family: "bedrooms",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "valet", count: 1 }],
  }),
  comp("chapel-basic", "Chapel, basic", 1, 1000, {
    family: "chapel",
    quality: "basic",
  }),
  comp("chapel-fancy", "Chapel, fancy", 2, 6000, {
    family: "chapel",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "acolyte", count: 1 }],
  }),
  comp("chapel-luxury", "Chapel, luxury", 2, 25000, {
    family: "chapel",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "acolyte", count: 2 }],
  }),
  comp("common-area-basic", "Common area, basic", 1, 500, {
    family: "common-area",
    quality: "basic",
  }),
  comp("common-area-fancy", "Common area, fancy", 1, 3000, {
    family: "common-area",
    quality: "fancy",
  }),
  comp("courtyard-basic", "Courtyard, basic", 1, 500, {
    family: "courtyard",
    quality: "basic",
  }),
  comp("courtyard-fancy", "Courtyard, fancy", 1, 3000, {
    family: "courtyard",
    quality: "fancy",
  }),
  comp("courtyard-luxury", "Courtyard, luxury", 1, 15000, {
    family: "courtyard",
    quality: "luxury",
  }),
  comp("dining-hall", "Dining hall", 2, 2000, {
    family: "dining-hall",
    quality: "basic",
    prerequisites: [{ type: "component", match: "kitchen", orBetter: true }],
  }),
  comp("dining-hall-fancy", "Dining hall, fancy", 2, 12000, {
    family: "dining-hall",
    quality: "fancy",
    prerequisites: [
      { type: "component", match: "kitchen", orBetter: true },
      { type: "staff", role: "servant", count: 1 },
    ],
  }),
  comp("dining-hall-luxury", "Dining hall, luxury", 2, 50000, {
    family: "dining-hall",
    quality: "luxury",
    prerequisites: [
      { type: "component", match: "kitchen-luxury" },
      { type: "staff", role: "servant", count: 2 },
    ],
  }),
  comp("dock-basic", "Dock, basic", 1, 500, {
    family: "dock",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "laborer", count: 2 }],
  }),
  comp("dock-extended", "Dock, extended", 2, 3000, {
    family: "dock",
    prerequisites: [{ type: "staff", role: "laborer", count: 4 }],
  }),
  comp("dock-extended-dry", "Dock, extended dry", 2, 15000, {
    family: "dock",
    prerequisites: [{ type: "staff", role: "laborer", count: 6 }],
  }),
  comp("gatehouse", "Gatehouse", 0.5, 1000),
  comp("guard-post", "Guard post", 0.5, 300),
  comp("kitchen-basic", "Kitchen, basic", 1, 2000, {
    family: "kitchen",
    quality: "basic",
  }),
  comp("kitchen-fancy", "Kitchen, fancy", 1, 12000, {
    family: "kitchen",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "cook", count: 2 }],
  }),
  comp("kitchen-luxury", "Kitchen, luxury", 2, 50000, {
    family: "kitchen",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "cook", count: 6 }],
  }),
  comp("labyrinth", "Labyrinth", 1, 500),
  comp("library-basic", "Library, basic", 1, 500, {
    family: "library",
    quality: "basic",
  }),
  comp("library-fancy", "Library, fancy", 1, 3000, {
    family: "library",
    quality: "fancy",
  }),
  comp("library-luxury", "Library, luxury", 2, 15000, {
    family: "library",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "librarian", count: 1 }],
  }),
  comp("magic-lab-basic", "Magic laboratory, basic", 1, 500, {
    family: "magic-lab",
    quality: "basic",
  }),
  comp("magic-lab-fancy", "Magic laboratory, fancy", 1, 3000, {
    family: "magic-lab",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "apprentice", count: 1 }],
  }),
  comp("prison-cell", "Prison cell", 0.5, 500, {
    prerequisites: [{ type: "staff", role: "guard", count: 1 }],
  }),
  comp("servants-quarters", "Servants' quarters", 1, 400),
  comp("shop-basic", "Shop, basic", 1, 400, {
    family: "shop",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "clerk", count: 1 }],
  }),
  comp("shop-fancy", "Shop, fancy", 1, 4000, {
    family: "shop",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "clerk", count: 2 }],
  }),
  comp("shop-luxury", "Shop, luxury", 1, 16000, {
    family: "shop",
    quality: "luxury",
    prerequisites: [
      { type: "staff", role: "clerk", count: 2 },
      { type: "staff", role: "guard", count: 2 },
    ],
  }),
  comp("smithy-basic", "Smithy, basic", 1, 500, {
    family: "smithy",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "smith", count: 1 }],
  }),
  comp("smithy-fancy", "Smithy, fancy", 1, 2000, {
    family: "smithy",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "smith", count: 1 }],
  }),
  comp("stable-basic", "Stable, basic", 1, 1000, {
    family: "stable",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "groom", count: 1 }],
  }),
  comp("stable-fancy", "Stable, fancy", 1, 3000, {
    family: "stable",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "groom", count: 1 }],
  }),
  comp("stable-luxury", "Stable, luxury", 1, 9000, {
    family: "stable",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "groom", count: 2 }],
  }),
  comp("storage-basic", "Storage, basic", 1, 250, {
    family: "storage",
    quality: "basic",
  }),
  comp("storage-fancy", "Storage, fancy", 1, 1000, {
    family: "storage",
    quality: "fancy",
  }),
  comp("storage-luxury", "Storage, luxury", 1, 3000, {
    family: "storage",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "clerk", count: 1 }],
  }),
  comp("study-basic", "Study/Office, basic", 0.5, 200, {
    family: "study",
    quality: "basic",
  }),
  comp("study-fancy", "Study/Office, fancy", 1, 500, {
    family: "study",
    quality: "fancy",
  }),
  comp("study-luxury", "Study/Office, luxury", 1.5, 15000, {
    family: "study",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "clerk", count: 1 }],
  }),
  comp("tavern-basic", "Tavern, basic", 1, 900, {
    family: "tavern",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "servant", count: 2 }],
  }),
  comp("tavern-fancy", "Tavern, fancy", 1, 4000, {
    family: "tavern",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "servant", count: 3 }],
  }),
  comp("tavern-luxury", "Tavern, luxury", 1, 20000, {
    family: "tavern",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "servant", count: 4 }],
  }),
  comp("throne-room-basic", "Throne room, basic", 1, 2000, {
    family: "throne-room",
    quality: "basic",
    prerequisites: [{ type: "staff", role: "servant", count: 2 }],
  }),
  comp("throne-room-fancy", "Throne room, fancy", 1, 12000, {
    family: "throne-room",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "servant", count: 4 }],
  }),
  comp("throne-room-luxury", "Throne room, luxury", 2, 80000, {
    family: "throne-room",
    quality: "luxury",
    prerequisites: [{ type: "staff", role: "servant", count: 6 }],
  }),
  comp("torture-chamber", "Torture chamber", 1, 3000, {
    prerequisites: [
      { type: "staff", role: "torturer", count: 1 },
      { type: "staff", role: "guard", count: 1 },
    ],
  }),
  comp("training-combat", "Training area, combat", 1, 1000),
  comp("training-rogue", "Training area, rogue", 1, 2000),
  comp("trophy-hall-basic", "Trophy hall, basic", 1, 1000, {
    family: "trophy-hall",
    quality: "basic",
  }),
  comp("trophy-hall-fancy", "Trophy hall, fancy (museum)", 1, 6000, {
    family: "trophy-hall",
    quality: "fancy",
    prerequisites: [{ type: "staff", role: "guard", count: 1 }],
  }),
  comp("workplace-basic", "Workplace, basic", 1, 500, {
    family: "workplace",
    quality: "basic",
  }),
  comp("workplace-fancy", "Workplace, fancy", 1, 2000, {
    family: "workplace",
    quality: "fancy",
  }),
];

export const COMPONENT_MAP = new Map(
  STRONGHOLD_COMPONENTS.map((c) => [c.id, c]),
);

export function getComponent(id: string): StrongholdComponent | undefined {
  return COMPONENT_MAP.get(id);
}

export const QUALITY_RANK: Record<string, number> = {
  basic: 0,
  fancy: 1,
  luxury: 2,
};
