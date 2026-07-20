# NPC Fantasy Grounds — kit da wiki

Esta pasta complementa a ferramenta embutida na wiki React.

## Onde está o app

- Interface: rota **`#/tools/npc-fg-export`** (componente `wiki/src/components/NpcFgExportTool.tsx`).
- Lógica e tipos: `wiki/src/tools/npc-fg-export/`.

## Uso rápido

1. Abra a wiki em modo dev ou build estático.
2. Preencha os campos, **envie um XML** exportado do FG para edição, ou **cole JSON** (export da ferramenta ou gerado pelo agente com a skill `npc-fg-wiki-json`).
3. Gere o XML e copie ou salve; importe no Fantasy Grounds Unity com ruleset **D&D 3.5**.

## JSON

O estado exportado corresponde ao tipo `NpcFgExportState` em `wiki/src/tools/npc-fg-export/types.ts`. Qualquer chave desconhecida no “colar JSON” é ignorada.

## Skill Cursor (JSON para colar)

O arquivo [`SKILL-for-cursor-copy.md`](SKILL-for-cursor-copy.md) espelha **`.cursor/skills/npc-fg-wiki-json/SKILL.md`** — orienta o agente a emitir **JSON** para o formulário da wiki. Copie para `.cursor/skills/npc-fg-wiki-json/SKILL.md` no repositório se necessário.

## Limitações

- O XML segue o layout **CoreRPG / export NPC único** usado no repositório (`<root>` → `<npc>`). Variações de módulo FG podem exigir ajuste manual.
- **Spellset** complexo: use o modo **XML bruto** ou refine no cliente após import.
- Personagens jogadores e gerador Python `generate_npc_xml.py` continuam como fluxos separados no repositório.
