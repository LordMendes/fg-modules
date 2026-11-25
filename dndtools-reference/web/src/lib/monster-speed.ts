/** Parse and format monster speed lines so every movement mode is shown. */

const MANEUVERS = ["perfect", "good", "average", "poor", "clumsy"] as const;
const MODES = ["land", "fly", "swim", "climb", "burrow"] as const;

type MovementMode = (typeof MODES)[number];

export type SpeedMode = {
  mode: MovementMode;
  feet: number;
  maneuver: string | null;
  note: string | null;
};

const MODE = "base(?:\\s+land)?(?:\\s+speed)?|land|fly|swim|climb|burrow";
const MANEUVER = MANEUVERS.join("|");

const TOKEN_RE = new RegExp(
  `(?<![A-Za-z0-9])(?:(${MODE})\\s+)?(?:\\(\\s*(${MANEUVER})\\s*\\)\\s*)?(\\d+)\\s*(?:ft\\.?|feet)\\b(?:\\s*\\.?\\s*\\(\\s*\\d+\\s+squares?\\s*\\))?(?:\\s*\\.?\\s*\\(?\\s*(${MANEUVER})\\s*\\)?)?`,
  "gi",
);

const NOTE_JUNK_RE = /^(?:ft\.?|feet|squares?|\d+\s+squares?)$/i;

function cleanNote(note: string): string {
  const text = note
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s,;:.()[\]]+|[\s,;:.()[\]]+$/g, "");
  if (!text || NOTE_JUNK_RE.test(text)) return "";
  return text;
}

function modeName(raw: string | undefined): { mode: MovementMode; isBase: boolean } {
  if (!raw) return { mode: "land", isBase: false };
  const lowered = raw.toLowerCase();
  if (lowered.startsWith("base")) return { mode: "land", isBase: true };
  if ((MODES as readonly string[]).includes(lowered)) {
    return { mode: lowered as MovementMode, isBase: false };
  }
  return { mode: "land", isBase: false };
}

export function parseMonsterSpeed(raw: string | null | undefined): SpeedMode[] {
  if (!raw) return [];
  const text = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const matches = [...text.matchAll(TOKEN_RE)];
  const parsed: SpeedMode[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const { mode, isBase } = modeName(match[1]);
    const maneuverRaw = match[2] || match[4];
    const end = (match.index ?? 0) + match[0].length;
    const nextStart =
      index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    let note = cleanNote(text.slice(end, nextStart));
    if (isBase) note = note ? `base; ${note}` : "base";
    parsed.push({
      mode,
      feet: Number(match[3]),
      maneuver: maneuverRaw ? maneuverRaw.toLowerCase() : null,
      note: note || null,
    });
  }

  return dedupe(parsed);
}

function dedupe(modes: SpeedMode[]): SpeedMode[] {
  const merged: SpeedMode[] = [];
  const indexByKey = new Map<string, number>();
  for (const mode of modes) {
    const key = `${mode.mode}|${mode.feet}|${mode.maneuver ?? ""}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex == null) {
      indexByKey.set(key, merged.length);
      merged.push({ ...mode });
      continue;
    }
    const existing = merged[existingIndex];
    if (mode.note && (!existing.note || mode.note.length > existing.note.length)) {
      existing.note = mode.note;
    }
  }

  const land = merged.filter((mode) => mode.mode === "land");
  if (land.length === 1 && land[0].note === "base") land[0].note = null;
  return merged;
}

function formatSpeedMode(mode: SpeedMode): string {
  const label = mode.mode.charAt(0).toUpperCase() + mode.mode.slice(1);
  const extras = [mode.maneuver, mode.note].filter((part): part is string => Boolean(part));
  const text = `${label} ${mode.feet} ft.`;
  return extras.length > 0 ? `${text} (${extras.join("; ")})` : text;
}

/** Format every movement mode. Unparsed text is returned unchanged. */
export function formatMonsterSpeed(raw: string | null | undefined): string {
  if (!raw) return "";
  const modes = parseMonsterSpeed(raw);
  if (modes.length === 0) return raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  return modes.map(formatSpeedMode).join(", ");
}
