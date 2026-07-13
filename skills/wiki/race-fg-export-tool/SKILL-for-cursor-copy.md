# Wiki JSON — Export Race (Fantasy Grounds 3.5E)

Paste this content into the `race-fg-wiki-json` skill configuration in Cursor.

See `.cursor/skills/race-fg-wiki-json/SKILL.md` for the full skill (canonical copy).

---

## Slug → `<name>` mapping (CRITICAL for FG automation)

Source: `mods/working/3.5E-basicrules/client.xml`. Full reference: `docs/09-recursos/fantasy-grounds/fg-35e-race-trait-mapping.md`.

| XML slug | Required `<name>` | `<h>` inside text | When |
|----------|---------------------|-------------------|------|
| `attributes` | `"Attribute Adjustments"` | `"Ability Scores"` | Any ability modifier |
| `size` | `"Medium"` / `"Small"` / exact category | `"Size"` | Always |
| `speed` | `"Normal Speed"` | `"Normal Speed"` | 30 ft. |
| `speed` | `"Slow Speed"` | `"Slow Speed"` | 20 ft. |
| `speed` | `"Slow and Steady"` | `"Slow and Steady"` | 20 ft. + dwarf armor rule |
| `vision` | `"Darkvision"` | `"Darkvision"` | Darkvision; range in `<p>` |
| `vision` | `"Low-Light Vision"` | `"Low-Light Vision"` | Low-light — same `vision` slug |
| `languages` | `"Languages"` | `"Languages"` | Starting languages |
| `favoredclass` | `"Favored Class: Fighter"` | `"Favored Class: Fighter"` | Includes class name |

**Rule**: `<h>` matches `<name>`, except `attributes` (`<name>` = `"Attribute Adjustments"`, `<h>` = `"Ability Scores"`).

## State fields (`RaceFgExportState`)

Mirror `wiki/src/tools/race-fg-export/types.ts`.

| Block | Fields |
|-------|--------|
| `format` | `"3.5E"` or `"PFRPG"` |
| `recordSlug`, `encoding` | Slug + XML encoding (`utf-8`) |
| `abilityScores` | `{ str, dex, con, int, wis, cha }` — auto `<attributes>` |
| `identity` | `name`, `size`, `type`, `favoredClass`, `levelAdjustment`, languages |
| `movement`, `senses`, `traits[]`, `summaryText` | See full skill |

## ABIL effect

`abilityScores` → `ABIL: STR -4, DEX 2` via `buildFgAbilityEffect()` for character automation.

## Common mistakes

See `.cursor/skills/race-fg-wiki-json/SKILL.md` § Common mistakes.

## Relation to other skills

Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
