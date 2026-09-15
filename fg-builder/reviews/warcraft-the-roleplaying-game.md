# Warcraft The Roleplaying Game — Module Build

Built: 2026-09-15
Module: `modules/Warcraft The Roleplaying Game.mod`
Source: `dndtools-reference/data/dndtools/supplemental/` (`source_abbrev` WRPG)
Automated report: [reviews/v3/warcraft-the-roleplaying-game.md](v3/warcraft-the-roleplaying-game.md)

## Record counts

| Category | Count |
|----------|------:|
| classes | 20 |
| feats | 39 |
| spells | 33 (native only; cosmology stub omitted) |
| races | 9 |
| items | 34 (equipment + magic items) |

## What was wired

### Classes
- Advancement automation from `advancement_html` (BAB/saves/feature levels)
- Rich spell-slot tables kept as original HTML for healer/priest/shaman/elven ranger (not rebuilt from parsed rows)
- Heading form: `<p><b>Advancement</b></p>` + one table (no `<h4>Advancement</h4>`, no prereq table merges)
- PHB overlays for Barbarian/Fighter/Rogue/Sorcerer/Wizard; DMG Assassin overlay for Horde Assassin
- Prestige `+1 divine` / `+1 arcane` rows emit `Spells per Day` classfeatures
- Own-slot casters get `Spells` + `score equal to` ability text

### Races
- `detail.fg` racial traits: attributes, size, speed, vision, languages, favored class
- Extra WRPG traits with BCE-style effects where they map cleanly

### Spells
- Native WRPG spells only (no PHB Fireball et al. duplication)
- Cast actions for all 33; damage/heal/effect overrides for condensed prose
- `warcraft-cosmology-wrpg` skipped (rules stub)

### Feats / items
- Feats with prereq/benefit/special split
- Weapons keep weapon item types; special materials as Goods

## Audit / review gates

- `audit_class_modules.py`: 20 classes, `no_features=0`, `prereq_table=0`, `h4_adv=0`, `merge_hint=0`
- `review_modules`: load_ready, 0 errors, 11 warnings (WRPG-only skill `Use Technological Device`; item `cl` type attrs)

## Explicit non-goals / notes

- PHB spell-list overlay links stay in the PHB module
- Cannibalize / Death Pact / Unholy Frenzy not added as native spells (class-feature territory in source work)
- Native spell text remains condensed; automation relies on overrides where needed
