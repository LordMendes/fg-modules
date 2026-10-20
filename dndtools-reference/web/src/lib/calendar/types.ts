export type CalendarInput = {
  yearLength: number;
  months: number;
  weekLength: number;
  moons: number;
  events: number;
};

export type CalendarLayout = "block" | "vertical" | "text";

export type CalendarMoon = {
  index: number;
  period: number;
};

export type CalendarHoliday = {
  dayOfYear: number;
  name: string;
  observance: string;
};

export type CalendarDayInfo = {
  month: number;
  day: number;
  dayOfYear: number;
  weekdayIndex: number;
};

export type CalendarMonth = {
  index: number;
  name: string;
  length: number;
  days: CalendarDayInfo[];
};

export type CalendarResult = {
  input: CalendarInput;
  monthsRequested: number;
  monthsUsed: number;
  monthsAdjustedMessage: string | null;
  yearLength: number;
  weekLength: number;
  weekdayNames: string[];
  monthNames: string[];
  months: CalendarMonth[];
  moons: CalendarMoon[];
  holidays: CalendarHoliday[];
};

export type CalendarNote = {
  year: number;
  month: number;
  day: number;
  text: string;
};

export type CalendarExportFile = {
  input: CalendarInput;
  seed: number;
  notes: CalendarNote[];
};

export const MOON_PHASE_NAMES = ["New", "Waxing", "Full", "Waning"] as const;

export const DEFAULT_CALENDAR_INPUT: CalendarInput = {
  yearLength: 360,
  months: 12,
  weekLength: 7,
  moons: 1,
  events: 6,
};

export const CALENDAR_NOTES_STORAGE_KEY = "calendar-generator-notes";
