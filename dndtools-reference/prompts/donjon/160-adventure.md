# Adventure Generator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `adventure-generator`
- label: Adventure Generator
- href: `/tools/adventure-generator`
- description: Roll adventure elements one section at a time, from theme and hook through villain, set piece, and twist.
- source: `Site tables`

## Goal

A list of sections. The page loads with every section filled. Clicking a section title rerolls only that section. Nothing else moves.

Write original phrases. The section list is the structure to hit, not text to import from a published kit.

## Sections

In this order:

1. Theme
2. Goal
3. Story hook
4. Plot
5. Climax
6. General setting
7. Specific setting
8. Second setting
9. Master villain
10. Minor villain
11. Second minor villain
12. Ally or neutral
13. Monster encounter
14. Character encounter
15. Deathtrap
16. Chase
17. Omen or prophecy
18. Secret weakness
19. Special condition
20. Moral quandary
21. Red herring
22. Cruel trick

Each section has at least 16 original entries in `src/lib/adventure/tables.ts`. One to two sentences. They should be usable at a 3.5 table: name a place type, a person, or a pressure, without requiring a setting book.

Monster encounter entries say "a CR appropriate creature" rather than inventing a stat block. If the encounter generator pure function is easy to call without Prisma, you may append a monster name. If that import pulls a server-only module into the client, skip it.

Deathtrap entries name a trigger, a DC band (easy 12, moderate 18, hard 24), and a consequence.

## UI

- Seed at the top. Generate all uses the seed and fills every section.
- A list. Each row: the section title is a button that rerolls that row (`seed + index + 1`). The body is the sentence.
- Copy all, plain text, title then sentence.
- Class prefix: `.adventure-gen`.
- No form of twenty selects. The only controls are seed, Generate all, per-row reroll, and Copy.

## Tests

- There are 22 sections in the order above.
- Each table has at least 16 entries.
- Reroll index 4 changes section 5 only. Compare the other 21 strings.
- Same seed fills the same sentences.

## Acceptance

- `/tools/adventure-generator` shows all 22 sections.
- Tests and typecheck pass.

## Suggested commit

`feat(adventure): add adventure element generator`
