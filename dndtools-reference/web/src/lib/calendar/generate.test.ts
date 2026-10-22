import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  buildCalendarExportFile,
  generateCalendar,
  moonPhaseIndex,
  notesListFromRecord,
  notesRecordFromList,
  parseCalendarExport,
  weekdayIndexForGlobalDay,
} from "./index";

describe("calendar generator", () => {
  it("sums 360 days across 12 months with each month at least 2", () => {
    const result = generateCalendar(
      {
        yearLength: 360,
        months: 12,
        weekLength: 7,
        moons: 0,
        events: 0,
      },
      createSeededRng(99),
    );
    const total = result.months.reduce((sum, month) => sum + month.length, 0);
    assert.equal(total, 360);
    assert.ok(result.months.every((month) => month.length >= 2));
  });

  it("wraps weekdays from the first name", () => {
    const result = generateCalendar(
      {
        yearLength: 360,
        months: 12,
        weekLength: 7,
        moons: 0,
        events: 0,
      },
      createSeededRng(5),
    );
    const first = result.weekdayNames[0];
    const dayOne = result.months[0]?.days[0];
    const dayEight = result.months[0]?.days[7];
    assert.ok(dayOne);
    assert.ok(dayEight);
    assert.equal(result.weekdayNames[dayOne.weekdayIndex], first);
    assert.equal(result.weekdayNames[dayEight.weekdayIndex], first);
    assert.equal(weekdayIndexForGlobalDay(1, 7), 0);
    assert.equal(weekdayIndexForGlobalDay(8, 7), 0);
  });

  it("computes moon phases from fixed periods", () => {
    const stubRng: SeededRng = {
      next: () => 0,
      pick: <T>(items: T[]) => items[0],
      pickInt: (min: number) => min,
      shuffle: <T>(items: T[]) => [...items],
      sample: <T>(items: T[]) => [...items],
    };
    const result = generateCalendar(
      {
        yearLength: 360,
        months: 12,
        weekLength: 7,
        moons: 2,
        events: 0,
      },
      stubRng,
    );
    assert.equal(result.moons.length, 2);
    assert.equal(result.moons[0]?.period, 18);
    assert.equal(result.moons[1]?.period, 18);
    assert.equal(moonPhaseIndex(1, 18), 0);
    assert.equal(moonPhaseIndex(10, 18), 2);
  });

  it("keeps holidays within the year length", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const result = generateCalendar(
        {
          yearLength: 360,
          months: 12,
          weekLength: 7,
          moons: 1,
          events: 12,
        },
        createSeededRng(seed),
      );
      for (const holiday of result.holidays) {
        assert.ok(holiday.dayOfYear >= 1);
        assert.ok(holiday.dayOfYear <= result.yearLength);
      }
    }
  });

  it("round-trips note JSON through parse helpers", () => {
    const file = buildCalendarExportFile(
      {
        yearLength: 360,
        months: 12,
        weekLength: 7,
        moons: 1,
        events: 3,
      },
      42,
      {
        "1-1-1": "Session start",
        "2-3-4": "Boss fight",
      },
    );
    const parsed = parseCalendarExport(file);
    assert.ok(parsed);
    const record = notesRecordFromList(parsed!.notes);
    assert.equal(record["1-1-1"], "Session start");
    assert.equal(record["2-3-4"], "Boss fight");
    const roundTrip = notesListFromRecord(record);
    assert.deepEqual(roundTrip, parsed!.notes);
  });
});
