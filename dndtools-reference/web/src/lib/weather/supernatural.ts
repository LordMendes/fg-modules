import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export type SupernaturalGroup =
  | "sky"
  | "wind"
  | "fog"
  | "rain"
  | "hail"
  | "snow"
  | "storm";

type SupernaturalEntry = {
  name: string;
  group: SupernaturalGroup;
};

const SUPERNATURAL_ENTRIES: SupernaturalEntry[] = [
  { name: "A calm silver sky with no visible sun", group: "sky" },
  { name: "Twin moons visible at noon", group: "sky" },
  { name: "Stars that drift slowly eastward", group: "sky" },
  { name: "A violet horizon that never fades", group: "sky" },
  { name: "A wind that repeats the last word spoken", group: "wind" },
  { name: "Warm gusts smelling of cut hay", group: "wind" },
  { name: "A steady breeze from every direction at once", group: "wind" },
  { name: "Whispers riding a cold northerly", group: "wind" },
  { name: "Fog that muffles footsteps and bells", group: "fog" },
  { name: "Pearl fog clinging only to stone", group: "fog" },
  { name: "Ground-hugging mist with a faint green glow", group: "fog" },
  { name: "Rain that falls upward for a few heartbeats", group: "rain" },
  { name: "Warm rain tasting of iron and honey", group: "rain" },
  { name: "Sheet rain in one color, clear in another", group: "rain" },
  { name: "Raindrops that vanish before they land", group: "rain" },
  { name: "Hailstones shaped like tiny coins", group: "hail" },
  { name: "Soft hail that melts on cloth but not skin", group: "hail" },
  { name: "Blue hail ringing like glass when it hits", group: "hail" },
  { name: "Snow that glows faintly until touched", group: "snow" },
  { name: "Black snow that leaves no meltwater", group: "snow" },
  { name: "Snowflakes all the same perfect size", group: "snow" },
  { name: "A storm cloud shaped like a closed fist", group: "storm" },
  { name: "Lightning that strikes the same hill thrice", group: "storm" },
  { name: "Thunder rolling backward through the valley", group: "storm" },
];

export function pickSupernatural(
  rng: SeededRng,
): { name: string; group: SupernaturalGroup } {
  const entry = rng.pick(SUPERNATURAL_ENTRIES);
  return entry ?? SUPERNATURAL_ENTRIES[0]!;
}

export function precipitationForSupernaturalGroup(
  group: SupernaturalGroup,
): string | null {
  switch (group) {
    case "rain":
      return "Rain";
    case "hail":
      return "Hail";
    case "snow":
      return "Snow";
    case "storm":
      return "Storm";
    default:
      return null;
  }
}
