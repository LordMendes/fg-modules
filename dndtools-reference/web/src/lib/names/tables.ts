import type { NameCatalog, NameCatalogGroup } from "./types";

const TOWN_NOUNS = [
  "Keep",
  "Gate",
  "Lantern",
  "Cross",
  "Ford",
  "Hollow",
  "Rest",
  "Watch",
  "Mill",
  "Harbor",
  "Bridge",
  "Market",
];

const PLACE_NOUNS = [
  "Hold",
  "Spire",
  "Vault",
  "Crown",
  "Anvil",
  "Flame",
  "Shard",
  "Thorn",
  "Mist",
  "Star",
  "Rune",
  "Haven",
];

const SHIP_NOUNS = [
  "Wake",
  "Tide",
  "Gull",
  "Kraken",
  "Reef",
  "Storm",
  "Anchor",
  "Mast",
  "Keel",
  "Drift",
  "Current",
  "Harbor",
];

const INN_NOUNS = [
  "Rest",
  "Hearth",
  "Tankard",
  "Lantern",
  "Stall",
  "Loft",
  "Cellar",
  "Yard",
  "Sign",
  "Bench",
  "Kettle",
  "Hearthstone",
];

const PARTY_NOUNS = [
  "Company",
  "Band",
  "Circle",
  "Bandits",
  "Seekers",
  "Wardens",
  "Blades",
  "Hounds",
  "Runners",
  "Envoys",
  "Vanguard",
  "Oath",
];

function catalog(
  id: string,
  label: string,
  group: NameCatalogGroup,
  syllables: NameCatalog["syllables"],
  extras?: Pick<NameCatalog, "nouns" | "twoWordChance">,
): NameCatalog {
  return { id, label, group, syllables, ...extras };
}

const humanMaleSyl = {
  start: ["Al", "Bar", "Cor", "Dan", "Ed", "Gar", "Hal", "Ian", "Jar", "Kel", "Len", "Mor"],
  middle: ["an", "en", "or", "ar", "el", "ic", "us", "on", "er", "in", "al", "ed"],
  end: ["ton", "ley", "ric", "win", "son", "mund", "bert", "nard", "rick", "ford", "well", "man"],
};

const humanFemaleSyl = {
  start: ["Al", "Bri", "Cel", "Dara", "Eva", "Fay", "Gwen", "Hel", "Iris", "Jade", "Kara", "Lia"],
  middle: ["a", "e", "i", "y", "el", "in", "an", "or", "is", "en", "ae", "ie"],
  end: ["a", "ia", "elle", "ina", "lyn", "wen", "ra", "sa", "da", "tha", "na", "ra"],
};

const humanTownSyl = {
  start: ["Ash", "Bar", "Clear", "Deep", "East", "Fair", "Gold", "High", "Iron", "Lake", "Mist", "North"],
  middle: ["field", "brook", "haven", "moor", "ridge", "vale", "wood", "ford", "mark", "wall", "gate", "cross"],
  end: ["ton", "ville", "burgh", "stead", "port", "dale", "wick", "ham", "by", "den", "mere", "view"],
};

const dwarvenMaleSyl = {
  start: ["Bal", "Dor", "Grim", "Thor", "Bran", "Dur", "Kil", "Mor", "Nor", "Ran", "Tor", "Ul"],
  middle: ["in", "ar", "or", "un", "ak", "ik", "ok", "gar", "grim", "dur", "thar", "bar"],
  end: ["in", "ar", "ik", "or", "grim", "stone", "gar", "helm", "axe", "beard", "forge", "hold"],
};

const dwarvenFemaleSyl = {
  start: ["Bri", "Dag", "Hel", "Ket", "Mor", "Run", "Sig", "Thra", "Unn", "Vor", "Yr", "Zara"],
  middle: ["a", "i", "dis", "na", "la", "ra", "ga", "da", "sa", "ni", "li", "mi"],
  end: ["a", "dis", "na", "la", "ra", "hild", "lin", "na", "sa", "da", "ni", "ra"],
};

const dwarvenTownSyl = {
  start: ["Anvil", "Deep", "Forge", "Grim", "Iron", "Keg", "Mine", "Ore", "Rune", "Stone", "Thunder", "Under"],
  middle: ["gate", "hall", "keep", "mark", "shaft", "vault", "well", "bridge", "delve", "peak", "root", "flame"],
  end: ["hold", "heim", "gar", "deep", "mount", "forge", "hall", "gate", "mark", "delve", "peak", "root"],
};

const elvenMaleSyl = {
  start: ["Ael", "Cae", "Eli", "Fae", "Gal", "Ith", "Lae", "Mae", "Nae", "Rae", "Syl", "Thae"],
  middle: ["an", "or", "il", "en", "ar", "is", "ae", "ir", "on", "al", "in", "el"],
  end: ["ion", "dir", "las", "mir", "nor", "thas", "wen", "ril", "dor", "thir", "las", "ion"],
};

const elvenFemaleSyl = {
  start: ["Aer", "Cel", "Ela", "Fae", "Gal", "Ila", "Lae", "Mae", "Nae", "Rae", "Syl", "Thae"],
  middle: ["a", "e", "i", "y", "ae", "ie", "la", "na", "ra", "sa", "li", "mi"],
  end: ["a", "iel", "wen", "ra", "thae", "lith", "nae", "sae", "dae", "lia", "sia", "ria"],
};

const elvenTownSyl = {
  start: ["Silver", "Moon", "Star", "Sun", "Crystal", "Verdant", "Whisper", "Glimmer", "Shade", "Bright", "Pale", "Deep"],
  middle: ["leaf", "song", "glade", "pool", "spire", "bloom", "wind", "mist", "brook", "grove", "vale", "rise"],
  end: ["haven", "rest", "glade", "hollow", "reach", "spire", "fall", "mere", "wood", "vale", "rise", "court"],
};

const halflingMaleSyl = {
  start: ["Bil", "Cor", "Din", "Fil", "Gam", "Hal", "Mil", "Nor", "Per", "Ros", "Sam", "Tol"],
  middle: ["bo", "co", "do", "fo", "go", "lo", "mo", "no", "po", "ro", "to", "wo"],
  end: ["bald", "wick", "wise", "foot", "berry", "banks", "good", "fair", "quick", "merry", "coil", "took"],
};

const halflingFemaleSyl = {
  start: ["Bel", "Cora", "Daisy", "Ella", "Fern", "Gilly", "Hazel", "Ivy", "Jilly", "Kira", "Lily", "Mira"],
  middle: ["a", "e", "i", "y", "ie", "ee", "la", "na", "ra", "sa", "da", "ma"],
  end: ["a", "ie", "y", "bell", "wort", "rose", "bud", "cup", "kin", "let", "petal", "vine"],
};

const halflingTownSyl = {
  start: ["Apple", "Berry", "Clover", "Duck", "Elm", "Fern", "Green", "Hill", "Ivy", "Jolly", "Kettle", "Lazy"],
  middle: ["bottom", "hill", "vale", "brook", "field", "lane", "yard", "corner", "meadow", "patch", "row", "way"],
  end: ["ton", "wick", "by", "dale", "ford", "shire", "hollow", "rest", "gate", "cross", "well", "end"],
};

const draconicMaleSyl = {
  start: ["Az", "Bal", "Drax", "Gor", "Kor", "Mal", "Nax", "Rax", "Sar", "Tor", "Vex", "Zor"],
  middle: ["a", "i", "o", "u", "ar", "or", "ax", "ix", "ox", "ux", "an", "on"],
  end: ["ax", "ion", "oth", "ar", "ix", "or", "us", "on", "axion", "maw", "fang", "wing"],
};

const draconicFemaleSyl = {
  start: ["Aza", "Bela", "Dra", "Gla", "Kra", "Mala", "Nia", "Ria", "Sia", "Tia", "Vra", "Zia"],
  middle: ["a", "e", "i", "y", "ae", "ia", "ra", "la", "na", "sa", "va", "za"],
  end: ["a", "ia", "ra", "th", "nix", "scale", "fire", "claw", "wing", "maw", "spark", "flare"],
};

const drowMaleSyl = {
  start: ["Dri", "Mal", "Quen", "Vio", "Zak", "Kel", "Nim", "Sor", "Vel", "Xan", "Yar", "Zol"],
  middle: ["zz", "th", "ss", "nn", "rr", "ll", "zzt", "nth", "rth", "lth", "ssh", "nth"],
  end: ["in", "ar", "on", "is", "or", "us", "ix", "ax", "eth", "oth", "urn", "ask"],
};

const drowFemaleSyl = {
  start: ["Lil", "Pha", "Quil", "Tri", "Ves", "Yss", "Zha", "Kha", "Nyl", "Syl", "Wyr", "Xil"],
  middle: ["a", "e", "i", "y", "ae", "ra", "la", "na", "sa", "va", "za", "th"],
  end: ["a", "ae", "ra", "th", "nis", "dra", "lae", "sae", "nae", "the", "iss", "elle"],
};

const drowTownSyl = {
  start: ["Dark", "Deep", "Gloom", "Night", "Pale", "Shadow", "Silent", "Spider", "Under", "Void", "Web", "Wyrm"],
  middle: ["web", "stone", "vault", "spire", "pit", "hall", "gate", "bridge", "cavern", "nest", "loom", "fang"],
  end: ["deep", "hold", "reach", "spire", "vault", "gate", "pit", "hall", "nest", "loom", "fang", "dark"],
};

const orcMaleSyl = {
  start: ["Gor", "Kr", "Mog", "Rug", "Thok", "Urg", "Zog", "Brak", "Drog", "Grash", "Huk", "Lug"],
  middle: ["a", "u", "o", "ar", "ug", "ok", "ash", "uk", "og", "ak", "uk", "or"],
  end: ["ash", "uk", "gash", "fang", "skull", "gut", "bash", "maw", "tusk", "grim", "rot", "gar"],
};

const orcFemaleSyl = {
  start: ["Gra", "Kra", "Mog", "Ruk", "Sha", "Uga", "Zra", "Bra", "Dra", "Huk", "Lug", "Nog"],
  middle: ["a", "u", "o", "ar", "ga", "ka", "sha", "ra", "la", "na", "sa", "za"],
  end: ["a", "ga", "ka", "sha", "na", "la", "ra", "tusk", "fang", "gore", "scar", "blood"],
};

const orcTownSyl = {
  start: ["Blood", "Bone", "Crush", "Gore", "Iron", "Rot", "Skull", "Smoke", "Steel", "Thorn", "War", "Wolf"],
  middle: ["pit", "camp", "hold", "mark", "fang", "maw", "rock", "mud", "ash", "scar", "tooth", "claw"],
  end: ["gar", "hold", "pit", "camp", "fang", "rock", "ash", "scar", "tooth", "claw", "maw", "den"],
};

const celestialSyl = {
  start: ["Aur", "Cel", "Div", "Glo", "Hal", "Lum", "Rad", "Ser", "Sol", "Ura", "Vox", "Zen"],
  middle: ["a", "e", "i", "el", "or", "is", "an", "en", "ar", "il", "on", "al"],
  end: ["iel", "ion", "ael", "or", "us", "iel", "star", "light", "wing", "song", "grace", "veil"],
};

const fiendishSyl = {
  start: ["Az", "Bael", "Cru", "Dre", "Gor", "Mal", "Nef", "Pyr", "Sul", "Tor", "Vex", "Xar"],
  middle: ["a", "o", "u", "ar", "or", "ax", "ix", "oth", "ul", "on", "an", "er"],
  end: ["ax", "oth", "or", "us", "on", "ix", "maw", "horn", "flame", "chain", "pit", "mark"],
};

const modronSyl = {
  start: ["Prim", "Sec", "Tri", "Quad", "Quin", "Hex", "Sept", "Oct", "Non", "Dec", "Und", "Duod"],
  middle: ["a", "e", "i", "o", "u", "on", "um", "ax", "ex", "ix", "ox", "ux"],
  end: ["us", "on", "um", "ax", "ex", "ix", "ox", "ux", "mod", "ron", "unit", "node"],
};

const airSyl = {
  start: ["Aer", "Bree", "Gale", "Gust", "Mist", "Sky", "Storm", "Swift", "Vapor", "Wind", "Zep", "Whirl"],
  middle: ["a", "e", "i", "y", "or", "ar", "en", "in", "on", "al", "el", "is"],
  end: ["a", "or", "en", "in", "wind", "gust", "sky", "mist", "current", "drift", "whirl", "spire"],
};

const earthSyl = {
  start: ["Boulder", "Crag", "Gran", "Iron", "Moss", "Peb", "Quartz", "Root", "Stone", "Terr", "Vein", "Worm"],
  middle: ["a", "e", "o", "ar", "or", "en", "on", "um", "ax", "ix", "ok", "un"],
  end: ["ite", "ock", "stone", "root", "vein", "crag", "hold", "bed", "shard", "mound", "crest", "wall"],
};

const fireSyl = {
  start: ["Ash", "Blaze", "Cin", "Ember", "Flare", "Glow", "Heat", "Ign", "Kind", "Pyre", "Scorch", "Spark"],
  middle: ["a", "e", "i", "o", "ar", "or", "en", "in", "on", "al", "el", "is"],
  end: ["a", "or", "en", "flame", "spark", "brand", "coil", "pyre", "ash", "glow", "heat", "maw"],
};

const waterSyl = {
  start: ["Brine", "Coral", "Deep", "Foam", "Glim", "Kel", "Lag", "Mist", "Pool", "Reef", "Tide", "Wave"],
  middle: ["a", "e", "i", "o", "ar", "or", "en", "in", "on", "al", "el", "is"],
  end: ["a", "or", "en", "pool", "tide", "foam", "reef", "spray", "current", "deep", "glim", "wake"],
};

const partySyl = {
  start: ["Ashen", "Bold", "Crimson", "Dawn", "Ember", "Frost", "Grim", "Iron", "Jade", "Keen", "Lost", "Misty"],
  middle: ["", " ", " of the ", " from ", " near ", " beyond ", " under ", " above ", " within ", " beside ", " against ", " for the "],
  end: ["Road", "Reach", "Oath", "Star", "Flame", "Thorn", "Crown", "Gate", "Hollow", "Mark", "Veil", "Shrine"],
};

const shipSyl = {
  start: ["Black", "Brave", "Copper", "Drift", "Golden", "Iron", "Lucky", "Pale", "Quick", "Salt", "Silver", "Storm"],
  middle: ["", " ", "s ", "ing ", "ed ", "y ", "en ", "ar ", "or ", "al ", "ic ", "ous "],
  end: ["Fin", "Wake", "Tide", "Gull", "Kraken", "Reef", "Mast", "Keel", "Spray", "Current", "Harbor", "Runner"],
};

const deitySyl = {
  start: ["All", "Bright", "Deep", "Eternal", "Grim", "Hidden", "Ivory", "Just", "Kind", "Lunar", "Mighty", "Noble"],
  middle: ["", " of ", " the ", " beyond ", " beneath ", " above ", " within ", " who ", " whose ", " ever ", " once ", " still "],
  end: ["Light", "Shadow", "Flame", "Tide", "Stone", "Wind", "Truth", "Mercy", "Fury", "Dream", "Harvest", "Forge"],
};

const festivalSyl = {
  start: ["Autumn", "Bright", "Candle", "Dawn", "Ember", "Feast", "Golden", "Harvest", "Ivory", "Jolly", "Kindle", "Lantern"],
  middle: ["", " ", " of ", " and ", " upon ", " under ", " near ", " for ", " with ", " without ", " after ", " before "],
  end: ["Days", "Night", "Tide", "Moon", "Sun", "Star", "Flame", "Song", "Dance", "Market", "Fair", "Games"],
};

const weaponSyl = {
  start: ["Ash", "Bitter", "Cold", "Dark", "Doom", "Edge", "Fell", "Grim", "Iron", "Keen", "Lost", "Night"],
  middle: ["", " ", "fang", "thorn", "bane", "ward", "bite", "cleave", "rend", "strike", "guard", "brand"],
  end: ["blade", "edge", "fang", "bane", "cleaver", "reaver", "breaker", "ward", "mark", "song", "whisper", "storm"],
};

const kingdomSyl = {
  start: ["Amber", "Azure", "Bright", "Crown", "Elder", "Fair", "Golden", "High", "Iron", "Jade", "Lost", "Misty"],
  middle: ["", " ", "land", " realm", " march", " coast", " vale", " peak", " wood", " fen", " dale", " reach"],
  end: ["ia", "or", "en", "ar", "us", "on", "heim", "gard", "wyn", "dor", "mark", "hold"],
};

const castleSyl = {
  start: ["Black", "Broken", "Cloud", "Dragon", "Eagle", "Falcon", "Grim", "High", "Iron", "Kings", "Lion", "Moon"],
  middle: ["", " ", "stone", "rock", "wall", "gate", "tower", "keep", "hall", "bridge", "watch", "ward"],
  end: ["keep", "hold", "tower", "fort", "castle", "citadel", "bastion", "wall", "gate", "hall", "watch", "reach"],
};

const dungeonSyl = {
  start: ["Ashen", "Black", "Bone", "Crypt", "Dark", "Deep", "Doom", "Forgotten", "Grim", "Hollow", "Lost", "Rotting"],
  middle: ["", " ", "pit", "vault", "hall", "maw", "nest", "warren", "labyrinth", "catacomb", "sink", "well"],
  end: ["depths", "pit", "vault", "hall", "maw", "warren", "labyrinth", "catacombs", "sink", "well", "reach", "dark"],
};

const wildernessSyl = {
  start: ["Bleak", "Briar", "Dust", "Fern", "Gloom", "Hollow", "Mire", "Pine", "Quaking", "Raven", "Thistle", "Wolf"],
  middle: ["", " ", "wood", "fen", "marsh", "ridge", "glen", "barrow", "grove", "heath", "crag", "vale"],
  end: ["wood", "fen", "marsh", "ridge", "glen", "barrow", "grove", "heath", "crag", "vale", "reach", "wild"],
};

const planarSyl = {
  start: ["Astral", "Bleak", "Burning", "Echo", "Fractured", "Glass", "Hollow", "Inverted", "Mirrored", "Null", "Shifting", "Twisted"],
  middle: ["", " ", "rift", "gate", "spire", "sea", "void", "fold", "arc", "node", "well", "bridge"],
  end: ["rift", "gate", "spire", "sea", "void", "fold", "arc", "node", "well", "bridge", "reach", "edge"],
};

const genericTownSyl = {
  start: ["Ash", "Bar", "Clear", "Deep", "Fair", "Gold", "Green", "High", "Iron", "Lake", "Mist", "North"],
  middle: ["field", "brook", "haven", "moor", "ridge", "vale", "wood", "ford", "mark", "wall", "gate", "cross"],
  end: ["ton", "ville", "burgh", "stead", "port", "dale", "wick", "ham", "by", "den", "mere", "view"],
};

const streetSyl = {
  start: ["Anchor", "Bell", "Copper", "Dock", "Elm", "Forge", "Gull", "Harbor", "Ivy", "Kettle", "Lantern", "Mill"],
  middle: ["", " ", "s ", "y ", "ed ", "ing ", "en ", "ar ", "or ", "al ", "ic ", "ous "],
  end: ["Lane", "Way", "Row", "Walk", "Alley", "Path", "Cross", "Bridge", "Gate", "Wharf", "Yard", "Court"],
};

const innSyl = {
  start: ["Copper", "Drift", "Golden", "Green", "Happy", "Ivory", "Jolly", "Keen", "Lazy", "Merry", "Noble", "Quiet"],
  middle: ["", " ", "s ", "y ", "ing ", "ed ", "en ", "ar ", "or ", "al ", "ic ", "ous "],
  end: ["Rest", "Hearth", "Tankard", "Lantern", "Stall", "Loft", "Cellar", "Yard", "Sign", "Bench", "Kettle", "Roof"],
};

export const NAME_CATALOGS: NameCatalog[] = [
  catalog("human-male", "Human male", "common", humanMaleSyl),
  catalog("human-female", "Human female", "common", humanFemaleSyl),
  catalog("human-town", "Human town", "common", humanTownSyl, { nouns: TOWN_NOUNS }),
  catalog("dwarven-male", "Dwarven male", "common", dwarvenMaleSyl),
  catalog("dwarven-female", "Dwarven female", "common", dwarvenFemaleSyl),
  catalog("dwarven-town", "Dwarven town", "common", dwarvenTownSyl, { nouns: TOWN_NOUNS }),
  catalog("elven-male", "Elven male", "common", elvenMaleSyl),
  catalog("elven-female", "Elven female", "common", elvenFemaleSyl),
  catalog("elven-town", "Elven town", "common", elvenTownSyl, { nouns: TOWN_NOUNS }),
  catalog("halfling-male", "Halfling male", "common", halflingMaleSyl),
  catalog("halfling-female", "Halfling female", "common", halflingFemaleSyl),
  catalog("halfling-town", "Halfling town", "common", halflingTownSyl, { nouns: TOWN_NOUNS }),
  catalog("draconic-male", "Draconic male", "monstrous", draconicMaleSyl),
  catalog("draconic-female", "Draconic female", "monstrous", draconicFemaleSyl),
  catalog("drow-male", "Drow male", "monstrous", drowMaleSyl),
  catalog("drow-female", "Drow female", "monstrous", drowFemaleSyl),
  catalog("drow-town", "Drow town", "monstrous", drowTownSyl, { nouns: TOWN_NOUNS }),
  catalog("orc-male", "Orc male", "monstrous", orcMaleSyl),
  catalog("orc-female", "Orc female", "monstrous", orcFemaleSyl),
  catalog("orc-town", "Orc town", "monstrous", orcTownSyl, { nouns: TOWN_NOUNS }),
  catalog("celestial", "Celestial", "outsider", celestialSyl),
  catalog("fiendish", "Fiendish", "outsider", fiendishSyl),
  catalog("modron", "Modron", "outsider", modronSyl),
  catalog("air", "Air", "outsider", airSyl),
  catalog("earth", "Earth", "outsider", earthSyl),
  catalog("fire", "Fire", "outsider", fireSyl),
  catalog("water", "Water", "outsider", waterSyl),
  catalog("adventuring-party", "Adventuring party", "places", partySyl, { nouns: PARTY_NOUNS }),
  catalog("ship", "Ship", "places", shipSyl, { nouns: SHIP_NOUNS }),
  catalog("deity", "Deity", "places", deitySyl, { nouns: PLACE_NOUNS }),
  catalog("festival", "Festival", "places", festivalSyl, { nouns: PLACE_NOUNS }),
  catalog("weapon", "Weapon", "places", weaponSyl),
  catalog("kingdom", "Kingdom", "places", kingdomSyl, { nouns: PLACE_NOUNS }),
  catalog("castle", "Castle", "places", castleSyl, { nouns: PLACE_NOUNS }),
  catalog("dungeon", "Dungeon", "places", dungeonSyl, { nouns: PLACE_NOUNS }),
  catalog("wilderness-site", "Wilderness site", "places", wildernessSyl, { nouns: PLACE_NOUNS }),
  catalog("planar-site", "Planar site", "places", planarSyl, { nouns: PLACE_NOUNS }),
  catalog("town", "Town", "places", genericTownSyl, { nouns: TOWN_NOUNS }),
  catalog("street", "Street", "places", streetSyl),
  catalog("inn", "Inn", "places", innSyl, { nouns: INN_NOUNS }),
];

export const NAME_CATALOG_GROUPS: { id: NameCatalogGroup; label: string }[] = [
  { id: "common", label: "Common" },
  { id: "monstrous", label: "Monstrous" },
  { id: "outsider", label: "Outsider" },
  { id: "places", label: "Places and things" },
];

export function getNameCatalog(id: string): NameCatalog | undefined {
  return NAME_CATALOGS.find((entry) => entry.id === id);
}

export function catalogsForGroup(group: NameCatalogGroup): NameCatalog[] {
  return NAME_CATALOGS.filter((entry) => entry.group === group);
}

export function catalogSupportsLastName(catalog: NameCatalog): boolean {
  return !catalog.nouns || catalog.nouns.length === 0;
}

export const DEFAULT_CATALOG_ID = "human-male";
