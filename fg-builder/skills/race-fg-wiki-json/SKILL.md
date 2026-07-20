---
name: race-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the wiki Export Race (FG) tool
  to paste at #/tools/race-fg-export. Use when the user asks for wiki JSON,
  exportable RaceFgExportState, or to fill racial traits before XML.
---

# JSON for the wiki — Export Race (Fantasy Grounds 3.5E)

## Goal

Emit a JSON object the wiki form accepts via **Apply JSON**. Merge is **deep over defaults** — omitted keys keep default values.

Shared conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`.

## Canonical source

Mirror **`RaceFgExportState`** in `wiki/src/tools/race-fg-export/types.ts`. XML from `buildXml.ts`. FG reference: `mods/working/3.5E-basicrules/client.xml`.

## Generated XML structure (3.5E)

```xml
<reference static="true">
  <races>
    <kobold>
      <name type="string">Kobold</name>
      <racialtraits>
        <attributes>
          <locked type="number">1</locked>
          <name type="string">Attribute Adjustments</name>
          <text type="formattedtext">
            <h>Ability Scores</h>
            <p>-4 Strength, +2 Dexterity, -2 Constitution</p>
          </text>
        </attributes>
        <size>...</size>
        <speed>...</speed>
        ...
      </racialtraits>
      <text type="formattedtext"><list><li>...</li></list></text>
    </kobold>
  </races>
</reference>
```

Full slug → name mapping: `docs/09-recursos/fantasy-grounds/fg-35e-race-trait-mapping.md`.

## Canonical format (`RaceFgExportState`)

| Block | Useful fields |
|-------|--------------|
| `format` | `"3.5E"` or `"PFRPG"`. Default `"3.5E"`. |
| `recordSlug` | XML node slug (e.g. `"kobold"`). Generated from name if empty. |
| `encoding` | XML declaration encoding. Default `"utf-8"`. |
| `abilityScores` | `{ str, dex, con, int, wis, cha }` — generates `<attributes>` with name `"Attribute Adjustments"`. |
| `abilityScoresNote` | PFRPG flavor sentence (ignored in 3.5E). |
| `identity` | `name`, `size`, `type`, `favoredClass`, `levelAdjustment`, `startingLanguages`, `bonusLanguages`. PFRPG also: `namePlural`, `raceType`, `moduleCategory`. |
| `movement` | `land` (ft.), `fly`, `swim`, `climb`, `burrow` (strings). |
| `senses` | `darkvision` (e.g. `"60 ft."`), `lowLightVision` (boolean). |
| `traits` | Custom traits only: `{ slug, name, text }`. Standard traits are auto-generated. |
| `summaryText` | FG HTML for main race `<text>`. |

## ABIL effect string

`buildFgAbilityEffect()` in `buildXml.ts` produces FG automation text from `abilityScores`:

- Example: `{ str: -4, dex: 2, con: -2 }` → `ABIL: STR -4, DEX 2, CON -2`
- Use when the user needs a pasteable racial ability effect for character sheets.

## Slug → `<name>` mapping (CRITICAL)

| XML slug | Required `<name>` | `<h>` inside text |
|----------|-------------------|-------------------|
| `attributes` | `"Attribute Adjustments"` | `"Ability Scores"` |
| `size` | `"Medium"` / `"Small"` / category only | `"Size"` |
| `speed` | `"Normal Speed"` / `"Slow Speed"` / `"Slow and Steady"` | same as name |
| `vision` | `"Darkvision"` / `"Low-Light Vision"` | same as name |
| `languages` | `"Languages"` | `"Languages"` |
| `favoredclass` | `"Favored Class: Fighter"` | includes class name |

Mechanical content (range, languages, modifiers) goes **only in `<p>`** — never in the title.

## Example — Kobold (3.5E)

```json
{
  "format": "3.5E",
  "recordSlug": "kobold",
  "abilityScores": { "str": -4, "dex": 2, "con": -2 },
  "identity": {
    "name": "Kobold",
    "size": "Small",
    "type": "Humanoid (reptilian)",
    "favoredClass": "Sorcerer",
    "levelAdjustment": "+0",
    "startingLanguages": "Draconic",
    "bonusLanguages": "Common, Undercommon, Goblin"
  },
  "movement": { "land": 30 },
  "senses": { "darkvision": "60 ft." },
  "traits": [
    {
      "slug": "naturalarmor",
      "name": "Natural Armor",
      "text": "<h>Natural Armor</h><p>Kobolds have a +1 natural armor bonus to AC.</p>"
    }
  ],
  "summaryText": "<list><li>Small: +1 size bonus to AC and attack rolls, +4 Hide.</li><li>Darkvision 60 ft.</li></list>"
}
```

## Common mistakes

| Wrong | Right |
|--------|-------|
| Trait with `slug: "attributes"` in `traits[]` | Use `abilityScores` field |
| `name: "Darkvision 60 ft."` | `name: "Darkvision"` — range only in `<p>` |
| `name: "Languages: Common, Orc"` | `name: "Languages"` — list only in `<p>` |
| `name: "Size: Small"` | `name: "Small"` |
| Custom trait slug `lowlightvision` for low-light | Slug `vision` with `<name>Low-Light Vision</name>` |

## Relation to other skills

- Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
- Trait mapping: `docs/09-recursos/fantasy-grounds/fg-35e-race-trait-mapping.md`
- 3.5 rules: `.cursor/skills/dnd-35/SKILL.md`
- Export Class / Feat / Spell / NPC (FG): sibling `*-fg-wiki-json` skills.
