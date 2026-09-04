# Forgotten Realms Campaign Setting — Module Refactor

Refactored: 2026-08-25
Module: modules/Forgotten Realms Campaign Setting.mod
Web source: `FRCS` — https://dnd.arkalseif.info/rulebooks/forgotten-realms-30--6/forgotten-realms-campaign-setting--19/

## Record counts (module vs web)

| Category | Module | Web | Delta |
|----------|-------:|----:|------:|
| classes | 23 | 23 | 0 |
| feats | 51 | 51 | 0 |
| spells | 39 | 39 | 0 |
| items | 0 | 0 | 0 |
| races | 23 | 23 | 0 |
| monsters | 0 | 0 | 0 |
| deities | 0 | 0 | 0 |
| domains | 5 | 5 | 0 |
| psionics | 0 | 0 | 0 |

## Fixes applied

### Feats
- Built from dndtools web JSON with prerequisites/benefit split (51 feats)
- Shadow Weave chain (Shadow Weave Magic, Insidious Magic, Tenacious Magic, etc.) with separated prereq/benefit fields
- Regional feats (Luck of Heroes, Thug, etc.) imported with summary

### Spells
- 39 spells imported with header fields from web JSON

### Classes
- 12 FR prestige classes: Arcane Devotee, Divine Champion, Divine Disciple, Divine Seeker, Guild Thief, Harper Scout, Hathran, Purple Dragon Knight, Red Wizard, Runecaster, Shadow Adept, plus Archmage/Hierophant
- 11 PHB base-class stubs in web JSON (Barbarian, Cleric, Druid, etc.) included but incomplete — missing BAB/saves/skills/features in source data

### Items
- N/A (no items with `FRCS` source abbrev in web JSON)

### Added categories
- Races: 23 regional/base race entries (Dwarf, Elf, Halfling, etc. with FR regional traits)
- Domains: 5 (Chaos, Evil, Good, Law, Magic)

## Spot-check notes
- Shadow Weave Magic: Wisdom 13+ prereq; benefit describes Weave vs Shadow Weave mechanics
- Harper Scout: prestige class with advancement table and classfeatures
- Luck of Heroes: regional feat with summary and benefit separated
- Magic domain: granted power and spell list present

## Verdict
Refactored with warnings

## Follow-up
- [ ] PHB base-class stubs (Barbarian, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Wizard) are incomplete in web JSON — consider excluding from FRCS module or linking to PH module
- [ ] Legacy 3.0 skill names (Alchemy, Scry, Pick Pocket, etc.) trigger class_unknown_skill warnings
- [ ] Items/equipment from realmshelps supplemental data not in build pipeline

Automated review: [v3/forgotten-realms-campaign-setting.md](v3/forgotten-realms-campaign-setting.md)
