# Name Generator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `name-generator`
- label: Name Generator
- href: `/tools/name-generator`
- description: Generate fantasy names from built-in lists, or from a list you paste in.
- source: `Site tables`

## Goal

Two modes on one page. Built-in mode picks from syllable tables written for this site. Custom mode trains a Markov chain on names the user pastes and generates new ones. No real-world ethnic name lists and no names copied from another generator.

## Built-in catalogs

Store tables in `src/lib/names/tables.ts`. Each catalog is `{ id, label, group, syllables: { start: string[], middle: string[], end: string[] } }`.

Groups and catalogs:

- Common: Human male, Human female, Human town, Dwarven male, Dwarven female, Dwarven town, Elven male, Elven female, Elven town, Halfling male, Halfling female, Halfling town.
- Monstrous: Draconic male, Draconic female, Drow male, Drow female, Drow town, Orc male, Orc female, Orc town.
- Outsider: Celestial, Fiendish, Modron, Air, Earth, Fire, Water.
- Places and things: Adventuring party, Ship, Deity, Festival, Weapon, Kingdom, Castle, Dungeon, Wilderness site, Planar site, Town, Street, Inn.

Each syllable list needs at least 12 entries. Keep them short (1-3 letters for personal names, longer chunks allowed for inns and ships). Personal names are `start + optional middle + end`. Towns, inns, ships, and parties may use two words: a generated name plus a noun from a small noun list on that catalog (`Keep`, `Gate`, `Lantern`, and so on). About half of place names are two words.

Reject a result under 3 letters or over 22 letters and try again, up to 10 times.

Generate 10 names by default. The count input is 1 to 50. Skip duplicates inside one batch.

## Markov mode

- Textarea "Source names", one name per line.
- Order: 2 or 3, default 2.
- Train on letters, including spaces and apostrophes. Start state is the first `order` characters of a random source name.
- Walk until the chain emits a stop (end of a training name) or 24 characters.
- Capitalize the first letter of each word.
- If the user pasted fewer than 5 names, show "Paste at least 5 names." and do not generate.
- Never echo a source name unchanged if another candidate exists. If every candidate collides, show the collisions and a note "The list is too small to vary."

## UI

- A segmented control, two buttons: Built-in and From a list. Use `.tool-btn` and `.tool-btn--active` if that modifier exists. If it does not, add `.tool-btn--active` next to the other tool button modifiers in `theme.css`.
- Built-in: group select, catalog select, count, seed, Generate.
- Custom: textarea, order select, count, Generate. The seed still drives picks.
- Results are a plain list. Click a name to copy it. A Copy all button copies one name per line.
- Class prefix: `.name-gen`.

## Tests

- Same seed and catalog returns the same 10 names.
- Batch of 10 has no duplicates when the syllable space allows it (human male should).
- Markov order 2 on a fixture of 8 names returns strings that only contain character pairs present in the training set, aside from the capitalized form. Compare lowercased.
- Fewer than 5 lines returns the error and an empty list.

## Acceptance

- Both modes work on `/tools/name-generator`.
- Tests and typecheck pass.

## Suggested commit

`feat(names): add fantasy and markov name generator`
