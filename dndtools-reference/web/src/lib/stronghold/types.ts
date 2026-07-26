export type ComponentQuality = "basic" | "fancy" | "luxury";

export type StaffRequirement = {
  role: StaffRoleKey;
  count: number;
};

export type ComponentPrerequisite =
  | { type: "component"; match: string; orBetter?: boolean }
  | { type: "staff"; role: StaffRoleKey; count: number };

export type StrongholdComponent = {
  id: string;
  name: string;
  size: number;
  cost: number;
  quality?: ComponentQuality;
  family?: string;
  prerequisites: ComponentPrerequisite[];
};

export type StrongholdCluster = {
  id: string;
  name: string;
  size: number;
  cost: number;
  description: string;
  components: { componentId: string; quantity: number }[];
  staff: StaffRequirement[];
  monthlyUpkeep: number;
};

export type ClimateType = "cold" | "temperate" | "warm";
export type TerrainType =
  | "aquatic"
  | "desert"
  | "plains"
  | "forest"
  | "hill"
  | "marsh"
  | "mountains"
  | "underground"
  | "exotic"
  | "mobile";

export type SettlementSize =
  | "small-town"
  | "large-town"
  | "small-city"
  | "large-city"
  | "metropolis";

export type SettlementDistance =
  | "less-than-1"
  | "1-16"
  | "17-48"
  | "49-112"
  | "113-plus";

export type NearbyFeature =
  | "impedes-movement"
  | "prohibits-movement"
  | "easier-attack"
  | "legal-dispute"
  | "lawless"
  | "controls-income"
  | "potential-income"
  | "hidden";

export type WallMaterialKey =
  | "adamantine"
  | "bone"
  | "deep-coral"
  | "earth-packed"
  | "glass"
  | "ice"
  | "iron"
  | "living-wood"
  | "masonry"
  | "masonry-superior"
  | "masonry-reinforced"
  | "mithral"
  | "obdurium"
  | "stone-hewn"
  | "stone-unworked"
  | "wall-of-force"
  | "wood";

export type StaffRoleKey =
  | "acolyte"
  | "alchemist"
  | "groom"
  | "apprentice"
  | "architect"
  | "artisan"
  | "bartender"
  | "butler"
  | "cavalry"
  | "clerk"
  | "cook"
  | "entertainer"
  | "guard"
  | "laborer"
  | "librarian"
  | "maid"
  | "mason"
  | "officer"
  | "sage"
  | "scribe"
  | "servant"
  | "soldier"
  | "smith"
  | "torturer"
  | "valet";

export type SpellDiscountKey =
  | "air-walk"
  | "fabricate"
  | "move-earth"
  | "stone-shape"
  | "telekinesis"
  | "wall-of-stone-9"
  | "wall-of-stone-12"
  | "wall-of-stone-16"
  | "wall-of-stone-20"
  | "wood-shape";

export type SelectedComponent = {
  componentId: string;
  quantity: number;
};

export type StrongholdInput = {
  components: SelectedComponent[];
  climate: ClimateType | null;
  terrain: TerrainType;
  settlement: SettlementSize;
  settlementDistance: SettlementDistance;
  nearbyFeatures: NearbyFeature[];
  interiorWall: WallMaterialKey;
  exteriorWall: WallMaterialKey;
  storiesAboveGround: number;
  subterraneanLayers: number;
  spellDiscounts: Partial<Record<SpellDiscountKey, boolean>>;
  staff: Partial<Record<StaffRoleKey, number>>;
  rushPercent: number;
  extrasCost: number;
};

export type CostLineItem = {
  label: string;
  amount: number;
  detail?: string;
};

export type ModifierLine = {
  label: string;
  percent: number;
};

export type StrongholdWarning = {
  type: "prerequisite" | "staff";
  message: string;
};

export type StrongholdResult = {
  totalSpaces: number;
  componentCost: number;
  heightDepthCost: number;
  wallCost: number;
  extrasCost: number;
  subtotalBeforeModifiers: number;
  spellDiscountAmount: number;
  siteModifierPercent: number;
  siteModifiers: ModifierLine[];
  costAfterSiteModifiers: number;
  rushCost: number;
  grandTotal: number;
  buildWeeks: number;
  buildWeeksRushed: number;
  monthlyUpkeep: number;
  lineItems: CostLineItem[];
  warnings: StrongholdWarning[];
  staffRequired: Partial<Record<StaffRoleKey, number>>;
};
