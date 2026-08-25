# Races of Faerûn — Module Refactor

Refactored: 2026-08-25
Module: modules/Races of Faerûn.mod
Web source: `Rac` — https://dnd.arkalseif.info/races/races-of-faerun--23/

## Record counts (module vs web)

| Category | Module | Web | Delta |
|----------|-------:|----:|------:|
| classes | 9 | 9 | 0 |
| feats | 84 | 84 | 0 |
| spells | 13 | 13 | 0 |
| items | 0 | 0 | 0 |
| races | 35 | 35 | 0 |
| monsters | 0 | 0 | 0 |
| deities | 0 | 0 | 0 |
| domains | 0 | 0 | 0 |
| psionics | 0 | 0 | 0 |

## Fixes applied

### Feats
- Built from dndtools web JSON with prerequisites/benefit split (84 feats)
- Regional and racial feats (e.g. Low Blow, Metallurgy, Celestial Bloodline) have summary and separated prereq/benefit fields

### Spells
- 13 spells imported with header fields from web JSON

### Classes
- 9 prestige classes: Battlerager, Bladesinger, Breachgnome, Elven High Mage, Great Rift Skyguard, Orc Warlord, Spellsinger, Warrior Skald, Warsling Sniper
- Classfeatures built from web description/notes; advancement tables preserved

### Items
- N/A (no items with `Rac` source abbrev in web JSON; realmshelps supplemental gear not in main pipeline)

### Added categories
- Races: 35 Faerûn subraces and variants (Aquatic Elf, Avariel, Gold Dwarf, Drow, Yuan-ti Pureblood, etc.)

## Spot-check notes
- Aquatic Elf: LA +1, swim speed, gills trait in description
- Low Blow: Mobility + BAB +4 prereqs; benefit in `<benefit>`, not merged into prerequisites
- Battlerager: 5-level advancement table, classfeatures from notes_html
- Bladesinger: prestige class with spellcasting advancement text present

## Verdict
Refactored with warnings

## Follow-up
- [ ] Elven High Mage: web JSON lacks fort/ref/will save progression (3 review warnings)
- [ ] Items/equipment from realmshelps supplemental data (weapons, armor, goods) not yet in build pipeline

Automated review: [v3/races-of-faer-n.md](v3/races-of-faer-n.md)
