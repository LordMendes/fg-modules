# Skills — portable copy

Mirror of campaign Cursor skills and Fantasy Grounds export support files. **Cursor loads skills from** [`.cursor/skills/`](../.cursor/skills/) — this folder is for backup, sharing, and syncing without touching Cursor config.

## Skill directories

| Folder | Purpose | Wiki route |
|--------|---------|------------|
| [`class-fg-wiki-json/`](class-fg-wiki-json/SKILL.md) | JSON → Export Class (FG) | `#/tools/class-fg-export` |
| [`race-fg-wiki-json/`](race-fg-wiki-json/SKILL.md) | JSON → Export Race (FG) | `#/tools/race-fg-export` |
| [`npc-fg-wiki-json/`](npc-fg-wiki-json/SKILL.md) | JSON → Export NPC (FG) | `#/tools/npc-fg-export` |
| [`feat-fg-wiki-json/`](feat-fg-wiki-json/SKILL.md) | JSON → Export Feat (FG) | `#/tools/feat-fg-export` |
| [`spell-fg-wiki-json/`](spell-fg-wiki-json/SKILL.md) | JSON → Export Spell (FG) | `#/tools/spell-fg-export` |
| [`npc-doc-to-fantasy-grounds/`](npc-doc-to-fantasy-grounds/SKILL.md) | Markdown NPC sheet → Python XML | — |
| [`dnd-35/`](dnd-35/SKILL.md) | D&D 3.5 adjudication and content | — |
| [`escalation-map-json/`](escalation-map-json/SKILL.md) | Escalation map JSON for wiki | `#/tools/mapa-escalada` |
| [`risk-matrix-json/`](risk-matrix-json/SKILL.md) | Risk matrix JSON for wiki | `#/tools/matriz-risco` |

## Reference docs (`reference/fantasy-grounds/`)

Copied from [`docs/09-recursos/fantasy-grounds/`](../docs/09-recursos/fantasy-grounds/):

- [`fg-export-json-conventions.md`](reference/fantasy-grounds/fg-export-json-conventions.md) — shared JSON/XML rules for all FG export skills
- [`fg-35e-spell-action-mapping.md`](reference/fantasy-grounds/fg-35e-spell-action-mapping.md) — spellset cast/damage/heal/effect actions
- [`fg-35e-race-trait-mapping.md`](reference/fantasy-grounds/fg-35e-race-trait-mapping.md) — race trait slug → FG `<name>` rules

Canonical campaign docs remain under `docs/09-recursos/fantasy-grounds/`. Update both when conventions change.

## Wiki tool copies (`wiki/`)

Embeddable skill text and notes from [`wiki/`](../wiki/):

- `wiki/*-fg-export-tool/SKILL-for-cursor-copy.md` — pasted into wiki UI “Copy skill” blocks
- `wiki/npc-fg-export-tool/README.md` — NPC export tool usage

Implementation (TypeScript, React) stays in `wiki/src/tools/*-fg-export/`.

## Sync workflow

1. Edit canonical skill in `.cursor/skills/<name>/SKILL.md`.
2. Copy to `skills/<name>/SKILL.md` (this folder).
3. If the skill has a wiki mirror, update `wiki/<tool>/SKILL-for-cursor-copy.md` and `skills/wiki/<tool>/`.

To install a skill into Cursor from here:

```text
Copy-Item skills\<skill-name>\SKILL.md .cursor\skills\<skill-name>\SKILL.md
```

## Related code (not duplicated here)

| Domain | Location |
|--------|----------|
| FG export types + XML builders | `wiki/src/tools/*-fg-export/`, `wiki/src/tools/fg-spell-actions/` |
| SRD spell library | `wiki/src/tools/npc-fg-export/data/srd-spell-library.json` |
| NPC Python XML generator | `docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/generate_npc_xml.py` |
| FG reference XML | `mods/working/3.5E-basicrules/client.xml` |
