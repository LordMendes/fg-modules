# Unearthed Arcana (`UA`) — Data Review

Reviewed: 2026-08-19  
Dataset: `dndtools-reference/data/dndtools/`  
Site route: `/sources/UA`

## Record counts

| Category | Index | Full JSON | Status |
|----------|------:|----------:|--------|
| classes | 50 | 50 | OK |
| feats | 95 | 95 | OK |
| spells | 2 | 2 | OK |
| domains | 0 | 0 | OK |
| races | 0 | 0 | OK |
| items | 0 | 0 | OK |
| skills | 0 | 0 | OK |
| rules | 0 | 0 | OK |
| monsters | 0 | 0 | OK |
| psionics | 0 | 0 | OK |
| deities | 0 | 0 | OK |
| templates | 0 | 0 | OK |

## Classes (50)

UA is mostly **alternate class variants** (21 with `—` hit die + "retained from base class" prose), **paragon classes** (3), **prestige alternate entry** classes (Prestige Bard/Paladin/Ranger), **NPC classes** (Expert, Warrior, Spellcaster, Thug), **tainted/scion** variants, and standalone alternates (Cloistered Cleric, Urban Ranger, etc.).

| Group | Count | Status |
|-------|------:|--------|
| Base-class variants (`*-variant-*`) | 21 | OK — `—` hit die expected (variant prose) |
| Standalone alternates | 17 | OK |
| Paragon (Drow/Dwarf/Elf) | 3 | OK after patch |
| NPC / generic (Expert, Warrior) | 2 | Warnings — see below |

### Fixes applied

- **Elf Paragon** (`elf-paragon-1002`): scraper left `hit_die` as `—`; patched to `d6` (matches Drow Paragon progression; Dwarf Paragon is `d10`).
- **Battle Sorcerer** (`battle-sorcerer-119`): patched `skill_points` to `2+ Int` (same as base Sorcerer).

### Accepted warnings

- **Expert** (`expert2-124`) and **Warrior** (`warrior2-135`): no fixed `class_skills` list — UA rules say "choose any twelve/six skills"; description prose documents this. Not a data bug.

### Spot-checks (JSON)

- **Bardic Sage** — full advancement table, class skills, feature prose OK
- **Tainted Sorcerer** — hit die, skills, advancement, description OK
- **Barbarian Variant** — variant prose, no standalone advancement (expected)
- **Paladin of Tyranny** — full prestige-style advancement and features OK

## Feats (95)

All 95 records have description/benefit content. Mix of **Traits**, **Spelltouched**, **General**, **Racial**, etc. Spot-checked: Aggressive, Favored Class, Planar Traveler — prerequisites and benefit text present.

## Spells (2)

Both domain spells for the Luck domain variant:

- **Auspicious Odds** — school, components, Luck domain level 3, description OK
- **Auspicious Odds, Mass** — Luck domain level 5, description OK

Spell class links resolve.

## Scraper errors

Two `errors.json` entries match the audit's `UA` substring filter (likely false positives from URLs containing `ua`, e.g. `urban-ranger`). Elf Paragon had a requirements scrape failure but full record content is present after manual review.

## Verdict

**Reviewed with warnings** — no Bard-style stubs or index/full mismatches. Remaining gaps (Expert/Warrior class skills) reflect UA's "player chooses skills" design.

## Follow-up

- [ ] Re-import if production DB is stale: `cd web && npx tsx prisma/import-dndtools.ts` or `/docker-entrypoint.sh import`
- [ ] Optional: model Expert/Warrior "pick N skills" in UI instead of empty class_skills list
