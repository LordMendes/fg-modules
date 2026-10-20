# Calendar Generator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `calendar-generator`
- label: Calendar Generator
- href: `/tools/calendar-generator`
- description: Build a fantasy year with months, a week, moons, and holidays, then page through it.
- source: `Site tables`

## Goal

The user sets the shape of a year or rolls one. The page draws that year as a block calendar, a vertical list, or plain text. They can move the displayed year, and attach a note to a day. Notes live in `localStorage` under the key `calendar-generator-notes` and in an exportable JSON blob. No account and no database table.

## Input

```ts
type CalendarInput = {
  yearLength: number; // 40-1000, default 360
  months: number; // 2-24, default 12
  weekLength: number; // 1-14, default 7
  moons: number; // 0-4, default 1
  events: number; // 0-24 holidays, default 6
};
```

Month names: generate `months` names from the name generator's place syllables if `src/lib/names` exists. If it does not, ship 24 original month names in this file's lib and use the first N. Do not block on the name tool.

Month lengths: distribute `yearLength` across months. Start from `floor(yearLength / months)` and give the remainder, one day at a time, to the earliest months. Then, if `yearLength` is at least `months * 4`, move up to 2 days off one month onto the next so the lengths are not a flat block, using the seed. No month may be under 2 days. If the math cannot satisfy that, lower the month count in the result and say so.

Weekday names: generate `weekLength` names the same way, original, at least 3 letters. The first day of year 1 is weekday 0.

Moons: for each moon, period is `rng.pickInt(18, 36)` days, phase names New, Waxing, Full, Waning. Phase on a date is `floor((dayOfYear % period) / period * 4)`.

Holidays: pick `events` distinct day-of-year values. Each holiday has an original name and a one-line observance ("markets close", "lanterns on the river"). Write 30 observance fragments and 30 holiday name fragments and combine them. A day can hold one holiday.

## Views

- Block: a row of weekday names, then month grids. Days flow left to right, wrapping to `weekLength`.
- Vertical: each month is a list of days. Holidays and notes sit on the same line.
- Text: a `<pre>` the user can copy. One month heading, then `1 Firstday. Holiday name` lines.

Year stepper: previous and next. The displayed year shifts every date by `yearLength` days for moon phase only. Weekdays continue from year 1, they do not reset. Holidays stay on the same day-of-year every year.

Notes: click a day, a small form opens under the calendar (not a modal library). Fields: text, Save, Cancel. Key is `year-month-day`. Empty text deletes the note.

## Import and export

Export button downloads `calendar.json`:

```json
{
  "input": {},
  "seed": 1,
  "notes": [{ "year": 1, "month": 1, "day": 1, "text": "..." }]
}
```

Import reads that shape and replaces state. Reject files that fail the types. Show the message "This file is not a calendar."

## UI

- Number fields for year length, months, week length, moons, holidays.
- Layout select: Block, Vertical, Text.
- Seed, Generate, Export, Import.
- Class prefix: `.calendar-gen`.
- Block cells use the existing border and background variables. Today is not highlighted (there is no real date). The selected day uses the accent outline.

## Tests

- 360 days and 12 months sums to 360, each month at least 2.
- Weekday of day 1 is the first name. Weekday of day `weekLength + 1` is the first name again.
- Two moons with fixed periods land on the phase the formula states. Pass a stub rng.
- A holiday does not fall on a day past `yearLength`.
- Note JSON round-trips through the parse function.

## Acceptance

- All three layouts render a generated year.
- A note survives reload (localStorage).
- Tests and typecheck pass.

## Suggested commit

`feat(calendar): add fantasy calendar generator`
