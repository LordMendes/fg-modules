# Shared rules for generator tools

Read this before editing. Prefer the repo over this file if they drift.

## Where the tools live

All of these are public pages under the existing Tools index. There is no new app, no new design system, and no login wall.

| Piece | Path |
|---|---|
| Tool catalog | `dndtools-reference/web/src/lib/tools.ts` (`TOOLS`) |
| Tools index | `dndtools-reference/web/src/app/tools/page.tsx` |
| FAQs | `dndtools-reference/web/src/lib/tool-faqs.ts` |
| Page pattern | `dndtools-reference/web/src/app/tools/turn-undead-calculator/page.tsx` |
| Client UI pattern | `dndtools-reference/web/src/components/tools/turn-undead-calculator.tsx` |
| Styles | `dndtools-reference/web/src/styles/theme.css` (`.tool-field`, `.tool-label`, `.tool-input`, `.tool-btn`, `.tool-btn-primary`, `.tool-btn-secondary`, `.tool-btn--ghost`) |
| Seeded RNG | `dndtools-reference/web/src/lib/random-spellbook/seeded-rng.ts` (`createSeededRng`) |
| Sitemap and llms.txt | Pick up `TOOLS` automatically. Do not hand-edit them unless a test fails. |
| Tests | `dndtools-reference/web/package.json` script `test` is an explicit file list. Add every new `*.test.ts` to that list. |

Work from `dndtools-reference/web` unless a path above says otherwise.

## Page shell

Match Turn Undead, not a new layout.

- `src/app/tools/<slug>/page.tsx` is a server component.
- Breadcrumb: Home / Tools / tool name. Classes: `breadcrumb`, `page-header`.
- `buildPageMetadata`, `JsonLd`, `toolPageJsonLd`, `absoluteUrl`.
- Short lede under `h1`. Rules citation in italics when it is a book we already cite (`Player's Handbook`, `Dungeon Master's Guide`).
- Client tool in `<Suspense fallback={null}>`.
- `<ToolExplainer faqs={faqs} />` with `getToolFaqs("<key>")`.
- Add 3 FAQs to `TOOL_FAQS`. Questions a DM would type. Answers name the 3.5 rule, not an external generator.

## Catalog entry

Append one object to `TOOLS` in `tools.ts`. Use the `key`, `label`, `href`, `description`, and `source` from the tool file. Set `icon` the same way existing entries do (one character in the `icon` field). Do not add a badge unless the tool file says so.

Do not put emoji in body copy, buttons, FAQs, or comments.

## UI

- Labels: `.tool-label`. Fields: `.tool-field`. Inputs and selects: `.tool-input`.
- Primary action: `className="tool-btn tool-btn-primary"`. Secondary: `tool-btn tool-btn-secondary` or `tool-btn tool-btn--ghost`.
- Icons inside the tool: `lucide-react` only, size 16.
- Colors, radii, and spacing come from existing CSS variables. New rules go in `theme.css` under a class prefix named in the tool file. No hard-coded hex in components.
- One column on narrow screens. The form sits above the result. Do not invent a sidebar.
- Results update in place. Keep the last result on screen until the next roll.
- A numeric seed field plus Use this seed. Same seed and same inputs must reproduce the same result. Use `createSeededRng`. Do not call `Math.random` from a generator that has a seed.
- Buttons say Generate, Reroll, Clear, Copy. Sentence case. No exclamation marks. Do not use an em dash in copy, comments, or commit subjects.
- Every control has a visible label and a usable focus ring. Do not rely on placeholder text as the label.
- Loading: `useTransition` or a disabled button. Do not blank the previous result until the next one is ready.
- Client components that need the compendium call a server action or a route handler. Do not import Prisma into a client file.

## Logic placement

- Pure functions live in `src/lib/<tool>/`. The React file only collects input and renders output.
- Export the input type, the result type, and one `generateX(input, rng)` function.
- Dice expressions such as `2d8 × 10 gp` and `1d4+1` must go through one shared parser if treasure or another tool already added `src/lib/dice/roll-expression.ts`. If it does not exist yet, the treasure plan creates it and later tools import it.
- Unit tests use `node:test` and `node:assert/strict`, same style as `src/lib/turn-undead/resolve.test.ts`. Seed the RNG. No snapshot of full HTML.

## Data and prose

- Use compendium records and the JSON already in the repo. Link monster, spell, and item names to existing routes (`/monsters/<slug>`, `/items/<slug>`, `/spells/<slug>`) when a match exists.
- Flavor sentences (shop descriptions, inn rumors, adventure hooks, name lists) must be written for this site. Do not paste tables or sentences from another generator.
- Do not mention any third-party generator, its author, or its URL in UI, FAQs, code comments, or commit messages.

## Verification

From `dndtools-reference/`:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web test
```

If `tsc` is not the project script, run the typecheck script already in `web/package.json`. Fix types you introduced.

Browser check when the tool renders a page: load `/tools/<slug>`, generate once, change one control, generate again, reload with the seed in the query string if the plan says the seed is synced to the URL.

## Out of scope for every file

- Campaign combat changes.
- Auth or Prisma schema changes, unless the tool file explicitly adds a table.
- New dependencies, unless the tool file names one.
- Editing unrelated tools.
