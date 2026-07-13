---
name: spell-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the wiki Export Spell (FG) tool
  to paste at #/tools/spell-fg-export. Use when the user asks for wiki JSON,
  exportable SpellFgExportState, spell reference XML, or spellset actions with effects.
---

# JSON for the wiki — Export Spell (Fantasy Grounds 3.5E)

## Goal

Emit a JSON object the wiki form accepts via **Apply JSON**. Merge is **deep over defaults**.

Shared conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`.

Spell actions: `docs/09-recursos/fantasy-grounds/fg-35e-spell-action-mapping.md`.

## Canonical source

Mirror **`SpellFgExportState`** in `wiki/src/tools/spell-fg-export/types.ts`. SRD lookup from `wiki/src/tools/npc-fg-export/data/srd-spell-library.json`.

## Export modes

| `exportMode` | Output | Use case |
|--------------|--------|----------|
| `"reference"` | Library `spelldesc` node under `<spells>` | FG module / spell reference |
| `"spellset"` | Spell entry with `<actions>` (cast + damage/heal/effect) | NPC spellset, automation |

Default: `"reference"`.

## FG XML — reference mode

```xml
<spells>
  <fireball>
    <name type="string">Fireball</name>
    <school type="string">Evocation [Fire]</school>
    <level type="string">Sor/Wiz 3</level>
    <castingtime type="string">1 standard action</castingtime>
    <components type="string">V, S, M</components>
    <range type="string">Long (400 ft. + 40 ft./level)</range>
    <effect type="string">20-ft.-radius spread</effect>
    <duration type="string">Instantaneous</duration>
    <save type="string">Reflex half</save>
    <sr type="string">Yes</sr>
    <description type="string">...</description>
    <shortdescription type="string">...</shortdescription>
    <source type="string">SRD 3.5E</source>
  </fireball>
</spells>
```

Fields match `record_spell.xml` / `spelldesc` — use `save` not `savingthrow`, `description` as string.

## FG XML — spellset mode

Spell node includes `<actions>`:

1. `type: "cast"` — `othertags`, `savetype`, `school`, `srnotallowed`, `atktype`, `onmissdamage`
2. Optional `type: "damage"` / `"heal"` / `"effect"` follow-up

## Canonical format (`SpellFgExportState`)

| Block | Fields |
|-------|--------|
| `exportMode` | `"reference"` or `"spellset"` |
| `recordSlug`, `encoding` | Slug + encoding |
| `slotLevel`, `prepared`, `abilityMod` | Spellset only — slot cost, prepared count, DC ability mod |
| `identity` | `name`, `schoolShort`, `schoolFull`, `levelStr`, `castingTime`, `components`, `range`, `effect` (target/area), `duration`, `save`, `sr`, `short`, `description`, `source` |
| `cast` | `othertags`, `savetype`, `atktype`, `onmissdamage`, `srNotAllowed` — spellset only |
| `action2` | Single damage/heal/effect follow-up |
| `actions` | Array of follow-ups |

Name-only JSON lookups SRD library (metadata + `action2` when seeded).

## Expected output

1. Valid JSON in a single ` ```json ` block.
2. Fragments OK.

## Example — Fireball (reference)

```json
{
  "exportMode": "reference",
  "recordSlug": "fireball",
  "identity": {
    "name": "Fireball",
    "schoolShort": "evocation",
    "schoolFull": "Evocation [Fire]",
    "levelStr": "Sor/Wiz 3",
    "castingTime": "1 standard action",
    "components": "V, S, M",
    "range": "Long (400 ft. + 40 ft./level)",
    "effect": "20-ft.-radius spread",
    "duration": "Instantaneous",
    "save": "Reflex half",
    "sr": "Yes",
    "short": "1d6 fire damage per caster level (maximum 10d6).",
    "description": "A fireball spell generates a searing explosion of flame that detonates with a low roar and deals 1d6 points of fire damage per caster level (maximum 10d6) to every creature within the area.",
    "source": "SRD 3.5E"
  }
}
```

## Example — Inflict Light Wounds (spellset + damage)

```json
{
  "exportMode": "spellset",
  "slotLevel": 1,
  "prepared": 1,
  "abilityMod": 3,
  "identity": { "name": "Inflict Light Wounds" },
  "cast": {
    "othertags": "negative; one; ",
    "savetype": "will"
  },
  "action2": {
    "type": "damage",
    "dice": "d8",
    "dicestat": "cl",
    "dicestatmax": 5,
    "dmgType": "negative"
  }
}
```

## Example — Flare (spellset + effect)

```json
{
  "exportMode": "spellset",
  "slotLevel": 0,
  "identity": { "name": "Flare" },
  "cast": { "savetype": "fort", "othertags": "light; zero; " },
  "action2": {
    "type": "effect",
    "label": "Dazzled",
    "durmod": 1,
    "durunit": "minute"
  }
}
```

## Common mistakes

| Wrong | Right |
|--------|-------|
| `identity.area` in spell export state | Use `identity.effect` (target/area line) |
| `action2.type: "effect"` confused with `identity.effect` | `identity.effect` = PHB target; `action2` = FG condition |
| `"savetype": "Reflex"` | `"savetype": "reflex"` |
| `"label": "dazzled"` | `"label": "Dazzled"` |
| `othertags` without trailing `; ` | FG habit: `"fire; one; "` |
| Reference mode with `action2` expecting XML actions | Set `"exportMode": "spellset"` |
| `srNotAllowed: false` when SR is No | `true` sets `<srnotallowed type="number">1</srnotallowed>` |

## Relation to other skills

- Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
- Spell actions: `docs/09-recursos/fantasy-grounds/fg-35e-spell-action-mapping.md`
- 3.5 rules: `.cursor/skills/dnd-35/SKILL.md`
- Export NPC (FG): `.cursor/skills/npc-fg-wiki-json/SKILL.md` — same spell row / `action2` schema
- Export Class / Race / Feat (FG): sibling `*-fg-wiki-json` skills.
