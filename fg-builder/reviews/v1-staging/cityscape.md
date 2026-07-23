# CityScape
- **Path:** `C:\Users\User\Documents\fg_modules\fg-builder\reviews\v1-staging\CityScape.mod`
- **Book slug:** `cityscape--53`
- **Load ready:** yes
- **Errors:** 0
- **Warnings:** 6
- **Info:** 0
## Record counts
| Category | Count |
|----------|------:|
| class | 3 |
| feat | 14 |
| spell | 8 |

## Spell-class readiness

| Metric | Count |
|--------|------:|
| Spell-related classfeatures | 3 |
| Named `Spells` (FG hook) | 2 |
| Named `Spellcasting` (variant/reference) | 1 |
| Named `Spells per Day` (prestige hook) | 0 |
| `score equal to` in class text | 2 |

## Build warnings (embedded)

- classes/Ebonmar Infiltrator: unknown class skill name(s) for FG ruleset: royalty)
- classes/Urban Savant: unknown class skill name(s) for FG ruleset: engineering), royalty)

## Warnings

- **[warning]** `class_malformed_classskills` — Ebonmar Infiltrator: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `class_malformed_classskills` — Urban Savant: Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug
  - Remediation: Fix classskills parser in classes.py and rebuild module.
- **[warning]** `spell_missing_field` — Zone of Peace: Missing required field: range
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Zone of Peace: Missing required field: duration
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Zone of Peace: Missing required field: save
  - Remediation: Rebuild spell with complete reference fields.
- **[warning]** `spell_missing_field` — Zone of Peace: Missing required field: sr
  - Remediation: Rebuild spell with complete reference fields.
