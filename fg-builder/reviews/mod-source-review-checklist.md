# FG Module Source Review Checklist

Manual review tracker for Fantasy Grounds `.mod` rulebooks in `fg-builder`.

**How to use:** Change `- [ ]` to `- [x]` when you finish reviewing a module.

**Progress:** 10 / 14 reviewed

---

## Modules

| Done | Module | `.mod` path | FG compat report |
|:----:|--------|-------------|------------------|
| - [ ] | Book of Exalted Deeds | `reviews/v1-staging/Book of Exalted Deeds.mod` | [book-of-exalted-deeds.md](reviews/v1-staging/book-of-exalted-deeds.md) |
| - [x] | Book of Vile Darkness | `modules/Book of Vile Darkness.mod` | [book-of-vile-darkness.md](reviews/v3/book-of-vile-darkness.md) |
| - [ ] | Champions of Valor | `reviews/v1-staging/Champions of Valor.mod` | [champions-of-valor.md](reviews/v1-staging/champions-of-valor.md) |
| - [ ] | CityScape | `reviews/v1-staging/CityScape.mod` | [cityscape.md](reviews/v1-staging/cityscape.md) |
| - [x] | Complete Adventurer | `modules/Complete Adventurer.mod` | [complete-adventurer.md](reviews/v3/complete-adventurer.md) |
| - [x] | Complete Arcane | `modules/Complete Arcane.mod` | [complete-arcane.md](reviews/v3/complete-arcane.md) |
| - [x] | Complete Champion | `modules/Complete Champion.mod` | [complete-champion.md](reviews/v3/complete-champion.md) |
| - [x] | Complete Divine | `modules/Complete Divine.mod` | [complete-divine.md](reviews/v3/complete-divine.md) |
| - [x] | Complete Mage | `modules/Complete Mage.mod` | [complete-mage.md](reviews/v3/complete-mage.md) |
| - [x] | Complete Warrior | `modules/Complete Warrior.mod` | [complete-warrior.md](reviews/v3/complete-warrior.md) |
| - [ ] | Libris Mortis: The Book of Undead | `reviews/v1-staging/Libris Mortis The Book of Undead.mod` | [libris-mortis-the-book-of-undead.md](reviews/v1-staging/libris-mortis-the-book-of-undead.md) |
| - [x] | Player's Handbook II | `modules/Player's Handbook II.mod` | [player-s-handbook-ii.md](reviews/v3/player-s-handbook-ii.md) |
| - [x] | Red Hand of Doom | `modules/Red Hand of Doom.mod` | [red-hand-of-doom.md](reviews/v3/red-hand-of-doom.md) |
| - [x] | Unearthed Arcana | `modules/Unearthed Arcana.mod` | [unearthed-arcana.md](reviews/v3/unearthed-arcana.md) |

---

## Review notes

### Book of Exalted Deeds

- 

### Book of Vile Darkness

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/book-of-vile-darkness.md)
- **Verdict:** Refactored with warnings (0 errors, 109 warnings)
- Categories: classes=18, feats=27, spells=141, races=2, domains=7

### Champions of Valor

- 

### CityScape

- 

### Complete Adventurer

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-adventurer.md)
- **Verdict:** Refactored with warnings (0 errors, 106 warnings)
- Categories: classes=29, feats=66, spells=70, items=13

### Complete Arcane

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-arcane.md)
- **Verdict:** Refactored with warnings (0 errors, 79 warnings)
- Categories: classes=22, feats=75, spells=149, items=1

### Complete Champion

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-champion.md)
- **Verdict:** Refactored with warnings (0 errors, 33 warnings)
- Categories: classes=11, feats=42, spells=52

### Complete Divine

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-divine.md)
- **2026-08-24:** class structural fix — prereq paragraphs (no table merge), classfeatures from description, Good/Bad saves, skill abilities
- **Verdict:** Refactored with warnings (0 errors on class structure; review warnings remain)
- Categories: classes=31, feats=56, spells=128, domains=20
- Feats: prerequisites split from benefit text via dndtools adapter

### Complete Mage

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-mage.md)
- **Verdict:** Refactored with warnings (0 errors, 38 warnings)
- Categories: classes=11, feats=65, spells=132

### Complete Warrior

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/complete-warrior.md)
- **Verdict:** Refactored with warnings (0 errors, 148 warnings)
- Categories: classes=41, feats=95, spells=8, items=2, domains=5

### Libris Mortis: The Book of Undead

- 

### Player's Handbook II

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/player-s-handbook-ii.md)
- **Verdict:** Refactored with warnings (0 errors, 24 warnings)
- Categories: classes=5, feats=106, spells=125, monsters=3, items=1

### Red Hand of Doom

- **2026-08-25:** built from dndtools JSON — see [red-hand-of-doom.md](reviews/red-hand-of-doom.md)
- **Verdict:** OK (0 errors, 0 warnings)
- Categories: feats=2, monsters=174
- Monsters: fixed malformed web anchor tags (7 records) via `<a>` unwrap in HTML sanitizer

### Unearthed Arcana

- **2026-08-24:** regenerated from dndtools JSON — see [v3 report](reviews/v3/unearthed-arcana.md)
- **Verdict:** Refactored with warnings (0 errors, 226 warnings)
- Categories: classes=50, feats=95, spells=2
