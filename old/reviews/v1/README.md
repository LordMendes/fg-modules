# FG Module Compatibility Review — v1

Generated: 2026-07-09 01:12 UTC

Target: Fantasy Grounds **3.5E** ruleset load + automation conventions (per `skills/` and `.cursor/skills/fantasy-grounds/`).

## Summary

| Module | .mod | Load ready | Errors | Warnings | Info | Records |
|--------|------|:----------:|-------:|---------:|-----:|--------:|
| [Complete Adventurer](complete-adventurer.md) | `Complete Adventurer.mod` | yes | 0 | 83 | 1 | 178 |
| [Complete Arcane](complete-arcane.md) | `Complete Arcane.mod` | yes | 0 | 75 | 0 | 247 |
| [Complete Champion](complete-champion.md) | `Complete Champion.mod` | yes | 0 | 38 | 0 | 105 |
| [Complete Divine](complete-divine.md) | `Complete Divine.mod` | yes | 0 | 65 | 5 | 216 |
| [Complete Mage](complete-mage.md) | `Complete Mage.mod` | yes | 0 | 85 | 0 | 208 |
| [Complete Warrior](complete-warrior.md) | `Complete Warrior.mod` | yes | 0 | 25 | 1 | 144 |
| [Player's Handbook II](player-s-handbook-ii.md) | `Player's Handbook II.mod` | yes | 0 | 80 | 0 | 237 |

## Rollup totals

- **Modules reviewed:** 7
- **Load ready:** 7 / 7
- **Total records:** 1335
- **Total errors:** 0
- **Total warnings:** 451
- **Total info:** 7

## Verdict

All modules have valid packaging and XML structure — they should **load in FG 3.5E**. Automation gaps (class skills, spell actions) are documented per module; see warnings for converter fixes.

## Known cross-cutting issues

| Issue | Impact | Fix |
|-------|--------|-----|
| `engineering)`, `royalty)` in classskills | FG won't recognize Knowledge sub-skills | Fix parser in `scraper/fg/converters/classes.py`, rebuild |
| Psionic skills (Exemplar, Shadowmind) | Needs Expanded Psionics module | Expected unless psionics loaded |
| Variant classes missing skill automation | Manual L1 skill selection | Improve scrape for variant class pages |

## Contents

This folder contains the reviewed `.mod` files plus per-module compatibility reports (`.json` / `.md`).

## Manual test plan

1. Copy `.mod` files from this folder into your Fantasy Grounds modules folder.
2. Load each module in a 3.5E campaign with **3.5E Basic Rules** enabled.
3. Open Library → Rules; verify classes, feats, spells drag to character sheets.
4. Create a test PC; add a prestige class — confirm requirements and features display.
5. Cast a spell with actions — confirm save/DC dialog appears.
