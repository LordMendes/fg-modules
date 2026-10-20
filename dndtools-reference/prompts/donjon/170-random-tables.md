# Random Tables

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `random-tables`
- label: Random Tables
- href: `/tools/random-tables`
- description: Roll traps, NPC sketches, pocket loot, magic items, and spellbooks from the compendium.
- source: `DMG`

## Goal

One page, one result type at a time. The select chooses the table. Generate prints a list of that type. Count is 1 to 20, default 5.

Psionic items and chaositech are out of scope. The compendium's psionic powers are not a magic-item table.

## Traps

`src/lib/random-tables/traps.ts`, exported, because the dungeon plan calls `rollTrap`.

Input: CR 1-20.

Output fields: name, CR, Search DC, Disable Device DC, trigger, attack or save, damage, bypass.

Rules of thumb, 3.5 style:

- Search DC = 15 + CR, plus 0 to 4 from the seed.
- Disable Device DC = Search DC, or Search DC + 2 for magic traps.
- Attack bonus, if it is an attack trap, is CR. Save DC, if it is a save trap, is 10 + CR + 2, where the +2 stands in for the minimum ability bonus.
- Damage is `(CR)d6` for CR 1-5, `(CR)d6` still, but at CR 6+ use `floor(CR / 2)d6` plus a rider (poison, pit, or a condition) so the dice do not run away. Show the expression, and also roll it for "example damage".
- Mechanical vs magic: even CR mechanical, odd CR magic. Magic traps say "spell effect" and name a spell from the compendium when a server action can find a spell of level `min(9, ceil(CR / 2))`. If the query fails, keep the generic line.

Write 12 mechanical names and 12 magic names.

## NPCs

A sketch, not the NPC Creator.

- Culture: Default only, unless `src/lib/names` exports cultures. Then list those catalogs. Default uses the human name table or a local given-name list.
- Gender: Any, Male, Female. Any picks one.
- Race: Any, Human, Dwarf, Elf, Gnome, Half-elf, Half-orc, Halfling.
- Order: Any class, Adventurer, NPC class, Arcane, Divine, Martial, Scoundrel, Wild.

Class groups:

- Adventurer: barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, wizard.
- NPC class: adept, aristocrat, commoner, expert, warrior.
- Arcane: bard, sorcerer, wizard.
- Divine: cleric, druid, paladin.
- Martial: barbarian, fighter, monk, paladin, ranger.
- Scoundrel: bard, rogue.
- Wild: barbarian, druid, ranger.

Output one paragraph: name, race, gender, class, level `1d6 + 1`, and a one-line mannerism from a list of 20. Link the class to `/classes/<slug>` when the slug matches.

## Pickpocket loot

Use the treasure generator if `generateTreasure` exists: one hoard, level `rng.pickInt(1, 3)`, coins standard, valuables half-chance, items none. Summarize coins and at most one gem.

If treasure is not implemented, roll `2d6 sp` plus a 25% chance of `1d4 gp`.

## Magic items

Rank: minor, medium, major. Type: any, armor, potion, ring, rod, scroll, staff, wand, weapon, wondrous.

Call the same item roller the treasure tool uses. If that function is not exported, export a `rollMagicItem(rank, type, rng)` from the treasure lib as part of this task only if `src/lib/treasure` already exists. If it does not exist, stop and report that treasure must be done first. Do not duplicate the DMG JSON.

Show name, price, and a link when the slug matches.

## Spellbooks

Rank: mundane, minor, medium, major.

This is a book, not the Random Spellbook tool. Do not edit that tool.

- Mundane: 1d6 0-level and 1d4 1st-level wizard spells.
- Minor: those, plus 1d4 2nd-level and 1d3 3rd-level.
- Medium: minor, plus 1d4 4th, 1d3 5th, 1d2 6th.
- Major: medium, plus 1d3 7th, 1d2 8th, 1 9th.

Server action loads wizard spells for the needed levels and the pure function picks them. Title the book with a generated name. List spells as links to `/spells/<slug>`.

## UI

- Type select: Traps, NPCs, Pickpocket loot, Magic items, Spellbooks.
- The extra fields for that type appear under the select. Hide the others.
- Count, seed, Generate.
- Results are an ordered list of cards.
- Class prefix: `.random-tables`.

## Tests

- `rollTrap(5)` Search DC is between 15 and 19.
- Odd CR trap is magic. Even CR is mechanical.
- NPC class group "Scoundrel" only returns bard or rogue.
- Spellbook mundane never includes a spell level above 1. Test with a fake spell list passed into the pure function.
- Pickpocket fallback, with treasure module absent, stays under 20 gp. Mock by calling the local coin function directly.

## Acceptance

- All five types render a list.
- Traps do not require the treasure tool. Magic items do. If treasure is missing, the magic-item type shows "Magic item rolls need the treasure tables." and the other types still work.
- Tests and typecheck pass.

## Suggested commit

`feat(random-tables): add traps npcs loot and spellbooks`
