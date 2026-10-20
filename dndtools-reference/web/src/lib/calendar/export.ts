import { normalizeCalendarInput } from "./generate";
import type { CalendarExportFile, CalendarNote } from "./types";

export const CALENDAR_IMPORT_ERROR = "This file is not a calendar.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNote(raw: unknown): CalendarNote | null {
  if (!isRecord(raw)) return null;
  if (
    !isFiniteNumber(raw.year) ||
    !isFiniteNumber(raw.month) ||
    !isFiniteNumber(raw.day) ||
    typeof raw.text !== "string"
  ) {
    return null;
  }
  return {
    year: Math.round(raw.year),
    month: Math.round(raw.month),
    day: Math.round(raw.day),
    text: raw.text,
  };
}

export function parseCalendarExport(raw: unknown): CalendarExportFile | null {
  if (!isRecord(raw)) return null;
  if (!isRecord(raw.input) || !isFiniteNumber(raw.seed)) return null;

  const input = normalizeCalendarInput({
    yearLength: Number(raw.input.yearLength),
    months: Number(raw.input.months),
    weekLength: Number(raw.input.weekLength),
    moons: Number(raw.input.moons),
    events: Number(raw.input.events),
  });

  if (!Array.isArray(raw.notes)) return null;
  const notes: CalendarNote[] = [];
  for (const entry of raw.notes) {
    const note = parseNote(entry);
    if (!note) return null;
    notes.push(note);
  }

  return {
    input,
    seed: Math.round(raw.seed),
    notes,
  };
}

export function notesRecordFromList(notes: CalendarNote[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const note of notes) {
    const text = note.text.trim();
    if (!text) continue;
    record[`${note.year}-${note.month}-${note.day}`] = text;
  }
  return record;
}

export function notesListFromRecord(
  record: Record<string, string>,
): CalendarNote[] {
  const notes: CalendarNote[] = [];
  for (const [key, text] of Object.entries(record)) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const parts = key.split("-").map((part) => Number.parseInt(part, 10));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      continue;
    }
    notes.push({
      year: parts[0]!,
      month: parts[1]!,
      day: parts[2]!,
      text: trimmed,
    });
  }
  notes.sort(
    (a, b) =>
      a.year - b.year || a.month - b.month || a.day - b.day,
  );
  return notes;
}

export function buildCalendarExportFile(
  input: CalendarExportFile["input"],
  seed: number,
  notes: Record<string, string>,
): CalendarExportFile {
  return {
    input: normalizeCalendarInput(input),
    seed: Math.round(seed),
    notes: notesListFromRecord(notes),
  };
}
