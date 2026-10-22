import type { DungeonMotif } from "./types";

export const LOCAL_DUNGEON_NAMES = [
  "Ashfall Vault",
  "Barrow of Quiet Steps",
  "Blackglass Warren",
  "Broken Seal Complex",
  "Cinder Catacombs",
  "Cold Iron Halls",
  "Cracked Crown Keep",
  "Deepwell Ruins",
  "Drowned Archive",
  "Echoing Pit",
  "Fallen Watch",
  "Gloomroot Labyrinth",
  "Graven Door Sanctum",
  "Hollow Crown Mine",
  "Ironspike Delve",
  "Knotroot Caverns",
  "Lanternless Depths",
  "Mold King Crypt",
  "Nightglass Cistern",
  "Obsidian Span",
  "Pale Hand Ossuary",
  "Quiet Coil Tunnels",
  "Riven Stair",
  "Salted Reliquary",
  "Shattered Orrery",
  "Silent Quay Undercroft",
  "Sinking Column Hall",
  "Spiral Gaol",
  "Starless Gallery",
  "Stoneheart Bastion",
  "Sunken Bell Tower",
  "Thorned Vault",
  "Three Key Warren",
  "Tidecut Sewers",
  "Umbral Crossing",
  "Verdigris Vault",
  "Whispering Shaft",
  "Wormsign Gallery",
  "Wyrmscale Pit",
  "Yellow Lantern Warren",
];

const FEATURE_GENERIC = [
  "A cracked basin holds stagnant water that reflects torchlight too sharply.",
  "Faded murals show a procession carrying an empty reliquary.",
  "Loose ceiling stones suggest a recent collapse blocked an older passage.",
  "A small shrine niche holds melted candle stubs and scratched prayers.",
  "Iron hooks line one wall, bent as if something heavy was dragged free.",
  "Mosaic tiles form a spiral that ends at a sealed drain grate.",
  "A rusted winch and frayed chain hang over a dry shaft.",
  "Charcoal tally marks climb the corner, stopping abruptly mid-count.",
  "A stone bench faces a blank wall, worn smooth by generations of waiting.",
  "Roots burst through the floor, wrapping a shattered urn.",
  "Alchemical stains color the mortar in sickly green rings.",
  "A toppled statue blocks half the room, its face carefully chiseled away.",
  "Cold air breathes from a crack no wider than a blade.",
  "Someone stacked skulls into a careful cairn beside the door.",
  "A pool of clear water hides silt that swirls without a visible current.",
  "Gouges in the stone match talons far larger than common vermin.",
  "A lectern holds a ledger of supplies, the last entries smeared with ash.",
  "Brass bells hang from the ceiling, each tongue removed.",
  "A half-finished barricade uses furniture from a surface chapel.",
  "Faint chalk arrows point toward a corridor that no longer exists.",
];

const FEATURE_BY_MOTIF: Partial<Record<Exclude<DungeonMotif, "">, string[]>> = {
  undead: [
    "Bone dust coats every ledge, undisturbed except for one set of fresh prints.",
    "Funerary cloth hangs in tatters, still scented with embalming resin.",
    "A sarcophagus lid leans open, its interior scraped clean.",
  ],
  vermin: [
    "Chewed gear and gnawed leather litter a nest corner.",
    "Tiny droppings form trails along the base of every wall.",
    "Webs thicken in the upper corners, vibrating with distant motion.",
  ],
  aquatic: [
    "Barnacles cling to stones that should never have seen the sea.",
    "Kelp strands dry to crisp ribbons on a rusted hook.",
    "Water marks ring the room at two different heights.",
  ],
  fire: [
    "Heat shimmer rises from a floor crack that glows dull orange.",
    "Obsidian glass sheets the walls where flame once passed.",
    "Sulfur crystals bloom around a vent that hisses softly.",
  ],
  arcane: [
    "Arcane sigils flicker when spoken names pass nearby lips.",
    "A scorched circle on the floor still tingles to the touch.",
    "Floating dust motes align into brief geometric patterns.",
  ],
};

const CREATURES: Record<string, string[]> = {
  "": ["bandit", "dire rat", "goblin scout", "stirge", "wolf", "giant spider"],
  abandoned: ["rusted animated armor", "stirge", "starved dog", "goblin squatter"],
  aberrant: ["grick", "gibbering mouther spawn", "chuul scout", "grell"],
  giant: ["ogre", "ettin", "hill giant runt", "dire bear"],
  undead: ["skeleton", "zombie", "ghoul", "shadow", "wight"],
  vermin: ["giant centipede", "carrion crawler", "giant ant", "monstrous spider"],
  aquatic: ["sahuagin", "lacedon", "giant frog", "water mephit"],
  desert: ["giant scorpion", "dust mephit", "jackalwere", "brass dragon wyrmling"],
  underdark: ["drow scout", "darkmantle", "troglodyte", "grimlock"],
  arcane: ["homunculus", "mephit", "animated object", "apprentice cultist"],
  fire: ["fire mephit", "magmin", "hell hound", "salamander hatchling"],
  cold: ["ice mephit", "winter wolf", "frost folk raider", "yeti cub"],
  abyssal: ["dretch", "mane", "abyssal scavenger", "vrock fledgling"],
  infernal: ["lemure", "imp", "bearded devil", "hell hound"],
};

const COUNT_WORDS = ["One", "Two", "Three", "Four", "Five", "Six"];

export function pickDungeonCreature(
  motif: DungeonMotif,
  level: number,
  rng: { next: () => number; pick: <T>(items: T[]) => T | undefined; pickInt: (min: number, max: number) => number },
  climax: boolean,
): string {
  const list = CREATURES[motif] ?? CREATURES[""]!;
  const name = rng.pick(list) ?? "creature";
  const count = rng.pickInt(1, Math.min(6, Math.max(1, Math.ceil(level / 3) + 1)));
  const word = COUNT_WORDS[count - 1] ?? String(count);
  const plural = count === 1 ? name : `${name}${name.endsWith("s") ? "es" : "s"}`;
  const role = climax ? " This is the climax fight." : "";
  return `${word} ${plural}, about CR ${level}.${role}`;
}

export function pickDungeonFeature(motif: DungeonMotif, rng: { next: () => number; pick: <T>(items: T[]) => T | undefined }): string {
  if (motif && FEATURE_BY_MOTIF[motif]?.length && rng.next() < 0.65) {
    const list = FEATURE_BY_MOTIF[motif]!;
    return rng.pick(list) ?? FEATURE_GENERIC[0]!;
  }
  return rng.pick(FEATURE_GENERIC) ?? FEATURE_GENERIC[0]!;
}
