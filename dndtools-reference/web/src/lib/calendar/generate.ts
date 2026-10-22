import { generateBuiltinNames } from "@/lib/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  HOLIDAY_NAME_FRAGMENTS,
  HOLIDAY_OBSERVANCE_FRAGMENTS,
} from "./fragments";
import { distributeMonthLengths, maxMonthsForYear } from "./month-lengths";
import type {
  CalendarDayInfo,
  CalendarHoliday,
  CalendarInput,
  CalendarMonth,
  CalendarMoon,
  CalendarResult,
} from "./types";
import { DEFAULT_CALENDAR_INPUT } from "./types";

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeCalendarInput(raw: CalendarInput): CalendarInput {
  return {
    yearLength: clampInt(raw.yearLength, 40, 1000),
    months: clampInt(raw.months, 2, 24),
    weekLength: clampInt(raw.weekLength, 1, 14),
    moons: clampInt(raw.moons, 0, 4),
    events: clampInt(raw.events, 0, 24),
  };
}

export function moonPhaseIndex(globalDay: number, period: number): number {
  if (period <= 0) return 0;
  const dayIndex = globalDay - 1;
  const pos = ((dayIndex % period) + period) % period;
  return Math.floor((pos / period) * 4);
}

export function weekdayIndexForGlobalDay(
  globalDay: number,
  weekLength: number,
): number {
  if (weekLength <= 0) return 0;
  return ((globalDay - 1) % weekLength + weekLength) % weekLength;
}

function generateLabelNames(count: number, rng: SeededRng): string[] {
  const raw = generateBuiltinNames(
    { catalogId: "kingdom", count, seed: 1 },
    rng,
  );
  const names: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const trimmed = entry.trim();
    if (trimmed.length >= 3 && !seen.has(trimmed)) {
      seen.add(trimmed);
      names.push(trimmed);
    }
  }

  let guard = 0;
  while (names.length < count && guard < count * 30) {
    guard += 1;
    const extra = generateBuiltinNames(
      { catalogId: "festival", count: 1, seed: 1 },
      rng,
    )[0];
    if (!extra) continue;
    const trimmed = extra.trim();
    if (trimmed.length >= 3 && !seen.has(trimmed)) {
      seen.add(trimmed);
      names.push(trimmed);
    }
  }

  while (names.length < count) {
    names.push(`Span ${names.length + 1}`);
  }

  return names.slice(0, count);
}

function buildHoliday(dayOfYear: number, rng: SeededRng): CalendarHoliday {
  const namePool = [...HOLIDAY_NAME_FRAGMENTS];
  const observancePool = [...HOLIDAY_OBSERVANCE_FRAGMENTS];
  const left = rng.pick(namePool) ?? "Lantern";
  const right = rng.pick(namePool) ?? "Day";
  const observance = rng.pick(observancePool) ?? "markets close at noon";
  const name = left === right ? `${left} Eve` : `${left} ${right}`;
  return { dayOfYear, name, observance };
}

function pickHolidayDays(
  yearLength: number,
  events: number,
  rng: SeededRng,
): number[] {
  if (events <= 0 || yearLength <= 0) return [];
  const pool = Array.from({ length: yearLength }, (_, index) => index + 1);
  return rng.shuffle(pool).slice(0, Math.min(events, yearLength));
}

export function generateCalendar(
  rawInput: CalendarInput,
  rng: SeededRng,
): CalendarResult {
  const input = normalizeCalendarInput(rawInput);
  const monthsRequested = input.months;
  const maxMonths = maxMonthsForYear(input.yearLength);
  const monthsUsed = Math.min(input.months, maxMonths);
  let monthsAdjustedMessage: string | null = null;
  if (monthsUsed < monthsRequested) {
    monthsAdjustedMessage = `Month count was lowered to ${monthsUsed} so every month has at least 2 days.`;
  }

  const monthLengths = distributeMonthLengths(
    input.yearLength,
    monthsUsed,
    rng,
  );
  const monthNames = generateLabelNames(monthsUsed, rng);
  const weekdayNames = generateLabelNames(input.weekLength, rng);

  const moons: CalendarMoon[] = [];
  for (let index = 0; index < input.moons; index += 1) {
    moons.push({ index: index + 1, period: rng.pickInt(18, 36) });
  }

  const holidayDays = pickHolidayDays(input.yearLength, input.events, rng);
  const holidays = holidayDays
    .sort((a, b) => a - b)
    .map((dayOfYear) => buildHoliday(dayOfYear, rng));

  const months: CalendarMonth[] = [];
  let dayOfYear = 0;
  for (let monthIndex = 0; monthIndex < monthsUsed; monthIndex += 1) {
    const length = monthLengths[monthIndex] ?? 2;
    const days: CalendarDayInfo[] = [];
    for (let day = 1; day <= length; day += 1) {
      dayOfYear += 1;
      days.push({
        month: monthIndex + 1,
        day,
        dayOfYear,
        weekdayIndex: weekdayIndexForGlobalDay(dayOfYear, input.weekLength),
      });
    }
    months.push({
      index: monthIndex + 1,
      name: monthNames[monthIndex] ?? `Month ${monthIndex + 1}`,
      length,
      days,
    });
  }

  return {
    input: {
      ...input,
      months: monthsUsed,
    },
    monthsRequested,
    monthsUsed,
    monthsAdjustedMessage,
    yearLength: input.yearLength,
    weekLength: input.weekLength,
    weekdayNames,
    monthNames,
    months,
    moons,
    holidays,
  };
}

export function globalDayForYear(
  displayYear: number,
  dayOfYear: number,
  yearLength: number,
): number {
  const year = Math.max(1, Math.round(displayYear));
  return (year - 1) * yearLength + dayOfYear;
}

export function weekdayIndexForDisplayedYear(
  displayYear: number,
  dayOfYear: number,
  yearLength: number,
  weekLength: number,
): number {
  return weekdayIndexForGlobalDay(
    globalDayForYear(displayYear, dayOfYear, yearLength),
    weekLength,
  );
}

export function holidayForDay(
  holidays: CalendarHoliday[],
  dayOfYear: number,
): CalendarHoliday | undefined {
  return holidays.find((holiday) => holiday.dayOfYear === dayOfYear);
}

export function formatCalendarText(
  result: CalendarResult,
  displayYear: number,
  notes: Record<string, string>,
): string {
  const lines: string[] = [`Year ${displayYear}`, ""];
  for (const month of result.months) {
    lines.push(month.name);
    for (const day of month.days) {
      const weekdayIndex = weekdayIndexForDisplayedYear(
        displayYear,
        day.dayOfYear,
        result.yearLength,
        result.weekLength,
      );
      const weekday = result.weekdayNames[weekdayIndex] ?? "Day";
      const holiday = holidayForDay(result.holidays, day.dayOfYear);
      const noteKey = `${displayYear}-${day.month}-${day.day}`;
      const note = notes[noteKey];
      let line = `${day.day} ${weekday}.`;
      if (holiday) {
        line += ` ${holiday.name}`;
      }
      if (note) {
        line += ` (${note})`;
      }
      lines.push(line);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function defaultCalendarInput(): CalendarInput {
  return { ...DEFAULT_CALENDAR_INPUT };
}
