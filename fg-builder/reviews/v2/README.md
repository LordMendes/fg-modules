# FG Module Compatibility Review — v2

Generated: 2026-08-12 21:29 UTC

Target: Fantasy Grounds **3.5E** ruleset load + automation conventions (per `skills/` and `.cursor/skills/fantasy-grounds/`).

## Summary

| Module | .mod | Load ready | Errors | Warnings | Info | Records |
|--------|------|:----------:|-------:|---------:|-----:|--------:|
| [Complete Divine](complete-divine.md) | `Complete Divine.mod` | yes | 0 | 60 | 5 | 216 |
| [Unearthed Arcana](unearthed-arcana.md) | `Unearthed Arcana.mod` | yes | 0 | 174 | 11 | 147 |

## Rollup totals

- **Modules reviewed:** 2
- **Load ready:** 2 / 2
- **Total records:** 363
- **Total errors:** 0
- **Total warnings:** 234
- **Total info:** 16

## Verdict

All modules have valid packaging and XML structure — they should **load in FG 3.5E**. Automation gaps (class skills, spell actions) are documented per module; see warnings for converter fixes.

## Spell-class automation (3.5E ruleset)

When a class level is dragged onto a PC, FG creates spell-class tracks only when a level-1 classfeature is named **`Spells`** (exact) and its text contains **`must have a {ability} score equal to`**. Prestige spellcasting advancement uses **`Spells per Day`**. Variant **`Spellcasting`** features are reference-only.

**Automated today:** weapon/armor proficiencies, class skills (L1), spell-class track creation, prestige spell-level bumps to existing tracks.

**Still manual:** spell slot counts for supplement casters (Warmage, Beguiler, etc.) because slot tables are hardcoded in the ruleset; most non-spell class abilities.

## Known cross-cutting issues

| Issue | Impact | Fix |
|-------|--------|-----|
| `engineering)`, `royalty)` in classskills | FG won't recognize Knowledge sub-skills | Fix classskills list parsing in `class_skills.py`, rebuild |
| Psionic skills (Exemplar, Shadowmind) | Needs Expanded Psionics module | Expected unless psionics loaded |
| Unearthed Arcana variant skill automation | Base-class skill ranks and skills are populated for supported variants | Review remaining ambiguous combined variants manually |
| Supplement caster slot tables | Spell-class track created but slots empty | Extend ruleset Lua (out of module scope) |

## Contents

This folder contains the reviewed `.mod` files plus per-module compatibility reports (`.json` / `.md`).

## Manual test plan

1. Copy `.mod` files from this folder into your Fantasy Grounds modules folder.
2. Load each module in a 3.5E campaign with **3.5E Basic Rules** enabled.
3. Open Library → Rules; verify classes, feats, spells drag to character sheets.
4. Create a test PC; add a prestige class — confirm requirements and features display.
5. Drag a primary caster class — confirm a spell-class track appears on Actions.
6. Cast a spell with actions — confirm save/DC dialog appears.
