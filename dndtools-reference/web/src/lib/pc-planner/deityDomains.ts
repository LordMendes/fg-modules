/**
 * Cleric domains granted by a deity.
 *
 * The compendium does not store domains on deity records. Core deities use the
 * Player's Handbook cleric table (Ehlonna's Sun domain is restored: the scraped
 * table splits "Sun" into the worshipers cell). Forgotten Realms deities use
 * the Faerunian, Mulhorandi, drow, and racial pantheon lists from the Player's
 * Guide to Faerun / Forgotten Realms Campaign Setting. Catalog names such as
 * "Cavern (FRCS)" still match the short domain name.
 */

const DEITY_DOMAINS: Record<string, readonly string[]> = {
  heironeous: ["Good", "Law", "War"],
  ehlonna: ["Animal", "Good", "Plant", "Sun"],
  pelor: ["Good", "Healing", "Strength", "Sun"],
  kord: ["Chaos", "Good", "Luck", "Strength"],
  "wee-jas": ["Death", "Law", "Magic"],
  "st-cuthbert": ["Destruction", "Law", "Protection", "Strength"],
  boccob: ["Knowledge", "Magic", "Trickery"],
  fharlanghn: ["Luck", "Protection", "Travel"],
  "obad-hai": ["Air", "Animal", "Earth", "Fire", "Plant", "Water"],
  olidammara: ["Chaos", "Luck", "Trickery"],
  hextor: ["Destruction", "Evil", "Law", "War"],
  nerull: ["Death", "Evil", "Trickery"],
  vecna: ["Evil", "Knowledge", "Magic"],
  erythnul: ["Chaos", "Evil", "Trickery", "War"],

  abbathor: ["Dwarf", "Evil", "Luck", "Trade", "Trickery"],
  "aerdrie-faenya": ["Air", "Animal", "Chaos", "Elf", "Good", "Storm"],
  akadi: ["Air", "Illusion", "Travel", "Trickery"],
  angharradh: ["Chaos", "Elf", "Good", "Knowledge", "Plant", "Protection", "Renewal"],
  anhur: ["Chaos", "Good", "Storm", "Strength", "War"],
  arvoreen: ["Good", "Halfling", "Law", "Protection", "War"],
  auril: ["Air", "Cold", "Evil", "Storm"],
  azuth: ["Illusion", "Knowledge", "Law", "Magic", "Spell"],
  "baervan-wildwanderer": ["Animal", "Gnome", "Good", "Plant", "Travel"],
  bahgtru: ["Chaos", "Evil", "Orc", "Strength"],
  bane: ["Destruction", "Evil", "Hatred", "Law", "Tyranny"],
  "baravar-cloakshadow": ["Gnome", "Good", "Illusion", "Protection", "Trickery"],
  "berronar-truesilver": ["Dwarf", "Family", "Good", "Healing", "Law", "Protection"],
  beshaba: ["Chaos", "Evil", "Fate", "Luck", "Trickery"],
  brandobaris: ["Halfling", "Luck", "Travel", "Trickery"],
  "callarduran-smoothhands": ["Cavern", "Craft", "Earth", "Gnome"],
  chauntea: ["Animal", "Earth", "Good", "Plant", "Protection", "Renewal"],
  "clangeddin-silverbeard": ["Dwarf", "Good", "Law", "Strength", "War"],
  "corellon-larethian": ["Chaos", "Elf", "Good", "Magic", "Protection", "War"],
  cyric: ["Chaos", "Destruction", "Evil", "Illusion", "Trickery"],
  cyrrollalee: ["Family", "Good", "Halfling", "Law"],
  "deep-sashelas": ["Chaos", "Elf", "Good", "Knowledge", "Ocean", "Water"],
  deneir: ["Good", "Knowledge", "Protection", "Rune"],
  "dugmaren-brightmantle": ["Chaos", "Craft", "Dwarf", "Good", "Knowledge", "Rune"],
  dumathoin: ["Cavern", "Craft", "Dwarf", "Earth", "Knowledge", "Metal", "Protection"],
  eilistraee: ["Chaos", "Charm", "Drow", "Elf", "Good", "Moon", "Portal"],
  eldath: ["Family", "Good", "Plant", "Protection", "Water"],
  "erevan-ilesere": ["Chaos", "Elf", "Luck", "Trickery"],
  "fenmarel-mestarine": ["Animal", "Chaos", "Elf", "Plant", "Travel"],
  "finder-wyvernspur": ["Chaos", "Charm", "Renewal", "Scalykind"],
  "flandal-steelskin": ["Craft", "Gnome", "Good", "Metal"],
  "gaerdal-ironhand": ["Gnome", "Good", "Law", "Protection", "War"],
  garagos: ["Chaos", "Destruction", "Strength", "War"],
  gargauth: ["Charm", "Evil", "Law", "Trickery"],
  "garl-glittergold": ["Craft", "Gnome", "Good", "Law", "Protection", "Trickery"],
  geb: ["Cavern", "Craft", "Earth", "Protection"],
  ghaunadaur: ["Cavern", "Chaos", "Drow", "Evil", "Hatred", "Slime"],
  gond: ["Craft", "Earth", "Fire", "Knowledge", "Metal", "Planning"],
  "gorm-gulthyn": ["Dwarf", "Good", "Law", "Protection", "War"],
  grumbar: ["Cavern", "Earth", "Metal", "Time"],
  gruumsh: ["Cavern", "Chaos", "Evil", "Hatred", "Orc", "Strength", "War"],
  "gwaeron-windstrom": ["Animal", "Good", "Knowledge", "Plant", "Travel"],
  "haela-brightaxe": ["Chaos", "Dwarf", "Good", "Luck", "War"],
  "hanali-celanil": ["Chaos", "Charm", "Elf", "Good", "Magic", "Protection"],
  helm: ["Law", "Planning", "Protection", "Strength"],
  hoar: ["Fate", "Law", "Retribution", "Travel"],
  "horus-re": ["Good", "Law", "Nobility", "Retribution", "Sun"],
  ilmater: ["Good", "Healing", "Law", "Strength", "Suffering"],
  ilneval: ["Destruction", "Evil", "Orc", "Planning", "War"],
  istishia: ["Destruction", "Ocean", "Storm", "Travel", "Water"],
  jergal: ["Fate", "Law", "Repose", "Rune", "Suffering"],
  kelemvor: ["Fate", "Law", "Protection", "Repose", "Travel"],
  kiaransalee: ["Chaos", "Drow", "Evil", "Retribution", "Undeath"],
  kossuth: ["Destruction", "Fire", "Renewal", "Suffering"],
  "labelas-enoreth": ["Chaos", "Elf", "Good", "Knowledge", "Time"],
  laduguer: ["Craft", "Dwarf", "Evil", "Law", "Magic", "Metal", "Protection"],
  lathander: ["Good", "Nobility", "Protection", "Renewal", "Strength", "Sun"],
  lliira: ["Chaos", "Charm", "Family", "Good", "Travel"],
  lolth: ["Chaos", "Darkness", "Destruction", "Drow", "Evil", "Spider", "Trickery"],
  loviatar: ["Evil", "Law", "Retribution", "Strength", "Suffering"],
  lurue: ["Animal", "Chaos", "Good", "Healing"],
  luthic: ["Cavern", "Earth", "Evil", "Family", "Healing", "Orc"],
  malar: ["Animal", "Chaos", "Evil", "Moon", "Strength"],
  "marthammor-duin": ["Dwarf", "Good", "Protection", "Travel"],
  mask: ["Darkness", "Evil", "Luck", "Trickery"],
  mielikki: ["Animal", "Good", "Plant", "Travel"],
  milil: ["Charm", "Good", "Knowledge", "Nobility"],
  moradin: ["Craft", "Dwarf", "Earth", "Good", "Law", "Protection"],
  mystra: ["Good", "Illusion", "Knowledge", "Magic", "Rune", "Spell"],
  nobanion: ["Animal", "Good", "Law", "Nobility"],
  oghma: ["Charm", "Knowledge", "Luck", "Travel", "Trickery"],
  "red-knight": ["Law", "Nobility", "Planning", "War"],
  "rillifane-rallathil": ["Chaos", "Elf", "Good", "Plant", "Protection"],
  savras: ["Fate", "Knowledge", "Law", "Magic", "Spell"],
  sebek: ["Animal", "Evil", "Scalykind", "Water"],
  "segojan-earthcaller": ["Cavern", "Earth", "Gnome", "Good"],
  "sehanine-moonbow": ["Chaos", "Elf", "Good", "Illusion", "Knowledge", "Moon", "Travel"],
  selvetarm: ["Chaos", "Drow", "Evil", "Spider", "War"],
  "sel-ne": ["Chaos", "Good", "Moon", "Protection", "Travel"],
  shar: ["Cavern", "Darkness", "Evil", "Knowledge"],
  sharess: ["Chaos", "Charm", "Good", "Travel", "Trickery"],
  shargaas: ["Chaos", "Darkness", "Evil", "Orc", "Trickery"],
  sharindlar: ["Chaos", "Charm", "Dwarf", "Good", "Healing", "Moon"],
  shaundakul: ["Air", "Chaos", "Portal", "Protection", "Trade", "Travel"],
  "sheela-peryroyl": ["Air", "Charm", "Halfling", "Plant"],
  shevarash: ["Chaos", "Elf", "Retribution", "War"],
  shiallia: ["Animal", "Good", "Plant", "Renewal"],
  siamorphe: ["Knowledge", "Law", "Nobility", "Planning"],
  silvanus: ["Animal", "Plant", "Protection", "Renewal", "Water"],
  "solonor-thelandira": ["Chaos", "Elf", "Good", "Plant", "War"],
  sune: ["Chaos", "Charm", "Good", "Protection"],
  talona: ["Chaos", "Destruction", "Evil", "Suffering"],
  talos: ["Chaos", "Destruction", "Evil", "Fire", "Storm"],
  tempus: ["Chaos", "Protection", "Strength", "War"],
  "thard-harr": ["Animal", "Chaos", "Dwarf", "Good", "Plant"],
  tiamat: ["Evil", "Law", "Scalykind", "Tyranny"],
  torm: ["Good", "Healing", "Law", "Protection", "Strength"],
  tymora: ["Chaos", "Good", "Luck", "Protection", "Travel"],
  tyr: ["Good", "Knowledge", "Law", "Retribution", "War"],
  ubtao: ["Planning", "Plant", "Protection", "Scalykind"],
  ulutiu: ["Animal", "Cold", "Law", "Ocean", "Protection"],
  umberlee: ["Chaos", "Destruction", "Evil", "Ocean", "Storm", "Weather"],
  urdlen: ["Chaos", "Earth", "Evil", "Gnome", "Hatred"],
  urogalan: ["Earth", "Halfling", "Law", "Protection", "Repose"],
  uthgar: ["Animal", "Chaos", "Retribution", "Strength", "War"],
  valkur: ["Air", "Chaos", "Good", "Ocean", "Protection"],
  velsharoon: ["Death", "Evil", "Magic", "Undeath"],
  vergadain: ["Dwarf", "Luck", "Trade", "Trickery"],
  vhaeraun: ["Chaos", "Drow", "Evil", "Travel", "Trickery"],
  waukeen: ["Knowledge", "Protection", "Trade", "Travel"],
  yondalla: ["Family", "Good", "Halfling", "Law", "Protection"],
  yurtrus: ["Death", "Destruction", "Evil", "Orc", "Suffering"],
};

export function normalizeDeityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Domains for the selected deity.
 * `null` when no deity is selected (any domain may be chosen).
 * An empty array when the deity is set but has no recorded domains.
 */
export function deityDomainNames(
  slug: string | null | undefined,
  name?: string | null,
): readonly string[] | null {
  const slugKey = slug?.trim() ? normalizeDeityKey(slug) : "";
  const nameKey = name?.trim() ? normalizeDeityKey(name) : "";
  if (!slugKey && !nameKey) return null;
  return DEITY_DOMAINS[slugKey] ?? (nameKey ? DEITY_DOMAINS[nameKey] : undefined) ?? [];
}

export function domainNameAllowed(
  domainName: string,
  allowed: readonly string[] | null,
): boolean {
  if (allowed == null) return true;
  const key = domainName.trim().toLowerCase();
  return allowed.some((name) => {
    const allowedKey = name.trim().toLowerCase();
    return key === allowedKey || key.startsWith(`${allowedKey} (`);
  });
}
