# Red Hand of Doom — Module Refactor

Refactored: 2026-08-25
Module: modules/Red Hand of Doom.mod
Web source: `RH` — /sources/RH

## Record counts (module vs web)

| Category | Module | Web | Delta |
|----------|-------:|----:|------:|
| classes | 0 | 0 | 0 |
| feats | 2 | 2 | 0 |
| spells | 0 | 0 | 0 |
| items | 0 | 0 | 0 |
| races | 0 | 0 | 0 |
| monsters | 174 | 174 | 0 |
| deities | 0 | 0 | 0 |
| domains | 0 | 0 | 0 |
| psionics | 0 | 0 | 0 |

## Fixes applied

### Feats
- Built from dndtools web JSON with prerequisites/benefit split (Divine Vigor, Dragonthrall)

### Spells
- N/A (no spells in source)

### Classes
- N/A (no classes in source)

### Items
- N/A (no items in source)

### Added categories
- Monsters: 174 NPC stat blocks from web JSON
- Fixed malformed anchor HTML in 7 monster records (unwrap `<a>` tags in `prepare_formatted_html`)

## Spot-check notes
- Divine Vigor: prerequisites and benefit separated; summary present
- Dragonthrall: skill prerequisite and benefit bullets intact
- Acidborn Shark, Large: stat block loads without XML parse errors (previously broken feat links)
- Chimera: CR and formatted stat block present

## Verdict
OK

## Follow-up
- [ ] none

Automated review: [v3/red-hand-of-doom.md](v3/red-hand-of-doom.md)
