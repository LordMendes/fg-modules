"use client";

import { Copy } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { DraftNumberInput } from "@/components/draft-number-input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildCalendarExportFile,
  CALENDAR_IMPORT_ERROR,
  CALENDAR_NOTES_STORAGE_KEY,
  DEFAULT_CALENDAR_INPUT,
  formatCalendarText,
  generateCalendar,
  globalDayForYear,
  holidayForDay,
  moonPhaseIndex,
  MOON_PHASE_NAMES,
  notesRecordFromList,
  parseCalendarExport,
  weekdayIndexForDisplayedYear,
  type CalendarInput,
  type CalendarLayout,
  type CalendarResult,
} from "@/lib/calendar";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

type SelectedDay = {
  year: number;
  month: number;
  day: number;
  dayOfYear: number;
};

const LAYOUT_OPTIONS: { value: CalendarLayout; label: string }[] = [
  { value: "block", label: "Block" },
  { value: "vertical", label: "Vertical" },
  { value: "text", label: "Text" },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseLayout(raw: string | null): CalendarLayout {
  if (raw === "vertical" || raw === "text") return raw;
  return "block";
}

function readNotesFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CALENDAR_NOTES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        record[key] = value;
      }
    }
    return record;
  } catch {
    return {};
  }
}

function writeNotesToStorage(notes: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CALENDAR_NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function CalendarGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const importRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [yearLength, setYearLength] = useState(DEFAULT_CALENDAR_INPUT.yearLength);
  const [months, setMonths] = useState(DEFAULT_CALENDAR_INPUT.months);
  const [weekLength, setWeekLength] = useState(DEFAULT_CALENDAR_INPUT.weekLength);
  const [moons, setMoons] = useState(DEFAULT_CALENDAR_INPUT.moons);
  const [events, setEvents] = useState(DEFAULT_CALENDAR_INPUT.events);
  const [layout, setLayout] = useState<CalendarLayout>(
    parseLayout(searchParams.get("layout")),
  );
  const [displayYear, setDisplayYear] = useState(1);
  const [result, setResult] = useState<CalendarResult | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SelectedDay | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const input = useMemo<CalendarInput>(
    () => ({
      yearLength: clampInt(yearLength, 40, 1000),
      months: clampInt(months, 2, 24),
      weekLength: clampInt(weekLength, 1, 14),
      moons: clampInt(moons, 0, 4),
      events: clampInt(events, 0, 24),
    }),
    [yearLength, months, weekLength, moons, events],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      params.set("layout", layout);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [layout, pathname, router],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateCalendar(input, rng));
        setSelected(null);
        setNoteDraft("");
        syncUrl(usedSeed);
      });
    },
    [input, seed, syncUrl],
  );

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed);
  }

  useEffect(() => {
    setNotes(readNotesFromStorage());
    runGenerate();
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    writeNotesToStorage(notes);
  }, [notes]);

  function handleClear() {
    setYearLength(DEFAULT_CALENDAR_INPUT.yearLength);
    setMonths(DEFAULT_CALENDAR_INPUT.months);
    setWeekLength(DEFAULT_CALENDAR_INPUT.weekLength);
    setMoons(DEFAULT_CALENDAR_INPUT.moons);
    setEvents(DEFAULT_CALENDAR_INPUT.events);
    setLayout("block");
    setSeed(1);
    setDisplayYear(1);
    setResult(null);
    setSelected(null);
    setNoteDraft("");
  }

  function openDay(day: SelectedDay) {
    setSelected(day);
    const key = `${day.year}-${day.month}-${day.day}`;
    setNoteDraft(notes[key] ?? "");
  }

  function saveNote() {
    if (!selected) return;
    const key = `${selected.year}-${selected.month}-${selected.day}`;
    const trimmed = noteDraft.trim();
    setNotes((prev) => {
      const next = { ...prev };
      if (!trimmed) {
        delete next[key];
      } else {
        next[key] = trimmed;
      }
      return next;
    });
    setSelected(null);
    setNoteDraft("");
  }

  function cancelNote() {
    setSelected(null);
    setNoteDraft("");
  }

  async function copyText() {
    if (!result) return;
    await navigator.clipboard.writeText(
      formatCalendarText(result, displayYear, notes),
    );
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  function exportCalendar() {
    const payload = buildCalendarExportFile(input, seed, notes);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "calendar.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    importRef.current?.click();
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = parseCalendarExport(JSON.parse(text) as unknown);
      if (!parsed) {
        setImportMessage(CALENDAR_IMPORT_ERROR);
        return;
      }
      setYearLength(parsed.input.yearLength);
      setMonths(parsed.input.months);
      setWeekLength(parsed.input.weekLength);
      setMoons(parsed.input.moons);
      setEvents(parsed.input.events);
      setSeed(parsed.seed);
      setNotes(notesRecordFromList(parsed.notes));
      startTransition(() => {
        const rng = createSeededRng(parsed.seed);
        setResult(generateCalendar(parsed.input, rng));
        syncUrl(parsed.seed);
      });
    } catch {
      setImportMessage(CALENDAR_IMPORT_ERROR);
    } finally {
      if (importRef.current) {
        importRef.current.value = "";
      }
    }
  }

  const textOutput = useMemo(() => {
    if (!result) return "";
    return formatCalendarText(result, displayYear, notes);
  }, [result, displayYear, notes]);

  function renderMoonSummary(dayOfYear: number) {
    if (!result || result.moons.length === 0) return null;
    const globalDay = globalDayForYear(displayYear, dayOfYear, result.yearLength);
    return result.moons.map((moon) => {
      const phase = MOON_PHASE_NAMES[moonPhaseIndex(globalDay, moon.period)];
      return (
        <span key={moon.index} className="calendar-gen-moon">
          M{moon.index}: {phase}
        </span>
      );
    });
  }

  function renderBlockView() {
    if (!result) return null;
    return (
      <div className="calendar-gen-block">
        <div
          className="calendar-gen-weekdays"
          style={{
            gridTemplateColumns: `repeat(${result.weekLength}, minmax(2.5rem, 1fr))`,
          }}
        >
          {result.weekdayNames.map((name) => (
            <div key={name} className="calendar-gen-weekday">
              {name}
            </div>
          ))}
        </div>
        {result.months.map((month) => (
          <section key={month.index} className="calendar-gen-month-block">
            <h3 className="calendar-gen-month-title">
              {month.name} ({month.length} days)
            </h3>
            <div
              className="calendar-gen-grid"
              style={{
                gridTemplateColumns: `repeat(${result.weekLength}, minmax(2.5rem, 1fr))`,
              }}
            >
              {month.days.flatMap((day, index) => {
                const pad =
                  index === 0
                    ? weekdayIndexForDisplayedYear(
                        displayYear,
                        day.dayOfYear,
                        result.yearLength,
                        result.weekLength,
                      )
                    : 0;
                const cells: React.ReactNode[] = [];
                if (pad > 0) {
                  for (let i = 0; i < pad; i += 1) {
                    cells.push(
                      <span
                        key={`pad-${month.index}-${i}`}
                        className="calendar-gen-day calendar-gen-day--pad"
                        aria-hidden="true"
                      />,
                    );
                  }
                }
                const holiday = holidayForDay(result.holidays, day.dayOfYear);
                const noteKey = `${displayYear}-${day.month}-${day.day}`;
                const note = notes[noteKey];
                const isSelected =
                  selected?.year === displayYear &&
                  selected.month === day.month &&
                  selected.day === day.day;
                cells.push(
                  <button
                    type="button"
                    key={`${month.index}-${day.day}`}
                    className={[
                      "calendar-gen-day",
                      holiday ? "calendar-gen-day--holiday" : "",
                      note ? "calendar-gen-day--noted" : "",
                      isSelected ? "calendar-gen-day--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      openDay({
                        year: displayYear,
                        month: day.month,
                        day: day.day,
                        dayOfYear: day.dayOfYear,
                      })
                    }
                  >
                    <span className="calendar-gen-day-num">{day.day}</span>
                    {holiday ? (
                      <span className="calendar-gen-day-tag">{holiday.name}</span>
                    ) : null}
                  </button>,
                );
                return cells;
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderVerticalView() {
    if (!result) return null;
    return (
      <div className="calendar-gen-vertical">
        {result.months.map((month) => (
          <section key={month.index} className="calendar-gen-month-vertical">
            <h3 className="calendar-gen-month-title">{month.name}</h3>
            <ul className="calendar-gen-day-list">
              {month.days.map((day) => {
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
                const isSelected =
                  selected?.year === displayYear &&
                  selected.month === day.month &&
                  selected.day === day.day;
                return (
                  <li key={`${month.index}-${day.day}`}>
                    <button
                      type="button"
                      className={[
                        "calendar-gen-day-line",
                        isSelected ? "calendar-gen-day-line--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        openDay({
                          year: displayYear,
                          month: day.month,
                          day: day.day,
                          dayOfYear: day.dayOfYear,
                        })
                      }
                    >
                      <span className="calendar-gen-day-line-main">
                        {day.day} {weekday}
                        {holiday ? `. ${holiday.name}` : "."}
                      </span>
                      {holiday ? (
                        <span className="calendar-gen-day-line-sub">
                          {holiday.observance}
                        </span>
                      ) : null}
                      {note ? (
                        <span className="calendar-gen-day-line-note">{note}</span>
                      ) : null}
                      {result.moons.length > 0 ? (
                        <span className="calendar-gen-day-line-moons">
                          {renderMoonSummary(day.dayOfYear)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="calendar-gen">
      <div className="calendar-gen-form">
        <div className="calendar-gen-seed-row">
          <div className="tool-field calendar-gen-seed-field">
            <Label htmlFor="calendar-seed">Seed</Label>
            <DraftNumberInput
              id="calendar-seed"
              className="tool-input"
              min={0}
              value={seed}
              onValueChange={setSeed}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() => runGenerate()}
          >
            Use this seed
          </button>
        </div>

        <div className="calendar-gen-grid-fields">
          <div className="tool-field">
            <Label htmlFor="calendar-year-length">Year length</Label>
            <DraftNumberInput
              id="calendar-year-length"
              className="tool-input"
              min={40}
              max={1000}
              value={yearLength}
              onValueChange={(next) => setYearLength(clampInt(next, 40, 1000))}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="calendar-months">Months</Label>
            <DraftNumberInput
              id="calendar-months"
              className="tool-input"
              min={2}
              max={24}
              value={months}
              onValueChange={(next) => setMonths(clampInt(next, 2, 24))}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="calendar-week-length">Week length</Label>
            <DraftNumberInput
              id="calendar-week-length"
              className="tool-input"
              min={1}
              max={14}
              value={weekLength}
              onValueChange={(next) => setWeekLength(clampInt(next, 1, 14))}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="calendar-moons">Moons</Label>
            <DraftNumberInput
              id="calendar-moons"
              className="tool-input"
              min={0}
              max={4}
              value={moons}
              onValueChange={(next) => setMoons(clampInt(next, 0, 4))}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="calendar-events">Holidays</Label>
            <DraftNumberInput
              id="calendar-events"
              className="tool-input"
              min={0}
              max={24}
              value={events}
              onValueChange={(next) => setEvents(clampInt(next, 0, 24))}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="calendar-layout">Layout</Label>
            <select
              id="calendar-layout"
              className="tool-input"
              value={layout}
              onChange={(event) =>
                setLayout(event.target.value as CalendarLayout)
              }
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="calendar-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            Generate
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={exportCalendar}
          >
            Export
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={triggerImport}
          >
            Import
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleClear}
          >
            Clear
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="calendar-gen-import-input"
            aria-label="Import calendar JSON"
            onChange={(event) =>
              void handleImportFile(event.target.files?.[0])
            }
          />
        </div>
        {importMessage ? (
          <p className="calendar-gen-import-error" role="alert">
            {importMessage}
          </p>
        ) : null}
      </div>

      {result ? (
        <div className="calendar-gen-results">
          <div className="calendar-gen-results-toolbar">
            <div className="calendar-gen-year-stepper">
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => setDisplayYear((year) => Math.max(1, year - 1))}
              >
                Previous year
              </button>
              <span className="calendar-gen-year-label">Year {displayYear}</span>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => setDisplayYear((year) => year + 1)}
              >
                Next year
              </button>
            </div>
            {layout === "text" ? (
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => void copyText()}
              >
                <Copy size={16} aria-hidden="true" />
                Copy
              </button>
            ) : null}
            {copyStatus ? (
              <span className="calendar-gen-copy-status">{copyStatus}</span>
            ) : null}
          </div>

          {result.monthsAdjustedMessage ? (
            <p className="calendar-gen-note">{result.monthsAdjustedMessage}</p>
          ) : null}

          {layout === "block" ? renderBlockView() : null}
          {layout === "vertical" ? renderVerticalView() : null}
          {layout === "text" ? (
            <pre className="calendar-gen-text">{textOutput}</pre>
          ) : null}

          {selected ? (
            <form
              className="calendar-gen-note-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveNote();
              }}
            >
              <p className="calendar-gen-note-form-label">
                Note for year {selected.year}, month {selected.month}, day{" "}
                {selected.day}
              </p>
              <div className="tool-field">
                <Label htmlFor="calendar-note-text">Note</Label>
                <textarea
                  id="calendar-note-text"
                  className="tool-input calendar-gen-note-textarea"
                  rows={3}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              </div>
              <div className="calendar-gen-note-actions">
                <button type="submit" className="tool-btn tool-btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="tool-btn tool-btn-secondary"
                  onClick={cancelNote}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
