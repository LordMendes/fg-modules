---
name: npc-doc-to-fantasy-grounds
description: >-
  Guides NPC sheet creation in Markdown for the repository and Fantasy Grounds Unity (D&D 3.5) XML export.
  Use when the user asks for FG NPC, XML import generation, aligning a sheet to generate_npc_xml.py, or doc → XML flow.
---

# NPC — from Markdown to Fantasy Grounds (this repository)

## Detailed source of truth

Follow the step-by-step guide (table labels, regeneration, civilian cases, and module):

- [`docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/guia-npc-doc-ao-xml.md`](../../../docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/guia-npc-doc-ao-xml.md)

## Operational summary

1. **Campaign canon:** a newly named person requires a sheet in `docs/05-pessoas/npcs/<polity>/<category>/<slug>.md` with mandatory sections (see `.cursor/rules/campanha-npc-ficha-obrigatoria.mdc` and `campanha-npc-ficha-motivacao-retrato.mdc`).
2. **Playable 3.5 block:** table `| Field | Value |` with `Race`, `Class / level`, `Alignment`, `Rank (guild)` when applicable; **Statistics** section compatible with the script parser (see guide).
3. **Alderhaven roster (guild):** to enter automatic generation, the slug must be in `GRUPO` / `ORDER` in `docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/generate_npc_xml.py`; output in `.../valedorn/guilda/<slug>.xml`.
4. **Regenerate XML:** `python docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/generate_npc_xml.py` (script internal paths are relative to `docs/`).
5. **FG environment:** set `FG_DB_XML` pointing to the campaign `db.xml` if auto-detection fails (Windows: `AppData\Roaming\Smiteworks\Fantasy Grounds\campaigns` folder).
6. **Spellcasters:** slots and structure come from the template; spell list is usually placeholder — review in the client after import.

## Wiki (JSON to paste)

To generate **JSON** compatible with the wiki **Export NPC (FG)** form (`#/tools/npc-fg-export`), use the **npc-fg-wiki-json** skill (`.cursor/skills/npc-fg-wiki-json/SKILL.md`).

## Project rules

- Sheet language: **en-US**; D&D 3.5 mechanical terms in English when that is table habit (see `.cursor/rules/campanha-idioma-en-us.mdc`).
- Canon propagation and NPC ↔ mission links: `.cursor/rules/campanha-propagacao-canon.mdc`, `campanha-npc-link-missao-arco.mdc`.
- 3.5 stats and adjudication: read `.cursor/skills/dnd-35/SKILL.md` when needed.
