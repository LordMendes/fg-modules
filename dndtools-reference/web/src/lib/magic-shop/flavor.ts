import type { ShopType, TownSize } from "./types";
import { TOWN_SIZE_PROSE } from "./constants";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export const SHOP_NAME_PATTERNS: readonly string[] = [
  "{keeper}'s Reliquary",
  "{keeper}'s Curio Cabinet",
  "{keeper}'s Wondrous Wares",
  "Brasswick's Arcane Annex",
  "Calder and Sons' Outfitters",
  "The Gilded Vial",
  "The Copper Cauldron",
  "The Silver Sigil",
  "The Verdant Flask",
  "The Iron Lantern",
  "The Quiet Quill",
  "The Wandering Wardrobe",
  "The Bent Compass",
  "The Hollow Crown",
  "The Starlit Counter",
  "The Mossy Hinge",
  "The Amber Apothecary",
  "The Runed Rack",
  "The Velvet Vault",
  "The Clockwork Closet",
  "The Painted Pegasus",
  "The Driftwood Door",
  "The Marble Mantle",
  "The Singing Anvil",
  "The Frosted Window",
  "The Golden Grimoire",
  "The Thorny Threshold",
  "The Lapis Ledger",
  "The Wicker Witchlight",
  "The Oaken Oracle",
  "The Sapphire Spindle",
  "The Rusted Ring",
  "The Ivory Inkwell",
  "The Cobalt Cache",
  "The Willow Wandworks",
  "The Granite Guard",
  "The Pewter Pouch",
  "The Sunstone Shelf",
  "The Moonlit Merchant",
  "The Ember Emporium",
];

const LOCATION_TEMPLATES: readonly string[] = [
  "Tucked on a side street in {town}, where foot traffic rarely lingers after dusk.",
  "Facing the market square of {town}, with a faded sign that creaks in the wind.",
  "Above a chandler in {town}, reachable by a narrow stair with worn treads.",
  "Beside the temple district of {town}, where pilgrims sometimes wander in by mistake.",
  "Near the riverfront of {town}, where damp stone keeps the windows fogged.",
  "On the craftsmen's row of {town}, sandwiched between a cooper and a tanner.",
  "At the edge of {town}, where the last cobbles give way to muddy cart tracks.",
  "Down a covered alley in {town}, lit by a single everburning torch over the door.",
  "Across from the guard barracks in {town}, though the watch rarely looks inside.",
  "Half-hidden behind a leaning warehouse in {town}, marked only by a chalk sigil.",
  "On the upper floor of a guild hall in {town}, open to members and curious travelers alike.",
  "Along the pilgrim road into {town}, where weary visitors stop before finding an inn.",
];

const SHOP_DESCRIPTIONS: readonly string[] = [
  "Shelves climb to the rafters, crowded with labeled jars and cloth-wrapped bundles.",
  "Glass cases line the walls, each item tagged with careful ink and wax seals.",
  "The air smells of old parchment, polish, and something faintly metallic.",
  "Lanterns cast warm light over narrow aisles barely wide enough for two shoppers.",
  "A brass bell above the door still rings, though its tone has gone slightly flat.",
  "Countertops are scarred from years of unpacking crates and weighing coin.",
  "Curios hang from the ceiling on fine chains, swaying when the door opens.",
  "Behind the counter, ledgers stack in neat towers beside a locked strongbox.",
  "Floorboards creak in a familiar rhythm, as if the building remembers every customer.",
  "Mirrors in the corners make the room feel larger than the street would suggest.",
  "Display niches are cut into the plaster, each lined with velvet faded to gray.",
  "A small brazier smolders in the back, keeping the shop dry on rainy days.",
  "Runes are chalked along the baseboards, renewed whenever scuffs blur the lines.",
  "Wooden drawers fill one wall, each pull ring stamped with a different symbol.",
  "The front window is crowded with mannequin busts wearing odd trinkets and charms.",
  "A cat sleeps on a stack of invoices, unbothered by the haggling at the counter.",
];

const KEEPERS_BY_TYPE: Record<ShopType, readonly string[]> = {
  trader: [
    "A sharp-eyed half-elf broker named Sera keeps a tally of every deal in three languages.",
    "A broad-shouldered human factor named Tomas trades rumors as freely as he trades goods.",
    "A quick-witted gnome clerk named Pip catalogs acquisitions in a ledger bound in green leather.",
    "A patient dwarf negotiator named Bruni never raises her voice, even when buyers bluff.",
  ],
  armorer: [
    "A meticulous dwarf smith named Haldor measures every pauldron twice before it leaves the rack.",
    "A calm human armorer named Elise speaks softly while fitting customers with padded jacks.",
    "A scarred half-orc craftmaster named Grak displays dents on his own breastplate as proof of quality.",
    "A precise gnome fitter named Nella keeps wax casts of noble clients in a locked cabinet.",
  ],
  weaponsmith: [
    "A steady human bladesmith named Corvin tests balance by resting each weapon on one finger.",
    "An elven fletcher named Lethan strings bows only after the morning dew has dried.",
    "A burly dwarf weapons dealer named Torval greets regulars by the nick on their favorite axe.",
    "A lanky halfling cutler named Mira wraps purchases in oiled cloth without being asked.",
  ],
  alchemist: [
    "A careful gnome brewer named Fizzwick labels every vial with date, batch, and warning.",
    "A solemn human apothecary named Odette refuses sales when a formula feels unstable.",
    "A cheerful halfling distiller named Bran keeps tasting spoons polished like silver.",
    "An elderly elf herbalist named Ayren dries hanging bundles that perfume the whole shop.",
  ],
  scribe: [
    "A nearsighted human copyist named Willem reads invoices through a lens ground from crystal.",
    "An ink-stained gnome scribe named Tessa archives duplicate seals for guild contracts.",
    "A precise elf antiquarian named Variel handles scroll tubes as if they were flute cases.",
    "A quiet half-elf clerk named Ren catalogs marginalia in a script only archivists enjoy.",
  ],
  wandwright: [
    "A focused gnome artificer named Orin tunes each focus against a tuning fork of bronze.",
    "A reserved human wandwright named Cassia inscribes maker marks along every haft she sells.",
    "An eccentric elf enchanter named Ilandra displays failed prototypes behind the counter as cautionary tales.",
    "A pragmatic dwarf rod-maker named Ulric weighs staves in both hands before quoting a price.",
  ],
};

export function rollShopNamePattern(rng: SeededRng): string {
  return rng.pick([...SHOP_NAME_PATTERNS]) ?? SHOP_NAME_PATTERNS[0]!;
}

export function rollLocation(townSize: TownSize, rng: SeededRng): string {
  const template = rng.pick([...LOCATION_TEMPLATES]) ?? LOCATION_TEMPLATES[0]!;
  return template.replace("{town}", TOWN_SIZE_PROSE[townSize]);
}

export function rollDescription(rng: SeededRng): string {
  return rng.pick([...SHOP_DESCRIPTIONS]) ?? SHOP_DESCRIPTIONS[0]!;
}

export function rollKeeper(shopType: ShopType, rng: SeededRng): string {
  const pool = KEEPERS_BY_TYPE[shopType];
  return rng.pick([...pool]) ?? pool[0]!;
}
