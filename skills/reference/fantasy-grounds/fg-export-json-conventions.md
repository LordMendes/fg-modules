# FG export JSON — shared conventions

Conventions for all wiki **Export * (FG)** tools and their Cursor skills (`*-fg-wiki-json`).

## Pipeline

1. Agent emits JSON (full state or fragment).
2. Wiki tool **Apply JSON** deep-merges over defaults (`mergeState.ts`).
3. Tool generates FG XML (`buildXml.ts`).
4. User pastes XML into Fantasy Grounds or bundles it in a `.mod`.

## Slug generation

Record slugs match `toSlug()` in the wiki tools:

- Lowercase, strip accents, keep `[a-z0-9]` only.
- Max 40 characters.
- Empty name → `"record"`.

Examples: `Fighter` → `fighter`, `Weapon Focus (longsword)` → `weaponfocuslongsword`.

## FG typed nodes

Every scalar in FG XML uses a `type` attribute:

| FG type | JSON | Example |
|---------|------|---------|
| `type="string"` | string | `<name type="string">Fighter</name>` |
| `type="number"` | number | `<skillranks type="number">2</skillranks>` |
| `type="formattedtext"` | FG HTML string | `<benefit type="formattedtext"><p>...</p></benefit>` |
| `type="dice"` | dice string | `<dice type="dice">d8</dice>` |

## FG HTML-like text

Used in `bodyText`, class features, racial traits, feat `benefit`/`normal`/`special`:

```
<p>Paragraph.</p>
<list><li>Bullet.</li></list>
<b>bold</b>  <i>italic</i>
<h>Section heading</h>
<table><tr><td>Cell</td></tr></table>
```

Do not use full HTML documents or `<html>` wrappers.

## Deep merge

- Omitted top-level keys keep defaults.
- Nested objects merge recursively (e.g. patch only `identity.name`).
- Unknown keys at the first level are ignored.
- Arrays replace when provided (e.g. `features[]`, `traits[]`).

## Encoding

Default `encoding`: `"utf-8"`. Used in the XML declaration.

## Wiki tools and skills

| Entity | Wiki route | State type | Skill |
|--------|------------|------------|-------|
| NPC | `#/tools/npc-fg-export` | `NpcFgExportState` | `npc-fg-wiki-json` |
| Race | `#/tools/race-fg-export` | `RaceFgExportState` | `race-fg-wiki-json` |
| Class | `#/tools/class-fg-export` | `ClassFgExportState` | `class-fg-wiki-json` |
| Feat | `#/tools/feat-fg-export` | `FeatFgExportState` | `feat-fg-wiki-json` |
| Spell | `#/tools/spell-fg-export` | `SpellFgExportState` | `spell-fg-wiki-json` |

## Canonical XML sources

- Races, classes, feats: `mods/working/3.5E-basicrules/client.xml` under `<reference static="true">`.
- Spell reference: `record_spell.xml` (`spelldesc` fields).
- Spell actions (NPC spellset): `generate_npc_xml.py` and exported NPC XML in `docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/`.
