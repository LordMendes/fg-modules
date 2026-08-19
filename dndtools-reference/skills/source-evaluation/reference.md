# Source evaluation — per-category checks

Required and recommended fields when auditing `data/dndtools/{category}.json` records filtered by `index.source_abbrev`.

## Common (all entities)

| Field | Required | Notes |
|-------|:--------:|-------|
| `id`, `slug`, `name` | yes | Slug usually `{name}-{id}`; bare slugs need import alias |
| `index.source_abbrev` | yes | Must match `source.abbrev` |
| `source.edition` | recommended | Often mislabeled "Core" — cosmetic |
| `description_html` or `description_text` | yes | Primary content for site render |

## Classes

| Field | Required | Notes |
|-------|:--------:|-------|
| `hit_die` | yes* | `—` OK for UA/CW variants with inheritance prose |
| `skill_points` | yes* | Same variant exception |
| `advancement_html` | yes* | Prestige/base need table; variants may omit |
| `class_skills` | yes* | Array of `{name, slug}` |
| `description_html` | recommended | Feature prose; Bard gap was warning not blocker after metadata patch |
| `requirements_html` | recommended | Prestige classes; ~209 global nulls |
| `classfeatures` / feature text in description | recommended | Spot-check level abilities |
| `spells_for*` lists | if caster | Spell list tab resolution |

**Index:** `prestige_level`, `hit_die`, `skill_points`, `source_abbrev`, `edition`

## Feats

| Field | Required |
|-------|:--------:|
| `description_html` or `benefit_html` | yes |
| `type` (or `index.type`) | recommended |
| `prerequisite_html` | if prereqs exist |

## Spells

| Field | Required |
|-------|:--------:|
| `description` / `description_html` | yes |
| `school` | yes |
| `casting_time`, `range`, `duration` | yes |
| `classes[]` with `slug`, `level` | yes |
| `components`, `saving_throw`, `spell_resistance` | recommended |

**Cross-ref:** every `classes[].slug` must exist in `classes.json` or `CLASS_SLUG_ALIASES`.

## Skills

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `index.key_ability` or `key_ability` | yes |
| `index.trained_only` | recommended |
| `index.armor_check_penalty` | if applicable |

## Races

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `size`, `type` | yes |
| `level_adjustment` | if LA race |
| Racial traits in description or dedicated fields | recommended |

## Monsters

| Field | Required |
|-------|:--------:|
| `stat_line` | yes |
| `hit_dice`, `armor_class`, `challenge_rating` | yes |
| `initiative`, `speed`, `attack` or `full_attack` | recommended |
| Ability scores (`str`–`cha`) | recommended |
| `special_abilities[]` | if CR > 0 |
| `description_html` or `flavor_html` | recommended |

**Index:** `type`, `subtypes`, `cr`, `hd`, `source_abbrev`

## Items (magic)

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `price` or `index.price` | recommended |
| `aura`, `caster_level` | if magical |

## Equipment (mundane gear)

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `price`, `weight` | recommended |

## Domains

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| Granted power text | in description |
| Domain spell list | spot-check |

## Rules

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `index.category`, `index.subcategory` | recommended |

## Psionics

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `power_points`, `manifesting_time`, `range` | yes |
| `classes[]` or `index.classes` | yes |
| `index.discipline` | recommended |

## Deities

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| `index.alignment`, `index.pantheon` | recommended |
| Portfolio, domains, favored weapon | in description |

## Templates

| Field | Required |
|-------|:--------:|
| `description_html` | yes |
| Level adjustment, stat changes | in description |

## Stub vs variant classification

**Error (Bard-style):** canonical record, wrong source, dashes/null on core fields, no sibling `{name}-{id}` record.

**Info (expected):** `"hit_die": "—"` with description saying "retained from base class"; campaign-setting cross-ref when canonical exists elsewhere.

**Info (slug):** PH class without `-{id}` suffix — verify `CLASS_SLUG_ALIASES` covers downstream refs.

## Import / site mapping

- List pages read `index` JSON columns.
- Detail pages read full record + `indexData` blob post-import.
- Class advancement: `advancementHtml` from import `classIndexData()`.
- Spell lists: class slug resolution via `resolveClassRefSlug()`.

## Known global issues (not per-source)

- Many records have `source.name: "Core"` regardless of book — cosmetic.
- `requirements_html: null` on some prestige classes — check `errors.json`.
- Production lag: fixed JSON ≠ fixed site until import.
